import type { DrizzleD1Database } from "drizzle-orm/d1";
import { calculateBalance } from "./domain";
import { getEntryTotals, getSettlementTotals } from "./repository";

export async function computeBalance(db: DrizzleD1Database, userId: string) {
	const [entryResult, settlementResult] = await Promise.all([
		getEntryTotals(db, userId),
		getSettlementTotals(db, userId),
	]);

	return calculateBalance(
		{
			advanceTotal: Number(entryResult?.advanceTotal ?? 0),
			depositTotal: Number(entryResult?.depositTotal ?? 0),
		},
		{
			fromHouseholdTotal: Number(settlementResult?.fromHouseholdTotal ?? 0),
			fromUserTotal: Number(settlementResult?.fromUserTotal ?? 0),
		},
	);
}
