import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Session, SessionUser } from "./auth";
import { createAuth } from "./auth";
import type { Env } from "./bindings";
import { createResendClient } from "./email";

type Variables = {
	user: SessionUser | null;
	session: Session | null;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── CORS for auth endpoints ──────────────────────────────────────────
app.use(
	"/api/auth/*",
	cors({
		origin: (origin) => origin,
		allowMethods: ["GET", "POST"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

// ── Better Auth handler ──────────────────────────────────────────────
app.on(["POST", "GET"], "/api/auth/**", (c) => {
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

app.post("/dev/email/test", async (c) => {
	const resend = createResendClient(c.env.RESEND_API_KEY);
	const { data, error } = await resend.emails.send({
		from: c.env.EMAIL_FROM,
		to: "delivered@resend.dev",
		subject: "テストメール from kakei-seisan",
		html: "<h1>テスト送信</h1><p>メール送信基盤が正常に動作しています。</p>",
	});

	if (error || !data) {
		return c.json({ error: error?.message ?? "Unknown error" }, 500);
	}

	return c.json({ message: "テストメール送信成功", id: data.id });
});

export default app;
