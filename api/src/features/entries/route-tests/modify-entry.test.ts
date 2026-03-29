import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { entryImages } from "../../../db/schema";
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
				form: { amount: "9000", label: "食費" },
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
				form: { amount: "1500", label: "日用品" },
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
				form: { amount: "1000", label: "食費" },
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
				form: { amount: "9000", label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				form: { amount: "8000", label: "食費" },
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
				form: { amount: "3000", label: "お釣り修正" },
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
				form: { amount: "3000", label: "お釣り修正", category: "advance" } as {
					amount: string;
					label: string;
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({ category: "deposit" });
	});

	it("画像追加でフィールド変更なしでも新バージョンが作成される", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				form: {
					amount: "1500",
					label: "食費",
					image1: createTestFile("receipt.jpg", "image/jpeg"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body).toMatchObject({
			amount: 1500,
			label: "食費",
			originalId: entry.id,
			latest: true,
		});
		expect(body.images).toHaveLength(1);

		const dbVersions = await queryVersionsByOriginalId(entry.id);
		expect(dbVersions).toHaveLength(2);
		expect(dbVersions[0].latest).toBe(true);
		expect(dbVersions[1].latest).toBe(false);
	});

	it("画像削除でフィールド変更なしでも新バージョンが作成される", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		// まず画像付きで修正
		const addRes = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				form: {
					amount: "1500",
					label: "食費",
					image1: createTestFile("receipt.jpg", "image/jpeg"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);
		const addBody = await addRes.json();
		if ("error" in addBody) throw new Error("unexpected error");
		const imageId = addBody.images[0].id;

		// 画像削除のみで修正
		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				form: {
					amount: "1500",
					label: "食費",
					deleteImageIds: imageId,
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(0);

		const dbVersions = await queryVersionsByOriginalId(entry.id);
		expect(dbVersions).toHaveLength(3);
	});

	it("修正時に画像の追加と削除を同時に行える", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		// 画像付きで修正
		const addRes = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				form: {
					amount: "1500",
					label: "食費",
					image1: createTestFile("old.jpg", "image/jpeg"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);
		const addBody = await addRes.json();
		if ("error" in addBody) throw new Error("unexpected error");
		const oldImageId = addBody.images[0].id;

		// 古い画像を削除しつつ新しい画像を追加
		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				form: {
					amount: "1500",
					label: "食費",
					deleteImageIds: oldImageId,
					image1: createTestFile("new.png", "image/png"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
		expect(body.images[0].id).not.toBe(oldImageId);
	});

	it("変更がない場合は 400 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				form: { amount: "1500", label: "食費" },
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
				form: { amount: "1000", label: "食費" },
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
				form: { amount: "1000", label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("存在しない ID の場合 404 を返す", async () => {
		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: "nonexistent" },
				form: { amount: "1000", label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id);

		const res = await client.api.entries[":originalId"].modify.$post({
			param: { originalId: entry.id },
			form: { amount: "1000", label: "食費" },
		});

		expect(res.status).toBe(401);
	});

	it("修正時にサポートされていないファイル形式は 400 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				form: {
					amount: "1500",
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

	it("修正で削除した画像は R2 からも削除される", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 1500,
			label: "食費",
		});

		// 画像追加
		const addRes = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				form: {
					amount: "1500",
					label: "食費",
					image1: createTestFile("receipt.jpg", "image/jpeg"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);
		const addBody = await addRes.json();
		if ("error" in addBody) throw new Error("unexpected error");
		const imageId = addBody.images[0].id;

		// storagePath を DB から取得
		const db = drizzle(env.DB);
		const [imageMeta] = await db
			.select()
			.from(entryImages)
			.where(eq(entryImages.id, imageId))
			.all();
		const storagePath = imageMeta.storagePath;

		// 画像削除
		await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				form: {
					amount: "1500",
					label: "食費",
					deleteImageIds: imageId,
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		// R2 から削除されていることを確認
		const r2Object = await env.R2.get(storagePath);
		expect(r2Object).toBeNull();
	});
});
