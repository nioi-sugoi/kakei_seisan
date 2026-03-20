import { applyD1Migrations, env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { testClient } from "hono/testing";
import { beforeAll } from "vitest";
import { entries, user } from "../../db/schema";
import type { AppType } from "../../index";
import app from "../../index";
import { buildAuthCookie } from "../../testing/auth-helper";

// app と routes は同一の実行時オブジェクト。型情報のために AppType へキャスト
// (Hono の export default app は basePath 以降のルート型を含まないため)
export const client = testClient(app as unknown as AppType, env);

export let authCookie: string;

beforeAll(async () => {
	await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
	authCookie = await buildAuthCookie();
});

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
