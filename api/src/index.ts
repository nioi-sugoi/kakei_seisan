import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";
import type { Env } from "./bindings";
import { balanceApp } from "./features/balance";
import { entriesApp } from "./features/entries";
import { partnerApp } from "./features/partner";
import { partnerInvitationsApp } from "./features/partner-invitations";
import { settlementsApp } from "./features/settlements";
import { timelineApp } from "./features/timeline";
import type { AppVariables } from "./types";

const app = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>().basePath("/api");

// ── CORS ─────────────────────────────────────────────────────────────
// 開発環境は全開放。本番環境ではCloudflare WorkersのカスタムドメインでSame-Originとなるため
// CORSは不要（ネイティブアプリはCORS制約を受けない）。
app.use(
	"*",
	cors({
		origin: (origin) => origin,
		allowMethods: ["GET", "POST", "PUT", "DELETE"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

// ── Better Auth handler ──────────────────────────────────────────────
app.on(["POST", "GET"], "/auth/**", async (c) => {
	const auth = createAuth(c.env);
	return auth.handler(c.req.raw);
});

// ── Session middleware (non-auth routes) ─────────────────────────────
app.use("*", async (c, next) => {
	if (c.req.path.startsWith("/api/auth")) {
		return next();
	}
	const auth = createAuth(c.env);
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});
	c.set("user", session?.user ?? null);
	c.set("session", session?.session ?? null);
	return next();
});

// ── Routes ───────────────────────────────────────────────────────────
const routes = app
	.get("/", (c) => {
		return c.json({ message: "kakei-seisan API" });
	})
	.get("/health", (c) => {
		return c.json({ status: "ok" });
	})
	.route("/entries", entriesApp)
	.route("/settlements", settlementsApp)
	.route("/balance", balanceApp)
	.route("/timeline", timelineApp)
	.route("/partner", partnerApp)
	.route("/partner-invitations", partnerInvitationsApp);

export default app;
export type AppType = typeof routes;
