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

describe("POST /api/entries/:originalId/restore", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("取り消し済みの記録を復元できる", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 5000,
			label: "交通費",
			category: "advance",
		});

		await client.api.entries[":originalId"].cancel.$post(
			{ param: { originalId: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.entries[":originalId"].restore.$post(
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
			cancelled: false,
			latest: true,
		});

		// DB状態: 3レコード（初版 + 取消 + 復元）、最新は復元
		const dbVersions = await queryVersionsByOriginalId(entry.id);
		expect(dbVersions).toHaveLength(3);
		// createdAt DESC なので先頭が最新
		expect(dbVersions[0].cancelled).toBe(false);
		expect(dbVersions[0].latest).toBe(true);
		expect(dbVersions[1].latest).toBe(false);
		expect(dbVersions[2].latest).toBe(false);
	});

	it("取り消されていない記録は復元できない", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		const res = await client.api.entries[":originalId"].restore.$post(
			{ param: { originalId: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty(
			"error",
			"取り消しされていない記録は復元できません",
		);
	});

	it("他ユーザーの記録は復元できない", async () => {
		await seedOtherUser();
		const entry = await insertEntry(OTHER_USER.id);

		await client.api.entries[":originalId"].cancel.$post(
			{ param: { originalId: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		// cancel は 404 になるはず（他ユーザーのため）、insertEntry で直接取消状態にする
		// 代わりに直接 restore を呼んで 404 を確認
		const res = await client.api.entries[":originalId"].restore.$post(
			{ param: { originalId: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("存在しない ID の場合 404 を返す", async () => {
		const res = await client.api.entries[":originalId"].restore.$post(
			{ param: { originalId: "nonexistent" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id);

		const res = await client.api.entries[":originalId"].restore.$post({
			param: { originalId: entry.id },
		});

		expect(res.status).toBe(401);
	});
});
