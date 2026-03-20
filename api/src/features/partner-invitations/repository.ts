import { and, eq, gt, or } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { partnerInvitations, partnerships, user } from "../../db/schema";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

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
			expiresAt: now + TWENTY_FOUR_HOURS_MS,
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

export function updateStatus(
	db: DrizzleD1Database,
	id: string,
	status: "accepted" | "expired",
) {
	return db
		.update(partnerInvitations)
		.set({ status })
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
