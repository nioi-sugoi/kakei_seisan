import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { entries } from "../../../db/schema";
import { client } from "../../../testing/app-helper";
import {
	OTHER_USER,
	authCookie,
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
	const [entry] = await db
		.insert(entries)
		.values({
			userId,
			category: "advance",
			amount: 1500,
			date: "2024-03-15",
			label: "食費",
			...overrides,
		})
		.returning();
	return entry;
}
