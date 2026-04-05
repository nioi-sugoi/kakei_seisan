import type { DrizzleD1Database } from "drizzle-orm/d1";
import { calculateBalance } from "./domain";
import { getEntryTotals, getSettlementTotals } from "./repository";

export async function computeBalance(db: DrizzleD1Database, userId: string) {
	const [entryResult, settlementResult] = await Promise.all([
		getEntryTotals(db, userId),
		getSettlementTotals(db, userId),
	]);

	return calculateBalance(entryResult, settlementResult);
}
