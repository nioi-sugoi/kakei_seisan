import { eq, or, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { partnerships, user } from "../../db/schema";

/**
 * パートナー関係をパートナーのユーザー情報付きで返す。
 * userId が inviter なら invitee の情報を、invitee なら inviter の情報を返す。
 */
export async function findPartner(db: DrizzleD1Database, userId: string) {
	// inviter として参加しているケース
	const asInviter = await db
		.select({
			id: partnerships.id,
			role: sql<"inviter">`'inviter'`.as("role"),
			partnerId: user.id,
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
			partnerId: user.id,
			partnerName: user.name,
			partnerEmail: user.email,
			createdAt: partnerships.createdAt,
		})
		.from(partnerships)
		.innerJoin(user, eq(partnerships.inviterId, user.id))
		.where(eq(partnerships.inviteeId, userId))
		.get();
}

export function findPartnerByUser(db: DrizzleD1Database, userId: string) {
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
 * targetUserId がリクエストユーザーのパートナーかどうかを検証し、
 * 実際にクエリすべき userId を返す。
 * - targetUserId が未指定または自分自身なら自分の userId を返す
 * - パートナーなら targetUserId を返す
 * - 非パートナーなら null を返す（403 相当）
 */
export async function resolvePartnerUserId(
	db: DrizzleD1Database,
	currentUserId: string,
	targetUserId: string | undefined,
): Promise<string | null> {
	if (!targetUserId || targetUserId === currentUserId) {
		return currentUserId;
	}
	const partner = await findPartner(db, currentUserId);
	if (!partner || partner.partnerId !== targetUserId) {
		return null;
	}
	return targetUserId;
}
