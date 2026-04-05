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
			sortBy: v.optional(v.picklist(["occurredOn", "createdAt"]), "occurredOn"),
			sortOrder: v.optional(v.picklist(["desc", "asc"]), "desc"),
		}),
	),
	async (c) => {
		const user = c.get("user");
		const {
			cursor: cursorParam,
			category,
			sortBy,
			sortOrder,
		} = c.req.valid("query");
		const limit = 50;
		const db = drizzle(c.env.DB);

		let cursor: CursorValue | undefined;
		if (cursorParam) {
			const parsed = parseCursor(cursorParam, sortBy);
			if (!parsed) {
				return c.json({ error: "Invalid cursor" }, 400);
			}
			cursor = parsed;
		}

		const rows = await timelineRepository.listByUser(db, user.id, {
			limit: limit + 1,
			cursor,
			category,
			sortBy,
			sortOrder,
		});

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
