import { env } from "cloudflare:test";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { entries } from "../../../db/schema";
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

/** originalId でグルーピングした全バージョンをDB直接取得（createdAt降順） */
export function queryVersionsByOriginalId(originalId: string) {
	const db = drizzle(env.DB);
	return db
		.select()
		.from(entries)
		.where(eq(entries.originalId, originalId))
		.orderBy(desc(entries.createdAt))
		.all();
}
