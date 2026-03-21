import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertEntry,
	OTHER_USER,
	queryVersionsByOriginalId,
	seedOtherUser,
	setupAuth,
	setupDB,
} from "./helpers";

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

describe("POST /api/entries/:id/cancel", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("記録を取り消すと cancelled バージョンが作成される", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 5000,
			label: "交通費",
			category: "advance",
		});

		const res = await client.api.entries[":originalId"].cancel.$post(
			{ param: { originalId: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			amount: 5000,
			category: "advance",
			label: "交通費",
			originalId: entry.id,
			cancelled: true,
		});

		// DB状態: originalId グループに2レコード、最新は取消バージョン
		const dbVersions = await queryVersionsByOriginalId(entry.id);
		expect(dbVersions).toHaveLength(2);
		// createdAt DESC なので先頭が最新
		expect(dbVersions[0].cancelled).toBe(true);
		expect(dbVersions[0].id).not.toBe(entry.id);
	});

	it("deposit カテゴリの記録も取り消せる", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 3000,
			category: "deposit",
			label: "預り金",
		});

		const res = await client.api.entries[":originalId"].cancel.$post(
			{ param: { originalId: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			amount: 3000,
			category: "deposit",
			cancelled: true,
		});
	});

	it("修正済み記録を取り消すと最新バージョンの値が保持される", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 10000,
			label: "食費",
		});

		await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				json: { amount: 9000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.entries[":originalId"].cancel.$post(
			{ param: { originalId: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			amount: 9000,
			cancelled: true,
		});

		// DB状態: 3バージョン（初版 + 修正 + 取消）、最新は取消
		const dbVersions = await queryVersionsByOriginalId(entry.id);
		expect(dbVersions).toHaveLength(3);
		// createdAt DESC なので先頭が最新
		expect(dbVersions[0].cancelled).toBe(true);
		expect(dbVersions[0].amount).toBe(9000);
	});

	it("取り消し後、旧バージョンより新しい createdAt を持つバージョンが存在する", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		await client.api.entries[":originalId"].cancel.$post(
			{ param: { originalId: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		const dbVersions = await queryVersionsByOriginalId(entry.id);
		const dbOriginal = dbVersions.find((v) => v.id === entry.id);
		// createdAt DESC なので先頭が最新、旧バージョンは先頭ではない
		expect(dbVersions[0].id).not.toBe(dbOriginal?.id);
		expect(dbVersions[0].createdAt).toBeGreaterThan(dbOriginal?.createdAt ?? 0);
	});

	it("既に取り消し済みの記録は再取り消しできない", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		await client.api.entries[":originalId"].cancel.$post(
			{ param: { originalId: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.entries[":originalId"].cancel.$post(
			{ param: { originalId: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "既に取り消し済みです");
	});

	it("他ユーザーの記録は取り消せない", async () => {
		await seedOtherUser();
		const entry = await insertEntry(OTHER_USER.id);

		const res = await client.api.entries[":originalId"].cancel.$post(
			{ param: { originalId: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("存在しない ID の場合 404 を返す", async () => {
		const res = await client.api.entries[":originalId"].cancel.$post(
			{ param: { originalId: "nonexistent" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id);

		const res = await client.api.entries[":originalId"].cancel.$post({
			param: { originalId: entry.id },
		});

		expect(res.status).toBe(401);
	});
});
