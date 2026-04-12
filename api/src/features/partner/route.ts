import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import { serveR2Object } from "../../shared/r2";
import type { AppVariables } from "../../types";
import { calculateBalance } from "../balance/domain";
import { getEntryTotals, getSettlementTotals } from "../balance/repository";
import * as entriesRepository from "../entries/repository";
import * as settlementsRepository from "../settlements/repository";
import {
	InvalidCursorError,
	listByUserPaginated,
} from "../timeline/repository";
import { findPartner, getPartnerUserId } from "./repository";

const partnerApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>()
	// ── GET / — 自分のパートナー情報を取得 ─────────────────────
	.get("/", requireAuth, async (c) => {
		const user = c.get("user");
		const db = drizzle(c.env.DB);

		const partnership = await findPartner(db, user.id);

		return c.json({ data: partnership ?? null });
	})

	// ── GET /balance — パートナーの残高サマリーを取得 ───────────
	.get("/balance", requireAuth, async (c) => {
		const user = c.get("user");
		const db = drizzle(c.env.DB);

		const partnerUserId = await getPartnerUserId(db, user.id);
		if (!partnerUserId) {
			return c.json({ error: "パートナーが見つかりません" }, 404);
		}

		const [entryTotals, settlementTotals] = await Promise.all([
			getEntryTotals(db, partnerUserId),
			getSettlementTotals(db, partnerUserId),
		]);

		const balance = calculateBalance(
			entryTotals.advanceTotal,
			entryTotals.depositTotal,
			settlementTotals.fromHouseholdTotal,
			settlementTotals.fromUserTotal,
		);

		return c.json({ ...entryTotals, ...settlementTotals, balance });
	})

	// ── GET /timeline — パートナーのタイムラインを取得 ──────────
	.get(
		"/timeline",
		requireAuth,
		vValidator(
			"query",
			v.object({
				cursor: v.optional(v.string()),
				category: v.optional(v.picklist(["advance", "deposit", "settlement"])),
				sortBy: v.optional(
					v.picklist(["occurredOn", "createdAt"]),
					"occurredOn",
				),
				sortOrder: v.optional(v.picklist(["desc", "asc"]), "desc"),
			}),
		),
		async (c) => {
			const user = c.get("user");
			const db = drizzle(c.env.DB);

			const partnerUserId = await getPartnerUserId(db, user.id);
			if (!partnerUserId) {
				return c.json({ error: "パートナーが見つかりません" }, 404);
			}

			const { cursor, category, sortBy, sortOrder } = c.req.valid("query");

			try {
				const result = await listByUserPaginated(db, partnerUserId, {
					cursor,
					category,
					sortBy,
					sortOrder,
				});
				return c.json(result);
			} catch (e) {
				if (e instanceof InvalidCursorError) {
					return c.json({ error: e.message }, 400);
				}
				throw e;
			}
		},
	)

	// ── GET /entries/:id — パートナーの記録詳細を取得 ──────────
	.get("/entries/:id", requireAuth, async (c) => {
		const user = c.get("user");
		const id = c.req.param("id");
		const db = drizzle(c.env.DB);

		const partnerUserId = await getPartnerUserId(db, user.id);
		if (!partnerUserId) {
			return c.json({ error: "パートナーが見つかりません" as const }, 404);
		}

		const detail = await entriesRepository.getEntryDetail(
			db,
			id,
			partnerUserId,
		);
		if (!detail) {
			return c.json({ error: "記録が見つかりません" as const }, 404);
		}
		return c.json(detail, 200);
	})

	// ── GET /entries/:entryId/images/:imageId — パートナー記録の画像を取得 ──
	.get("/entries/:entryId/images/:imageId", requireAuth, async (c) => {
		const user = c.get("user");
		const db = drizzle(c.env.DB);

		const partnerUserId = await getPartnerUserId(db, user.id);
		if (!partnerUserId) {
			return c.json({ error: "パートナーが見つかりません" as const }, 404);
		}

		const entry = await entriesRepository.findByOwner(
			db,
			c.req.param("entryId"),
			partnerUserId,
		);
		if (!entry) {
			return c.json({ error: "記録が見つかりません" as const }, 404);
		}
		const image = await entriesRepository.findImageWithOwnershipCheck(
			db,
			c.req.param("imageId"),
			entry.originalId,
		);
		if (!image) {
			return c.json({ error: "画像が見つかりません" as const }, 404);
		}

		const response = await serveR2Object(c.env.R2, image.storagePath);
		if (!response) {
			return c.json({ error: "画像が見つかりません" as const }, 404);
		}
		return response;
	})

	// ── GET /settlements/:id — パートナーの精算詳細を取得 ────────
	.get("/settlements/:id", requireAuth, async (c) => {
		const user = c.get("user");
		const id = c.req.param("id");
		const db = drizzle(c.env.DB);

		const partnerUserId = await getPartnerUserId(db, user.id);
		if (!partnerUserId) {
			return c.json({ error: "パートナーが見つかりません" as const }, 404);
		}

		const detail = await settlementsRepository.getSettlementDetail(
			db,
			id,
			partnerUserId,
		);
		if (!detail) {
			return c.json({ error: "精算が見つかりません" as const }, 404);
		}
		return c.json(detail, 200);
	})

	// ── GET /settlements/:settlementId/images/:imageId — パートナー精算の画像を取得 ──
	.get("/settlements/:settlementId/images/:imageId", requireAuth, async (c) => {
		const user = c.get("user");
		const db = drizzle(c.env.DB);

		const partnerUserId = await getPartnerUserId(db, user.id);
		if (!partnerUserId) {
			return c.json({ error: "パートナーが見つかりません" as const }, 404);
		}

		const settlement = await settlementsRepository.findByOwner(
			db,
			c.req.param("settlementId"),
			partnerUserId,
		);
		if (!settlement) {
			return c.json({ error: "精算が見つかりません" as const }, 404);
		}
		const image = await settlementsRepository.findImageWithOwnershipCheck(
			db,
			c.req.param("imageId"),
			settlement.originalId,
		);
		if (!image) {
			return c.json({ error: "画像が見つかりません" as const }, 404);
		}

		const response = await serveR2Object(c.env.R2, image.storagePath);
		if (!response) {
			return c.json({ error: "画像が見つかりません" as const }, 404);
		}
		return response;
	});

export { partnerApp };
