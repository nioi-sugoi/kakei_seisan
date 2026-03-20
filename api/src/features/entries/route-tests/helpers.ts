import { applyD1Migrations, env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { testClient } from "hono/testing";
import { entries } from "../../../db/schema";
import type { AppType } from "../../../index";
import app from "../../../index";
import {
	buildAuthCookie,
	OTHER_USER,
	seedUser,
} from "../../../testing/auth-helper";

// app と routes は同一の実行時オブジェクト。型情報のために AppType へキャスト
// (Hono の export default app は basePath 以降のルート型を含まないため)
export const client = testClient(app as unknown as AppType, env);

export let authCookie: string;

export async function setupAuth() {
	await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
	authCookie = await buildAuthCookie();
}

export { OTHER_USER };

export async function seedOtherUser() {
	await seedUser(OTHER_USER);
}

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
