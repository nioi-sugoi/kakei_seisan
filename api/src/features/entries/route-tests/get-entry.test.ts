import { env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../../index";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertEntry,
	OTHER_USER,
	seedOtherUser,
	setupAuth,
	setupDB,
} from "./helpers";

function createTestFile(name: string, type: string, sizeBytes = 1024): File {
	const buffer = new ArrayBuffer(sizeBytes);
	return new File([buffer], name, { type });
}

async function postImage(
	entryId: string,
	file: File,
	cookie: string,
): Promise<Response> {
	const formData = new FormData();
	formData.append("image", file);
	return app.request(
		`/api/entries/${entryId}/images`,
		{ method: "POST", body: formData, headers: { Cookie: cookie } },
		env,
	);
}

async function cleanR2() {
	const listed = await env.RECEIPTS.list();
	for (const obj of listed.objects) {
		await env.RECEIPTS.delete(obj.key);
	}
}

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

describe("GET /api/entries/:id", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("自分の記録を取得できる", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			category: "advance",
			amount: 1500,
			occurredOn: "2024-03-15",
			label: "交通費",
		});

		const res = await client.api.entries[":id"].$get(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toMatchObject({
			id: entry.id,
			category: "advance",
			amount: 1500,
			occurredOn: "2024-03-15",
			label: "交通費",
			userId: TEST_USER.id,
			cancelled: false,
			latest: true,
			status: "approved",
		});
	});

	it("memo 付きの記録を取得できる", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			label: "ランチ",
			memo: "同僚と外食",
		});

		const res = await client.api.entries[":id"].$get(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveProperty("memo", "同僚と外食");
	});

	it("存在しない ID の場合 404 を返す", async () => {
		const res = await client.api.entries[":id"].$get(
			{ param: { id: "nonexistent-id" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error", "記録が見つかりません");
	});

	it("他のユーザーの記録は取得できない", async () => {
		await seedOtherUser();
		const entry = await insertEntry(OTHER_USER.id);

		const res = await client.api.entries[":id"].$get(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty("error", "記録が見つかりません");
	});

	it("versions にバージョン一覧が含まれる", async () => {
		const entry = await insertEntry(TEST_USER.id, {
			amount: 5000,
			label: "食費",
		});

		await client.api.entries[":originalId"].modify.$post(
			{
				param: { originalId: entry.id },
				json: { amount: 4000, label: "食費" },
			},
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.entries[":id"].$get(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.versions).toHaveLength(2);
		// createdAt DESC なので先頭が最新
		expect(body.versions[0].amount).toBe(4000);
		expect(body.versions[0].createdAt).toBeGreaterThan(
			body.versions[1].createdAt,
		);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const entry = await insertEntry(TEST_USER.id);

		const res = await client.api.entries[":id"].$get({
			param: { id: entry.id },
		});

		expect(res.status).toBe(401);
	});

	it("記録詳細に画像メタデータが含まれる", async () => {
		const entry = await insertEntry(TEST_USER.id);
		await cleanR2();
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

describe("POST → GET の結合テスト", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("POST で作成した記録を GET で取得できる", async () => {
		const createRes = await client.api.entries.$post(
			{
				json: {
					category: "advance",
					amount: 3000,
					occurredOn: "2024-04-01",
					label: "会議費",
					memo: "チームミーティング",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(createRes.status).toBe(201);
		const created = await createRes.json();
		if ("error" in created) throw new Error("unexpected validation error");

		const getRes = await client.api.entries[":id"].$get(
			{ param: { id: created.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(getRes.status).toBe(200);
		const fetched = await getRes.json();
		if ("error" in fetched) throw new Error("unexpected error");
		expect(fetched).toMatchObject({
			id: created.id,
			category: "advance",
			amount: 3000,
			occurredOn: "2024-04-01",
			label: "会議費",
			memo: "チームミーティング",
		});
	});
});
