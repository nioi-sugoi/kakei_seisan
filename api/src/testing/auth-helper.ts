import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { serializeSigned } from "hono/utils/cookie";
import { session, user } from "../db/schema";

export const TEST_USER = {
	id: "test-user-id",
	name: "Test User",
	email: "test@example.com",
} as const;

export const OTHER_USER = {
	id: "other-user-id",
	name: "Other User",
	email: "other@example.com",
} as const;

export const THIRD_USER = {
	id: "third-user-id",
	name: "Third User",
	email: "third@example.com",
} as const;

type TestUserData = { id: string; name: string; email: string };

const SESSION_TOKEN = "test-session-token";

/**
 * テスト用ユーザーとセッションを DB にシードする。
 * beforeEach で cleanAllTables() のあとに呼び出す想定。
 */
export async function seedTestUser() {
	const db = drizzle(env.DB);
	await db.insert(user).values({
		id: TEST_USER.id,
		name: TEST_USER.name,
		email: TEST_USER.email,
		emailVerified: true,
	});
	await db.insert(session).values({
		id: "test-session-id",
		expiresAt: new Date(Date.now() + 86_400_000),
		token: SESSION_TOKEN,
		updatedAt: new Date(),
		userId: TEST_USER.id,
	});
}

/**
 * 任意のテストユーザーを DB にシードする。
 */
export async function seedUser(data: TestUserData) {
	const db = drizzle(env.DB);
	await db.insert(user).values({
		id: data.id,
		name: data.name,
		email: data.email,
		emailVerified: true,
	});
}

/**
 * Better Auth の署名付きクッキー (HMAC-SHA256) を生成し、
 * Cookie ヘッダとして使える `name=signedValue` 形式の文字列を返す。
 */
export async function buildAuthCookie(): Promise<string> {
	const setCookie = await serializeSigned(
		"better-auth.session_token",
		SESSION_TOKEN,
		env.BETTER_AUTH_SECRET,
	);
	return setCookie.split(";")[0];
}

export let authCookie: string;

/**
 * 認証クッキーを生成してモジュール変数にセットする。
 * beforeAll で setupDB() の後に呼び出す。
 */
export async function setupAuth() {
	authCookie = await buildAuthCookie();
}

export async function seedOtherUser() {
	await seedUser(OTHER_USER);
}

export async function seedThirdUser() {
	await seedUser(THIRD_USER);
}

/**
 * OTHER_USER としてログインするための認証クッキーを作成する。
 * OTHER_USER 用のセッションをDBに挿入して署名付きクッキーを返す。
 */
export async function buildOtherUserAuthCookie(): Promise<string> {
	const db = drizzle(env.DB);
	const token = "other-user-session-token";
	await db.insert(session).values({
		id: "other-user-session-id",
		expiresAt: new Date(Date.now() + 86_400_000),
		token,
		updatedAt: new Date(),
		userId: OTHER_USER.id,
	});
	const setCookie = await serializeSigned(
		"better-auth.session_token",
		token,
		env.BETTER_AUTH_SECRET,
	);
	return setCookie.split(";")[0];
}
