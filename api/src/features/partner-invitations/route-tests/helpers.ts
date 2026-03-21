import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { partnerInvitations } from "../../../db/schema";
import { authCookie, client, setupAuth } from "../../../testing/app-helper";
import {
	OTHER_USER,
	THIRD_USER,
	buildOtherUserAuthCookie,
	seedOtherUser,
	seedThirdUser,
} from "../../../testing/auth-helper";
import { insertPartnership } from "../../../testing/db-helper";

export {
	authCookie,
	buildOtherUserAuthCookie,
	client,
	insertPartnership,
	OTHER_USER,
	seedOtherUser,
	seedThirdUser,
	setupAuth,
	THIRD_USER,
};

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

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
			expiresAt: now + FORTY_EIGHT_HOURS_MS,
			createdAt: now,
			...overrides,
		})
		.returning();
	return invitation;
}
