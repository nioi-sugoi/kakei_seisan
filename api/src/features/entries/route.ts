import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import { handleValidationError } from "../../middleware/validation-error-handler";
import {
	extensionForType,
	imageUploadSchema,
	validateImageFile,
} from "../../shared/image-constants";
import type { AppVariables } from "../../types";
import * as entriesRepository from "./repository";

const createEntrySchema = v.object({
	category: v.picklist(["advance", "deposit"]),
	amount: v.pipe(v.number(), v.integer(), v.minValue(0)),
	occurredOn: v.pipe(v.string(), v.isoDate()),
	label: v.pipe(v.string(), v.minLength(1)),
	memo: v.optional(v.string()),
});

const modifyEntrySchema = v.object({
	amount: v.pipe(v.number(), v.integer(), v.minValue(0)),
	label: v.pipe(v.string(), v.minLength(1)),
	memo: v.optional(v.string()),
	deleteImageIds: v.optional(v.array(v.string())),
});

const entriesApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>()
	.get("/:id", requireAuth, async (c) => {
		const user = c.get("user");
		const id = c.req.param("id");
		const db = drizzle(c.env.DB);

		const entry = await entriesRepository.findByOwner(db, id, user.id);
		if (!entry) {
			return c.json({ error: "記録が見つかりません" as const }, 404);
		}

		const [versions, images] = await Promise.all([
			entriesRepository.findVersions(db, entry.originalId),
			entriesRepository.findImagesByEntry(db, entry.originalId),
		]);

		return c.json(
			{
				...entry,
				versions,
				images: images.map((img) => ({
					id: img.id,
					displayOrder: img.displayOrder,
					createdAt: img.createdAt,
				})),
			},
			200,
		);
	})
	.post(
		"/",
		requireAuth,
		vValidator("json", createEntrySchema, handleValidationError),
		async (c) => {
			const user = c.get("user");
			const input = c.req.valid("json");
			const db = drizzle(c.env.DB);

			const entry = await entriesRepository.createEntry(db, user.id, input);

			return c.json({ ...entry, images: [] }, 201);
		},
	)
	.post(
		"/:originalId/modify",
		requireAuth,
		vValidator("json", modifyEntrySchema, handleValidationError),
		async (c) => {
			const user = c.get("user");
			const originalId = c.req.param("originalId");
			const { amount, label, memo, deleteImageIds } = c.req.valid("json");
			const db = drizzle(c.env.DB);

			const latestEntry = await entriesRepository.findMyLatestVersion(
				db,
				originalId,
				user.id,
			);
			if (!latestEntry) {
				return c.json({ error: "記録が見つかりません" as const }, 404);
			}
			if (latestEntry.cancelled) {
				return c.json(
					{ error: "取り消し済みの記録は修正できません" as const },
					400,
				);
			}

			const deleteIds = deleteImageIds ?? [];
			const hasImageChanges = deleteIds.length > 0;

			if (
				amount === latestEntry.amount &&
				label === latestEntry.label &&
				(memo || null) === latestEntry.memo &&
				!hasImageChanges
			) {
				return c.json({ error: "変更がありません" as const }, 400);
			}

			const [, insertedRows] = await entriesRepository.createModification(
				db,
				user.id,
				{
					originalId,
					category: latestEntry.category,
					occurredOn: latestEntry.occurredOn,
				},
				{ amount, label, memo },
			);

			for (const imageId of deleteIds) {
				const image = await entriesRepository.findImageById(db, imageId);
				if (image && image.entryId === originalId) {
					await entriesRepository.deleteImage(db, imageId);
					await c.env.R2.delete(image.storagePath);
				}
			}

			const images = await entriesRepository.findImagesByEntry(db, originalId);

			return c.json(
				{
					...insertedRows[0],
					images: images.map((img) => ({
						id: img.id,
						displayOrder: img.displayOrder,
						createdAt: img.createdAt,
					})),
				},
				201,
			);
		},
	)
	.post("/:originalId/cancel", requireAuth, async (c) => {
		const user = c.get("user");
		const originalId = c.req.param("originalId");
		const db = drizzle(c.env.DB);

		const latestEntry = await entriesRepository.findMyLatestVersion(
			db,
			originalId,
			user.id,
		);
		if (!latestEntry) {
			return c.json({ error: "記録が見つかりません" as const }, 404);
		}
		if (latestEntry.cancelled) {
			return c.json({ error: "既に取り消し済みです" as const }, 400);
		}

		const [, insertedRows] = await entriesRepository.createCancellation(
			db,
			user.id,
			latestEntry,
		);

		return c.json(insertedRows[0], 201);
	})
	.post("/:originalId/restore", requireAuth, async (c) => {
		const user = c.get("user");
		const originalId = c.req.param("originalId");
		const db = drizzle(c.env.DB);

		const latestEntry = await entriesRepository.findMyLatestVersion(
			db,
			originalId,
			user.id,
		);
		if (!latestEntry) {
			return c.json({ error: "記録が見つかりません" as const }, 404);
		}
		if (!latestEntry.cancelled) {
			return c.json(
				{ error: "取り消しされていない記録は復元できません" as const },
				400,
			);
		}

		const [, insertedRows] = await entriesRepository.createRestoration(
			db,
			user.id,
			latestEntry,
		);

		return c.json(insertedRows[0], 201);
	})
	// ── 画像エンドポイント ──────────────────────────────────────
	.post(
		"/:entryId/images",
		requireAuth,
		vValidator("form", imageUploadSchema, handleValidationError),
		async (c) => {
			const user = c.get("user");
			const entryId = c.req.param("entryId");
			const { image } = c.req.valid("form");
			const db = drizzle(c.env.DB);

			const entry = await entriesRepository.findByOwner(db, entryId, user.id);
			if (!entry) {
				return c.json({ error: "記録が見つかりません" as const }, 404);
			}

			const imageError = validateImageFile(image);
			if (imageError) {
				return c.json({ error: imageError }, 400);
			}

			const ext = extensionForType(image.type);
			const storagePath = `receipts/${user.id}/${entry.originalId}/${crypto.randomUUID()}.${ext}`;

			const imageRecord = await entriesRepository.createImage(db, {
				entryId: entry.originalId,
				storagePath,
			});
			if (!imageRecord) {
				return c.json({ error: "画像は最大2枚までです" as const }, 400);
			}

			await c.env.R2.put(storagePath, image.stream(), {
				httpMetadata: { contentType: image.type },
			});

			return c.json(
				{
					id: imageRecord.id,
					displayOrder: imageRecord.displayOrder,
					createdAt: imageRecord.createdAt,
				},
				201,
			);
		},
	)
	.delete("/:entryId/images/:imageId", requireAuth, async (c) => {
		const user = c.get("user");
		const entryId = c.req.param("entryId");
		const imageId = c.req.param("imageId");
		const db = drizzle(c.env.DB);

		const entry = await entriesRepository.findByOwner(db, entryId, user.id);
		if (!entry) {
			return c.json({ error: "記録が見つかりません" as const }, 404);
		}

		const image = await entriesRepository.findImageById(db, imageId);
		if (!image || image.entryId !== entry.originalId) {
			return c.json({ error: "画像が見つかりません" as const }, 404);
		}

		await entriesRepository.deleteImage(db, imageId);
		await c.env.R2.delete(image.storagePath);

		return c.json({ ok: true as const }, 200);
	})
	.get("/:entryId/images/:imageId", requireAuth, async (c) => {
		const user = c.get("user");
		const db = drizzle(c.env.DB);

		const [entry, image] = await Promise.all([
			entriesRepository.findByOwner(db, c.req.param("entryId"), user.id),
			entriesRepository.findImageById(db, c.req.param("imageId")),
		]);
		if (!entry) {
			return c.json({ error: "記録が見つかりません" as const }, 404);
		}
		if (!image || image.entryId !== entry.originalId) {
			return c.json({ error: "画像が見つかりません" as const }, 404);
		}

		const object = await c.env.R2.get(image.storagePath);
		if (!object) {
			return c.json({ error: "画像が見つかりません" as const }, 404);
		}

		const headers = new Headers();
		object.writeHttpMetadata(headers);
		headers.set("etag", object.httpEtag);
		headers.set("cache-control", "private, max-age=3600");

		return new Response(object.body, { headers });
	});

export { entriesApp };
