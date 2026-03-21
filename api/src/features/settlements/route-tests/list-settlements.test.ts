import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
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

describe("GET /api/settlements", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("精算が0件の場合は空配列を返す", async () => {
		const res = await client.api.settlements.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body).toEqual({ data: [], nextCursor: null });
	});

	it("自分の精算一覧を取得できる", async () => {
		await insertSettlement(TEST_USER.id, { amount: 5000 });
		await insertSettlement(TEST_USER.id, { amount: 3000 });

		const res = await client.api.settlements.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(2);
	});

	it("createdAt の降順で返される", async () => {
		const older = new Date("2024-01-01").getTime();
		const newer = new Date("2024-01-02").getTime();
		await insertSettlement(TEST_USER.id, { amount: 1000, createdAt: older });
		await insertSettlement(TEST_USER.id, { amount: 2000, createdAt: newer });

		const res = await client.api.settlements.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data[0].amount).toBe(2000);
		expect(body.data[1].amount).toBe(1000);
	});

	it("他のユーザーの精算は含まれない", async () => {
		await seedOtherUser();
		await insertSettlement(TEST_USER.id, { amount: 5000 });
		await insertSettlement(OTHER_USER.id, { amount: 3000 });

		const res = await client.api.settlements.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].amount).toBe(5000);
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await client.api.settlements.$get({ query: {} });

		expect(res.status).toBe(401);
	});
});
