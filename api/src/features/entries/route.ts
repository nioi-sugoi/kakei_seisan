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

const entriesApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>()
	.get("/:id", requireAuth, async (c) => {
		const user = c.get("user")!;
		const id = c.req.param("id");
		const db = drizzle(c.env.DB);

		const entry = await entriesRepository.findByOwner(db, id, user.id);
		if (!entry) {
			return c.json({ error: "記録が見つかりません" as const }, 404);
		}

		return c.json(entry, 200);
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
			const user = c.get("user")!;
			const input = c.req.valid("json");
			const db = drizzle(c.env.DB);
			const entry = await entriesRepository.createEntry(db, user.id, input);

			return c.json(entry, 201);
		},
	);

export { entriesApp };
