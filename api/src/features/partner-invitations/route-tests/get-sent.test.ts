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

	it("自分が送った pending 招待を取得できる", async () => {
		await insertInvitation(TEST_USER.id, "partner@example.com");

		const res = await client.api["partner-invitations"].sent.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toMatchObject({
			inviterId: TEST_USER.id,
			inviteeEmail: "partner@example.com",
			status: "pending",
		});
	});

	it("招待がない場合は null を返す", async () => {
		const res = await client.api["partner-invitations"].sent.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toBeNull();
	});

	it("有効期限切れの招待は取得されない", async () => {
		await insertInvitation(TEST_USER.id, "partner@example.com", {
			expiresAt: Date.now() - 1000,
		});

		const res = await client.api["partner-invitations"].sent.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toBeNull();
	});

	it("accepted の招待は取得されない", async () => {
		await insertInvitation(TEST_USER.id, "partner@example.com", {
			status: "accepted",
		});

		const res = await client.api["partner-invitations"].sent.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toBeNull();
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
		expect(body.data).toBeNull();
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await client.api["partner-invitations"].sent.$get({});

		expect(res.status).toBe(401);
	});
});
