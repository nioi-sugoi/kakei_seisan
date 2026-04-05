interface EntryTotals {
	advanceTotal: number;
	depositTotal: number;
}

interface SettlementTotals {
	fromHouseholdTotal: number;
	fromUserTotal: number;
}

export function calculateBalance(
	entryResult: EntryTotals,
	settlementResult: SettlementTotals,
) {
	const balance =
		entryResult.advanceTotal -
		entryResult.depositTotal -
		settlementResult.fromHouseholdTotal +
		settlementResult.fromUserTotal;

	return {
		...entryResult,
		...settlementResult,
		balance,
	};
}
