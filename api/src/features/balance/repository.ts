import { and, eq, sql, sum } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { entryVersions, settlementVersions } from "../../db/schema";

export async function getEntryTotals(db: DrizzleD1Database, userId: string) {
	const result = await db
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
		.get();

	return {
		advanceTotal: Number(result?.advanceTotal ?? 0),
		depositTotal: Number(result?.depositTotal ?? 0),
	};
}

export async function getSettlementTotals(
	db: DrizzleD1Database,
	userId: string,
) {
	const result = await db
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
		.get();

	return {
		fromHouseholdTotal: Number(result?.fromHouseholdTotal ?? 0),
		fromUserTotal: Number(result?.fromUserTotal ?? 0),
	};
}
