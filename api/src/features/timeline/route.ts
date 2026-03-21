import { vValidator } from "@hono/valibot-validator";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../types";

type TimelineRow = {
	id: string;
	userId: string;
	type: "entry" | "settlement";
	category: string | null;
	amount: number;
	occurredOn: string;
	label: string | null;
	memo: string | null;
	originalId: string;
	cancelled: number;
	latest: number;
	status: string;
	createdAt: number;
};

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
		}),
	),
	async (c) => {
		const user = c.get("user");
		const { cursor } = c.req.valid("query");
		const limit = 50;
		const db = drizzle(c.env.DB);

		const cursorClause = cursor ? sql`AND created_at < ${cursor}` : sql``;

		const result = await db.all<TimelineRow>(sql`
			SELECT id, user_id AS userId, 'entry' AS type,
				category, amount, occurred_on AS occurredOn, label, memo,
				original_id AS originalId, cancelled, latest, status, created_at AS createdAt
			FROM entries
			WHERE user_id = ${user.id} ${cursorClause}
			UNION ALL
			SELECT id, user_id AS userId, 'settlement' AS type,
				NULL AS category, amount, occurred_on AS occurredOn, NULL AS label, NULL AS memo,
				original_id AS originalId, cancelled, latest, status, created_at AS createdAt
			FROM settlements
			WHERE user_id = ${user.id} ${cursorClause}
			ORDER BY createdAt DESC
			LIMIT ${limit + 1}
		`);

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
			createdAt: row.createdAt,
		}));

		const hasMore = rows.length > limit;
		const data = hasMore ? rows.slice(0, limit) : rows;
		const nextCursor = hasMore ? data[data.length - 1].createdAt : null;

		return c.json({ data, nextCursor });
	},
);

export { timelineApp };
