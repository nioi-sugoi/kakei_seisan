import { vValidator } from "@hono/valibot-validator";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import * as v from "valibot";
import type { Env } from "../../bindings";
import { requireAuth } from "../../middleware/require-auth";
import { handleValidationError } from "../../middleware/validation-error-handler";
import type { AppVariables } from "../../types";
import * as settlementsRepository from "./repository";

const createSettlementSchema = v.object({
	category: v.picklist(["refund", "repayment"]),
	amount: v.pipe(v.number(), v.integer(), v.minValue(1)),
	occurredOn: v.pipe(v.string(), v.isoDate()),
});

const modifySettlementSchema = v.object({
	amount: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const settlementsApp = new Hono<{
	Bindings: Env;
	Variables: AppVariables;
}>()
	.get("/:id", requireAuth, async (c) => {
		const user = c.get("user");
		const id = c.req.param("id");
		const db = drizzle(c.env.DB);

		const settlement = await settlementsRepository.findByOwner(db, id, user.id);
		if (!settlement) {
			return c.json({ error: "精算が見つかりません" as const }, 404);
		}

		const versions = await settlementsRepository.findVersions(
			db,
			settlement.originalId,
		);

		return c.json({ ...settlement, versions }, 200);
	})
	.post(
		"/",
		requireAuth,
		vValidator("json", createSettlementSchema, handleValidationError),
		async (c) => {
			const user = c.get("user");
			const input = c.req.valid("json");
			const db = drizzle(c.env.DB);
			const settlement = await settlementsRepository.createSettlement(
				db,
				user.id,
				input,
			);

			return c.json(settlement, 201);
		},
	)
	.post(
		"/:originalId/modify",
		requireAuth,
		vValidator("json", modifySettlementSchema, handleValidationError),
		async (c) => {
			const user = c.get("user");
			const originalId = c.req.param("originalId");
			const input = c.req.valid("json");
			const db = drizzle(c.env.DB);

			const latestSettlement = await settlementsRepository.findMyLatestVersion(
				db,
				originalId,
				user.id,
			);
			if (!latestSettlement) {
				return c.json({ error: "精算が見つかりません" as const }, 404);
			}
			if (latestSettlement.cancelled) {
				return c.json(
					{ error: "取り消し済みの精算は修正できません" as const },
					400,
				);
			}

			if (input.amount === latestSettlement.amount) {
				return c.json({ error: "変更がありません" as const }, 400);
			}

			const [, insertedRows] = await settlementsRepository.createModification(
				db,
				user.id,
				{
					originalId,
					category: latestSettlement.category,
					occurredOn: latestSettlement.occurredOn,
				},
				input,
			);

			return c.json(insertedRows[0], 201);
		},
	)
	.post("/:originalId/cancel", requireAuth, async (c) => {
		const user = c.get("user");
		const originalId = c.req.param("originalId");
		const db = drizzle(c.env.DB);

		const latestSettlement = await settlementsRepository.findMyLatestVersion(
			db,
			originalId,
			user.id,
		);
		if (!latestSettlement) {
			return c.json({ error: "精算が見つかりません" as const }, 404);
		}
		if (latestSettlement.cancelled) {
			return c.json({ error: "既に取り消し済みです" as const }, 400);
		}

		const [, insertedRows] = await settlementsRepository.createCancellation(
			db,
			user.id,
			latestSettlement,
		);

		return c.json(insertedRows[0], 201);
	})
	.post("/:originalId/restore", requireAuth, async (c) => {
		const user = c.get("user");
		const originalId = c.req.param("originalId");
		const db = drizzle(c.env.DB);

		const latestSettlement = await settlementsRepository.findMyLatestVersion(
			db,
			originalId,
			user.id,
		);
		if (!latestSettlement) {
			return c.json({ error: "精算が見つかりません" as const }, 404);
		}
		if (!latestSettlement.cancelled) {
			return c.json(
				{ error: "取り消しされていない精算は復元できません" as const },
				400,
			);
		}

		const [, insertedRows] = await settlementsRepository.createRestoration(
			db,
			user.id,
			latestSettlement,
		);

		return c.json(insertedRows[0], 201);
	});

export { settlementsApp };
