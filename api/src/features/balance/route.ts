import { and, eq, sql, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import type { Env } from "../../bindings";
import { entries, settlements } from "../../db/schema";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../types";

const balanceApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>().get("/", requireAuth, async (c) => {
	const user = c.get("user");
	const db = drizzle(c.env.DB);

	const [entryResult, settlementResult] = await Promise.all([
		db
			.select({
				advanceTotal: sum(
					sql`CASE WHEN ${entries.category} = 'advance' THEN ${entries.amount} ELSE 0 END`,
				),
				depositTotal: sum(
					sql`CASE WHEN ${entries.category} = 'deposit' THEN ${entries.amount} ELSE 0 END`,
				),
			})
			.from(entries)
			.where(
				and(
					eq(entries.userId, user.id),
					eq(entries.latest, true),
					eq(entries.cancelled, false),
				),
			)
			.get(),
		db
			.select({
				fromHouseholdTotal: sum(
					sql`CASE WHEN ${settlements.category} = 'fromHousehold' THEN ${settlements.amount} ELSE 0 END`,
				),
				fromUserTotal: sum(
					sql`CASE WHEN ${settlements.category} = 'fromUser' THEN ${settlements.amount} ELSE 0 END`,
				),
			})
			.from(settlements)
			.where(
				and(
					eq(settlements.userId, user.id),
					eq(settlements.latest, true),
					eq(settlements.cancelled, false),
				),
			)
			.get(),
	]);

	const advanceTotal = Number(entryResult?.advanceTotal ?? 0);
	const depositTotal = Number(entryResult?.depositTotal ?? 0);
	const fromHouseholdTotal = Number(settlementResult?.fromHouseholdTotal ?? 0);
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
});

export { balanceApp };
