import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import { handleValidationError } from "../../middleware/validation-error-handler";
import {
	extensionForType,
	isAllowedImageType,
	MAX_IMAGE_SIZE,
} from "../../shared/image-constants";
import type { AppVariables } from "../../types";
import * as entriesRepository from "./repository";

const createEntrySchema = v.object({
	category: v.picklist(["advance", "deposit"]),
	amount: v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(0)),
	occurredOn: v.pipe(v.string(), v.isoDate()),
	label: v.pipe(v.string(), v.minLength(1)),
	memo: v.optional(v.string()),
	image1: v.optional(v.instance(File)),
	image2: v.optional(v.instance(File)),
});

const modifyEntrySchema = v.object({
	amount: v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(0)),
	label: v.pipe(v.string(), v.minLength(1)),
	memo: v.optional(v.string()),
	image1: v.optional(v.instance(File)),
	image2: v.optional(v.instance(File)),
	deleteImageIds: v.optional(v.string()),
});

function collectImageFiles(
	image1: File | undefined,
	image2: File | undefined,
): File[] {
	return [image1, image2].filter((f): f is File => f !== undefined);
}

function validateImageFiles(files: File[]): string | null {
	for (const file of files) {
		if (!isAllowedImageType(file.type)) {
			return "サポートされていないファイル形式です";
		}
		if (file.size > MAX_IMAGE_SIZE) {
			return "ファイルサイズは10MB以下にしてください";
		}
	}
	return null;
}

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
		vValidator("form", createEntrySchema, handleValidationError),
		async (c) => {
			const user = c.get("user");
			const { category, amount, occurredOn, label, memo, image1, image2 } =
				c.req.valid("form");
			const db = drizzle(c.env.DB);

			const imageFiles = collectImageFiles(image1, image2);
			const imageError = validateImageFiles(imageFiles);
			if (imageError) {
				return c.json(
					{
						error: imageError as
							| "サポートされていないファイル形式です"
							| "ファイルサイズは10MB以下にしてください",
					},
					400,
				);
			}

			const entry = await entriesRepository.createEntry(db, user.id, {
				category,
				amount,
				occurredOn,
				label,
				memo,
			});

			const images = [];
			for (const file of imageFiles) {
				const ext = extensionForType(file.type);
				const storagePath = `receipts/${user.id}/${entry.originalId}/${crypto.randomUUID()}.${ext}`;

				const image = await entriesRepository.createImage(db, {
					entryId: entry.originalId,
					storagePath,
				});
				if (!image) {
					return c.json({ error: "画像は最大2枚までです" as const }, 400);
				}

				await c.env.R2.put(storagePath, file.stream(), {
					httpMetadata: { contentType: file.type },
				});

				images.push({
					id: image.id,
					displayOrder: image.displayOrder,
					createdAt: image.createdAt,
				});
			}

			return c.json({ ...entry, images }, 201);
		},
	)
	.post(
		"/:originalId/modify",
		requireAuth,
		vValidator("form", modifyEntrySchema, handleValidationError),
		async (c) => {
			const user = c.get("user");
			const originalId = c.req.param("originalId");
			const {
				amount,
				label,
				memo,
				image1,
				image2,
				deleteImageIds: deleteIdsStr,
			} = c.req.valid("form");
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

			const imageFiles = collectImageFiles(image1, image2);
			const imageError = validateImageFiles(imageFiles);
			if (imageError) {
				return c.json(
					{
						error: imageError as
							| "サポートされていないファイル形式です"
							| "ファイルサイズは10MB以下にしてください",
					},
					400,
				);
			}

			const deleteIds = deleteIdsStr
				? deleteIdsStr.split(",").filter(Boolean)
				: [];
			const hasImageChanges = imageFiles.length > 0 || deleteIds.length > 0;

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

			// 削除を先に実行（枚数制限のため）
			for (const imageId of deleteIds) {
				const image = await entriesRepository.findImageById(db, imageId);
				if (image && image.entryId === originalId) {
					await entriesRepository.deleteImage(db, imageId);
					await c.env.R2.delete(image.storagePath);
				}
			}

			for (const file of imageFiles) {
				const ext = extensionForType(file.type);
				const storagePath = `receipts/${user.id}/${originalId}/${crypto.randomUUID()}.${ext}`;

				const image = await entriesRepository.createImage(db, {
					entryId: originalId,
					storagePath,
				});
				if (!image) {
					return c.json({ error: "画像は最大2枚までです" as const }, 400);
				}

				await c.env.R2.put(storagePath, file.stream(), {
					httpMetadata: { contentType: file.type },
				});
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
	// ── 画像取得エンドポイント（GET のみ維持）──────────────────────────
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
