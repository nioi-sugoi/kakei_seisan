import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../types";
import { calculateBalance } from "./domain";
import { getEntryTotals, getSettlementTotals } from "./repository";

const balanceApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>().get("/", requireAuth, async (c) => {
	const user = c.get("user");
	const db = drizzle(c.env.DB);

	const [entryResult, settlementResult] = await Promise.all([
		getEntryTotals(db, user.id),
		getSettlementTotals(db, user.id),
	]);

	const advanceTotal = Number(entryResult?.advanceTotal ?? 0);
	const depositTotal = Number(entryResult?.depositTotal ?? 0);
	const fromHouseholdTotal = Number(settlementResult?.fromHouseholdTotal ?? 0);
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
});

export { balanceApp };
