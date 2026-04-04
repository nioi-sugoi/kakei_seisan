import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../types";
import { computeBalance } from "./compute-balance";

const balanceApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>().get("/", requireAuth, async (c) => {
	const user = c.get("user");
	const db = drizzle(c.env.DB);

	const result = await computeBalance(db, user.id);

	return c.json(result);
});

export { balanceApp };
