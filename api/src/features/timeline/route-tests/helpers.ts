import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import {
	entries,
	entryImages,
	settlementImages,
	settlements,
} from "../../../db/schema";
import { client } from "../../../testing/app-helper";
import {
	authCookie,
	OTHER_USER,
	seedOtherUser,
	setupAuth,
} from "../../../testing/auth-helper";
import { setupDB } from "../../../testing/db-helper";

export { authCookie, client, OTHER_USER, seedOtherUser, setupAuth, setupDB };

export async function insertEntry(
	userId: string,
	overrides?: Partial<typeof entries.$inferInsert>,
) {
	const db = drizzle(env.DB);
	const id = crypto.randomUUID();
	const [entry] = await db
		.insert(entries)
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

export async function insertSettlement(
	userId: string,
	overrides?: Partial<typeof settlements.$inferInsert>,
) {
	const db = drizzle(env.DB);
	const id = crypto.randomUUID();
	const [settlement] = await db
		.insert(settlements)
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

export async function insertEntryImage(entryId: string) {
	const db = drizzle(env.DB);
	const id = crypto.randomUUID();
	const [image] = await db
		.insert(entryImages)
		.values({
			id,
			entryId,
			storagePath: `receipts/test/${entryId}/${id}.jpg`,
			createdAt: Date.now(),
		})
		.returning();
	return image;
}

export async function insertSettlementImage(settlementId: string) {
	const db = drizzle(env.DB);
	const id = crypto.randomUUID();
	const [image] = await db
		.insert(settlementImages)
		.values({
			id,
			settlementId,
			storagePath: `receipts/test/${settlementId}/${id}.jpg`,
			createdAt: Date.now(),
		})
		.returning();
	return image;
}
