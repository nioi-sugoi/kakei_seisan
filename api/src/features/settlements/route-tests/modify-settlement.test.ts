import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { settlementImages } from "../../../db/schema";
import app from "../../../index";
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

/** 画像アップロード用ヘルパー: POST /:settlementId/images に FormData で送信 */
async function uploadImage(settlementId: string, file?: File): Promise<string> {
	const formData = new FormData();
	formData.append("image", file ?? createTestFile("receipt.jpg", "image/jpeg"));
	const res = await app.request(
		`/api/settlements/${settlementId}/images`,
		{ method: "POST", headers: { Cookie: authCookie }, body: formData },
		env,
	);
	const body = (await res.json()) as { id: string };
	return body.id;
}

async function cleanR2() {
	const listed = await env.R2.list();
	for (const obj of listed.objects) {
		await env.R2.delete(obj.key);
	}
}

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

describe("POST /api/settlements/:originalId/modify", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await cleanR2();
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

	it("画像も金額変更もない場合は 400 を返す", async () => {
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

	it("金額が0円の場合はエラーになる", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				json: { amount: 0 },
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
				json: { amount: -1 },
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
				json: { amount: 100.5 },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});

	it("ログインしていないとエラーになる", async () => {
		const settlement = await insertSettlement(TEST_USER.id);

		const res = await client.api.settlements[":originalId"].modify.$post({
			param: { originalId: settlement.id },
			json: { amount: 3000 },
		});

		expect(res.status).toBe(401);
	});

	it("画像削除で新バージョンが作成される", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		// 専用エンドポイント経由で画像を追加
		const imageId = await uploadImage(settlement.id);

		// 画像削除のみで修正
		const res = await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				json: {
					amount: 5000,
					deleteImageIds: [imageId],
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(0);

		const dbVersions = await queryVersionsByOriginalId(settlement.id);
		expect(dbVersions).toHaveLength(2);
	});

	it("修正で削除した画像はR2から削除されるがDBレコードは旧バージョンに残る", async () => {
		const settlement = await insertSettlement(TEST_USER.id, {
			amount: 5000,
		});

		// 専用エンドポイント経由で画像を追加
		const imageId = await uploadImage(settlement.id);

		// storagePath を DB から取得
		const db = drizzle(env.DB);
		const [imageMeta] = await db
			.select()
			.from(settlementImages)
			.where(eq(settlementImages.id, imageId))
			.all();
		const storagePath = imageMeta.storagePath;

		// 画像削除で修正
		await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				json: {
					amount: 5000,
					deleteImageIds: [imageId],
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		// R2 からは削除される（コスト最適化）
		const r2Object = await env.R2.get(storagePath);
		expect(r2Object).toBeNull();

		// 旧バージョンの画像レコードは DB に残っている（履歴用）
		const oldImage = await db
			.select()
			.from(settlementImages)
			.where(eq(settlementImages.id, imageId))
			.get();
		expect(oldImage).toBeTruthy();
	});
});
