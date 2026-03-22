import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertSettlement,
	OTHER_USER,
	queryVersionsByOriginalId,
	seedOtherUser,
	setupAuth,
	setupDB,
} from "./helpers";

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

describe("POST /api/settlements/:originalId/cancel", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("精算を取り消すと cancelled バージョンが作成される", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		const res = await client.api.settlements[":originalId"].cancel.$post(
			{ param: { originalId: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			amount: 5000,
			originalId: settlement.id,
			cancelled: true,
			latest: true,
		});

		const dbVersions = await queryVersionsByOriginalId(settlement.id);
		expect(dbVersions).toHaveLength(2);
		expect(dbVersions[0].cancelled).toBe(true);
		expect(dbVersions[0].latest).toBe(true);
		expect(dbVersions[1].latest).toBe(false);
	});

	it("修正済み精算を取り消すと最新バージョンの値が保持される", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 10000,
		});

		await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				json: { amount: 9000 },
			},
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.settlements[":originalId"].cancel.$post(
			{ param: { originalId: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			amount: 9000,
			cancelled: true,
		});

		const dbVersions = await queryVersionsByOriginalId(settlement.id);
		expect(dbVersions).toHaveLength(3);
		expect(dbVersions[0].cancelled).toBe(true);
		expect(dbVersions[0].amount).toBe(9000);
	});

	it("既に取り消し済みの精算は再取り消しできない", async () => {
		const settlement = await insertSettlement(TEST_USER.id);

		await client.api.settlements[":originalId"].cancel.$post(
			{ param: { originalId: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.settlements[":originalId"].cancel.$post(
			{ param: { originalId: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "既に取り消し済みです");
	});

	it("他ユーザーの精算は取り消せない", async () => {
		await seedOtherUser();
		const settlement = await insertSettlement(OTHER_USER.id);

		const res = await client.api.settlements[":originalId"].cancel.$post(
			{ param: { originalId: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("存在しない ID の場合 404 を返す", async () => {
		const res = await client.api.settlements[":originalId"].cancel.$post(
			{ param: { originalId: "nonexistent" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const settlement = await insertSettlement(TEST_USER.id);

		const res = await client.api.settlements[":originalId"].cancel.$post({
			param: { originalId: settlement.id },
		});

		expect(res.status).toBe(401);
	});
});
