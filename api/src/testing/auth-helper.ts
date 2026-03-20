import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { serializeSigned } from "hono/utils/cookie";
import { session, user } from "../db/schema";

export const TEST_USER = {
	id: "test-user-id",
	name: "Test User",
	email: "test@example.com",
} as const;

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
