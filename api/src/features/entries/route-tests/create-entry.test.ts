import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { entries, entryImages } from "../../../db/schema";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import { authCookie, client, setupAuth, setupDB } from "./helpers";

function createTestFile(name: string, type: string, sizeBytes = 1024): File {
	const buffer = new ArrayBuffer(sizeBytes);
	return new File([buffer], name, { type });
}

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

describe("POST /api/entries", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("advance カテゴリで記録を登録できる", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1500",
					occurredOn: "2024-03-15",
					label: "食費",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body).toMatchObject({
			category: "advance",
			amount: 1500,
			occurredOn: "2024-03-15",
			label: "食費",
			userId: TEST_USER.id,
			cancelled: false,
			latest: true,
			status: "approved",
			memo: null,
		});
		// originalId は自身の id と一致
		expect(body.originalId).toBe(body.id);
		expect(body.images).toEqual([]);
	});

	it("deposit カテゴリで記録を登録できる", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "deposit",
					amount: "5000",
					occurredOn: "2024-03-20",
					label: "ATM入金",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			category: "deposit",
			amount: 5000,
		});
	});

	it("memo 付きで記録を登録できる", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "800",
					occurredOn: "2024-03-15",
					label: "ランチ",
					memo: "同僚と外食",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toHaveProperty("memo", "同僚と外食");
	});

	it("amount が 0 でも登録できる", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "0",
					occurredOn: "2024-03-15",
					label: "無料サンプル",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toHaveProperty("amount", 0);
	});

	it("登録した記録が DB に保存される", async () => {
		await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1500",
					occurredOn: "2024-03-15",
					label: "食費",
					memo: "テストメモ",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		const db = drizzle(env.DB);
		const result = await db
			.select()
			.from(entries)
			.where(eq(entries.userId, TEST_USER.id))
			.all();

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			category: "advance",
			amount: 1500,
			occurredOn: "2024-03-15",
			label: "食費",
			memo: "テストメモ",
			cancelled: false,
			latest: true,
			status: "approved",
		});
		expect(result[0].originalId).toBe(result[0].id);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await client.api.entries.$post({
			form: {
				category: "advance",
				amount: "1000",
				occurredOn: "2024-03-15",
				label: "食費",
			},
		});

		expect(res.status).toBe(401);
	});

	it("category が不正な値の場合 400 を返す", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "invalid" as "advance",
					amount: "1000",
					occurredOn: "2024-03-15",
					label: "食費",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "バリデーションエラー");
	});

	it("amount が負の値の場合 400 を返す", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "-100",
					occurredOn: "2024-03-15",
					label: "食費",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "バリデーションエラー");
	});

	it("amount が小数の場合 400 を返す", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "100.5",
					occurredOn: "2024-03-15",
					label: "食費",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "バリデーションエラー");
	});

	it("occurredOn が ISO 日付形式でない場合 400 を返す", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1000",
					occurredOn: "2024/03/15",
					label: "食費",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});

	it("label が空文字の場合 400 を返す", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1000",
					occurredOn: "2024-03-15",
					label: "",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});

	it("必須フィールドが欠落している場合 400 を返す", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1000",
				} as {
					category: "advance";
					amount: string;
					occurredOn: string;
					label: string;
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});

	it("画像付きで記録を登録できる", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1500",
					occurredOn: "2024-03-15",
					label: "食費",
					image1: createTestFile("receipt.jpg", "image/jpeg"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
		expect(body.images[0]).toHaveProperty("id");
		expect(body.images[0]).toHaveProperty("displayOrder", 0);
		expect(body.images[0]).not.toHaveProperty("storagePath");
	});

	it("2枚の画像付きで記録を登録できる", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1500",
					occurredOn: "2024-03-15",
					label: "食費",
					image1: createTestFile("receipt1.jpg", "image/jpeg"),
					image2: createTestFile("receipt2.png", "image/png"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(2);
		expect(body.images[0]).toMatchObject({ displayOrder: 0 });
		expect(body.images[1]).toMatchObject({ displayOrder: 1 });
	});

	it("サポートされていないファイル形式の画像は 400 を返す", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1500",
					occurredOn: "2024-03-15",
					label: "食費",
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

	it("10MBを超える画像は 400 を返す", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1500",
					occurredOn: "2024-03-15",
					label: "食費",
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

	it("画像付き登録で R2 に画像が保存される", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1500",
					occurredOn: "2024-03-15",
					label: "食費",
					image1: createTestFile("receipt.jpg", "image/jpeg"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");

		const db = drizzle(env.DB);
		const images = await db
			.select()
			.from(entryImages)
			.where(eq(entryImages.entryId, body.originalId))
			.all();

		expect(images).toHaveLength(1);
		const r2Object = await env.R2.get(images[0].storagePath);
		expect(r2Object).not.toBeNull();
	});
});
