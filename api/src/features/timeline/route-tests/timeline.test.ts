import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertEntry,
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

describe("GET /api/timeline", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("記録も精算もない場合は空配列を返す", async () => {
		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body).toEqual({ data: [], nextCursor: null });
	});

	it("記録のみの場合は記録が返される", async () => {
		await insertEntry(TEST_USER.id, { label: "食費", amount: 1500 });

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].type).toBe("entry");
		expect(body.data[0].label).toBe("食費");
		expect(body.data[0].amount).toBe(1500);
	});

	it("精算のみの場合は精算が返される", async () => {
		await insertSettlement(TEST_USER.id, { amount: 3000 });

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].type).toBe("settlement");
		expect(body.data[0].amount).toBe(3000);
		expect(body.data[0].category).toBe("fromHousehold");
		expect(body.data[0].label).toBeNull();
	});

	it("記録と精算が createdAt 降順で混合されて返される", async () => {
		const t1 = new Date("2024-01-01").getTime();
		const t2 = new Date("2024-01-02").getTime();
		const t3 = new Date("2024-01-03").getTime();

		await insertEntry(TEST_USER.id, { label: "古い記録", createdAt: t1 });
		await insertSettlement(TEST_USER.id, { amount: 2000, createdAt: t2 });
		await insertEntry(TEST_USER.id, { label: "新しい記録", createdAt: t3 });

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(3);
		expect(body.data[0].type).toBe("entry");
		expect(body.data[0].label).toBe("新しい記録");
		expect(body.data[1].type).toBe("settlement");
		expect(body.data[1].amount).toBe(2000);
		expect(body.data[2].type).toBe("entry");
		expect(body.data[2].label).toBe("古い記録");
	});

	it("他のユーザーのデータは含まれない", async () => {
		await seedOtherUser();
		await insertEntry(TEST_USER.id, { label: "自分の記録" });
		await insertEntry(OTHER_USER.id, { label: "他人の記録" });
		await insertSettlement(OTHER_USER.id, { amount: 9999 });

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].label).toBe("自分の記録");
	});

	it("取り消し済みの記録はタイムラインに含まれるが旧バージョンは含まれない", async () => {
		const t1 = new Date("2024-01-01").getTime();
		const t2 = new Date("2024-01-02").getTime();
		const t3 = new Date("2024-01-03").getTime();

		await insertEntry(TEST_USER.id, {
			label: "通常",
			createdAt: t1,
		});
		await insertEntry(TEST_USER.id, {
			label: "取消済み",
			cancelled: true,
			createdAt: t2,
		});
		await insertEntry(TEST_USER.id, {
			label: "旧バージョン",
			latest: false,
			createdAt: t3,
		});

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(2);

		const cancelled = body.data.find((r) => r.label === "取消済み");
		expect(cancelled?.cancelled).toBe(true);

		const old = body.data.find((r) => r.label === "旧バージョン");
		expect(old).toBeUndefined();
	});

	it("取り消し状態と最新版フラグが真偽値で返される", async () => {
		await insertEntry(TEST_USER.id, { cancelled: false, latest: true });

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data[0].cancelled).toBe(false);
		expect(body.data[0].latest).toBe(true);
	});

	it("50件を超える場合は続きを取得できる", async () => {
		const base = new Date("2024-01-01").getTime();
		const inserts = [];
		for (let i = 0; i < 51; i++) {
			inserts.push(
				insertEntry(TEST_USER.id, {
					label: `記録${i}`,
					createdAt: base + i,
				}),
			);
		}
		await Promise.all(inserts);

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(50);
		expect(body.nextCursor).not.toBeNull();
	});

	it("50件以下の場合はすべて一度に返される", async () => {
		await insertEntry(TEST_USER.id);

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.nextCursor).toBeNull();
	});

	it("続きを読み込むとより古いデータが取得される", async () => {
		const t1 = new Date("2024-01-01").getTime();
		const t2 = new Date("2024-01-02").getTime();
		const t3 = new Date("2024-01-03").getTime();

		await insertEntry(TEST_USER.id, { label: "古い記録", createdAt: t1 });
		await insertSettlement(TEST_USER.id, { amount: 2000, createdAt: t2 });
		await insertEntry(TEST_USER.id, { label: "新しい記録", createdAt: t3 });

		const res = await client.api.timeline.$get(
			{ query: { cursor: String(t2) } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].label).toBe("古い記録");
	});

	it("続きを読み込むことで全データを取得できる", async () => {
		const base = new Date("2024-01-01").getTime();
		const inserts = [];
		for (let i = 0; i < 60; i++) {
			inserts.push(
				insertEntry(TEST_USER.id, {
					label: `記録${i}`,
					createdAt: base + i,
				}),
			);
		}
		await Promise.all(inserts);

		const firstRes = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);
		expect(firstRes.ok).toBe(true);
		if (!firstRes.ok) return;
		const firstBody = await firstRes.json();
		expect(firstBody.data).toHaveLength(50);
		expect(firstBody.nextCursor).not.toBeNull();

		const secondRes = await client.api.timeline.$get(
			{ query: { cursor: String(firstBody.nextCursor) } },
			{ headers: { Cookie: authCookie } },
		);
		expect(secondRes.ok).toBe(true);
		if (!secondRes.ok) return;
		const secondBody = await secondRes.json();
		expect(secondBody.data).toHaveLength(10);
		expect(secondBody.nextCursor).toBeNull();
	});

	it("記録のフィールドが正しく返される", async () => {
		await insertEntry(TEST_USER.id, {
			category: "deposit",
			amount: 5000,
			occurredOn: "2024-06-01",
			label: "立替金",
			memo: "テストメモ",
		});

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		const [record] = body.data;
		expect(record.type).toBe("entry");
		expect(record.category).toBe("deposit");
		expect(record.amount).toBe(5000);
		expect(record.occurredOn).toBe("2024-06-01");
		expect(record.label).toBe("立替金");
		expect(record.memo).toBe("テストメモ");
		expect(record.userId).toBe(TEST_USER.id);
		expect(record.id).toBe(record.originalId);
		expect(record.status).toBe("approved");
	});

	it("精算のフィールドが正しく返される", async () => {
		await insertSettlement(TEST_USER.id, {
			category: "fromUser",
			amount: 8000,
			occurredOn: "2024-07-01",
		});

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		const [record] = body.data;
		expect(record.type).toBe("settlement");
		expect(record.category).toBe("fromUser");
		expect(record.amount).toBe(8000);
		expect(record.occurredOn).toBe("2024-07-01");
		expect(record.label).toBeNull();
		expect(record.memo).toBeNull();
		expect(record.userId).toBe(TEST_USER.id);
		expect(record.id).toBe(record.originalId);
		expect(record.status).toBe("approved");
	});

	it("承認待ちステータスの記録が正しく返される", async () => {
		await insertEntry(TEST_USER.id, {
			label: "承認待ち記録",
			status: "pending",
		});

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data[0].status).toBe("pending");
		expect(body.data[0].approvalComment).toBeNull();
	});

	it("差し戻し記録の approvalComment が正しく返される", async () => {
		await insertEntry(TEST_USER.id, {
			label: "差し戻し記録",
			status: "rejected",
			approvalComment: "金額を確認してください",
		});

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data[0].status).toBe("rejected");
		expect(body.data[0].approvalComment).toBe("金額を確認してください");
	});

	it("精算の承認ステータスとコメントが正しく返される", async () => {
		await insertSettlement(TEST_USER.id, {
			amount: 5000,
			status: "rejected",
			approvalComment: "精算額が違います",
		});

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data[0].status).toBe("rejected");
		expect(body.data[0].approvalComment).toBe("精算額が違います");
	});

	it("承認済み記録の approvalComment が正しく返される", async () => {
		await insertEntry(TEST_USER.id, {
			label: "承認済み記録",
			status: "approved",
			approvalComment: "確認しました",
		});

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data[0].status).toBe("approved");
		expect(body.data[0].approvalComment).toBe("確認しました");
	});

	it("異なる承認ステータスの記録が混在して正しく返される", async () => {
		const t1 = new Date("2024-01-01").getTime();
		const t2 = new Date("2024-01-02").getTime();
		const t3 = new Date("2024-01-03").getTime();

		await insertEntry(TEST_USER.id, {
			label: "承認済み",
			status: "approved",
			createdAt: t1,
		});
		await insertEntry(TEST_USER.id, {
			label: "承認待ち",
			status: "pending",
			createdAt: t2,
		});
		await insertEntry(TEST_USER.id, {
			label: "差し戻し",
			status: "rejected",
			approvalComment: "要修正",
			createdAt: t3,
		});

		const res = await client.api.timeline.$get(
			{ query: {} },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.ok).toBe(true);
		if (!res.ok) return;
		const body = await res.json();
		expect(body.data).toHaveLength(3);
		expect(body.data[0].status).toBe("rejected");
		expect(body.data[0].approvalComment).toBe("要修正");
		expect(body.data[1].status).toBe("pending");
		expect(body.data[2].status).toBe("approved");
	});

	it("cursorが不正な値の場合は400エラーになる", async () => {
		const res = await client.api.timeline.$get(
			{ query: { cursor: "abc" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
	});

	it("ログインしていないとエラーになる", async () => {
		const res = await client.api.timeline.$get({ query: {} });

		expect(res.status).toBe(401);
	});

	describe("category フィルター", () => {
		it("category=advance で立替記録のみ返却される（精算は含まれない）", async () => {
			const t1 = new Date("2024-01-01").getTime();
			const t2 = new Date("2024-01-02").getTime();
			const t3 = new Date("2024-01-03").getTime();

			await insertEntry(TEST_USER.id, {
				category: "advance",
				label: "立替",
				createdAt: t1,
			});
			await insertEntry(TEST_USER.id, {
				category: "deposit",
				label: "預り",
				createdAt: t2,
			});
			await insertSettlement(TEST_USER.id, { amount: 5000, createdAt: t3 });

			const res = await client.api.timeline.$get(
				{ query: { category: "advance" } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.ok).toBe(true);
			if (!res.ok) return;
			const body = await res.json();
			expect(body.data).toHaveLength(1);
			expect(body.data[0].category).toBe("advance");
			expect(body.data[0].label).toBe("立替");
		});

		it("category=deposit で預り記録のみ返却される", async () => {
			const t1 = new Date("2024-01-01").getTime();
			const t2 = new Date("2024-01-02").getTime();

			await insertEntry(TEST_USER.id, {
				category: "advance",
				label: "立替",
				createdAt: t1,
			});
			await insertEntry(TEST_USER.id, {
				category: "deposit",
				label: "預り",
				createdAt: t2,
			});

			const res = await client.api.timeline.$get(
				{ query: { category: "deposit" } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.ok).toBe(true);
			if (!res.ok) return;
			const body = await res.json();
			expect(body.data).toHaveLength(1);
			expect(body.data[0].category).toBe("deposit");
			expect(body.data[0].label).toBe("預り");
		});

		it("category=settlement で精算のみ返却される（記録は含まれない）", async () => {
			const t1 = new Date("2024-01-01").getTime();
			const t2 = new Date("2024-01-02").getTime();

			await insertEntry(TEST_USER.id, {
				category: "advance",
				label: "立替",
				createdAt: t1,
			});
			await insertSettlement(TEST_USER.id, { amount: 3000, createdAt: t2 });

			const res = await client.api.timeline.$get(
				{ query: { category: "settlement" } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.ok).toBe(true);
			if (!res.ok) return;
			const body = await res.json();
			expect(body.data).toHaveLength(1);
			expect(body.data[0].type).toBe("settlement");
			expect(body.data[0].amount).toBe(3000);
		});

		it("category パラメータなしの場合は全件返却される", async () => {
			const t1 = new Date("2024-01-01").getTime();
			const t2 = new Date("2024-01-02").getTime();
			const t3 = new Date("2024-01-03").getTime();

			await insertEntry(TEST_USER.id, {
				category: "advance",
				label: "立替",
				createdAt: t1,
			});
			await insertEntry(TEST_USER.id, {
				category: "deposit",
				label: "預り",
				createdAt: t2,
			});
			await insertSettlement(TEST_USER.id, { amount: 5000, createdAt: t3 });

			const res = await client.api.timeline.$get(
				{ query: {} },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.ok).toBe(true);
			if (!res.ok) return;
			const body = await res.json();
			expect(body.data).toHaveLength(3);
		});

		it("category フィルター適用中に50件超で正しい nextCursor が返却される", async () => {
			const base = new Date("2024-01-01").getTime();
			const inserts = [];
			for (let i = 0; i < 51; i++) {
				inserts.push(
					insertEntry(TEST_USER.id, {
						category: "advance",
						label: `立替${i}`,
						createdAt: base + i,
					}),
				);
			}
			// deposit もあるが advance フィルターでは無視される
			inserts.push(
				insertEntry(TEST_USER.id, {
					category: "deposit",
					label: "預り",
					createdAt: base + 100,
				}),
			);
			await Promise.all(inserts);

			const res = await client.api.timeline.$get(
				{ query: { category: "advance" } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.ok).toBe(true);
			if (!res.ok) return;
			const body = await res.json();
			expect(body.data).toHaveLength(50);
			expect(body.nextCursor).not.toBeNull();
			// フィルタされた結果にdepositが含まれていないこと
			for (const record of body.data) {
				expect(record.category).toBe("advance");
			}
		});

		it("category フィルター + cursor で次ページが正しく返却される", async () => {
			const base = new Date("2024-01-01").getTime();
			const inserts = [];
			for (let i = 0; i < 55; i++) {
				inserts.push(
					insertEntry(TEST_USER.id, {
						category: "advance",
						label: `立替${i}`,
						createdAt: base + i,
					}),
				);
			}
			await Promise.all(inserts);

			const firstRes = await client.api.timeline.$get(
				{ query: { category: "advance" } },
				{ headers: { Cookie: authCookie } },
			);
			expect(firstRes.ok).toBe(true);
			if (!firstRes.ok) return;
			const firstBody = await firstRes.json();
			expect(firstBody.data).toHaveLength(50);
			expect(firstBody.nextCursor).not.toBeNull();

			const secondRes = await client.api.timeline.$get(
				{
					query: {
						category: "advance",
						cursor: String(firstBody.nextCursor),
					},
				},
				{ headers: { Cookie: authCookie } },
			);
			expect(secondRes.ok).toBe(true);
			if (!secondRes.ok) return;
			const secondBody = await secondRes.json();
			expect(secondBody.data).toHaveLength(5);
			expect(secondBody.nextCursor).toBeNull();
		});

		it("category フィルターで50件以下になった場合は nextCursor が null になる", async () => {
			const t1 = new Date("2024-01-01").getTime();
			const t2 = new Date("2024-01-02").getTime();

			await insertEntry(TEST_USER.id, {
				category: "advance",
				label: "立替",
				createdAt: t1,
			});
			await insertEntry(TEST_USER.id, {
				category: "deposit",
				label: "預り",
				createdAt: t2,
			});

			const res = await client.api.timeline.$get(
				{ query: { category: "advance" } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.ok).toBe(true);
			if (!res.ok) return;
			const body = await res.json();
			expect(body.data).toHaveLength(1);
			expect(body.nextCursor).toBeNull();
		});

		it("不正な category パラメータで400エラーが返却される", async () => {
			const res = await client.api.timeline.$get(
				// @ts-expect-error テスト用に不正な値を送信
				{ query: { category: "invalid" } },
				{ headers: { Cookie: authCookie } },
			);

			expect(res.status).toBe(400);
		});
	});
});
