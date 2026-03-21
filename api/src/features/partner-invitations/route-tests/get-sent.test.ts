import { beforeAll, beforeEach, describe, expect, it } from "vitest";
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

describe("GET /api/partner-invitations/sent", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("自分が送った招待を全件取得できる", async () => {
		await insertInvitation(TEST_USER.id, "partner@example.com");

		const res = await client.api["partner-invitations"].sent.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0]).toMatchObject({
			inviterId: TEST_USER.id,
			inviteeEmail: "partner@example.com",
			status: "pending",
		});
	});

	it("招待がない場合は空配列を返す", async () => {
		const res = await client.api["partner-invitations"].sent.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toEqual([]);
	});

	it("有効期限切れの招待も取得される", async () => {
		await insertInvitation(TEST_USER.id, "partner@example.com", {
			expiresAt: Date.now() - 1000,
		});

		const res = await client.api["partner-invitations"].sent.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0]).toMatchObject({
			status: "pending",
		});
	});

	it("cancelled や accepted の招待も取得される", async () => {
		await insertInvitation(TEST_USER.id, "a@example.com", {
			status: "cancelled",
		});
		await insertInvitation(TEST_USER.id, "b@example.com", {
			status: "accepted",
		});
		await insertInvitation(TEST_USER.id, "c@example.com");

		const res = await client.api["partner-invitations"].sent.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(3);
	});

	it("新しい招待が先に返される", async () => {
		await insertInvitation(TEST_USER.id, "old@example.com", {
			createdAt: Date.now() - 100000,
		});
		await insertInvitation(TEST_USER.id, "new@example.com", {
			createdAt: Date.now(),
		});

		const res = await client.api["partner-invitations"].sent.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data[0].inviteeEmail).toBe("new@example.com");
		expect(body.data[1].inviteeEmail).toBe("old@example.com");
	});

	it("他のユーザーが送った招待は取得されない", async () => {
		await seedOtherUser();
		await insertInvitation(OTHER_USER.id, "someone@example.com");

		const res = await client.api["partner-invitations"].sent.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toEqual([]);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await client.api["partner-invitations"].sent.$get({});

		expect(res.status).toBe(401);
	});
});
