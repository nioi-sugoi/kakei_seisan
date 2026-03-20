import { applyD1Migrations, env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { testClient } from "hono/testing";
import {
	partnerInvitations,
	partnerships,
	session,
	user,
} from "../../../db/schema";
import type { AppType } from "../../../index";
import app from "../../../index";
import { buildAuthCookie } from "../../../testing/auth-helper";

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

export const THIRD_USER = {
	id: "third-user-id",
	name: "Third User",
	email: "third@example.com",
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

export async function seedThirdUser() {
	const db = drizzle(env.DB);
	await db.insert(user).values({
		id: THIRD_USER.id,
		name: THIRD_USER.name,
		email: THIRD_USER.email,
		emailVerified: true,
	});
}

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
			expiresAt: now + 24 * 60 * 60 * 1000,
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
	const { serializeSigned } = await import("hono/utils/cookie");
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
