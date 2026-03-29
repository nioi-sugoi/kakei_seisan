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

function createTestFile(name: string, type: string, sizeBytes = 1024): File {
	const buffer = new ArrayBuffer(sizeBytes);
	return new File([buffer], name, { type });
}

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
				form: { amount: "9000" },
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
				form: { amount: "9000" },
			},
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				form: { amount: "8000" },
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

	it("画像追加で金額変更なしでも新バージョンが作成される", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				form: {
					amount: "5000",
					image1: createTestFile("receipt.jpg", "image/jpeg"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body).toMatchObject({
			amount: 5000,
			originalId: settlement.id,
			latest: true,
		});
		expect(body.images).toHaveLength(1);

		const dbVersions = await queryVersionsByOriginalId(settlement.id);
		expect(dbVersions).toHaveLength(2);
		expect(dbVersions[0].latest).toBe(true);
		expect(dbVersions[1].latest).toBe(false);
	});

	it("画像も金額変更もない場合は 400 を返す", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				form: { amount: "5000" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "変更がありません");
	});

	it("変更がない場合はエラーになる", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				form: { amount: "5000" },
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
				form: { amount: "3000" },
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
				form: { amount: "3000" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("存在しない精算を指定するとエラーになる", async () => {
		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: "nonexistent" },
				form: { amount: "3000" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("金額が0円の場合はエラーになる", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				form: { amount: "0" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});

	it("金額がマイナスの場合はエラーになる", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				form: { amount: "-1" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});

	it("金額が小数の場合はエラーになる", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				form: { amount: "100.5" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});

	it("ログインしていないとエラーになる", async () => {
		const settlement = await insertSettlement(TEST_USER.id);

		const res = await client.api.settlements[":originalId"].modify.$post({
			param: { originalId: settlement.id },
			form: { amount: "3000" },
		});

		expect(res.status).toBe(401);
	});

	it("修正時に画像の追加と削除を同時に行える", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		// 画像を追加
		const addRes = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				form: {
					amount: "5000",
					image1: createTestFile("old.jpg", "image/jpeg"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);
		const addBody = await addRes.json();
		if ("error" in addBody) throw new Error("unexpected error");
		const oldImageId = addBody.images[0].id;

		// 古い画像を削除しつつ新しい画像を追加
		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				form: {
					amount: "5000",
					deleteImageIds: oldImageId,
					image1: createTestFile("new.png", "image/png"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
		expect(body.images[0].id).not.toBe(oldImageId);
	});
});
