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
			cursor: v.optional(v.string()),
			category: v.optional(v.picklist(["advance", "deposit", "settlement"])),
			sortBy: v.optional(v.picklist(["occurredOn", "createdAt"]), "occurredOn"),
			sortOrder: v.optional(v.picklist(["desc", "asc"]), "desc"),
		}),
	),
	async (c) => {
		const user = c.get("user");
		const { cursor, category, sortBy, sortOrder } = c.req.valid("query");
		const db = drizzle(c.env.DB);

		const result = await timelineRepository.listByUserPaginated(db, user.id, {
			cursorParam: cursor,
			category,
			sortBy,
			sortOrder,
		});

		if ("error" in result) {
			return c.json({ error: result.error }, result.status);
		}

		return c.json(result);
	},
);

export { timelineApp };
