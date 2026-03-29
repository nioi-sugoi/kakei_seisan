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
import * as settlementsRepository from "./repository";

const createSettlementSchema = v.object({
	category: v.picklist(["fromUser", "fromHousehold"]),
	amount: v.pipe(v.number(), v.integer(), v.minValue(1)),
	occurredOn: v.pipe(v.string(), v.isoDate()),
});

const modifySettlementSchema = v.object({
	amount: v.pipe(v.number(), v.integer(), v.minValue(1)),
	deleteImageIds: v.optional(v.array(v.string())),
});

const settlementsApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>()
	.get("/:id", requireAuth, async (c) => {
		const user = c.get("user");
		const id = c.req.param("id");
		const db = drizzle(c.env.DB);

		const settlement = await settlementsRepository.findByOwner(db, id, user.id);
		if (!settlement) {
			return c.json({ error: "精算が見つかりません" as const }, 404);
		}

		const [versions, images] = await Promise.all([
			settlementsRepository.findVersions(db, settlement.originalId),
			settlementsRepository.findImagesBySettlement(db, settlement.originalId),
		]);

		return c.json(
			{
				...settlement,
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
		vValidator("json", createSettlementSchema, handleValidationError),
		async (c) => {
			const user = c.get("user");
			const input = c.req.valid("json");
			const db = drizzle(c.env.DB);

			const settlement = await settlementsRepository.createSettlement(
				db,
				user.id,
				input,
			);

			return c.json({ ...settlement, images: [] }, 201);
		},
	)
	.post(
		"/:originalId/modify",
		requireAuth,
		vValidator("json", modifySettlementSchema, handleValidationError),
		async (c) => {
			const user = c.get("user");
			const originalId = c.req.param("originalId");
			const { amount, deleteImageIds } = c.req.valid("json");
			const db = drizzle(c.env.DB);

			const latestSettlement = await settlementsRepository.findMyLatestVersion(
				db,
				originalId,
				user.id,
			);
			if (!latestSettlement) {
				return c.json({ error: "精算が見つかりません" as const }, 404);
			}
			if (latestSettlement.cancelled) {
				return c.json(
					{ error: "取り消し済みの精算は修正できません" as const },
					400,
				);
			}

			const deleteIds = deleteImageIds ?? [];
			const hasImageChanges = deleteIds.length > 0;

			if (amount === latestSettlement.amount && !hasImageChanges) {
				return c.json({ error: "変更がありません" as const }, 400);
			}

			const [, insertedRows] = await settlementsRepository.createModification(
				db,
				user.id,
				{
					originalId,
					category: latestSettlement.category,
					occurredOn: latestSettlement.occurredOn,
				},
				{ amount },
			);

			for (const imageId of deleteIds) {
				const image = await settlementsRepository.findImageById(db, imageId);
				if (image && image.settlementId === originalId) {
					await settlementsRepository.deleteImage(db, imageId);
					await c.env.R2.delete(image.storagePath);
				}
			}

			const images = await settlementsRepository.findImagesBySettlement(
				db,
				originalId,
			);

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

		const latestSettlement = await settlementsRepository.findMyLatestVersion(
			db,
			originalId,
			user.id,
		);
		if (!latestSettlement) {
			return c.json({ error: "精算が見つかりません" as const }, 404);
		}
		if (latestSettlement.cancelled) {
			return c.json({ error: "既に取り消し済みです" as const }, 400);
		}

		const [, insertedRows] = await settlementsRepository.createCancellation(
			db,
			user.id,
			latestSettlement,
		);

		return c.json(insertedRows[0], 201);
	})
	.post("/:originalId/restore", requireAuth, async (c) => {
		const user = c.get("user");
		const originalId = c.req.param("originalId");
		const db = drizzle(c.env.DB);

		const latestSettlement = await settlementsRepository.findMyLatestVersion(
			db,
			originalId,
			user.id,
		);
		if (!latestSettlement) {
			return c.json({ error: "精算が見つかりません" as const }, 404);
		}
		if (!latestSettlement.cancelled) {
			return c.json(
				{ error: "取り消しされていない精算は復元できません" as const },
				400,
			);
		}

		const [, insertedRows] = await settlementsRepository.createRestoration(
			db,
			user.id,
			latestSettlement,
		);

		return c.json(insertedRows[0], 201);
	})
	// ── 画像エンドポイント ──────────────────────────────────────
	.post(
		"/:settlementId/images",
		requireAuth,
		vValidator("form", imageUploadSchema, handleValidationError),
		async (c) => {
			const user = c.get("user");
			const settlementId = c.req.param("settlementId");
			const { image } = c.req.valid("form");
			const db = drizzle(c.env.DB);

			const settlement = await settlementsRepository.findByOwner(
				db,
				settlementId,
				user.id,
			);
			if (!settlement) {
				return c.json({ error: "精算が見つかりません" as const }, 404);
			}

			const imageError = validateImageFile(image);
			if (imageError) {
				return c.json({ error: imageError }, 400);
			}

			const ext = extensionForType(image.type);
			const storagePath = `receipts/${user.id}/${settlement.originalId}/${crypto.randomUUID()}.${ext}`;

			const imageRecord = await settlementsRepository.createImage(db, {
				settlementId: settlement.originalId,
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
	.delete("/:settlementId/images/:imageId", requireAuth, async (c) => {
		const user = c.get("user");
		const settlementId = c.req.param("settlementId");
		const imageId = c.req.param("imageId");
		const db = drizzle(c.env.DB);

		const settlement = await settlementsRepository.findByOwner(
			db,
			settlementId,
			user.id,
		);
		if (!settlement) {
			return c.json({ error: "精算が見つかりません" as const }, 404);
		}

		const image = await settlementsRepository.findImageById(db, imageId);
		if (!image || image.settlementId !== settlement.originalId) {
			return c.json({ error: "画像が見つかりません" as const }, 404);
		}

		await settlementsRepository.deleteImage(db, imageId);
		await c.env.R2.delete(image.storagePath);

		return c.json({ ok: true as const }, 200);
	})
	.get("/:settlementId/images/:imageId", requireAuth, async (c) => {
		const user = c.get("user");
		const db = drizzle(c.env.DB);

		const [settlement, image] = await Promise.all([
			settlementsRepository.findByOwner(
				db,
				c.req.param("settlementId"),
				user.id,
			),
			settlementsRepository.findImageById(db, c.req.param("imageId")),
		]);
		if (!settlement) {
			return c.json({ error: "精算が見つかりません" as const }, 404);
		}
		if (!image || image.settlementId !== settlement.originalId) {
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

export { settlementsApp };
