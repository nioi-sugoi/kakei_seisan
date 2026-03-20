import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import { authCookie, client, setupAuth } from "./helpers";

beforeAll(async () => {
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
				json: {
					category: "advance",
					amount: 1500,
					date: "2024-03-15",
					label: "食費",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			category: "advance",
			amount: 1500,
			date: "2024-03-15",
			label: "食費",
			userId: TEST_USER.id,
			operation: "original",
			status: "approved",
			memo: null,
		});
		expect(body).toHaveProperty("id", expect.any(String));
	});

	it("deposit カテゴリで記録を登録できる", async () => {
		const res = await client.api.entries.$post(
			{
				json: {
					category: "deposit",
					amount: 5000,
					date: "2024-03-20",
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
				json: {
					category: "advance",
					amount: 800,
					date: "2024-03-15",
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
				json: {
					category: "advance",
					amount: 0,
					date: "2024-03-15",
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
				json: {
					category: "advance",
					amount: 1500,
					date: "2024-03-15",
					label: "食費",
					memo: "テストメモ",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		const result = await env.DB.prepare(
			"SELECT * FROM entries WHERE user_id = ?",
		)
			.bind(TEST_USER.id)
			.all();

		expect(result.results).toHaveLength(1);
		expect(result.results[0]).toMatchObject({
			category: "advance",
			amount: 1500,
			date: "2024-03-15",
			label: "食費",
			memo: "テストメモ",
			operation: "original",
			status: "approved",
		});
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await client.api.entries.$post({
			json: {
				category: "advance",
				amount: 1000,
				date: "2024-03-15",
				label: "食費",
			},
		});

		expect(res.status).toBe(401);
	});

	it("category が不正な値の場合 400 を返す", async () => {
		const res = await client.api.entries.$post(
			{
				json: {
					category: "invalid" as "advance",
					amount: 1000,
					date: "2024-03-15",
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
				json: {
					category: "advance",
					amount: -100,
					date: "2024-03-15",
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
				json: {
					category: "advance",
					amount: 100.5,
					date: "2024-03-15",
					label: "食費",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "バリデーションエラー");
	});

	it("date が ISO 日付形式でない場合 400 を返す", async () => {
		const res = await client.api.entries.$post(
			{
				json: {
					category: "advance",
					amount: 1000,
					date: "2024/03/15",
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
				json: {
					category: "advance",
					amount: 1000,
					date: "2024-03-15",
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
				json: {
					category: "advance",
					amount: 1000,
				} as {
					category: "advance";
					amount: number;
					date: string;
					label: string;
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});
});
