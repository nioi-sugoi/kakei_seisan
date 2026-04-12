import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertPartnership,
	insertSettlement,
	OTHER_USER,
	seedOtherUser,
	setupAuth,
	setupDB,
} from "./helpers";

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

describe("GET /api/partner/settlements/:id", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await seedOtherUser();
	});

	it("パートナーの精算を取得できる", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		const settlement = await insertSettlement(OTHER_USER.id, { amount: 4200 });

		const res = await client.api.partner.settlements[":id"].$get(
			{ param: { id: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		if (res.status !== 200) return;
		const body = await res.json();
		expect(body.id).toBe(settlement.id);
		expect(body.userId).toBe(OTHER_USER.id);
		expect(body.amount).toBe(4200);
		expect(body.versions).toHaveLength(1);
		expect(body.images).toEqual([]);
	});

	it("自分の精算は取得できない（404 を返す）", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		const mySettlement = await insertSettlement(TEST_USER.id);

		const res = await client.api.partner.settlements[":id"].$get(
			{ param: { id: mySettlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("存在しない精算は 404 を返す", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);

		const res = await client.api.partner.settlements[":id"].$get(
			{ param: { id: "missing-id" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("パートナーシップがない場合は 404 を返す", async () => {
		const settlement = await insertSettlement(OTHER_USER.id);

		const res = await client.api.partner.settlements[":id"].$get(
			{ param: { id: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("ログインしていないと 401 を返す", async () => {
		const res = await client.api.partner.settlements[":id"].$get({
			param: { id: "any-id" },
		});

		expect(res.status).toBe(401);
	});
});
