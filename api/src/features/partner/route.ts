import { vValidator } from "@hono/valibot-validator";
import { and, eq, sql, sum } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { entryVersions, settlementVersions } from "../../db/schema";
import { requireAuth } from "../../middleware/require-auth";
import type { AppVariables } from "../../types";
import type { CursorValue } from "../timeline/repository";
import * as timelineRepository from "../timeline/repository";
import { findPartner, getPartnerUserId } from "./repository";

function parseCursor(
	cursorParam: string,
	sortBy: "occurredOn" | "createdAt",
): CursorValue | null {
	if (sortBy === "createdAt") {
		const createdAt = Number(cursorParam);
		if (!Number.isInteger(createdAt)) return null;
		return { createdAt };
	}

	const commaIdx = cursorParam.indexOf(",");
	if (commaIdx === -1) return null;

	const occurredOn = cursorParam.slice(0, commaIdx);
	const createdAt = Number(cursorParam.slice(commaIdx + 1));
	if (!occurredOn || !Number.isInteger(createdAt)) return null;

	return { occurredOn, createdAt };
}

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

		const [entryResult, settlementResult] = await Promise.all([
			db
				.select({
					advanceTotal: sum(
						sql`CASE WHEN ${entryVersions.category} = 'advance' THEN ${entryVersions.amount} ELSE 0 END`,
					),
					depositTotal: sum(
						sql`CASE WHEN ${entryVersions.category} = 'deposit' THEN ${entryVersions.amount} ELSE 0 END`,
					),
				})
				.from(entryVersions)
				.where(
					and(
						eq(entryVersions.userId, partnerUserId),
						eq(entryVersions.latest, true),
						eq(entryVersions.cancelled, false),
					),
				)
				.get(),
			db
				.select({
					fromHouseholdTotal: sum(
						sql`CASE WHEN ${settlementVersions.category} = 'fromHousehold' THEN ${settlementVersions.amount} ELSE 0 END`,
					),
					fromUserTotal: sum(
						sql`CASE WHEN ${settlementVersions.category} = 'fromUser' THEN ${settlementVersions.amount} ELSE 0 END`,
					),
				})
				.from(settlementVersions)
				.where(
					and(
						eq(settlementVersions.userId, partnerUserId),
						eq(settlementVersions.latest, true),
						eq(settlementVersions.cancelled, false),
					),
				)
				.get(),
		]);

		const advanceTotal = Number(entryResult?.advanceTotal ?? 0);
		const depositTotal = Number(entryResult?.depositTotal ?? 0);
		const fromHouseholdTotal = Number(
			settlementResult?.fromHouseholdTotal ?? 0,
		);
		const fromUserTotal = Number(settlementResult?.fromUserTotal ?? 0);
		const balance =
			advanceTotal - depositTotal - fromHouseholdTotal + fromUserTotal;

		return c.json({
			advanceTotal,
			depositTotal,
			fromHouseholdTotal,
			fromUserTotal,
			balance,
		});
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
				sortBy: v.optional(v.picklist(["occurredOn", "createdAt"])),
				sortOrder: v.optional(v.picklist(["desc", "asc"])),
			}),
		),
		async (c) => {
			const user = c.get("user");
			const db = drizzle(c.env.DB);

			const partnerUserId = await getPartnerUserId(db, user.id);
			if (!partnerUserId) {
				return c.json({ error: "パートナーが見つかりません" }, 404);
			}

			const {
				cursor: cursorParam,
				category,
				sortBy: sortByParam,
				sortOrder: sortOrderParam,
			} = c.req.valid("query");
			const limit = 50;

			const sortBy = sortByParam ?? "occurredOn";
			const sortOrder = sortOrderParam ?? "desc";

			let cursor: CursorValue | undefined;
			if (cursorParam) {
				const parsed = parseCursor(cursorParam, sortBy);
				if (!parsed) {
					return c.json({ error: "Invalid cursor" }, 400);
				}
				cursor = parsed;
			}

			const result = await timelineRepository.listByUser(db, partnerUserId, {
				limit: limit + 1,
				cursor,
				category,
				sortBy,
				sortOrder,
			});

			const rows = result.map((row) => ({
				id: row.id,
				userId: row.userId,
				type: row.type,
				category: row.category,
				amount: row.amount,
				occurredOn: row.occurredOn,
				label: row.label,
				memo: row.memo,
				originalId: row.originalId,
				cancelled: Boolean(row.cancelled),
				latest: Boolean(row.latest),
				status: row.status,
				approvalComment: row.approvalComment,
				createdAt: row.createdAt,
				imageCount: row.imageCount,
			}));

			const hasMore = rows.length > limit;
			const data = hasMore ? rows.slice(0, limit) : rows;

			let nextCursor: string | null = null;
			if (hasMore) {
				const lastItem = data[data.length - 1];
				nextCursor =
					sortBy === "createdAt"
						? String(lastItem.createdAt)
						: `${lastItem.occurredOn},${lastItem.createdAt}`;
			}

			return c.json({ data, nextCursor });
		},
	);

export { partnerApp };
