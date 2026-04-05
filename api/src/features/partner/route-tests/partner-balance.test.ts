import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertEntry,
	insertPartnership,
	insertSettlement,
	OTHER_USER,
	seedOtherUser,
	setupAuth,
	setupDB,
} from "./helpers";

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

describe("GET /api/partner/balance", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await seedOtherUser();
	});

	it("パートナーの記録も精算もない場合は全て 0 を返す", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);

		const res = await client.api.partner.balance.$get(
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

	it("パートナーの残高 = 立替合計 − 預り合計 − 家計からの精算合計 + ユーザーからの精算合計", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		await insertEntry(OTHER_USER.id, { category: "advance", amount: 10000 });
		await insertEntry(OTHER_USER.id, { category: "deposit", amount: 3000 });
		await insertSettlement(OTHER_USER.id, {
			category: "fromHousehold",
			amount: 4000,
		});
		await insertSettlement(OTHER_USER.id, {
			category: "fromUser",
			amount: 1000,
		});

		const res = await client.api.partner.balance.$get(
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

	it("自分のデータはパートナー残高に含まれない", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		await insertEntry(TEST_USER.id, { category: "advance", amount: 9999 });
		await insertEntry(OTHER_USER.id, { category: "advance", amount: 1000 });

		const res = await client.api.partner.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.advanceTotal).toBe(1000);
	});

	it("取り消された記録はパートナー残高に含まれない", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		await insertEntry(OTHER_USER.id, { category: "advance", amount: 5000 });
		await insertEntry(OTHER_USER.id, {
			category: "advance",
			amount: 3000,
			cancelled: true,
		});

		const res = await client.api.partner.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.advanceTotal).toBe(5000);
	});

	it("最新版ではない記録はパートナー残高に含まれない", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		await insertEntry(OTHER_USER.id, { category: "advance", amount: 5000 });
		await insertEntry(OTHER_USER.id, {
			category: "advance",
			amount: 3000,
			latest: false,
		});

		const res = await client.api.partner.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.advanceTotal).toBe(5000);
	});

	it("パートナーがいない場合は 404 を返す", async () => {
		const res = await client.api.partner.balance.$get(
			{},
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("ログインしていないとエラーになる", async () => {
		const res = await client.api.partner.balance.$get({});

		expect(res.status).toBe(401);
	});
});
