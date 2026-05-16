import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertEntry,
	insertEntryImage,
	insertPartnership,
	OTHER_USER,
	seedOtherUser,
	setupAuth,
	setupDB,
} from "./helpers";

beforeAll(async () => {
	await setupDB();
	await setupAuth();
});

describe("GET /api/partner/entries/:id", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
		await seedOtherUser();
	});

	it("パートナーの記録を取得できる", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		const entry = await insertEntry(OTHER_USER.id, {
			amount: 1800,
			label: "パートナーの食費",
		});

		const res = await client.api.partner.entries[":id"].$get(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		if (res.status !== 200) return;
		const body = await res.json();
		expect(body.id).toBe(entry.id);
		expect(body.userId).toBe(OTHER_USER.id);
		expect(body.amount).toBe(1800);
		expect(body.label).toBe("パートナーの食費");
		expect(body.versions).toHaveLength(1);
		expect(body.images).toEqual([]);
	});

	it("パートナーの記録に紐づく画像が返される", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		const entry = await insertEntry(OTHER_USER.id);
		const image = await insertEntryImage(entry.id);

		const res = await client.api.partner.entries[":id"].$get(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(200);
		if (res.status !== 200) return;
		const body = await res.json();
		expect(body.images).toHaveLength(1);
		expect(body.images[0].id).toBe(image.id);
	});

	it("自分の記録は取得できない（404 を返す）", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);
		const myEntry = await insertEntry(TEST_USER.id);

		const res = await client.api.partner.entries[":id"].$get(
			{ param: { id: myEntry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("存在しない記録は 404 を返す", async () => {
		await insertPartnership(TEST_USER.id, OTHER_USER.id);

		const res = await client.api.partner.entries[":id"].$get(
			{ param: { id: "missing-id" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("パートナーシップがない場合は 404 を返す", async () => {
		const entry = await insertEntry(OTHER_USER.id);

		const res = await client.api.partner.entries[":id"].$get(
			{ param: { id: entry.id } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(404);
	});

	it("ログインしていないと 401 を返す", async () => {
		const res = await client.api.partner.entries[":id"].$get({
			param: { id: "any-id" },
		});

		expect(res.status).toBe(401);
	});
});
