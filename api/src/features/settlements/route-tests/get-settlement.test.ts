import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
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

describe("GET /api/settlements/:id", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("自分の精算を取得できる", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
			occurredOn: "2024-03-15",
		});

		const res = await client.api.settlements[":id"].$get(
			{ param: { id: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({
			id: settlement.id,
			amount: 5000,
			occurredOn: "2024-03-15",
			userId: TEST_USER.id,
			cancelled: false,
			latest: true,
		});
	});

	it("versions にバージョン一覧が含まれる", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				json: { amount: 4000 },
			},
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.settlements[":id"].$get(
			{ param: { id: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.versions).toHaveLength(2);
		expect(body.versions[0].amount).toBe(4000);
	});

	it("存在しない ID の場合 404 を返す", async () => {
		const res = await client.api.settlements[":id"].$get(
			{ param: { id: "nonexistent-id" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error", "精算が見つかりません");
	});

	it("他のユーザーの精算は取得できない", async () => {
		await seedOtherUser();
		const settlement = await insertSettlement(OTHER_USER.id);

		const res = await client.api.settlements[":id"].$get(
			{ param: { id: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const settlement = await insertSettlement(TEST_USER.id);

		const res = await client.api.settlements[":id"].$get({
			param: { id: settlement.id },
		});

		expect(res.status).toBe(401);
	});
});
