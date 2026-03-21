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
	date: v.pipe(v.string(), v.isoDate()),
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

			// 非最新エントリのグループが取消済みかどうかを取得
			const nonLatestOriginalIds = [
				...new Set(data.filter((e) => !e.latest).map((e) => e.originalId)),
			];
			const cancelledStatuses = await entriesRepository.getGroupCancelledStatus(
				db,
				nonLatestOriginalIds,
			);

			const cancelledMap = new Map(
				cancelledStatuses.map((s) => [s.originalId, s.cancelled]),
			);

			const augmented = data.map((entry) => ({
				...entry,
				groupCancelled: entry.latest
					? entry.cancelled
					: (cancelledMap.get(entry.originalId) ?? false),
			}));

			return c.json({ data: augmented, nextCursor });
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

		// バージョン一覧と元エントリを並行取得
		const [versions, original] = await Promise.all([
			entriesRepository.findVersions(db, entry.originalId),
			entry.id !== entry.originalId
				? entriesRepository
						.findById(db, entry.originalId)
						.then((e) => e ?? undefined)
				: Promise.resolve(undefined),
		]);

		return c.json({ ...entry, versions, original }, 200);
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

			const [, inserted] = await entriesRepository.createModification(
				db,
				user.id,
				{
					originalId,
					category: latestEntry.category,
					date: latestEntry.date,
				},
				input,
			);

			return c.json(inserted[0], 201);
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

		const [, inserted] = await entriesRepository.createCancellation(
			db,
			user.id,
			latestEntry,
		);

		return c.json(inserted[0], 201);
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

		const [, inserted] = await entriesRepository.createRestoration(
			db,
			user.id,
			latestEntry,
		);

		return c.json(inserted[0], 201);
	});

export { entriesApp };
