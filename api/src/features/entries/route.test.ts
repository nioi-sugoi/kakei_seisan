import { applyD1Migrations, env } from "cloudflare:test";
import { testClient } from "hono/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AppType } from "../../index";
import app from "../../index";
import {
	buildAuthCookie,
	seedTestUser,
	TEST_USER,
} from "../../testing/auth-helper";
import { cleanAllTables } from "../../testing/db-helper";

let authCookie: string;

// app と routes は同一の実行時オブジェクト。型情報のために AppType へキャスト
// (Hono の export default app は basePath 以降のルート型を含まないため)
const client = testClient(app as unknown as AppType, env);

beforeAll(async () => {
	await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
	authCookie = await buildAuthCookie();
});

/** DB に直接エントリを挿入する（createdAt を制御するため） */
async function insertEntry(
	overrides: Partial<{
		id: string;
		userId: string;
		category: string;
		amount: number;
		date: string;
		label: string;
		memo: string | null;
		createdAt: number;
	}> = {},
) {
	const id = overrides.id ?? crypto.randomUUID();
	const now = Date.now();
	await env.DB.prepare(
		`INSERT INTO entries (id, user_id, category, operation, amount, date, label, memo, status, created_at, updated_at)
		 VALUES (?, ?, ?, 'original', ?, ?, ?, ?, 'approved', ?, ?)`,
	)
		.bind(
			id,
			overrides.userId ?? TEST_USER.id,
			overrides.category ?? "advance",
			overrides.amount ?? 1000,
			overrides.date ?? "2024-03-15",
			overrides.label ?? "テスト",
			overrides.memo ?? null,
			overrides.createdAt ?? now,
			now,
		)
		.run();
	return id;
}

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

describe("GET /api/entries", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("記録が0件の場合は空配列を返す", async () => {
		const res = await client.api.entries.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ data: [], nextCursor: null });
	});

	it("自分の記録一覧を取得できる", async () => {
		await insertEntry({ label: "食費", amount: 1500 });
		await insertEntry({ label: "交通費", amount: 300 });

		const res = await client.api.entries.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(2);
	});

	it("createdAt の降順で返される", async () => {
		const baseTime = 1700000000000;
		await insertEntry({ label: "古い記録", createdAt: baseTime });
		await insertEntry({ label: "新しい記録", createdAt: baseTime + 1000 });

		const res = await client.api.entries.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		const body = await res.json();
		expect(body.data[0].label).toBe("新しい記録");
		expect(body.data[1].label).toBe("古い記録");
	});

	it("他のユーザーの記録は含まれない", async () => {
		// 別ユーザーをDBに追加
		await env.DB.prepare(
			"INSERT INTO user (id, name, email, email_verified) VALUES (?, ?, ?, 1)",
		)
			.bind("other-user-id", "Other User", "other@example.com")
			.run();

		await insertEntry({ label: "自分の記録", userId: TEST_USER.id });
		await insertEntry({ label: "他人の記録", userId: "other-user-id" });

		const res = await client.api.entries.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].label).toBe("自分の記録");
	});

	it("50件を超える場合は nextCursor を返す", async () => {
		const baseTime = 1700000000000;
		const inserts = [];
		for (let i = 0; i < 51; i++) {
			inserts.push(insertEntry({ label: `記録${i}`, createdAt: baseTime + i }));
		}
		await Promise.all(inserts);

		const res = await client.api.entries.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		const body = await res.json();
		expect(body.data).toHaveLength(50);
		expect(body.nextCursor).not.toBeNull();
	});

	it("50件以下の場合は nextCursor が null", async () => {
		await insertEntry({ label: "記録" });

		const res = await client.api.entries.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		const body = await res.json();
		expect(body.nextCursor).toBeNull();
	});

	it("cursor を指定するとそれより前の記録を返す", async () => {
		const baseTime = 1700000000000;
		await insertEntry({ label: "古い記録", createdAt: baseTime });
		await insertEntry({ label: "中間の記録", createdAt: baseTime + 1000 });
		await insertEntry({ label: "新しい記録", createdAt: baseTime + 2000 });

		// 中間の記録の createdAt をカーソルとして指定 → 古い記録のみ返る
		const res = await client.api.entries.$get(
			{ query: { cursor: String(baseTime + 1000) } },
			{ headers: { Cookie: authCookie } },
		);

		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].label).toBe("古い記録");
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await client.api.entries.$get({ query: {} });

		expect(res.status).toBe(401);
	});
});

describe("GET /api/entries/:id", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("自分の記録を取得できる", async () => {
		const entryId = await insertEntry({
			label: "食費",
			amount: 1500,
			date: "2024-03-15",
			memo: "テストメモ",
		});

		const res = await client.api.entries[":id"].$get(
			{ param: { id: entryId } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({
			id: entryId,
			label: "食費",
			amount: 1500,
			date: "2024-03-15",
			memo: "テストメモ",
			userId: TEST_USER.id,
			category: "advance",
			operation: "original",
			status: "approved",
		});
	});

	it("存在しない ID の場合 404 を返す", async () => {
		const res = await client.api.entries[":id"].$get(
			{ param: { id: "non-existent-id" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error", "記録が見つかりません");
	});

	it("他のユーザーの記録にアクセスすると 404 を返す", async () => {
		await env.DB.prepare(
			"INSERT INTO user (id, name, email, email_verified) VALUES (?, ?, ?, 1)",
		)
			.bind("other-user-id", "Other User", "other@example.com")
			.run();

		const entryId = await insertEntry({
			label: "他人の記録",
			userId: "other-user-id",
		});

		const res = await client.api.entries[":id"].$get(
			{ param: { id: entryId } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error", "記録が見つかりません");
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const entryId = await insertEntry({ label: "記録" });

		const res = await client.api.entries[":id"].$get({
			param: { id: entryId },
		});

		expect(res.status).toBe(401);
	});
});
