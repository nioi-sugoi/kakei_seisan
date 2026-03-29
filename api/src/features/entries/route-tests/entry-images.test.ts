import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../../index";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	buildOtherUserAuthCookie,
	client,
	insertEntry,
	seedOtherUser,
	setupAuth,
	setupDB,
} from "./helpers";

function createTestFile(name: string, type: string, sizeBytes = 1024): File {
	const buffer = new ArrayBuffer(sizeBytes);
	return new File([buffer], name, { type });
}

/** create-entry API 経由で画像付きエントリーを作成し、画像IDを返す */
async function createEntryWithImage(
	entryId?: string,
	file?: File,
): Promise<{ entryId: string; imageId: string }> {
	if (entryId) {
		// 既存エントリーに画像を追加（modify経由）
		const res = await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entryId },
				form: {
					amount: "1500",
					label: "食費",
					image1: file ?? createTestFile("receipt.jpg", "image/jpeg"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		return { entryId: body.originalId, imageId: body.images[0].id };
	}
	// 新規エントリー + 画像
	const res = await client.api.entries.$post(
		{
			form: {
				category: "advance",
				amount: "1500",
				occurredOn: "2024-03-15",
				label: "食費",
				image1: file ?? createTestFile("receipt.jpg", "image/jpeg"),
			},
		},
		{ headers: { Cookie: authCookie } },
	);
	const body = await res.json();
	if ("error" in body) throw new Error("unexpected error");
	return { entryId: body.id, imageId: body.images[0].id };
}

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

async function cleanR2() {
	const listed = await env.R2.list();
	for (const obj of listed.objects) {
		await env.R2.delete(obj.key);
	}
}

describe("GET /api/entries/:entryId/images/:imageId", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await cleanR2();
	});

	it("アップロード済み画像をダウンロードできる", async () => {
		const { entryId, imageId } = await createEntryWithImage(
			undefined,
			createTestFile("receipt.jpg", "image/jpeg", 2048),
		);

		const res = await app.request(
			`/api/entries/${entryId}/images/${imageId}`,
			{ headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("image/jpeg");
		const blob = await res.blob();
		expect(blob.size).toBe(2048);
	});

	it("存在しない画像 ID は 404 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id);

		const res = await app.request(
			`/api/entries/${entry.id}/images/nonexistent`,
			{ headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(404);
	});

	it("他のユーザーの記録の画像は取得できない", async () => {
		const { entryId, imageId } = await createEntryWithImage();

		await seedOtherUser();
		const otherCookie = await buildOtherUserAuthCookie();

		const res = await app.request(
			`/api/entries/${entryId}/images/${imageId}`,
			{ headers: { Cookie: otherCookie } },
			env,
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id);

		const res = await app.request(
			`/api/entries/${entry.id}/images/any`,
			{},
			env,
		);

		expect(res.status).toBe(401);
	});
});

describe("画像フォーマットのテスト", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await cleanR2();
	});

	it("jpeg形式の画像をアップロードできる", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1500",
					occurredOn: "2024-03-15",
					label: "食費",
					image1: createTestFile("receipt.jpg", "image/jpeg"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
	});

	it("png形式の画像をアップロードできる", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1500",
					occurredOn: "2024-03-15",
					label: "食費",
					image1: createTestFile("receipt.png", "image/png"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
	});

	it("webp形式の画像をアップロードできる", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1500",
					occurredOn: "2024-03-15",
					label: "食費",
					image1: createTestFile("receipt.webp", "image/webp"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
	});

	it("heic形式の画像をアップロードできる", async () => {
		const res = await client.api.entries.$post(
			{
				form: {
					category: "advance",
					amount: "1500",
					occurredOn: "2024-03-15",
					label: "食費",
					image1: createTestFile("receipt.heic", "image/heic"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
	});
});
