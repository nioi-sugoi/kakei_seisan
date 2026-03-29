import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import {
	entryImageVersions,
	entryVersions,
	partnerships,
	settlementImageVersions,
	settlementVersions,
} from "../../../db/schema";
import { client } from "../../../testing/app-helper";
import {
	authCookie,
	buildOtherUserAuthCookie,
	OTHER_USER,
	seedOtherUser,
	seedThirdUser,
	setupAuth,
	THIRD_USER,
} from "../../../testing/auth-helper";
import { setupDB } from "../../../testing/db-helper";

export {
	authCookie,
	buildOtherUserAuthCookie,
	client,
	OTHER_USER,
	seedOtherUser,
	seedThirdUser,
	setupAuth,
	setupDB,
	THIRD_USER,
};

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

export async function insertEntryImage(entryId: string) {
	const db = drizzle(env.DB);
	const id = crypto.randomUUID();
	const [image] = await db
		.insert(entryImageVersions)
		.values({
			id,
			entryVersionId: entryId,
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
		.insert(settlementImageVersions)
		.values({
			id,
			settlementVersionId: settlementId,
			storagePath: `receipts/test/${settlementId}/${id}.jpg`,
			createdAt: Date.now(),
		})
		.returning();
	return image;
}

export async function insertPartnership(inviterId: string, inviteeId: string) {
	const db = drizzle(env.DB);
	const [partnership] = await db
		.insert(partnerships)
		.values({
			id: crypto.randomUUID(),
			inviterId,
			inviteeId,
			createdAt: Date.now(),
		})
		.returning();
	return partnership;
}
