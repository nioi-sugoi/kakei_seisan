import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../types";
import { parseCursor } from "./parse-cursor";
import type { CursorValue } from "./repository";
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
			cursor: v.optional(v.string()),
			category: v.optional(v.picklist(["advance", "deposit", "settlement"])),
			sortBy: v.optional(v.picklist(["occurredOn", "createdAt"])),
			sortOrder: v.optional(v.picklist(["desc", "asc"])),
		}),
	),
	async (c) => {
		const user = c.get("user");
		const {
			cursor: cursorParam,
			category,
			sortBy: sortByParam,
			sortOrder: sortOrderParam,
		} = c.req.valid("query");
		const limit = 50;
		const db = drizzle(c.env.DB);

		const sortBy = sortByParam ?? "occurredOn";
		const sortOrder = sortOrderParam ?? "desc";

		let cursor: CursorValue | undefined;
		if (cursorParam) {
			const parsed = parseCursor(cursorParam, sortBy);
			if (!parsed) {
				return c.json({ error: "Invalid cursor" }, 400);
			}
			cursor = parsed;
		}

		const result = await timelineRepository.listByUser(db, user.id, {
			limit: limit + 1,
			cursor,
			category,
			sortBy,
			sortOrder,
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
			imageCount: row.imageCount,
		}));

		const hasMore = rows.length > limit;
		const data = hasMore ? rows.slice(0, limit) : rows;

		let nextCursor: string | null = null;
		if (hasMore) {
			const lastItem = data[data.length - 1];
			nextCursor =
				sortBy === "createdAt"
					? String(lastItem.createdAt)
					: `${lastItem.occurredOn},${lastItem.createdAt}`;
		}

		return c.json({ data, nextCursor });
	},
);

export { timelineApp };
