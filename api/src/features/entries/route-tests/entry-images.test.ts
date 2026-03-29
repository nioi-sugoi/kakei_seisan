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

/** JSON API でエントリーを作成し、専用エンドポイント経由で画像をアップロードする */
async function createEntryWithImage(
	entryId?: string,
	file?: File,
): Promise<{ entryId: string; imageId: string }> {
	let targetEntryId: string;
	if (entryId) {
		targetEntryId = entryId;
	} else {
		// 新規エントリーを JSON API で作成
		const res = await client.api.entries.$post(
			{
				json: {
					category: "advance",
					amount: 1500,
					occurredOn: "2024-03-15",
					label: "食費",
				},
			},
			{ headers: { Cookie: authCookie } },
		);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		targetEntryId = body.id;
	}

	// 専用エンドポイント経由で画像をアップロード
	const formData = new FormData();
	formData.append("image", file ?? createTestFile("receipt.jpg", "image/jpeg"));
	const imgRes = await app.request(
		`/api/entries/${targetEntryId}/images`,
		{ method: "POST", headers: { Cookie: authCookie }, body: formData },
		env,
	);
	if (imgRes.status !== 201) {
		const errBody = await imgRes.text();
		throw new Error(`image upload failed: ${imgRes.status} ${errBody}`);
	}
	const imgBody = (await imgRes.json()) as { id: string };
	return { entryId: targetEntryId, imageId: imgBody.id };
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

describe("GET /api/entries/:id（画像メタデータ含む）", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await cleanR2();
	});

	it("記録詳細に画像メタデータが含まれる", async () => {
		const { entryId } = await createEntryWithImage();

		const res = await client.api.entries[":id"].$get(
			{ param: { id: entryId } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
		expect(body.images[0]).toHaveProperty("id");
		expect(body.images[0]).toHaveProperty("displayOrder", 0);
		expect(body.images[0]).toHaveProperty("createdAt");
		// storagePath はクライアントに返さない
		expect(body.images[0]).not.toHaveProperty("storagePath");
	});

	it("画像がない場合は空配列が返る", async () => {
		const entry = await insertEntry(TEST_USER.id);

		const res = await client.api.entries[":id"].$get(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toEqual([]);
	});
});

describe("POST /api/entries/:entryId/images（画像フォーマット）", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await cleanR2();
	});

	it("jpeg形式の画像をアップロードできる", async () => {
		const entry = await insertEntry(TEST_USER.id);
		const formData = new FormData();
		formData.append("image", createTestFile("receipt.jpg", "image/jpeg"));

		const res = await app.request(
			`/api/entries/${entry.id}/images`,
			{ method: "POST", headers: { Cookie: authCookie }, body: formData },
			env,
		);

		expect(res.status).toBe(201);
		const body = (await res.json()) as { id: string; displayOrder: number };
		expect(body).toHaveProperty("id");
		expect(body).toHaveProperty("displayOrder", 0);
	});

	it("png形式の画像をアップロードできる", async () => {
		const entry = await insertEntry(TEST_USER.id);
		const formData = new FormData();
		formData.append("image", createTestFile("receipt.png", "image/png"));

		const res = await app.request(
			`/api/entries/${entry.id}/images`,
			{ method: "POST", headers: { Cookie: authCookie }, body: formData },
			env,
		);

		expect(res.status).toBe(201);
		const body = (await res.json()) as { id: string };
		expect(body).toHaveProperty("id");
	});

	it("webp形式の画像をアップロードできる", async () => {
		const entry = await insertEntry(TEST_USER.id);
		const formData = new FormData();
		formData.append("image", createTestFile("receipt.webp", "image/webp"));

		const res = await app.request(
			`/api/entries/${entry.id}/images`,
			{ method: "POST", headers: { Cookie: authCookie }, body: formData },
			env,
		);

		expect(res.status).toBe(201);
		const body = (await res.json()) as { id: string };
		expect(body).toHaveProperty("id");
	});

	it("heic形式の画像をアップロードできる", async () => {
		const entry = await insertEntry(TEST_USER.id);
		const formData = new FormData();
		formData.append("image", createTestFile("receipt.heic", "image/heic"));

		const res = await app.request(
			`/api/entries/${entry.id}/images`,
			{ method: "POST", headers: { Cookie: authCookie }, body: formData },
			env,
		);

		expect(res.status).toBe(201);
		const body = (await res.json()) as { id: string };
		expect(body).toHaveProperty("id");
	});

	it("サポートされていないファイル形式は 400 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id);
		const formData = new FormData();
		formData.append("image", createTestFile("doc.pdf", "application/pdf"));

		const res = await app.request(
			`/api/entries/${entry.id}/images`,
			{ method: "POST", headers: { Cookie: authCookie }, body: formData },
			env,
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body).toHaveProperty(
			"error",
			"サポートされていないファイル形式です",
		);
	});

	it("10MBを超える画像は 400 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id);
		const formData = new FormData();
		formData.append(
			"image",
			createTestFile("big.jpg", "image/jpeg", 11 * 1024 * 1024),
		);

		const res = await app.request(
			`/api/entries/${entry.id}/images`,
			{ method: "POST", headers: { Cookie: authCookie }, body: formData },
			env,
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body).toHaveProperty(
			"error",
			"ファイルサイズは10MB以下にしてください",
		);
	});
});
