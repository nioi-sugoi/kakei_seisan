import { beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../testing/auth-helper";
import { cleanAllTables } from "../../testing/db-helper";
import {
	authCookie,
	client,
	insertEntry,
	OTHER_USER,
	seedOtherUser,
} from "./testing-helpers";

describe("GET /api/entries", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("記録が0件の場合は空配列を返す", async () => {
		const res = await client.api.entries.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ data: [], nextCursor: null });
	});

	it("自分の記録一覧を取得できる", async () => {
		await insertEntry(TEST_USER.id, { label: "食費", amount: 1500 });
		await insertEntry(TEST_USER.id, { label: "交通費", amount: 300 });

		const res = await client.api.entries.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(2);
	});

	it("createdAt の降順で返される", async () => {
		const baseTime = 1700000000000;
		await insertEntry(TEST_USER.id, {
			label: "古い記録",
			createdAt: baseTime,
		});
		await insertEntry(TEST_USER.id, {
			label: "新しい記録",
			createdAt: baseTime + 1000,
		});

		const res = await client.api.entries.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		const body = await res.json();
		expect(body.data[0].label).toBe("新しい記録");
		expect(body.data[1].label).toBe("古い記録");
	});

	it("他のユーザーの記録は含まれない", async () => {
		await seedOtherUser();
		await insertEntry(TEST_USER.id, { label: "自分の記録" });
		await insertEntry(OTHER_USER.id, { label: "他人の記録" });

		const res = await client.api.entries.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].label).toBe("自分の記録");
	});

	it("50件を超える場合は nextCursor を返す", async () => {
		const baseTime = 1700000000000;
		const inserts = [];
		for (let i = 0; i < 51; i++) {
			inserts.push(
				insertEntry(TEST_USER.id, {
					label: `記録${i}`,
					createdAt: baseTime + i,
				}),
			);
		}
		await Promise.all(inserts);

		const res = await client.api.entries.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		const body = await res.json();
		expect(body.data).toHaveLength(50);
		expect(body.nextCursor).not.toBeNull();
	});

	it("50件以下の場合は nextCursor が null", async () => {
		await insertEntry(TEST_USER.id);

		const res = await client.api.entries.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		const body = await res.json();
		expect(body.nextCursor).toBeNull();
	});

	it("cursor を指定するとそれより前の記録を返す", async () => {
		const baseTime = 1700000000000;
		await insertEntry(TEST_USER.id, {
			label: "古い記録",
			createdAt: baseTime,
		});
		await insertEntry(TEST_USER.id, {
			label: "中間の記録",
			createdAt: baseTime + 1000,
		});
		await insertEntry(TEST_USER.id, {
			label: "新しい記録",
			createdAt: baseTime + 2000,
		});

		// 中間の記録の createdAt をカーソルとして指定 → 古い記録のみ返る
		const res = await client.api.entries.$get(
			{ query: { cursor: String(baseTime + 1000) } },
			{ headers: { Cookie: authCookie } },
		);

		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].label).toBe("古い記録");
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await client.api.entries.$get({ query: {} });

		expect(res.status).toBe(401);
	});
});
