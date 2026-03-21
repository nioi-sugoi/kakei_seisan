import { and, eq, gt, or, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { partnerInvitations, partnerships, user } from "../../db/schema";

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

// ── partner_invitations ─────────────────────────────────────────

export function createInvitation(
	db: DrizzleD1Database,
	inviterId: string,
	inviteeEmail: string,
) {
	const now = Date.now();
	return db
		.insert(partnerInvitations)
		.values({
			id: crypto.randomUUID(),
			inviterId,
			inviteeEmail,
			status: "pending",
			expiresAt: now + FORTY_EIGHT_HOURS_MS,
			createdAt: now,
		})
		.returning()
		.get();
}

export function findPendingByEmail(
	db: DrizzleD1Database,
	email: string,
	now: number,
) {
	return db
		.select({
			id: partnerInvitations.id,
			inviterId: partnerInvitations.inviterId,
			inviteeEmail: partnerInvitations.inviteeEmail,
			status: partnerInvitations.status,
			expiresAt: partnerInvitations.expiresAt,
			createdAt: partnerInvitations.createdAt,
			inviterName: user.name,
			inviterEmail: user.email,
		})
		.from(partnerInvitations)
		.innerJoin(user, eq(partnerInvitations.inviterId, user.id))
		.where(
			and(
				eq(partnerInvitations.inviteeEmail, email),
				eq(partnerInvitations.status, "pending"),
				gt(partnerInvitations.expiresAt, now),
			),
		)
		.all();
}

export function findById(db: DrizzleD1Database, id: string) {
	return db
		.select()
		.from(partnerInvitations)
		.where(eq(partnerInvitations.id, id))
		.get();
}

export function findPendingByInviter(
	db: DrizzleD1Database,
	inviterId: string,
	now: number,
) {
	return db
		.select()
		.from(partnerInvitations)
		.where(
			and(
				eq(partnerInvitations.inviterId, inviterId),
				eq(partnerInvitations.status, "pending"),
				gt(partnerInvitations.expiresAt, now),
			),
		)
		.get();
}

export function findAllByInviter(db: DrizzleD1Database, inviterId: string) {
	return db
		.select()
		.from(partnerInvitations)
		.where(eq(partnerInvitations.inviterId, inviterId))
		.orderBy(sql`${partnerInvitations.createdAt} desc`)
		.all();
}

export function findUserByEmail(db: DrizzleD1Database, email: string) {
	return db.select().from(user).where(eq(user.email, email)).get();
}

export function cancelInvitation(db: DrizzleD1Database, id: string) {
	return db
		.update(partnerInvitations)
		.set({ status: "cancelled" })
		.where(eq(partnerInvitations.id, id))
		.returning()
		.get();
}

// ── partnerships ────────────────────────────────────────────────

export function findPartnershipByUser(db: DrizzleD1Database, userId: string) {
	return db
		.select()
		.from(partnerships)
		.where(
			or(
				eq(partnerships.inviterId, userId),
				eq(partnerships.inviteeId, userId),
			),
		)
		.get();
}

/**
 * パートナー関係をパートナーのユーザー情報付きで返す。
 * userId が inviter なら invitee の情報を、invitee なら inviter の情報を返す。
 */
export async function findPartnershipWithPartnerInfo(
	db: DrizzleD1Database,
	userId: string,
) {
	// inviter として参加しているケース
	const asInviter = await db
		.select({
			id: partnerships.id,
			role: sql<"inviter">`'inviter'`.as("role"),
			partnerName: user.name,
			partnerEmail: user.email,
			createdAt: partnerships.createdAt,
		})
		.from(partnerships)
		.innerJoin(user, eq(partnerships.inviteeId, user.id))
		.where(eq(partnerships.inviterId, userId))
		.get();

	if (asInviter) return asInviter;

	// invitee として参加しているケース
	return db
		.select({
			id: partnerships.id,
			role: sql<"invitee">`'invitee'`.as("role"),
			partnerName: user.name,
			partnerEmail: user.email,
			createdAt: partnerships.createdAt,
		})
		.from(partnerships)
		.innerJoin(user, eq(partnerships.inviterId, user.id))
		.where(eq(partnerships.inviteeId, userId))
		.get();
}

/**
 * 招待を accepted に更新し、パートナー関係を作成する。
 * D1 の batch API でアトミックに実行される。
 */
export async function acceptInvitationAndCreatePartnership(
	db: DrizzleD1Database,
	invitationId: string,
	inviterId: string,
	inviteeId: string,
) {
	const now = Date.now();
	const partnershipId = crypto.randomUUID();

	const [, partnershipRows] = await db.batch([
		db
			.update(partnerInvitations)
			.set({ status: "accepted" })
			.where(eq(partnerInvitations.id, invitationId)),
		db
			.insert(partnerships)
			.values({
				id: partnershipId,
				inviterId,
				inviteeId,
				createdAt: now,
			})
			.returning(),
	]);

	return partnershipRows[0];
}
