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

	it("金額を修正すると新バージョンがフルスナップショットで作成される", async () => {
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
			amount: 9000,
			label: "食費",
			category: "advance",
			originalId: entry.id,
			cancelled: false,
			latest: true,
		});
	});

	it("ラベルのみの修正でも新バージョンが作成される", async () => {
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
			amount: 1500,
			label: "日用品",
			originalId: entry.id,
		});
	});

	it("修正後、旧バージョンの latest が false になる", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 1000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		const getRes = await client.api.entries[":id"].$get(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);
		const original = await getRes.json();
		if ("error" in original) throw new Error("unexpected error");
		expect(original.latest).toBe(false);
	});

	it("既に修正済みのエントリをさらに修正できる", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 10000,
			label: "食費",
		});

		await client.api.entries[":id"].modify.$post(
			{
				param: { id: entry.id },
				json: { amount: 9000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

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
			amount: 8000,
			originalId: entry.id,
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
