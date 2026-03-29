import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { entries, settlements } from "../../../db/schema";
import { client } from "../../../testing/app-helper";
import {
	authCookie,
	OTHER_USER,
	seedOtherUser,
	seedTestUser,
	setupAuth,
	TEST_USER,
} from "../../../testing/auth-helper";
import { cleanAllTables, setupDB } from "../../../testing/db-helper";

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

async function insertEntry(
	userId: string,
	overrides: Partial<typeof entries.$inferInsert>,
) {
	const db = drizzle(env.DB);
	const id = crypto.randomUUID();
	await db.insert(entries).values({
		id,
		userId,
		category: "advance",
		amount: 0,
		occurredOn: "2024-03-15",
		label: "テスト",
		originalId: id,
		...overrides,
	});
}

async function insertSettlement(
	userId: string,
	overrides: Partial<typeof settlements.$inferInsert>,
) {
	const db = drizzle(env.DB);
	const id = crypto.randomUUID();
	await db.insert(settlements).values({
		id,
		userId,
		category: "fromHousehold",
		amount: 0,
		occurredOn: "2024-03-15",
		originalId: id,
		createdAt: Date.now(),
		...overrides,
	});
}

describe("GET /api/balance", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("記録も精算もない場合は全て 0 を返す", async () => {
		const res = await client.api.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(body).toEqual({
			advanceTotal: 0,
			depositTotal: 0,
			fromHouseholdTotal: 0,
			fromUserTotal: 0,
			balance: 0,
		});
	});

	it("立替のみの場合、残高 = 立替合計", async () => {
		await insertEntry(TEST_USER.id, { category: "advance", amount: 3000 });
		await insertEntry(TEST_USER.id, { category: "advance", amount: 2000 });

		const res = await client.api.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(body).toEqual({
			advanceTotal: 5000,
			depositTotal: 0,
			fromHouseholdTotal: 0,
			fromUserTotal: 0,
			balance: 5000,
		});
	});

	it("残高 = 立替合計 − 預り合計 − 家計からの精算合計 + ユーザーからの精算合計", async () => {
		await insertEntry(TEST_USER.id, { category: "advance", amount: 10000 });
		await insertEntry(TEST_USER.id, { category: "deposit", amount: 3000 });
		await insertSettlement(TEST_USER.id, {
			category: "fromHousehold",
			amount: 4000,
		});
		await insertSettlement(TEST_USER.id, {
			category: "fromUser",
			amount: 1000,
		});

		const res = await client.api.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(body).toEqual({
			advanceTotal: 10000,
			depositTotal: 3000,
			fromHouseholdTotal: 4000,
			fromUserTotal: 1000,
			balance: 4000,
		});
	});

	it("預り超過の場合は残高がマイナスになる", async () => {
		await insertEntry(TEST_USER.id, { category: "advance", amount: 1000 });
		await insertEntry(TEST_USER.id, { category: "deposit", amount: 5000 });

		const res = await client.api.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(body.balance).toBe(-4000);
	});

	it("ユーザーからの精算は残高を増やす", async () => {
		await insertEntry(TEST_USER.id, { category: "advance", amount: 1000 });
		await insertEntry(TEST_USER.id, { category: "deposit", amount: 5000 });
		await insertSettlement(TEST_USER.id, {
			category: "fromUser",
			amount: 2000,
		});

		const res = await client.api.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(body.balance).toBe(-2000);
		expect(body.fromUserTotal).toBe(2000);
	});

	it("取り消された記録は集計に含まれない", async () => {
		await insertEntry(TEST_USER.id, { category: "advance", amount: 5000 });
		await insertEntry(TEST_USER.id, {
			category: "advance",
			amount: 3000,
			cancelled: true,
		});

		const res = await client.api.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(body.advanceTotal).toBe(5000);
	});

	it("最新版ではない記録は集計に含まれない", async () => {
		await insertEntry(TEST_USER.id, { category: "advance", amount: 5000 });
		await insertEntry(TEST_USER.id, {
			category: "advance",
			amount: 3000,
			latest: false,
		});

		const res = await client.api.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(body.advanceTotal).toBe(5000);
	});

	it("取り消された精算は集計に含まれない", async () => {
		await insertSettlement(TEST_USER.id, {
			category: "fromHousehold",
			amount: 5000,
		});
		await insertSettlement(TEST_USER.id, {
			category: "fromHousehold",
			amount: 3000,
			cancelled: true,
		});

		const res = await client.api.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(body.fromHouseholdTotal).toBe(5000);
	});

	it("最新版ではない精算は集計に含まれない", async () => {
		await insertSettlement(TEST_USER.id, {
			category: "fromHousehold",
			amount: 5000,
		});
		await insertSettlement(TEST_USER.id, {
			category: "fromHousehold",
			amount: 3000,
			latest: false,
		});

		const res = await client.api.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(body.fromHouseholdTotal).toBe(5000);
	});

	it("他ユーザーのデータは集計に含まれない", async () => {
		await seedOtherUser();
		await insertEntry(TEST_USER.id, { category: "advance", amount: 5000 });
		await insertEntry(OTHER_USER.id, { category: "advance", amount: 9999 });

		const res = await client.api.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(body.advanceTotal).toBe(5000);
	});

	it("精算を取り消すと残高に反映される", async () => {
		await insertEntry(TEST_USER.id, { category: "advance", amount: 10000 });

		const settlementRes = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "3000",
					occurredOn: "2024-03-15",
				},
			},
			{ headers: { Cookie: authCookie } },
		);
		const settlement = await settlementRes.json();
		if ("error" in settlement) throw new Error("unexpected error");

		await client.api.settlements[":originalId"].cancel.$post(
			{ param: { originalId: settlement.id } },
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(body.fromHouseholdTotal).toBe(0);
		expect(body.balance).toBe(10000);
	});

	it("精算を修正すると残高に反映される", async () => {
		await insertEntry(TEST_USER.id, { category: "advance", amount: 10000 });

		const settlementRes = await client.api.settlements.$post(
			{
				form: {
					category: "fromHousehold",
					amount: "3000",
					occurredOn: "2024-03-15",
				},
			},
			{ headers: { Cookie: authCookie } },
		);
		const settlement = await settlementRes.json();
		if ("error" in settlement) throw new Error("unexpected error");

		await client.api.settlements[":originalId"].modify.$post(
			{
				param: { originalId: settlement.id },
				form: { amount: "5000" },
			},
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		const body = await res.json();
		expect(body.fromHouseholdTotal).toBe(5000);
		expect(body.balance).toBe(5000);
	});

	it("ログインしていないとエラーになる", async () => {
		const res = await client.api.balance.$get({});

		expect(res.status).toBe(401);
	});
});
