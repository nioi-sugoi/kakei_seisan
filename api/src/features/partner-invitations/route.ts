import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import { handleValidationError } from "../../middleware/validation-error-handler";
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
		vValidator("json", createInvitationSchema, handleValidationError),
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

			// 相手が登録済みユーザーで既にパートナーがいる場合は招待不可
			const invitee = await repository.findUserByEmail(db, inviteeEmail);
			if (invitee) {
				const inviteePartnership = await repository.findPartnershipByUser(
					db,
					invitee.id,
				);
				if (inviteePartnership) {
					return c.json(
						{
							error:
								"招待先のユーザーは既にパートナーが登録されています" as const,
						},
						409,
					);
				}
			}

			// 既に有効期限内の招待がある場合は送信不可
			const existingInvitation = await repository.findPendingByInviter(
				db,
				user.id,
				Date.now(),
			);
			if (existingInvitation) {
				return c.json({ error: "すでに有効な招待があります" as const }, 409);
			}

			const invitation = await repository.createInvitation(
				db,
				user.id,
				inviteeEmail,
			);

			return c.json(invitation, 201);
		},
	)
	// ── GET /sent — 自分が送った招待を全件取得 ──────────────────
	.get("/sent", requireAuth, async (c) => {
		const user = c.get("user");
		const db = drizzle(c.env.DB);

		const invitations = await repository.findAllByInviter(db, user.id);

		return c.json({ data: invitations });
	})
	// ── GET /partnership — 自分のパートナー関係を取得 ────────────
	.get("/partnership", requireAuth, async (c) => {
		const user = c.get("user");
		const db = drizzle(c.env.DB);

		const partnership = await repository.findPartnershipWithPartnerInfo(
			db,
			user.id,
		);

		return c.json({ data: partnership ?? null });
	})
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
	// ── DELETE /:id — 送信した招待を解除 ──────────────────────
	.delete("/:id", requireAuth, async (c) => {
		const user = c.get("user");
		const invitationId = c.req.param("id");
		const db = drizzle(c.env.DB);

		const invitation = await repository.findById(db, invitationId);
		if (!invitation) {
			return c.json({ error: "招待が見つかりません" as const }, 404);
		}

		// 自分が送信した招待かチェック
		if (invitation.inviterId !== user.id) {
			return c.json({ error: "招待が見つかりません" as const }, 404);
		}

		// pending 状態のみ解除可能
		if (invitation.status !== "pending") {
			return c.json({ error: "この招待は既に処理されています" as const }, 409);
		}

		const cancelled = await repository.cancelInvitation(db, invitationId);

		return c.json(cancelled);
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
			return c.json({ error: "招待の有効期限が切れています" as const }, 410);
		}

		// 双方のパートナーシップを並列チェック
		const [inviteePartnership, inviterPartnership] = await Promise.all([
			repository.findPartnershipByUser(db, user.id),
			repository.findPartnershipByUser(db, invitation.inviterId),
		]);

		if (inviteePartnership) {
			return c.json(
				{ error: "すでにパートナーが登録されています" as const },
				409,
			);
		}

		if (inviterPartnership) {
			return c.json(
				{ error: "招待者は既に別のパートナーが登録されています" as const },
				409,
			);
		}

		// 招待を承認してパートナー関係を作成（アトミック）
		const partnership = await repository.acceptInvitationAndCreatePartnership(
			db,
			invitationId,
			invitation.inviterId,
			user.id,
		);

		return c.json(partnership, 201);
	});

export { partnerInvitationsApp };
