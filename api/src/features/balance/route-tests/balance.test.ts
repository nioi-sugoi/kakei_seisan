import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { entryVersions, settlementVersions } from "../../../db/schema";
import { client } from "../../../testing/app-helper";
import {
	authCookie,
	OTHER_USER,
	seedOtherUser,
	seedTestUser,
	seedThirdUser,
	setupAuth,
	TEST_USER,
	THIRD_USER,
} from "../../../testing/auth-helper";
import { cleanAllTables, setupDB } from "../../../testing/db-helper";
import { insertPartnership } from "../../partner/route-tests/helpers";

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

async function insertEntry(
	userId: string,
	overrides: Partial<typeof entryVersions.$inferInsert>,
) {
	const db = drizzle(env.DB);
	const id = crypto.randomUUID();
	await db.insert(entryVersions).values({
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
	overrides: Partial<typeof settlementVersions.$inferInsert>,
) {
	const db = drizzle(env.DB);
	const id = crypto.randomUUID();
	await db.insert(settlementVersions).values({
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
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
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
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
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
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
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
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
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
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
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
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
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
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
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
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
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
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.fromHouseholdTotal).toBe(5000);
	});

	it("他ユーザーのデータは集計に含まれない", async () => {
		await seedOtherUser();
		await insertEntry(TEST_USER.id, { category: "advance", amount: 5000 });
		await insertEntry(OTHER_USER.id, { category: "advance", amount: 9999 });

		const res = await client.api.balance.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.advanceTotal).toBe(5000);
	});

	it("精算を取り消すと残高に反映される", async () => {
		await insertEntry(TEST_USER.id, { category: "advance", amount: 10000 });

		const settlementRes = await client.api.settlements.$post(
			{
				json: {
					category: "fromHousehold",
					amount: 3000,
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
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.fromHouseholdTotal).toBe(0);
		expect(body.balance).toBe(10000);
	});

	it("精算を修正すると残高に反映される", async () => {
		await insertEntry(TEST_USER.id, { category: "advance", amount: 10000 });

		const settlementRes = await client.api.settlements.$post(
			{
				json: {
					category: "fromHousehold",
					amount: 3000,
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
				json: { amount: 5000 },
			},
			{ headers: { Cookie: authCookie } },
		);

		const res = await client.api.balance.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.fromHouseholdTotal).toBe(5000);
		expect(body.balance).toBe(5000);
	});

	it("ログインしていないとエラーになる", async () => {
		const res = await client.api.balance.$get({ query: {} });

		expect(res.status).toBe(401);
	});

	describe("パートナーの残高 (userId パラメータ)", () => {
		it("パートナーの残高を取得できる", async () => {
			await seedOtherUser();
			await insertPartnership(TEST_USER.id, OTHER_USER.id);
			await insertEntry(OTHER_USER.id, {
				category: "advance",
				amount: 3000,
			});

			const res = await client.api.balance.$get(
				{ query: { userId: OTHER_USER.id } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.ok).toBe(true);
			if (!res.ok) return;
			const body = await res.json();
			expect(body.advanceTotal).toBe(3000);
			expect(body.balance).toBe(3000);
		});

		it("パートナーの残高には自分のデータが含まれない", async () => {
			await seedOtherUser();
			await insertPartnership(TEST_USER.id, OTHER_USER.id);
			await insertEntry(TEST_USER.id, {
				category: "advance",
				amount: 9999,
			});
			await insertEntry(OTHER_USER.id, {
				category: "advance",
				amount: 3000,
			});

			const res = await client.api.balance.$get(
				{ query: { userId: OTHER_USER.id } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.ok).toBe(true);
			if (!res.ok) return;
			const body = await res.json();
			expect(body.advanceTotal).toBe(3000);
		});

		it("invitee 側からもパートナーの残高を取得できる", async () => {
			await seedOtherUser();
			await insertPartnership(OTHER_USER.id, TEST_USER.id);
			await insertEntry(OTHER_USER.id, {
				category: "advance",
				amount: 5000,
			});

			const res = await client.api.balance.$get(
				{ query: { userId: OTHER_USER.id } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.ok).toBe(true);
			if (!res.ok) return;
			const body = await res.json();
			expect(body.advanceTotal).toBe(5000);
		});

		it("パートナーシップがない場合は403エラーになる", async () => {
			await seedOtherUser();

			const res = await client.api.balance.$get(
				{ query: { userId: OTHER_USER.id } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.status).toBe(403);
		});

		it("パートナーではないユーザーの残高は取得できない", async () => {
			await seedOtherUser();
			await seedThirdUser();
			await insertPartnership(TEST_USER.id, OTHER_USER.id);

			const res = await client.api.balance.$get(
				{ query: { userId: THIRD_USER.id } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.status).toBe(403);
		});

		it("自分のuserIdを指定した場合は自分の残高が返る", async () => {
			await insertEntry(TEST_USER.id, {
				category: "advance",
				amount: 7000,
			});

			const res = await client.api.balance.$get(
				{ query: { userId: TEST_USER.id } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.ok).toBe(true);
			if (!res.ok) return;
			const body = await res.json();
			expect(body.advanceTotal).toBe(7000);
		});

		it("パートナーの残高計算が正しい（立替−預り−精算）", async () => {
			await seedOtherUser();
			await insertPartnership(TEST_USER.id, OTHER_USER.id);
			await insertEntry(OTHER_USER.id, {
				category: "advance",
				amount: 10000,
			});
			await insertEntry(OTHER_USER.id, {
				category: "deposit",
				amount: 2000,
			});
			await insertSettlement(OTHER_USER.id, {
				category: "fromHousehold",
				amount: 3000,
			});

			const res = await client.api.balance.$get(
				{ query: { userId: OTHER_USER.id } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.ok).toBe(true);
			if (!res.ok) return;
			const body = await res.json();
			expect(body.balance).toBe(5000);
		});
	});
});
