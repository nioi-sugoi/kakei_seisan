import { applyD1Migrations, env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { testClient } from "hono/testing";
import { entries, user } from "../../../db/schema";
import type { AppType } from "../../../index";
import app from "../../../index";
import { buildAuthCookie } from "../../../testing/auth-helper";

// app と routes は同一の実行時オブジェクト。型情報のために AppType へキャスト
// (Hono の export default app は basePath 以降のルート型を含まないため)
export const client = testClient(app as unknown as AppType, env);

export let authCookie: string;

export async function setupAuth() {
	await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
	authCookie = await buildAuthCookie();
}

export const OTHER_USER = {
	id: "other-user-id",
	name: "Other User",
	email: "other@example.com",
} as const;

export async function seedOtherUser() {
	const db = drizzle(env.DB);
	await db.insert(user).values({
		id: OTHER_USER.id,
		name: OTHER_USER.name,
		email: OTHER_USER.email,
		emailVerified: true,
	});
}

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
			date: "2024-03-15",
			label: "食費",
			originalId: id,
			...overrides,
		})
		.returning();
	return entry;
}
