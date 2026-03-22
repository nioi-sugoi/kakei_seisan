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

describe("POST /api/settlements/:originalId/modify", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("金額を修正すると新バージョンが作成される", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 10000,
		});

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				json: { amount: 9000 },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			amount: 9000,
			originalId: settlement.id,
			cancelled: false,
			latest: true,
		});

		const dbVersions = await queryVersionsByOriginalId(settlement.id);
		expect(dbVersions).toHaveLength(2);
		expect(dbVersions[0].amount).toBe(9000);
		expect(dbVersions[0].latest).toBe(true);
		expect(dbVersions[1].latest).toBe(false);
	});

	it("既に修正済みの精算をさらに修正できる", async () => {
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

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				json: { amount: 8000 },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({ amount: 8000 });

		const dbVersions = await queryVersionsByOriginalId(settlement.id);
		expect(dbVersions).toHaveLength(3);
		expect(dbVersions[0].amount).toBe(8000);
	});

	it("変更がない場合はエラーになる", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				json: { amount: 5000 },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "変更がありません");
	});

	it("取り消し済みの精算は修正できない", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		await client.api.settlements[":originalId"].cancel.$post(
			{ param: { originalId: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				json: { amount: 3000 },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "取り消し済みの精算は修正できません");
	});

	it("他ユーザーの精算は修正できない", async () => {
		await seedOtherUser();
		const settlement = await insertSettlement(OTHER_USER.id);

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				json: { amount: 3000 },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("存在しない精算を指定するとエラーになる", async () => {
		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: "nonexistent" },
				json: { amount: 3000 },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("ログインしていないとエラーになる", async () => {
		const settlement = await insertSettlement(TEST_USER.id);

		const res = await client.api.settlements[":originalId"].modify.$post({
			param: { originalId: settlement.id },
			json: { amount: 3000 },
		});

		expect(res.status).toBe(401);
	});
});
