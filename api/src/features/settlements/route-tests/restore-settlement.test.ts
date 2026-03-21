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

describe("POST /api/settlements/:originalId/restore", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("取り消し済みの精算を復元できる", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		await client.api.settlements[":originalId"].cancel.$post(
			{ param: { originalId: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.settlements[":originalId"].restore.$post(
			{ param: { originalId: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			amount: 5000,
			originalId: settlement.id,
			cancelled: false,
			latest: true,
		});

		const dbVersions = await queryVersionsByOriginalId(settlement.id);
		expect(dbVersions).toHaveLength(3);
		expect(dbVersions[0].cancelled).toBe(false);
		expect(dbVersions[0].latest).toBe(true);
		expect(dbVersions[1].latest).toBe(false);
		expect(dbVersions[2].latest).toBe(false);
	});

	it("取り消されていない精算は復元できない", async () => {
		const settlement = await insertSettlement(TEST_USER.id);

		const res = await client.api.settlements[":originalId"].restore.$post(
			{ param: { originalId: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty(
			"error",
			"取り消しされていない精算は復元できません",
		);
	});

	it("他ユーザーの精算は復元できない", async () => {
		await seedOtherUser();
		const settlement = await insertSettlement(OTHER_USER.id);

		const res = await client.api.settlements[":originalId"].restore.$post(
			{ param: { originalId: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("存在しない ID の場合 404 を返す", async () => {
		const res = await client.api.settlements[":originalId"].restore.$post(
			{ param: { originalId: "nonexistent" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const settlement = await insertSettlement(TEST_USER.id);

		const res = await client.api.settlements[":originalId"].restore.$post({
			param: { originalId: settlement.id },
		});

		expect(res.status).toBe(401);
	});
});
