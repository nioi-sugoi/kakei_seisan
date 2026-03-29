import { env } from "cloudflare:test";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { entryVersions, settlementVersions } from "../../../db/schema";
import { client } from "../../../testing/app-helper";
import {
	authCookie,
	buildOtherUserAuthCookie,
	OTHER_USER,
	seedOtherUser,
	setupAuth,
} from "../../../testing/auth-helper";
import { setupDB } from "../../../testing/db-helper";

export {
	authCookie,
	buildOtherUserAuthCookie,
	client,
	OTHER_USER,
	seedOtherUser,
	setupAuth,
	setupDB,
};

export async function insertSettlement(
	userId: string,
	overrides?: Partial<typeof settlementVersions.$inferInsert>,
) {
	const db = drizzle(env.DB);
	const id = crypto.randomUUID();
	const [settlement] = await db
		.insert(settlementVersions)
		.values({
			id,
			userId,
			category: "fromHousehold",
			amount: 5000,
			occurredOn: "2024-03-15",
			originalId: id,
			createdAt: Date.now(),
			...overrides,
		})
		.returning();
	return settlement;
}

export function queryVersionsByOriginalId(originalId: string) {
	const db = drizzle(env.DB);
	return db
		.select()
		.from(settlementVersions)
		.where(eq(settlementVersions.originalId, originalId))
		.orderBy(desc(settlementVersions.createdAt))
		.all();
}

export async function insertEntry(
	userId: string,
	overrides?: Partial<typeof entryVersions.$inferInsert>,
) {
	const db = drizzle(env.DB);
	const id = crypto.randomUUID();
	const [entry] = await db
		.insert(entryVersions)
		.values({
			id,
			userId,
			category: "advance",
			amount: 1500,
			occurredOn: "2024-03-15",
			label: "食費",
			originalId: id,
			...overrides,
		})
		.returning();
	return entry;
}
