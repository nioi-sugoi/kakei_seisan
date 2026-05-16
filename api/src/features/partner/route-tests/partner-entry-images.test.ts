import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../../index";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	buildOtherUserAuthCookie,
	insertEntry,
	insertPartnership,
	OTHER_USER,
	seedOtherUser,
	setupAuth,
	setupDB,
} from "./helpers";

function createTestFile(name: string, type: string, sizeBytes = 1024): File {
	const buffer = new ArrayBuffer(sizeBytes);
	return new File([buffer], name, { type });
}

/** パートナー(OTHER_USER)のエントリーに画像をアップロード */
async function uploadImageAsPartner(
	entryId: string,
): Promise<{ imageId: string }> {
	const formData = new FormData();
	formData.append("image", createTestFile("receipt.jpg", "image/jpeg", 2048));

	const otherCookie = await buildOtherUserAuthCookie();
	const res = await app.request(
		`/api/entries/${entryId}/images`,
		{ method: "POST", headers: { Cookie: otherCookie }, body: formData },
		env,
	);
	if (res.status !== 201) {
		throw new Error(`image upload failed: ${res.status}`);
	}
	const body = (await res.json()) as { id: string };
	return { imageId: body.id };
}

async function cleanR2() {
	const listed = await env.R2.list();
	for (const obj of listed.objects) {
		await env.R2.delete(obj.key);
	}
}

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

describe("GET /api/partner/entries/:entryId/images/:imageId", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await seedOtherUser();
		await cleanR2();
	});

	it("パートナーの記録画像をダウンロードできる", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		const entry = await insertEntry(OTHER_USER.id);
		const { imageId } = await uploadImageAsPartner(entry.id);

		const res = await app.request(
			`/api/partner/entries/${entry.id}/images/${imageId}`,
			{ headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("image/jpeg");
		const blob = await res.blob();
		expect(blob.size).toBe(2048);
	});

	it("パートナーシップがない場合は 404 を返す", async () => {
		const entry = await insertEntry(OTHER_USER.id);
		const { imageId } = await uploadImageAsPartner(entry.id);

		const res = await app.request(
			`/api/partner/entries/${entry.id}/images/${imageId}`,
			{ headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(404);
	});

	it("自分の記録の画像はパートナーエンドポイントでは取得できない", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		const entry = await insertEntry(TEST_USER.id);
		const formData = new FormData();
		formData.append("image", createTestFile("receipt.jpg", "image/jpeg"));
		const imgRes = await app.request(
			`/api/entries/${entry.id}/images`,
			{ method: "POST", headers: { Cookie: authCookie }, body: formData },
			env,
		);
		const imgBody = (await imgRes.json()) as { id: string };

		const res = await app.request(
			`/api/partner/entries/${entry.id}/images/${imgBody.id}`,
			{ headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(404);
	});

	it("存在しない画像IDは 404 を返す", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		const entry = await insertEntry(OTHER_USER.id);

		const res = await app.request(
			`/api/partner/entries/${entry.id}/images/nonexistent`,
			{ headers: { Cookie: authCookie } },
			env,
		);

		expect(res.status).toBe(404);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await app.request(
			"/api/partner/entries/any/images/any",
			{},
			env,
		);

		expect(res.status).toBe(401);
	});
});
