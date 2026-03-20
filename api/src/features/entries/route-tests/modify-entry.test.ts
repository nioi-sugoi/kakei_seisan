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

describe("POST /api/entries/:id/modify", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("金額を修正すると差分レコードが作成される", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 10000,
			label: "食費",
		});

		const res = await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 9000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			operation: "modification",
			amount: -1000,
			category: "advance",
			parentId: entry.id,
			label: "食費",
		});
	});

	it("ラベルのみの修正でも修正レコードが作成される", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		const res = await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 1500, label: "日用品" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			operation: "modification",
			amount: 0,
			label: "日用品",
			parentId: entry.id,
		});
	});

	it("メモの追加で修正レコードが作成される", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		const res = await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 1500, label: "食費", memo: "追加メモ" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			memo: "追加メモ",
		});
	});

	it("金額を増額する修正も可能", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 5000,
			label: "食費",
		});

		const res = await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 7000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			amount: 2000,
		});
	});

	it("既に修正済みのエントリをさらに修正できる（実効金額からの差分）", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 10000,
			label: "食費",
		});

		// 1回目の修正: 10000 → 9000 (diff: -1000)
		await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 9000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		// 2回目の修正: 9000 → 8000 (diff: -1000, not -2000)
		const res = await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 8000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			amount: -1000,
		});
	});

	it("変更がない場合は 400 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		const res = await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 1500, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "変更がありません");
	});

	it("取り消し済みのエントリは修正できない", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		await client.api.entries[":id"].cancel.$post(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 1000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "取り消し済みの記録は修正できません");
	});

	it("修正・取消レコード自体は修正できない", async () => {
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

		const res = await client.api.entries[":id"].modify.$post(
			{
				param: { id: modification.id },
				json: { amount: 500, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "元の記録のみ修正できます");
	});

	it("他ユーザーのエントリは修正できない", async () => {
		await seedOtherUser();
		const entry = await insertEntry(OTHER_USER.id);

		const res = await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 1000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("存在しない ID の場合 404 を返す", async () => {
		const res = await client.api.entries[":id"].modify.$post(
			{
				param: { id: "nonexistent" },
				json: { amount: 1000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id);

		const res = await client.api.entries[":id"].modify.$post({
			param: { id: entry.id },
			json: { amount: 1000, label: "食費" },
		});

		expect(res.status).toBe(401);
	});
});
