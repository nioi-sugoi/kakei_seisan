import { Hono } from "hono";
import type { Env } from "./bindings";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
	return c.json({ message: "kakei-seisan API" });
});

app.get("/health", (c) => {
	return c.json({ status: "ok" });
});

export default app;
