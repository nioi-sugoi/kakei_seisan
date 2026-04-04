import { and, eq, sql, sum } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { entryVersions, settlementVersions } from "../../db/schema";

export async function computeBalance(db: DrizzleD1Database, userId: string) {
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
					eq(entryVersions.userId, userId),
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
					eq(settlementVersions.userId, userId),
					eq(settlementVersions.latest, true),
					eq(settlementVersions.cancelled, false),
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

	return {
		advanceTotal,
		depositTotal,
		fromHouseholdTotal,
		fromUserTotal,
		balance,
	};
}
