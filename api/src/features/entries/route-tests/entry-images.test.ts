import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { entryImages } from "../../../db/schema";
import app from "../../../index";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import { authCookie, client, insertEntry, setupAuth, setupDB } from "./helpers";

function createTestFile(name: string, type: string, sizeBytes = 1024): File {
	const buffer = new ArrayBuffer(sizeBytes);
	return new File([buffer], name, { type });
}

/** multipart で画像アップロードリクエストを送る */
async function postImage(
	entryId: string,
	file: File,
	cookie?: string,
): Promise<Response> {
	const formData = new FormData();
	formData.append("image", file);
	return app.request(
		`/api/entries/${entryId}/images`,
		{
			method: "POST",
			body: formData,
			headers: cookie ? { Cookie: cookie } : {},
		},
		env,
	);
}

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

async function cleanR2() {
	const listed = await env.RECEIPTS.list();
	for (const obj of listed.objects) {
		await env.RECEIPTS.delete(obj.key);
	}
}

describe("POST /api/entries/:entryId/images", () => {
	let entry: Awaited<ReturnType<typeof insertEntry>>;

	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		entry = await insertEntry(TEST_USER.id);
		await cleanR2();
	});

	it("画像をアップロードできる", async () => {
		const res = await postImage(
			entry.id,
			createTestFile("receipt.jpg", "image/jpeg"),
			authCookie,
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			entryId: entry.originalId,
			displayOrder: 0,
		});
		expect(body).toHaveProperty("id");
		expect(body).toHaveProperty("storagePath");
	});

	it("2枚目の画像をアップロードできる", async () => {
		await postImage(
			entry.id,
			createTestFile("receipt1.jpg", "image/jpeg"),
			authCookie,
		);

		const res = await postImage(
			entry.id,
			createTestFile("receipt2.png", "image/png"),
			authCookie,
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({ displayOrder: 1 });
	});

	it("3枚目のアップロードは 400 を返す", async () => {
		for (let i = 0; i < 2; i++) {
			await postImage(
				entry.id,
				createTestFile(`receipt${i}.jpg`, "image/jpeg"),
				authCookie,
			);
		}

		const res = await postImage(
			entry.id,
			createTestFile("receipt3.jpg", "image/jpeg"),
			authCookie,
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "画像は最大2枚までです");
	});

	it("サポートされていないファイル形式は 400 を返す", async () => {
		const res = await postImage(
			entry.id,
			createTestFile("doc.pdf", "application/pdf"),
			authCookie,
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty(
			"error",
			"サポートされていないファイル形式です",
		);
	});

	it("10MBを超えるファイルは 400 を返す", async () => {
		const res = await postImage(
			entry.id,
			createTestFile("big.jpg", "image/jpeg", 11 * 1024 * 1024),
			authCookie,
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty(
			"error",
			"ファイルサイズは10MB以下にしてください",
		);
	});

	it("存在しないエントリーへのアップロードは 404 を返す", async () => {
		const res = await postImage(
			"nonexistent",
			createTestFile("receipt.jpg", "image/jpeg"),
			authCookie,
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await postImage(
			entry.id,
			createTestFile("receipt.jpg", "image/jpeg"),
		);

		expect(res.status).toBe(401);
	});

	it("R2 に画像が保存される", async () => {
		await postImage(
			entry.id,
			createTestFile("receipt.jpg", "image/jpeg"),
			authCookie,
		);

		const db = drizzle(env.DB);
		const images = await db
			.select()
			.from(entryImages)
			.where(eq(entryImages.entryId, entry.originalId))
			.all();

		expect(images).toHaveLength(1);

		const r2Object = await env.RECEIPTS.get(images[0].storagePath);
		expect(r2Object).not.toBeNull();
	});
});

describe("GET /api/entries/:entryId/images/:imageId", () => {
	let entry: Awaited<ReturnType<typeof insertEntry>>;

	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		entry = await insertEntry(TEST_USER.id);
		await cleanR2();
	});

	it("アップロード済み画像をダウンロードできる", async () => {
		const uploadRes = await postImage(
			entry.id,
			createTestFile("receipt.jpg", "image/jpeg", 2048),
			authCookie,
		);
		const uploaded = (await uploadRes.json()) as {
			id: string;
			storagePath: string;
		};

		const res = await app.request(
			`/api/entries/${entry.id}/images/${uploaded.id}`,
			{ headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("image/jpeg");
		const blob = await res.blob();
		expect(blob.size).toBe(2048);
	});

	it("存在しない画像 ID は 404 を返す", async () => {
		const res = await app.request(
			`/api/entries/${entry.id}/images/nonexistent`,
			{ headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await app.request(
			`/api/entries/${entry.id}/images/any`,
			{},
			env,
		);

		expect(res.status).toBe(401);
	});
});

describe("DELETE /api/entries/:entryId/images/:imageId", () => {
	let entry: Awaited<ReturnType<typeof insertEntry>>;

	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		entry = await insertEntry(TEST_USER.id);
		await cleanR2();
	});

	it("画像を削除できる", async () => {
		const uploadRes = await postImage(
			entry.id,
			createTestFile("receipt.jpg", "image/jpeg"),
			authCookie,
		);
		const uploaded = (await uploadRes.json()) as {
			id: string;
			storagePath: string;
		};

		const res = await app.request(
			`/api/entries/${entry.id}/images/${uploaded.id}`,
			{ method: "DELETE", headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(200);

		const db = drizzle(env.DB);
		const images = await db
			.select()
			.from(entryImages)
			.where(eq(entryImages.entryId, entry.originalId))
			.all();
		expect(images).toHaveLength(0);

		const r2Object = await env.RECEIPTS.get(uploaded.storagePath);
		expect(r2Object).toBeNull();
	});

	it("存在しない画像 ID の削除は 404 を返す", async () => {
		const res = await app.request(
			`/api/entries/${entry.id}/images/nonexistent`,
			{ method: "DELETE", headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await app.request(
			`/api/entries/${entry.id}/images/any`,
			{ method: "DELETE" },
			env,
		);

		expect(res.status).toBe(401);
	});
});

describe("GET /api/entries/:id（画像メタデータ含む）", () => {
	let entry: Awaited<ReturnType<typeof insertEntry>>;

	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		entry = await insertEntry(TEST_USER.id);
		await cleanR2();
	});

	it("エントリー詳細に画像メタデータが含まれる", async () => {
		await postImage(
			entry.id,
			createTestFile("receipt.jpg", "image/jpeg"),
			authCookie,
		);

		const res = await client.api.entries[":id"].$get(
			{ param: { id: entry.id } },
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
