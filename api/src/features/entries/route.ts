import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import type { AppVariables } from "../../types";
import * as entriesRepository from "./repository";

const entriesApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>();

function isValidCalendarDate(dateStr: string): boolean {
	const [y, m, d] = dateStr.split("-").map(Number);
	const date = new Date(y, m - 1, d);
	return (
		date.getFullYear() === y &&
		date.getMonth() === m - 1 &&
		date.getDate() === d
	);
}

const createEntrySchema = v.object({
	category: v.picklist(["advance", "deposit"]),
	amount: v.pipe(v.number(), v.integer(), v.minValue(0)),
	date: v.pipe(
		v.string(),
		v.regex(/^\d{4}-\d{2}-\d{2}$/),
		v.check(isValidCalendarDate, "実在する日付を指定してください"),
	),
	label: v.pipe(v.string(), v.minLength(1)),
	memo: v.optional(v.string()),
});

entriesApp.post(
	"/",
	vValidator("json", createEntrySchema, (result, c) => {
		if (!result.success) {
			return c.json(
				{
					error: "バリデーションエラー",
					issues: result.issues.map((issue) => ({
						field: issue.path?.[0]?.key ?? "unknown",
						message: issue.message,
					})),
				},
				400,
			);
		}
	}),
	async (c) => {
		const user = c.get("user");
		if (!user) {
			return c.json({ error: "認証が必要です" }, 401);
		}

		const input = c.req.valid("json");
		const db = drizzle(c.env.DB);
		const entry = await entriesRepository.createEntry(db, user.id, input);

		return c.json(entry, 201);
	},
);

export { entriesApp };
