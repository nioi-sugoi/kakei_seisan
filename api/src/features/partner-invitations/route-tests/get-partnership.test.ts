import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertPartnership,
	OTHER_USER,
	seedOtherUser,
	seedThirdUser,
	setupAuth,
	setupDB,
	THIRD_USER,
} from "./helpers";

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

describe("GET /api/partner-invitations/partnership", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await seedOtherUser();
	});

	it("inviter としてのパートナー関係を取得できる", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);

		const res = await client.api["partner-invitations"].partnership.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toMatchObject({
			role: "inviter",
			partnerName: OTHER_USER.name,
			partnerEmail: OTHER_USER.email,
		});
		expect(body.data).toHaveProperty("id", expect.any(String));
	});

	it("invitee としてのパートナー関係を取得できる", async () => {
		await insertPartnership(OTHER_USER.id, TEST_USER.id);

		const res = await client.api["partner-invitations"].partnership.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toMatchObject({
			role: "invitee",
			partnerName: OTHER_USER.name,
			partnerEmail: OTHER_USER.email,
		});
	});

	it("パートナー関係がない場合は null を返す", async () => {
		const res = await client.api["partner-invitations"].partnership.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toBeNull();
	});

	it("他のユーザー同士のパートナー関係は取得されない", async () => {
		await seedThirdUser();
		await insertPartnership(OTHER_USER.id, THIRD_USER.id);

		const res = await client.api["partner-invitations"].partnership.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toBeNull();
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res =
			await client.api["partner-invitations"].partnership.$get({});

		expect(res.status).toBe(401);
	});
});
