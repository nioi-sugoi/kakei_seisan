import { vValidator } from "@hono/valibot-validator";
import { and, eq, sql, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { entryVersions, settlementVersions } from "../../db/schema";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../types";
import { findPartnerByUser } from "../partner/repository";

const balanceApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>().get(
	"/",
	requireAuth,
	vValidator(
		"query",
		v.object({
			userId: v.optional(v.string()),
		}),
	),
	async (c) => {
		const user = c.get("user");
		const { userId: targetUserId } = c.req.valid("query");
		const db = drizzle(c.env.DB);

		// パートナーの残高を取得する場合は認可チェック
		let effectiveUserId = user.id;
		if (targetUserId && targetUserId !== user.id) {
			const partnership = await findPartnerByUser(db, user.id);
			if (!partnership) {
				return c.json({ error: "パートナーが見つかりません" }, 403);
			}
			const partnerId =
				partnership.inviterId === user.id
					? partnership.inviteeId
					: partnership.inviterId;
			if (partnerId !== targetUserId) {
				return c.json({ error: "パートナーが見つかりません" }, 403);
			}
			effectiveUserId = targetUserId;
		}

		const [entryResult, settlementResult] = await Promise.all([
			db
				.select({
					advanceTotal: sum(
						sql`CASE WHEN ${entryVersions.category} = 'advance' THEN ${entryVersions.amount} ELSE 0 END`,
					),
					depositTotal: sum(
						sql`CASE WHEN ${entryVersions.category} = 'deposit' THEN ${entryVersions.amount} ELSE 0 END`,
					),
				})
				.from(entryVersions)
				.where(
					and(
						eq(entryVersions.userId, effectiveUserId),
						eq(entryVersions.latest, true),
						eq(entryVersions.cancelled, false),
					),
				)
				.get(),
			db
				.select({
					fromHouseholdTotal: sum(
						sql`CASE WHEN ${settlementVersions.category} = 'fromHousehold' THEN ${settlementVersions.amount} ELSE 0 END`,
					),
					fromUserTotal: sum(
						sql`CASE WHEN ${settlementVersions.category} = 'fromUser' THEN ${settlementVersions.amount} ELSE 0 END`,
					),
				})
				.from(settlementVersions)
				.where(
					and(
						eq(settlementVersions.userId, effectiveUserId),
						eq(settlementVersions.latest, true),
						eq(settlementVersions.cancelled, false),
					),
				)
				.get(),
		]);

		const advanceTotal = Number(entryResult?.advanceTotal ?? 0);
		const depositTotal = Number(entryResult?.depositTotal ?? 0);
		const fromHouseholdTotal = Number(
			settlementResult?.fromHouseholdTotal ?? 0,
		);
		const fromUserTotal = Number(settlementResult?.fromUserTotal ?? 0);
		const balance =
			advanceTotal - depositTotal - fromHouseholdTotal + fromUserTotal;

		return c.json({
			advanceTotal,
			depositTotal,
			fromHouseholdTotal,
			fromUserTotal,
			balance,
		});
	},
);

export { balanceApp };
