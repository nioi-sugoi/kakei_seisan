import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import { handleValidationError } from "../../middleware/validation-error-handler";
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
});

const entriesApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>()
	.get(
		"/",
		requireAuth,
		vValidator(
			"query",
			v.object({
				cursor: v.optional(
					v.pipe(v.string(), v.transform(Number), v.integer()),
				),
			}),
		),
		async (c) => {
			const user = c.get("user");
			const { cursor } = c.req.valid("query");
			const limit = 50;

			const db = drizzle(c.env.DB);
			const items = await entriesRepository.listByUser(db, user.id, {
				limit: limit + 1,
				cursor,
			});

			const hasMore = items.length > limit;
			const data = hasMore ? items.slice(0, limit) : items;
			const nextCursor = hasMore ? data[data.length - 1].createdAt : null;

			return c.json({ data, nextCursor });
		},
	)
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

			return c.json(entry, 201);
		},
	)
	.post(
		"/:originalId/modify",
		requireAuth,
		vValidator("json", modifyEntrySchema, handleValidationError),
		async (c) => {
			const user = c.get("user");
			const originalId = c.req.param("originalId");
			const input = c.req.valid("json");
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

			if (
				input.amount === latestEntry.amount &&
				input.label === latestEntry.label &&
				(input.memo ?? null) === latestEntry.memo
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
				input,
			);

			return c.json(insertedRows[0], 201);
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
	// ── 画像エンドポイント ────────────────────────────────────────
	.post("/:entryId/images", requireAuth, async (c) => {
		const user = c.get("user");
		const entryId = c.req.param("entryId");
		const db = drizzle(c.env.DB);

		// エントリーの所有者チェック（任意のバージョン ID を受け付けて originalId を特定）
		const entry = await entriesRepository.findByOwner(db, entryId, user.id);
		if (!entry) {
			return c.json({ error: "記録が見つかりません" as const }, 404);
		}
		const targetId = entry.originalId;

		// マルチパートボディをパース
		const body = await c.req.parseBody();
		const file = body.image;
		if (!(file instanceof File)) {
			return c.json({ error: "画像ファイルが必要です" as const }, 400);
		}

		// ファイル形式チェック
		const allowedTypes = [
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/heic",
		];
		if (!allowedTypes.includes(file.type)) {
			return c.json(
				{ error: "サポートされていないファイル形式です" as const },
				400,
			);
		}

		// ファイルサイズチェック（10MB）
		if (file.size > 10 * 1024 * 1024) {
			return c.json(
				{ error: "ファイルサイズは10MB以下にしてください" as const },
				400,
			);
		}

		// MIME → 拡張子マッピング
		const extMap: Record<string, string> = {
			"image/jpeg": "jpg",
			"image/png": "png",
			"image/webp": "webp",
			"image/heic": "heic",
		};
		const ext = extMap[file.type] ?? "jpg";
		const storagePath = `receipts/${user.id}/${targetId}/${crypto.randomUUID()}.${ext}`;

		// DB にメタデータを保存（アトミックに枚数制限チェック）
		const image = await entriesRepository.createImage(db, {
			entryId: targetId,
			storagePath,
		});
		if (!image) {
			return c.json({ error: "画像は最大2枚までです" as const }, 400);
		}

		// R2 にアップロード
		await c.env.RECEIPTS.put(storagePath, file.stream(), {
			httpMetadata: { contentType: file.type },
		});

		return c.json(
			{
				id: image.id,
				entryId: image.entryId,
				displayOrder: image.displayOrder,
				createdAt: image.createdAt,
			},
			201,
		);
	})
	.get("/:entryId/images/:imageId", requireAuth, async (c) => {
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

		const object = await c.env.RECEIPTS.get(image.storagePath);
		if (!object) {
			return c.json({ error: "画像が見つかりません" as const }, 404);
		}

		const headers = new Headers();
		object.writeHttpMetadata(headers);
		headers.set("etag", object.httpEtag);
		headers.set("cache-control", "private, max-age=3600");

		return new Response(object.body, { headers });
	})
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

		// R2 から削除
		await c.env.RECEIPTS.delete(image.storagePath);

		// DB から削除
		await entriesRepository.deleteImage(db, imageId);

		return c.json({ success: true as const }, 200);
	});

export { entriesApp };
