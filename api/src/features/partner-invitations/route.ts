import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../types";
import * as repository from "./repository";

const createInvitationSchema = v.object({
	inviteeEmail: v.pipe(v.string(), v.email()),
});

const partnerInvitationsApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>()
	// ── POST / — 招待を作成 ────────────────────────────────────
	.post(
		"/",
		requireAuth,
		vValidator("json", createInvitationSchema, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						error: "バリデーションエラー" as const,
						issues: result.issues.map((issue) => ({
							field: String(issue.path?.[0]?.key ?? "unknown"),
							message: issue.message,
						})),
					},
					400,
				);
			}
		}),
		async (c) => {
			const user = c.get("user");
			const { inviteeEmail } = c.req.valid("json");
			const db = drizzle(c.env.DB);

			// 自分自身への招待を禁止
			if (inviteeEmail === user.email) {
				return c.json(
					{ error: "自分自身を招待することはできません" as const },
					400,
				);
			}

			// 既にパートナーがいる場合は招待不可
			const existingPartnership = await repository.findPartnershipByUser(
				db,
				user.id,
			);
			if (existingPartnership) {
				return c.json(
					{ error: "すでにパートナーが登録されています" as const },
					409,
				);
			}

			const invitation = await repository.createInvitation(
				db,
				user.id,
				inviteeEmail,
			);

			return c.json(invitation, 201);
		},
	)
	// ── GET /pending — 自分宛の pending 招待を取得 ─────────────
	.get("/pending", requireAuth, async (c) => {
		const user = c.get("user");
		const db = drizzle(c.env.DB);

		const invitations = await repository.findPendingByEmail(
			db,
			user.email,
			Date.now(),
		);

		return c.json({ data: invitations });
	})
	// ── POST /:id/accept — 招待を承認 ─────────────────────────
	.post("/:id/accept", requireAuth, async (c) => {
		const user = c.get("user");
		const invitationId = c.req.param("id");
		const db = drizzle(c.env.DB);

		// 招待を取得
		const invitation = await repository.findById(db, invitationId);
		if (!invitation) {
			return c.json({ error: "招待が見つかりません" as const }, 404);
		}

		// 自分宛の招待かチェック
		if (invitation.inviteeEmail !== user.email) {
			return c.json({ error: "招待が見つかりません" as const }, 404);
		}

		// ステータスチェック
		if (invitation.status !== "pending") {
			return c.json({ error: "この招待は既に処理されています" as const }, 409);
		}

		// 有効期限チェック
		if (invitation.expiresAt <= Date.now()) {
			await repository.updateStatus(db, invitationId, "expired");
			return c.json({ error: "招待の有効期限が切れています" as const }, 410);
		}

		// 承認者が既にパートナーを持っているかチェック
		const inviteePartnership = await repository.findPartnershipByUser(
			db,
			user.id,
		);
		if (inviteePartnership) {
			return c.json(
				{ error: "すでにパートナーが登録されています" as const },
				409,
			);
		}

		// 招待者が既にパートナーを持っているかチェック
		const inviterPartnership = await repository.findPartnershipByUser(
			db,
			invitation.inviterId,
		);
		if (inviterPartnership) {
			return c.json(
				{ error: "招待者は既に別のパートナーが登録されています" as const },
				409,
			);
		}

		// 招待を承認してパートナー関係を作成
		await repository.updateStatus(db, invitationId, "accepted");
		const partnership = await repository.createPartnership(
			db,
			invitation.inviterId,
			user.id,
		);

		return c.json(partnership, 201);
	});

export { partnerInvitationsApp };
