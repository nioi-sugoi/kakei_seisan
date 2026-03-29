import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { entryImageVersions } from "../../../db/schema";
import app from "../../../index";
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

function createTestFile(name: string, type: string, sizeBytes = 1024): File {
	const buffer = new ArrayBuffer(sizeBytes);
	return new File([buffer], name, { type });
}

/** 専用エンドポイント経由で画像をアップロードし、画像IDを返す */
async function uploadImage(entryId: string, file?: File): Promise<string> {
	const formData = new FormData();
	formData.append("image", file ?? createTestFile("receipt.jpg", "image/jpeg"));
	const res = await app.request(
		`/api/entries/${entryId}/images`,
		{ method: "POST", headers: { Cookie: authCookie }, body: formData },
		env,
	);
	if (res.status !== 201) throw new Error(`image upload failed: ${res.status}`);
	const body = (await res.json()) as { id: string };
	return body.id;
}

beforeAll(async () => {
	await setupDB();
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

		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
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

		// DB状態: 2レコード、最新は修正バージョン
		const dbVersions = await queryVersionsByOriginalId(entry.id);
		expect(dbVersions).toHaveLength(2);
		// createdAt DESC なので先頭が最新
		expect(dbVersions[0].id).not.toBe(entry.id);
		expect(dbVersions[0].amount).toBe(9000);
		expect(dbVersions[0].latest).toBe(true);
		expect(dbVersions[1].latest).toBe(false);
	});

	it("ラベルのみの修正でも新バージョンが作成される", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
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

	it("修正後、旧バージョンより新しい createdAt を持つバージョンが存在する", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				json: { amount: 1000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		const dbVersions = await queryVersionsByOriginalId(entry.id);
		const dbOriginal = dbVersions.find((v) => v.id === entry.id);
		// createdAt DESC なので先頭が最新、旧バージョンは先頭ではない
		expect(dbVersions[0].id).not.toBe(dbOriginal?.id);
		expect(dbVersions[0].createdAt).toBeGreaterThan(dbOriginal?.createdAt ?? 0);
	});

	it("既に修正済みの記録をさらに修正できる", async () => {
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

		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
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

		// DB状態: 3バージョン、最新は最後の修正
		const dbVersions = await queryVersionsByOriginalId(entry.id);
		expect(dbVersions).toHaveLength(3);
		// createdAt DESC なので先頭が最新
		expect(dbVersions[0].amount).toBe(8000);
	});

	it("deposit カテゴリの記録を修正してもカテゴリは deposit のまま変わらない", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 5000,
			label: "お釣り",
			category: "deposit",
		});

		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				json: { amount: 3000, label: "お釣り修正" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({ category: "deposit" });

		const dbVersions = await queryVersionsByOriginalId(entry.id);
		expect(dbVersions[0].category).toBe("deposit");
	});

	it("修正リクエストに category を含めても無視される", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 5000,
			label: "お釣り",
			category: "deposit",
		});

		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				json: { amount: 3000, label: "お釣り修正", category: "advance" } as {
					amount: number;
					label: string;
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({ category: "deposit" });
	});

	it("画像削除で新バージョンが作成される", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		// 専用エンドポイント経由で画像を追加
		const imageId = await uploadImage(entry.id);

		// 画像削除のみで修正
		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				json: {
					amount: 1500,
					label: "食費",
					deleteImageIds: [imageId],
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(0);

		const dbVersions = await queryVersionsByOriginalId(entry.id);
		expect(dbVersions).toHaveLength(2);
	});

	it("変更がない場合は 400 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				json: { amount: 1500, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "変更がありません");
	});

	it("取り消し済みの記録は修正できない", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		await client.api.entries[":originalId"].cancel.$post(
			{ param: { originalId: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				json: { amount: 1000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "取り消し済みの記録は修正できません");
	});

	it("他ユーザーの記録は修正できない", async () => {
		await seedOtherUser();
		const entry = await insertEntry(OTHER_USER.id);

		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				json: { amount: 1000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("存在しない ID の場合 404 を返す", async () => {
		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: "nonexistent" },
				json: { amount: 1000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id);

		const res = await client.api.entries[":originalId"].modify.$post({
			param: { originalId: entry.id },
			json: { amount: 1000, label: "食費" },
		});

		expect(res.status).toBe(401);
	});

	it("修正で削除した画像はR2から削除されるがDBレコードは旧バージョンに残る", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		// 専用エンドポイント経由で画像を追加
		const imageId = await uploadImage(entry.id);

		// storagePath を DB から取得
		const db = drizzle(env.DB);
		const [imageMeta] = await db
			.select()
			.from(entryImageVersions)
			.where(eq(entryImageVersions.id, imageId))
			.all();
		const storagePath = imageMeta.storagePath;

		// 画像削除で修正
		await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				json: {
					amount: 1500,
					label: "食費",
					deleteImageIds: [imageId],
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		// R2 からは削除される（コスト最適化）
		const r2Object = await env.R2.get(storagePath);
		expect(r2Object).toBeNull();

		// 旧バージョンの画像レコードは DB に残っている（履歴用）
		const oldImage = await db
			.select()
			.from(entryImageVersions)
			.where(eq(entryImageVersions.id, imageId))
			.get();
		expect(oldImage).toBeTruthy();
	});
});
