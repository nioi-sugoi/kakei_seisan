import { env } from "cloudflare:test";
import { applyD1Migrations } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { testClient } from "hono/testing";
import { serializeSigned } from "hono/utils/cookie";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	account,
	entries,
	session,
	user,
} from "../../db/schema";
import app from "../../index";
import type { AppType } from "../../index";

const TEST_USER = {
	id: "test-user-id",
	name: "Test User",
	email: "test@example.com",
} as const;

const SESSION_TOKEN = "test-session-token";

let authCookie: string;

// app と routes は同一の実行時オブジェクト。型情報のために AppType へキャスト
// (Hono の export default app は basePath 以降のルート型を含まないため)
const client = testClient(app as unknown as AppType, env);
const db = drizzle(env.DB);

async function seedTestUser() {
	await db.insert(user).values({
		id: TEST_USER.id,
		name: TEST_USER.name,
		email: TEST_USER.email,
		emailVerified: true,
	});
	await db.insert(session).values({
		id: "test-session-id",
		expiresAt: new Date(Date.now() + 86_400_000),
		token: SESSION_TOKEN,
		updatedAt: new Date(),
		userId: TEST_USER.id,
	});
}

async function cleanTables() {
	await db.delete(entries);
	await db.delete(session);
	await db.delete(account);
	await db.delete(user);
}

beforeAll(async () => {
	await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
	// serializeSigned は "name=signedValue; Path=/" 形式を返すので name=value 部分だけ取得
	const setCookie = await serializeSigned(
		"better-auth.session_token",
		SESSION_TOKEN,
		env.BETTER_AUTH_SECRET,
	);
	authCookie = setCookie.split(";")[0];
});

describe("POST /api/entries", () => {
	beforeEach(async () => {
		await cleanTables();
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
