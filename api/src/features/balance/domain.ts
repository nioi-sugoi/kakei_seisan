export function calculateBalance(
	advanceTotal: number,
	depositTotal: number,
	fromHouseholdTotal: number,
	fromUserTotal: number,
) {
	return advanceTotal - depositTotal - fromHouseholdTotal + fromUserTotal;
}
