interface EntryTotals {
	advanceTotal: string | null;
	depositTotal: string | null;
}

interface SettlementTotals {
	fromHouseholdTotal: string | null;
	fromUserTotal: string | null;
}

export function calculateBalance(
	entryResult: EntryTotals | undefined,
	settlementResult: SettlementTotals | undefined,
) {
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
