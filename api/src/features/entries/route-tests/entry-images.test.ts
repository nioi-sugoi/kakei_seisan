import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { entryImages } from "../../../db/schema";
import app from "../../../index";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	buildOtherUserAuthCookie,
	insertEntry,
	seedOtherUser,
	setupAuth,
	setupDB,
} from "./helpers";

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
	const listed = await env.R2.list();
	for (const obj of listed.objects) {
		await env.R2.delete(obj.key);
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
		expect(body).not.toHaveProperty("storagePath");
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

	it("jpeg形式の画像をアップロードできる", async () => {
		const res = await postImage(
			entry.id,
			createTestFile("receipt.jpg", "image/jpeg"),
			authCookie,
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toHaveProperty("id");
	});

	it("png形式の画像をアップロードできる", async () => {
		const res = await postImage(
			entry.id,
			createTestFile("receipt.png", "image/png"),
			authCookie,
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toHaveProperty("id");
	});

	it("webp形式の画像をアップロードできる", async () => {
		const res = await postImage(
			entry.id,
			createTestFile("receipt.webp", "image/webp"),
			authCookie,
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toHaveProperty("id");
	});

	it("heic形式の画像をアップロードできる", async () => {
		const res = await postImage(
			entry.id,
			createTestFile("receipt.heic", "image/heic"),
			authCookie,
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toHaveProperty("id");
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

	it("存在しない記録へのアップロードは 404 を返す", async () => {
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

		const r2Object = await env.R2.get(images[0].storagePath);
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
		const uploaded = (await uploadRes.json()) as { id: string };

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

	it("他のユーザーの記録の画像は取得できない", async () => {
		const uploadRes = await postImage(
			entry.id,
			createTestFile("receipt.jpg", "image/jpeg"),
			authCookie,
		);
		const uploaded = (await uploadRes.json()) as { id: string };

		await seedOtherUser();
		const otherCookie = await buildOtherUserAuthCookie();

		const res = await app.request(
			`/api/entries/${entry.id}/images/${uploaded.id}`,
			{ headers: { Cookie: otherCookie } },
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
		const uploaded = (await uploadRes.json()) as { id: string };

		// DB から storagePath を取得（APIレスポンスにはリークしない）
		const db = drizzle(env.DB);
		const imagesBefore = await db
			.select()
			.from(entryImages)
			.where(eq(entryImages.entryId, entry.originalId))
			.all();
		expect(imagesBefore).toHaveLength(1);
		const storagePath = imagesBefore[0].storagePath;

		const res = await app.request(
			`/api/entries/${entry.id}/images/${uploaded.id}`,
			{ method: "DELETE", headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(200);

		const imagesAfter = await db
			.select()
			.from(entryImages)
			.where(eq(entryImages.entryId, entry.originalId))
			.all();
		expect(imagesAfter).toHaveLength(0);

		const r2Object = await env.R2.get(storagePath);
		expect(r2Object).toBeNull();
	});

	it("他のユーザーの記録の画像は削除できない", async () => {
		const uploadRes = await postImage(
			entry.id,
			createTestFile("receipt.jpg", "image/jpeg"),
			authCookie,
		);
		const uploaded = (await uploadRes.json()) as { id: string };

		await seedOtherUser();
		const otherCookie = await buildOtherUserAuthCookie();

		const res = await app.request(
			`/api/entries/${entry.id}/images/${uploaded.id}`,
			{ method: "DELETE", headers: { Cookie: otherCookie } },
			env,
		);

		expect(res.status).toBe(404);

		// 元のユーザーからはまだアクセスできることを確認
		const checkRes = await app.request(
			`/api/entries/${entry.id}/images/${uploaded.id}`,
			{ headers: { Cookie: authCookie } },
			env,
		);
		expect(checkRes.status).toBe(200);
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
