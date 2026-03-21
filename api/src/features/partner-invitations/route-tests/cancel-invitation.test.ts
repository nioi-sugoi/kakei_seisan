import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { partnerInvitations } from "../../../db/schema";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertInvitation,
	OTHER_USER,
	seedOtherUser,
	setupAuth,
	setupDB,
} from "./helpers";

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

describe("DELETE /api/partner-invitations/:id", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("送信した招待を解除できる", async () => {
		const invitation = await insertInvitation(
			TEST_USER.id,
			"partner@example.com",
		);

		const res = await client.api["partner-invitations"][":id"].$delete(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({
			id: invitation.id,
			status: "cancelled",
		});
	});

	it("解除後に招待のステータスが cancelled になる", async () => {
		const invitation = await insertInvitation(
			TEST_USER.id,
			"partner@example.com",
		);

		await client.api["partner-invitations"][":id"].$delete(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		const db = drizzle(env.DB);
		const updated = await db
			.select()
			.from(partnerInvitations)
			.where(eq(partnerInvitations.id, invitation.id))
			.get();
		expect(updated?.status).toBe("cancelled");
	});

	it("存在しない招待IDの場合 404 を返す", async () => {
		const res = await client.api["partner-invitations"][":id"].$delete(
			{ param: { id: "non-existent-id" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error", "招待が見つかりません");
	});

	it("他のユーザーが送信した招待を解除しようとすると 404 を返す", async () => {
		await seedOtherUser();
		const invitation = await insertInvitation(
			OTHER_USER.id,
			"someone@example.com",
		);

		const res = await client.api["partner-invitations"][":id"].$delete(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error", "招待が見つかりません");
	});

	it("既に accepted の招待を解除しようとすると 409 を返す", async () => {
		const invitation = await insertInvitation(
			TEST_USER.id,
			"partner@example.com",
			{ status: "accepted" },
		);

		const res = await client.api["partner-invitations"][":id"].$delete(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body).toHaveProperty("error", "この招待は既に処理されています");
	});

	it("招待を解除した後に新しい招待を送信できる", async () => {
		const invitation = await insertInvitation(
			TEST_USER.id,
			"first@example.com",
		);

		await client.api["partner-invitations"][":id"].$delete(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api["partner-invitations"].$post(
			{ json: { inviteeEmail: "second@example.com" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
	});

	it("有効期限切れの招待も解除できる", async () => {
		const invitation = await insertInvitation(
			TEST_USER.id,
			"partner@example.com",
			{ expiresAt: Date.now() - 1000 },
		);

		const res = await client.api["partner-invitations"][":id"].$delete(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({
			id: invitation.id,
			status: "cancelled",
		});
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const invitation = await insertInvitation(
			TEST_USER.id,
			"partner@example.com",
		);

		const res = await client.api["partner-invitations"][":id"].$delete({
			param: { id: invitation.id },
		});

		expect(res.status).toBe(401);
	});
});
