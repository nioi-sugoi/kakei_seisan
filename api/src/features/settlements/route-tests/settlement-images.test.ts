import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../../index";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	buildOtherUserAuthCookie,
	client,
	insertSettlement,
	seedOtherUser,
	setupAuth,
	setupDB,
} from "./helpers";

function createTestFile(name: string, type: string, sizeBytes = 1024): File {
	const buffer = new ArrayBuffer(sizeBytes);
	return new File([buffer], name, { type });
}

/** create/modify API 経由で画像付き精算を作成し、画像IDを返す */
async function createSettlementWithImage(
	file?: File,
): Promise<{ settlementId: string; imageId: string }> {
	const res = await client.api.settlements.$post(
		{
			form: {
				category: "fromHousehold",
				amount: "5000",
				occurredOn: "2024-03-15",
				image1: file ?? createTestFile("receipt.jpg", "image/jpeg"),
			},
		},
		{ headers: { Cookie: authCookie } },
	);
	const body = await res.json();
	if ("error" in body) throw new Error("unexpected error");
	return { settlementId: body.id, imageId: body.images[0].id };
}

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

async function cleanR2() {
	const listed = await env.R2.list();
	for (const obj of listed.objects) {
		await env.R2.delete(obj.key);
	}
}

describe("GET /api/settlements/:settlementId/images/:imageId", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await cleanR2();
	});

	it("アップロード済み画像をダウンロードできる", async () => {
		const { settlementId, imageId } = await createSettlementWithImage(
			createTestFile("receipt.jpg", "image/jpeg", 2048),
		);

		const res = await app.request(
			`/api/settlements/${settlementId}/images/${imageId}`,
			{ headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("image/jpeg");
		const blob = await res.blob();
		expect(blob.size).toBe(2048);
	});

	it("存在しない画像 ID は 404 を返す", async () => {
		const settlement = await insertSettlement(TEST_USER.id);

		const res = await app.request(
			`/api/settlements/${settlement.id}/images/nonexistent`,
			{ headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(404);
	});

	it("他のユーザーの精算の画像は取得できない", async () => {
		const { settlementId, imageId } = await createSettlementWithImage();

		await seedOtherUser();
		const otherCookie = await buildOtherUserAuthCookie();

		const res = await app.request(
			`/api/settlements/${settlementId}/images/${imageId}`,
			{ headers: { Cookie: otherCookie } },
			env,
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const settlement = await insertSettlement(TEST_USER.id);

		const res = await app.request(
			`/api/settlements/${settlement.id}/images/any`,
			{},
			env,
		);

		expect(res.status).toBe(401);
	});
});

describe("GET /api/settlements/:id（画像メタデータ含む）", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await cleanR2();
	});

	it("精算詳細に画像メタデータが含まれる", async () => {
		const { settlementId } = await createSettlementWithImage();

		const res = await client.api.settlements[":id"].$get(
			{ param: { id: settlementId } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
		expect(body.images[0]).toHaveProperty("id");
		expect(body.images[0]).toHaveProperty("displayOrder", 0);
		expect(body.images[0]).toHaveProperty("createdAt");
		// storagePath はクライアントに返さない
		expect(body.images[0]).not.toHaveProperty("storagePath");
	});

	it("画像がない場合は空配列が返る", async () => {
		const settlement = await insertSettlement(TEST_USER.id);

		const res = await client.api.settlements[":id"].$get(
			{ param: { id: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toEqual([]);
	});
});

describe("画像フォーマットのテスト", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await cleanR2();
	});

	it("jpeg形式の画像をアップロードできる", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "5000",
					occurredOn: "2024-03-15",
					image1: createTestFile("receipt.jpg", "image/jpeg"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
	});

	it("png形式の画像をアップロードできる", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "5000",
					occurredOn: "2024-03-15",
					image1: createTestFile("receipt.png", "image/png"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
	});

	it("webp形式の画像をアップロードできる", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "5000",
					occurredOn: "2024-03-15",
					image1: createTestFile("receipt.webp", "image/webp"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
	});

	it("heic形式の画像をアップロードできる", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "5000",
					occurredOn: "2024-03-15",
					image1: createTestFile("receipt.heic", "image/heic"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
	});

	it("サポートされていないファイル形式は 400 を返す", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "5000",
					occurredOn: "2024-03-15",
					image1: createTestFile("doc.pdf", "application/pdf"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty(
			"error",
			"サポートされていないファイル形式です",
		);
	});

	it("10MBを超えるファイルは 400 を返す", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "5000",
					occurredOn: "2024-03-15",
					image1: createTestFile("big.jpg", "image/jpeg", 11 * 1024 * 1024),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty(
			"error",
			"ファイルサイズは10MB以下にしてください",
		);
	});
});
