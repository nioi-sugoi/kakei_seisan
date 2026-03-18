import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Session, SessionUser } from "./auth";
import { createAuth } from "./auth";
import type { Env } from "./bindings";
import { entriesApp } from "./features/entries";

type Variables = {
	user: SessionUser | null;
	session: Session | null;
};

const app = new Hono<{
	Bindings: Env;
	Variables: Variables;
}>().basePath("/api");

// ── CORS ─────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN_PATTERNS = [
	/^http:\/\/localhost(:\d+)?$/,
	/^http:\/\/127\.0\.0\.1(:\d+)?$/,
	/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/, // LAN (Expo dev on mobile)
];

app.use(
	"*",
	cors({
		origin: (origin) => {
			if (ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin))) {
				return origin;
			}
			return null;
		},
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
app.get("/", (c) => {
	return c.json({ message: "kakei-seisan API" });
});

app.get("/health", (c) => {
	return c.json({ status: "ok" });
});

// ── Feature routes ──────────────────────────────────────────────────
app.route("/entries", entriesApp);

export default app;
