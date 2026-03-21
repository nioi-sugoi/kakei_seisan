import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../types";
import { findPartnershipWithPartnerInfo } from "./repository";

const partnerApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>()
	// ── GET / — 自分のパートナー情報を取得 ─────────────────────
	.get("/", requireAuth, async (c) => {
		const user = c.get("user");
		const db = drizzle(c.env.DB);

		const partnership = await findPartnershipWithPartnerInfo(db, user.id);

		return c.json({ data: partnership ?? null });
	});

export { partnerApp };
