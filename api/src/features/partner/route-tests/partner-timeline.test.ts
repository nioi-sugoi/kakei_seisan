import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertEntry,
	insertEntryImage,
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

describe("GET /api/partner/timeline", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await seedOtherUser();
	});

	it("パートナーの記録も精算もない場合は空配列を返す", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);

		const res = await client.api.partner.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body).toEqual({ data: [], nextCursor: null });
	});

	it("パートナーの記録が返される", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		await insertEntry(OTHER_USER.id, {
			label: "パートナーの食費",
			amount: 2000,
		});

		const res = await client.api.partner.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].type).toBe("entry");
		expect(body.data[0].label).toBe("パートナーの食費");
		expect(body.data[0].amount).toBe(2000);
	});

	it("パートナーの精算が返される", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		await insertSettlement(OTHER_USER.id, { amount: 3000 });

		const res = await client.api.partner.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].type).toBe("settlement");
		expect(body.data[0].amount).toBe(3000);
	});

	it("自分のデータはパートナータイムラインに含まれない", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		await insertEntry(TEST_USER.id, { label: "自分の食費", amount: 9999 });
		await insertEntry(OTHER_USER.id, {
			label: "パートナーの食費",
			amount: 1000,
		});

		const res = await client.api.partner.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].label).toBe("パートナーの食費");
	});

	it("カテゴリで絞り込みできる", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		await insertEntry(OTHER_USER.id, {
			category: "advance",
			label: "立替",
			amount: 1000,
		});
		await insertEntry(OTHER_USER.id, {
			category: "deposit",
			label: "預り",
			amount: 2000,
		});

		const res = await client.api.partner.timeline.$get(
			{ query: { category: "advance" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].label).toBe("立替");
	});

	it("occurredOn で昇順ソートできる", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		await insertEntry(OTHER_USER.id, {
			label: "古い",
			occurredOn: "2024-01-01",
		});
		await insertEntry(OTHER_USER.id, {
			label: "新しい",
			occurredOn: "2024-03-01",
		});

		const res = await client.api.partner.timeline.$get(
			{ query: { sortBy: "occurredOn", sortOrder: "asc" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(2);
		expect(body.data[0].label).toBe("古い");
		expect(body.data[1].label).toBe("新しい");
	});

	it("画像数が返される", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		const entry = await insertEntry(OTHER_USER.id, { label: "レシート付き" });
		await insertEntryImage(entry.id);
		await insertEntryImage(entry.id);

		const res = await client.api.partner.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data[0].imageCount).toBe(2);
	});

	it("パートナーシップがない場合は 404 を返す", async () => {
		const res = await client.api.partner.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("ログインしていないとエラーになる", async () => {
		const res = await client.api.partner.timeline.$get({ query: {} });

		expect(res.status).toBe(401);
	});
});
