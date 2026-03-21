import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { partnerInvitations, partnerships } from "../../../db/schema";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertInvitation,
	insertPartnership,
	OTHER_USER,
	seedOtherUser,
	seedThirdUser,
	setupAuth,
	THIRD_USER,
} from "./helpers";

beforeAll(async () => {
	await setupAuth();
});

describe("POST /api/partner-invitations/:id/accept", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await seedOtherUser();
	});

	it("招待を承認してパートナー関係が作成される", async () => {
		const invitation = await insertInvitation(OTHER_USER.id, TEST_USER.email);

		const res = await client.api["partner-invitations"][":id"].accept.$post(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			inviterId: OTHER_USER.id,
			inviteeId: TEST_USER.id,
		});
		expect(body).toHaveProperty("id", expect.any(String));
	});

	it("承認後に招待のステータスが accepted になる", async () => {
		const invitation = await insertInvitation(OTHER_USER.id, TEST_USER.email);

		await client.api["partner-invitations"][":id"].accept.$post(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		const db = drizzle(env.DB);
		const updated = await db
			.select()
			.from(partnerInvitations)
			.where(eq(partnerInvitations.id, invitation.id))
			.get();
		expect(updated?.status).toBe("accepted");
	});

	it("承認後にパートナー関係がDBに保存される", async () => {
		const invitation = await insertInvitation(OTHER_USER.id, TEST_USER.email);

		await client.api["partner-invitations"][":id"].accept.$post(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		const db = drizzle(env.DB);
		const result = await db.select().from(partnerships).all();
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			inviterId: OTHER_USER.id,
			inviteeId: TEST_USER.id,
		});
	});

	it("存在しない招待IDの場合 404 を返す", async () => {
		const res = await client.api["partner-invitations"][":id"].accept.$post(
			{ param: { id: "non-existent-id" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error", "招待が見つかりません");
	});

	it("他のユーザー宛の招待を承認しようとすると 404 を返す", async () => {
		const invitation = await insertInvitation(
			OTHER_USER.id,
			"someone-else@example.com",
		);

		const res = await client.api["partner-invitations"][":id"].accept.$post(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("既に accepted の招待を再度承認しようとすると 409 を返す", async () => {
		const invitation = await insertInvitation(OTHER_USER.id, TEST_USER.email, {
			status: "accepted",
		});

		const res = await client.api["partner-invitations"][":id"].accept.$post(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body).toHaveProperty("error", "この招待は既に処理されています");
	});

	it("有効期限切れの招待を承認しようとすると 410 を返す", async () => {
		const invitation = await insertInvitation(OTHER_USER.id, TEST_USER.email, {
			expiresAt: Date.now() - 1000,
		});

		const res = await client.api["partner-invitations"][":id"].accept.$post(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(410);
		const body = await res.json();
		expect(body).toHaveProperty("error", "招待の有効期限が切れています");
	});

	it("承認者が既にパートナーを持っている場合 409 を返す", async () => {
		await seedThirdUser();
		await insertPartnership(TEST_USER.id, THIRD_USER.id);

		const invitation = await insertInvitation(OTHER_USER.id, TEST_USER.email);

		const res = await client.api["partner-invitations"][":id"].accept.$post(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body).toHaveProperty("error", "すでにパートナーが登録されています");
	});

	it("招待者が既に別のパートナーを持っている場合 409 を返す", async () => {
		await seedThirdUser();
		await insertPartnership(OTHER_USER.id, THIRD_USER.id);

		const invitation = await insertInvitation(OTHER_USER.id, TEST_USER.email);

		const res = await client.api["partner-invitations"][":id"].accept.$post(
			{ param: { id: invitation.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body).toHaveProperty(
			"error",
			"招待者は既に別のパートナーが登録されています",
		);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const invitation = await insertInvitation(OTHER_USER.id, TEST_USER.email);

		const res = await client.api["partner-invitations"][":id"].accept.$post({
			param: { id: invitation.id },
		});

		expect(res.status).toBe(401);
	});
});
