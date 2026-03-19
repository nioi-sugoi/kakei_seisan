import { createMiddleware } from "hono/factory";
import type { Env } from "../bindings";
import type { AppVariables } from "../types";

export const requireAuth = createMiddleware<{
	Bindings: Env;
	Variables: AppVariables;
}>(async (c, next) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "認証が必要です" }, 401);
	}
	await next();
});
