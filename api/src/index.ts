import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Session, SessionUser } from "./auth";
import { createAuth } from "./auth";
import type { Env } from "./bindings";

type Variables = {
	user: SessionUser | null;
	session: Session | null;
};

const app = new Hono<{
	Bindings: Env;
	Variables: Variables;
}>().basePath("/api");

// ── CORS for auth endpoints ──────────────────────────────────────────
app.use(
	"/auth/*",
	cors({
		origin: (origin) => origin,
		allowMethods: ["GET", "POST"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

// ── Better Auth handler ──────────────────────────────────────────────
// ディープリンクへのリダイレクト時に Set-Cookie を URL パラメータに付加する。
// ブラウザ経由のマジックリンク検証ではアプリが HTTP cookie を受け取れないため、
// セッション cookie を deep link URL の query に含めて渡す。
app.on(["POST", "GET"], "/auth/**", async (c) => {
	const auth = createAuth(c.env);
	const response = await auth.handler(c.req.raw);

	if (response.status === 302 || response.status === 303) {
		const location = response.headers.get("location");
		if (location && isDeepLink(location)) {
			const setCookie = response.headers.get("set-cookie");
			if (setCookie) {
				const separator = location.includes("?") ? "&" : "?";
				const redirectUrl = `${location}${separator}cookie=${encodeURIComponent(setCookie)}`;
				return new Response(null, {
					status: response.status,
					headers: { location: redirectUrl },
				});
			}
		}
	}

	return response;
});

function isDeepLink(url: string): boolean {
	return url.startsWith("kakei-seisan://") || url.startsWith("exp://");
}

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

export default app;
