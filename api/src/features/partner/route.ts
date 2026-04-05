import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../types";
import { calculateBalance } from "../balance/domain";
import { getEntryTotals, getSettlementTotals } from "../balance/repository";
import { parseCursor } from "../timeline/parse-cursor";
import type { CursorValue } from "../timeline/repository";
import * as timelineRepository from "../timeline/repository";
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

		const [entryResult, settlementResult] = await Promise.all([
			getEntryTotals(db, partnerUserId),
			getSettlementTotals(db, partnerUserId),
		]);

		const advanceTotal = Number(entryResult?.advanceTotal ?? 0);
		const depositTotal = Number(entryResult?.depositTotal ?? 0);
		const fromHouseholdTotal = Number(
			settlementResult?.fromHouseholdTotal ?? 0,
		);
		const fromUserTotal = Number(settlementResult?.fromUserTotal ?? 0);
		const balance = calculateBalance(
			advanceTotal,
			depositTotal,
			fromHouseholdTotal,
			fromUserTotal,
		);

		return c.json({
			advanceTotal,
			depositTotal,
			fromHouseholdTotal,
			fromUserTotal,
			balance,
		});
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

			const {
				cursor: cursorParam,
				category,
				sortBy,
				sortOrder,
			} = c.req.valid("query");
			const limit = 50;

			let cursor: CursorValue | undefined;
			if (cursorParam) {
				const parsed = parseCursor(cursorParam, sortBy);
				if (!parsed) {
					return c.json({ error: "Invalid cursor" }, 400);
				}
				cursor = parsed;
			}

			const rows = await timelineRepository.listByUser(db, partnerUserId, {
				limit: limit + 1,
				cursor,
				category,
				sortBy,
				sortOrder,
			});

			const hasMore = rows.length > limit;
			const data = hasMore ? rows.slice(0, limit) : rows;

			let nextCursor: string | null = null;
			if (hasMore) {
				const lastItem = data[data.length - 1];
				nextCursor =
					sortBy === "createdAt"
						? String(lastItem.createdAt)
						: `${lastItem.occurredOn},${lastItem.createdAt}`;
			}

			return c.json({ data, nextCursor });
		},
	);

export { partnerApp };
