import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { partnerInvitations } from "../../../db/schema";
import { seedTestUser, TEST_USER } from "../../../testing/auth-helper";
import { cleanAllTables } from "../../../testing/db-helper";
import {
	authCookie,
	client,
	insertInvitation,
	insertPartnership,
	OTHER_USER,
	seedOtherUser,
	seedThirdUser,
	setupAuth,
	THIRD_USER,
} from "./helpers";

beforeAll(async () => {
	await setupAuth();
});

describe("POST /api/partner-invitations", () => {
	beforeEach(async () => {
		await cleanAllTables();
		await seedTestUser();
	});

	it("パートナー招待を作成できる", async () => {
		const res = await client.api["partner-invitations"].$post(
			{ json: { inviteeEmail: "partner@example.com" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			inviterId: TEST_USER.id,
			inviteeEmail: "partner@example.com",
			status: "pending",
		});
		expect(body).toHaveProperty("id", expect.any(String));
		expect(body).toHaveProperty("expiresAt", expect.any(Number));
	});

	it("作成した招待がDBに保存される", async () => {
		await client.api["partner-invitations"].$post(
			{ json: { inviteeEmail: "partner@example.com" } },
			{ headers: { Cookie: authCookie } },
		);

		const db = drizzle(env.DB);
		const result = await db
			.select()
			.from(partnerInvitations)
			.where(eq(partnerInvitations.inviterId, TEST_USER.id))
			.all();

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			inviterId: TEST_USER.id,
			inviteeEmail: "partner@example.com",
			status: "pending",
		});
	});

	it("有効期限が約24時間後に設定される", async () => {
		const before = Date.now();
		const res = await client.api["partner-invitations"].$post(
			{ json: { inviteeEmail: "partner@example.com" } },
			{ headers: { Cookie: authCookie } },
		);
		const after = Date.now();

		expect(res.status).toBe(201);
		const body: Record<string, unknown> = await res.json();
		const twentyFourHours = 24 * 60 * 60 * 1000;
		const expiresAt = body.expiresAt;
		expect(expiresAt).toBeGreaterThanOrEqual(before + twentyFourHours);
		expect(expiresAt).toBeLessThanOrEqual(after + twentyFourHours);
	});

	it("自分自身のメールアドレスには招待を送れない", async () => {
		const res = await client.api["partner-invitations"].$post(
			{ json: { inviteeEmail: TEST_USER.email } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "自分自身を招待することはできません");
	});

	it("既にパートナーがいる場合は招待を送れない", async () => {
		await seedOtherUser();
		await insertPartnership(TEST_USER.id, OTHER_USER.id);

		const res = await client.api["partner-invitations"].$post(
			{ json: { inviteeEmail: "another@example.com" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body).toHaveProperty("error", "すでにパートナーが登録されています");
	});

	it("指定したメールアドレスに紐づくアカウントがなくても招待を送信できる", async () => {
		const res = await client.api["partner-invitations"].$post(
			{ json: { inviteeEmail: "unregistered@example.com" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body).toMatchObject({
			inviterId: TEST_USER.id,
			inviteeEmail: "unregistered@example.com",
			status: "pending",
		});
	});

	it("相手にすでにパートナーがいる場合は招待できない", async () => {
		await seedOtherUser();
		await seedThirdUser();
		await insertPartnership(OTHER_USER.id, THIRD_USER.id);

		const res = await client.api["partner-invitations"].$post(
			{ json: { inviteeEmail: OTHER_USER.email } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body).toHaveProperty(
			"error",
			"招待先のユーザーは既にパートナーが登録されています",
		);
	});

	it("すでに有効期限内の招待を送信済みの場合は招待を送信できない", async () => {
		await insertInvitation(TEST_USER.id, "first@example.com");

		const res = await client.api["partner-invitations"].$post(
			{ json: { inviteeEmail: "second@example.com" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body).toHaveProperty("error", "すでに有効な招待があります");
	});

	it("有効期限切れの招待があっても新しい招待を送信できる", async () => {
		await insertInvitation(TEST_USER.id, "first@example.com", {
			expiresAt: Date.now() - 1000,
		});

		const res = await client.api["partner-invitations"].$post(
			{ json: { inviteeEmail: "second@example.com" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(201);
	});

	it("メールアドレスの形式が不正な場合 400 を返す", async () => {
		const res = await client.api["partner-invitations"].$post(
			{ json: { inviteeEmail: "not-an-email" } },
			{ headers: { Cookie: authCookie } },
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toHaveProperty("error", "バリデーションエラー");
	});

	it("認証なしでリクエストすると 401 を返す", async () => {
		const res = await client.api["partner-invitations"].$post({
			json: { inviteeEmail: "partner@example.com" },
		});

		expect(res.status).toBe(401);
	});
});
