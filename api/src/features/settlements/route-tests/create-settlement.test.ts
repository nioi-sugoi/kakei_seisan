import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { settlements } from "../../../db/schema";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import { authCookie, client, setupAuth, setupDB } from "./helpers";

function createTestFile(name: string, type: string, sizeBytes = 1024): File {
	const buffer = new ArrayBuffer(sizeBytes);
	return new File([buffer], name, { type });
}

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

describe("POST /api/settlements", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("家計からの精算を登録できる", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "5000",
					occurredOn: "2024-03-15",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body).toMatchObject({
			category: "fromHousehold",
			amount: 5000,
			occurredOn: "2024-03-15",
			userId: TEST_USER.id,
			cancelled: false,
			latest: true,
			status: "approved",
		});
		expect(body.originalId).toBe(body.id);
		expect(body.images).toEqual([]);
	});

	it("ユーザーからの精算を登録できる", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromUser",
					amount: "3000",
					occurredOn: "2024-03-15",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body).toMatchObject({
			category: "fromUser",
			amount: 3000,
		});
	});

	it("登録した精算が DB に保存される", async () => {
		await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "3000",
					occurredOn: "2024-04-01",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		const db = drizzle(env.DB);
		const result = await db
			.select()
			.from(settlements)
			.where(eq(settlements.userId, TEST_USER.id))
			.all();

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			category: "fromHousehold",
			amount: 3000,
			occurredOn: "2024-04-01",
			cancelled: false,
			latest: true,
		});
	});

	it("ログインしていないとエラーになる", async () => {
		const res = await client.api.settlements.$post({
			form: {
				category: "fromHousehold",
				amount: "1000",
				occurredOn: "2024-03-15",
			},
		});

		expect(res.status).toBe(401);
	});

	it("金額が0円の場合はエラーになる", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "0",
					occurredOn: "2024-03-15",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});

	it("金額がマイナスの場合はエラーになる", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "-100",
					occurredOn: "2024-03-15",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});

	it("金額が小数の場合はエラーになる", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "100.5",
					occurredOn: "2024-03-15",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});

	it("日付の形式が正しくない場合はエラーになる", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "1000",
					occurredOn: "2024/03/15",
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});

	it("画像付きで精算を登録できる", async () => {
		const res = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "5000",
					occurredOn: "2024-03-15",
					image1: createTestFile("receipt.jpg", "image/jpeg"),
				},
			},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		if ("error" in body) throw new Error("unexpected error");
		expect(body.images).toHaveLength(1);
		expect(body.images[0]).toHaveProperty("id");
		expect(body.images[0]).toHaveProperty("displayOrder", 0);
	});
});
