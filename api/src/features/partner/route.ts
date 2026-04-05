import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../types";
import { calculateBalance } from "../balance/domain";
import { getEntryTotals, getSettlementTotals } from "../balance/repository";
import {
	InvalidCursorError,
	listByUserPaginated,
} from "../timeline/repository";
import { findPartner, getPartnerUserId } from "./repository";

const partnerApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>()
	// ── GET / — 自分のパートナー情報を取得 ─────────────────────
	.get("/", requireAuth, async (c) => {
		const user = c.get("user");
		const db = drizzle(c.env.DB);

		const partnership = await findPartner(db, user.id);

		return c.json({ data: partnership ?? null });
	})

	// ── GET /balance — パートナーの残高サマリーを取得 ───────────
	.get("/balance", requireAuth, async (c) => {
		const user = c.get("user");
		const db = drizzle(c.env.DB);

		const partnerUserId = await getPartnerUserId(db, user.id);
		if (!partnerUserId) {
			return c.json({ error: "パートナーが見つかりません" }, 404);
		}

		const [entryTotals, settlementTotals] = await Promise.all([
			getEntryTotals(db, partnerUserId),
			getSettlementTotals(db, partnerUserId),
		]);

		const balance = calculateBalance(
			entryTotals.advanceTotal,
			entryTotals.depositTotal,
			settlementTotals.fromHouseholdTotal,
			settlementTotals.fromUserTotal,
		);

		return c.json({ ...entryTotals, ...settlementTotals, balance });
	})

	// ── GET /timeline — パートナーのタイムラインを取得 ──────────
	.get(
		"/timeline",
		requireAuth,
		vValidator(
			"query",
			v.object({
				cursor: v.optional(v.string()),
				category: v.optional(v.picklist(["advance", "deposit", "settlement"])),
				sortBy: v.optional(
					v.picklist(["occurredOn", "createdAt"]),
					"occurredOn",
				),
				sortOrder: v.optional(v.picklist(["desc", "asc"]), "desc"),
			}),
		),
		async (c) => {
			const user = c.get("user");
			const db = drizzle(c.env.DB);

			const partnerUserId = await getPartnerUserId(db, user.id);
			if (!partnerUserId) {
				return c.json({ error: "パートナーが見つかりません" }, 404);
			}

			const { cursor, category, sortBy, sortOrder } = c.req.valid("query");

			try {
				const result = await listByUserPaginated(db, partnerUserId, {
					cursor,
					category,
					sortBy,
					sortOrder,
				});
				return c.json(result);
			} catch (e) {
				if (e instanceof InvalidCursorError) {
					return c.json({ error: e.message }, 400);
				}
				throw e;
			}
		},
	);

export { partnerApp };
