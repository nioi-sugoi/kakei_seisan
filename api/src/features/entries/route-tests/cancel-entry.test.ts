import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertEntry,
	OTHER_USER,
	seedOtherUser,
	setupAuth,
} from "./helpers";

beforeAll(async () => {
	await setupAuth();
});

describe("POST /api/entries/:id/cancel", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("記録を取り消すと打消しレコードが作成される", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 5000,
			label: "交通費",
			category: "advance",
		});

		const res = await client.api.entries[":id"].cancel.$post(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			operation: "cancellation",
			amount: -5000,
			category: "advance",
			parentId: entry.id,
			label: "交通費",
		});
	});

	it("deposit カテゴリの記録も取り消せる", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 3000,
			category: "deposit",
			label: "預り金",
		});

		const res = await client.api.entries[":id"].cancel.$post(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			operation: "cancellation",
			amount: -3000,
			category: "deposit",
		});
	});

	it("修正済みエントリの取り消しは実効金額で打ち消す", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 10000,
			label: "食費",
		});

		// 修正: 10000 → 9000
		await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 9000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.entries[":id"].cancel.$post(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		// 実効金額 9000 の打消しなので -9000
		expect(body).toMatchObject({
			amount: -9000,
		});
	});

	it("既に取り消し済みのエントリは再取り消しできない", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		await client.api.entries[":id"].cancel.$post(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.entries[":id"].cancel.$post(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "既に取り消し済みです");
	});

	it("修正・取消レコード自体は取り消しできない", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 10000,
			label: "食費",
		});

		const modRes = await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 9000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);
		const modification = await modRes.json();
		if ("error" in modification) throw new Error("unexpected error");

		const res = await client.api.entries[":id"].cancel.$post(
			{ param: { id: modification.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "元の記録のみ取り消しできます");
	});

	it("他ユーザーのエントリは取り消せない", async () => {
		await seedOtherUser();
		const entry = await insertEntry(OTHER_USER.id);

		const res = await client.api.entries[":id"].cancel.$post(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("存在しない ID の場合 404 を返す", async () => {
		const res = await client.api.entries[":id"].cancel.$post(
			{ param: { id: "nonexistent" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id);

		const res = await client.api.entries[":id"].cancel.$post({
			param: { id: entry.id },
		});

		expect(res.status).toBe(401);
	});
});
