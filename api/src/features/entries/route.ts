import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
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

			// 元エントリの子レコード（修正・取消）を取得して childOperations を付与
			const originalIds = data
				.filter((e) => e.operation === "original")
				.map((e) => e.id);
			const childOps =
				originalIds.length > 0
					? await entriesRepository.getChildOperations(db, originalIds)
					: [];

			const childOpsMap = new Map<string, Set<string>>();
			for (const row of childOps) {
				if (!row.parentId) continue;
				const set = childOpsMap.get(row.parentId) ?? new Set();
				set.add(row.operation);
				childOpsMap.set(row.parentId, set);
			}

			const augmented = data.map((entry) => ({
				...entry,
				childOperations: [...(childOpsMap.get(entry.id) ?? new Set<string>())],
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

		// 子エントリ（修正・取消）を取得
		const children = await entriesRepository.findChildren(db, id);

		// 親エントリ（修正・取消レコードの場合）
		const parent = entry.parentId
			? ((await entriesRepository.findById(db, entry.parentId)) ?? undefined)
			: undefined;

		return c.json({ ...entry, children, parent }, 200);
	})
	.post(
		"/",
		requireAuth,
		vValidator("json", createEntrySchema, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						error: "バリデーションエラー" as const,
						issues: result.issues.map((issue) => ({
							field: String(issue.path?.[0]?.key ?? "unknown"),
							message: issue.message,
						})),
					},
					400,
				);
			}
		}),
		async (c) => {
			const user = c.get("user");
			const input = c.req.valid("json");
			const db = drizzle(c.env.DB);
			const entry = await entriesRepository.createEntry(db, user.id, input);

			return c.json(entry, 201);
		},
	)
	.post(
		"/:id/modify",
		requireAuth,
		vValidator("json", modifyEntrySchema, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						error: "バリデーションエラー" as const,
						issues: result.issues.map((issue) => ({
							field: String(issue.path?.[0]?.key ?? "unknown"),
							message: issue.message,
						})),
					},
					400,
				);
			}
		}),
		async (c) => {
			const user = c.get("user");
			const id = c.req.param("id");
			const input = c.req.valid("json");
			const db = drizzle(c.env.DB);

			const entry = await entriesRepository.findByOwner(db, id, user.id);
			if (!entry) {
				return c.json({ error: "記録が見つかりません" as const }, 404);
			}
			if (entry.operation !== "original") {
				return c.json({ error: "元の記録のみ修正できます" as const }, 400);
			}

			// 子エントリを取得して取消済みチェックと実効金額を計算
			const children = await entriesRepository.findChildren(db, id);
			const hasCancellation = children.some(
				(child) => child.operation === "cancellation",
			);
			if (hasCancellation) {
				return c.json(
					{ error: "取り消し済みの記録は修正できません" as const },
					400,
				);
			}

			const modificationSum = children
				.filter((child) => child.operation === "modification")
				.reduce((sum, child) => sum + child.amount, 0);
			const effectiveAmount = entry.amount + modificationSum;
			const diff = input.amount - effectiveAmount;

			if (
				diff === 0 &&
				input.label === entry.label &&
				(input.memo ?? null) === entry.memo
			) {
				return c.json({ error: "変更がありません" as const }, 400);
			}

			const modification = await entriesRepository.createModification(
				db,
				user.id,
				id,
				{ category: entry.category, date: entry.date },
				{ amount: diff, label: input.label, memo: input.memo },
			);

			return c.json(modification, 201);
		},
	)
	.post("/:id/cancel", requireAuth, async (c) => {
		const user = c.get("user");
		const id = c.req.param("id");
		const db = drizzle(c.env.DB);

		const entry = await entriesRepository.findByOwner(db, id, user.id);
		if (!entry) {
			return c.json({ error: "記録が見つかりません" as const }, 404);
		}
		if (entry.operation !== "original") {
			return c.json({ error: "元の記録のみ取り消しできます" as const }, 400);
		}

		const children = await entriesRepository.findChildren(db, id);
		const hasCancellation = children.some(
			(child) => child.operation === "cancellation",
		);
		if (hasCancellation) {
			return c.json({ error: "既に取り消し済みです" as const }, 400);
		}

		const modificationSum = children
			.filter((child) => child.operation === "modification")
			.reduce((sum, child) => sum + child.amount, 0);
		const effectiveAmount = entry.amount + modificationSum;

		const cancellation = await entriesRepository.createCancellation(
			db,
			user.id,
			id,
			{ category: entry.category, date: entry.date, label: entry.label },
			effectiveAmount,
		);

		return c.json(cancellation, 201);
	});

export { entriesApp };
