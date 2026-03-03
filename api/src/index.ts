import { Hono } from "hono";
import type { Env } from "./bindings";
import { sendEmail } from "./email";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
	return c.json({ message: "kakei-seisan API" });
});

app.get("/health", (c) => {
	return c.json({ status: "ok" });
});

app.post("/dev/email/test", async (c) => {
	const result = await sendEmail(c.env.RESEND_API_KEY, c.env.EMAIL_FROM, {
		to: "delivered@resend.dev",
		subject: "テストメール from kakei-seisan",
		html: "<h1>テスト送信</h1><p>メール送信基盤が正常に動作しています。</p>",
	});

	if (!result.success) {
		return c.json({ error: result.error }, 500);
	}

	return c.json({ message: "テストメール送信成功", id: result.id });
});

export default app;
