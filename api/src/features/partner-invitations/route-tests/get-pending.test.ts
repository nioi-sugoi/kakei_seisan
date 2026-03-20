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
} from "./helpers";

beforeAll(async () => {
	await setupAuth();
});

describe("GET /api/partner-invitations/pending", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await seedOtherUser();
	});

	it("自分宛の pending 招待を取得できる", async () => {
		await insertInvitation(OTHER_USER.id, TEST_USER.email);

		const res = await client.api["partner-invitations"].pending.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0]).toMatchObject({
			inviterId: OTHER_USER.id,
			inviteeEmail: TEST_USER.email,
			status: "pending",
			inviterName: OTHER_USER.name,
			inviterEmail: OTHER_USER.email,
		});
	});

	it("有効期限切れの招待は取得されない", async () => {
		await insertInvitation(OTHER_USER.id, TEST_USER.email, {
			expiresAt: Date.now() - 1000,
		});

		const res = await client.api["partner-invitations"].pending.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(0);
	});

	it("accepted の招待は取得されない", async () => {
		await insertInvitation(OTHER_USER.id, TEST_USER.email, {
			status: "accepted",
		});

		const res = await client.api["partner-invitations"].pending.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(0);
	});

	it("他のユーザー宛の招待は取得されない", async () => {
		await insertInvitation(OTHER_USER.id, "someone-else@example.com");

		const res = await client.api["partner-invitations"].pending.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(0);
	});

	it("招待がない場合は空配列を返す", async () => {
		const res = await client.api["partner-invitations"].pending.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(0);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await client.api["partner-invitations"].pending.$get({});

		expect(res.status).toBe(401);
	});
});
