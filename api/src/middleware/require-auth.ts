import { createMiddleware } from "hono/factory";
import type { Session, SessionUser } from "../auth";
import type { Env } from "../bindings";

export const requireAuth = createMiddleware<{
	Bindings: Env;
	Variables: {
		user: SessionUser;
		session: Session;
	};
}>(async (c, next) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "認証が必要です" }, 401);
	}
	await next();
});
