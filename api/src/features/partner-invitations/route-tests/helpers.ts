import { applyD1Migrations, env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { testClient } from "hono/testing";
import { serializeSigned } from "hono/utils/cookie";
import { partnerInvitations, partnerships, session } from "../../../db/schema";
import type { AppType } from "../../../index";
import app from "../../../index";
import {
	buildAuthCookie,
	OTHER_USER,
	seedUser,
	THIRD_USER,
} from "../../../testing/auth-helper";

// app と routes は同一の実行時オブジェクト。型情報のために AppType へキャスト
// (Hono の export default app は basePath 以降のルート型を含まないため)
export const client = testClient(app as unknown as AppType, env);

export let authCookie: string;

export async function setupAuth() {
	await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
	authCookie = await buildAuthCookie();
}

export { OTHER_USER, THIRD_USER };

export async function seedOtherUser() {
	await seedUser(OTHER_USER);
}

export async function seedThirdUser() {
	await seedUser(THIRD_USER);
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function insertInvitation(
	inviterId: string,
	inviteeEmail: string,
	overrides?: Partial<typeof partnerInvitations.$inferInsert>,
) {
	const db = drizzle(env.DB);
	const now = Date.now();
	const [invitation] = await db
		.insert(partnerInvitations)
		.values({
			id: crypto.randomUUID(),
			inviterId,
			inviteeEmail,
			status: "pending",
			expiresAt: now + TWENTY_FOUR_HOURS_MS,
			createdAt: now,
			...overrides,
		})
		.returning();
	return invitation;
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
