import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../types";
import * as timelineRepository from "./repository";

const timelineApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>().get(
	"/",
	requireAuth,
	vValidator(
		"query",
		v.object({
			cursor: v.optional(v.pipe(v.string(), v.transform(Number), v.integer())),
			category: v.optional(v.picklist(["advance", "deposit", "settlement"])),
		}),
	),
	async (c) => {
		const user = c.get("user");
		const { cursor, category } = c.req.valid("query");
		const limit = 50;
		const db = drizzle(c.env.DB);

		const result = await timelineRepository.listByUser(db, user.id, {
			limit: limit + 1,
			cursor,
			category,
		});

		const rows = result.map((row) => ({
			id: row.id,
			userId: row.userId,
			type: row.type,
			category: row.category,
			amount: row.amount,
			occurredOn: row.occurredOn,
			label: row.label,
			memo: row.memo,
			originalId: row.originalId,
			cancelled: Boolean(row.cancelled),
			latest: Boolean(row.latest),
			status: row.status,
			approvalComment: row.approvalComment,
			createdAt: row.createdAt,
		}));

		const hasMore = rows.length > limit;
		const data = hasMore ? rows.slice(0, limit) : rows;
		const nextCursor = hasMore ? data[data.length - 1].createdAt : null;

		return c.json({ data, nextCursor });
	},
);

export { timelineApp };
