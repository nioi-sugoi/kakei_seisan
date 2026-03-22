import { and, desc, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { settlements } from "../../db/schema";
import type {
	CreateSettlementInput,
	ModifySettlementInput,
	SettlementCategory,
} from "./types";

export function createSettlement(
	db: DrizzleD1Database,
	userId: string,
	input: CreateSettlementInput,
) {
	const id = crypto.randomUUID();
	return db
		.insert(settlements)
		.values({
			id,
			userId,
			category: input.category,
			amount: input.amount,
			occurredOn: input.occurredOn,
			originalId: id,
			createdAt: Date.now(),
		})
		.returning()
		.get();
}

export function findByOwner(db: DrizzleD1Database, id: string, userId: string) {
	return db
		.select()
		.from(settlements)
		.where(and(eq(settlements.id, id), eq(settlements.userId, userId)))
		.get();
}

export function findVersions(db: DrizzleD1Database, originalId: string) {
	return db
		.select()
		.from(settlements)
		.where(eq(settlements.originalId, originalId))
		.orderBy(desc(settlements.createdAt))
		.all();
}

export function findMyLatestVersion(
	db: DrizzleD1Database,
	originalId: string,
	userId: string,
) {
	return db
		.select()
		.from(settlements)
		.where(
			and(
				eq(settlements.originalId, originalId),
				eq(settlements.userId, userId),
				eq(settlements.latest, true),
			),
		)
		.get();
}

export function createModification(
	db: DrizzleD1Database,
	userId: string,
	original: {
		originalId: string;
		category: SettlementCategory;
		occurredOn: string;
	},
	input: ModifySettlementInput,
) {
	const newId = crypto.randomUUID();
	const now = Date.now();
	return db.batch([
		db
			.update(settlements)
			.set({ latest: false })
			.where(
				and(
					eq(settlements.originalId, original.originalId),
					eq(settlements.latest, true),
				),
			),
		db
			.insert(settlements)
			.values({
				id: newId,
				userId,
				category: original.category,
				amount: input.amount,
				occurredOn: original.occurredOn,
				originalId: original.originalId,
				cancelled: false,
				latest: true,
				createdAt: now,
			})
			.returning(),
	]);
}

export function createCancellation(
	db: DrizzleD1Database,
	userId: string,
	latestSettlement: {
		originalId: string;
		category: SettlementCategory;
		amount: number;
		occurredOn: string;
	},
) {
	const newId = crypto.randomUUID();
	const now = Date.now();
	return db.batch([
		db
			.update(settlements)
			.set({ latest: false })
			.where(
				and(
					eq(settlements.originalId, latestSettlement.originalId),
					eq(settlements.latest, true),
				),
			),
		db
			.insert(settlements)
			.values({
				id: newId,
				userId,
				category: latestSettlement.category,
				amount: latestSettlement.amount,
				occurredOn: latestSettlement.occurredOn,
				originalId: latestSettlement.originalId,
				cancelled: true,
				latest: true,
				createdAt: now,
			})
			.returning(),
	]);
}

export function createRestoration(
	db: DrizzleD1Database,
	userId: string,
	latestSettlement: {
		originalId: string;
		category: SettlementCategory;
		amount: number;
		occurredOn: string;
	},
) {
	const newId = crypto.randomUUID();
	const now = Date.now();
	return db.batch([
		db
			.update(settlements)
			.set({ latest: false })
			.where(
				and(
					eq(settlements.originalId, latestSettlement.originalId),
					eq(settlements.latest, true),
				),
			),
		db
			.insert(settlements)
			.values({
				id: newId,
				userId,
				category: latestSettlement.category,
				amount: latestSettlement.amount,
				occurredOn: latestSettlement.occurredOn,
				originalId: latestSettlement.originalId,
				cancelled: false,
				latest: true,
				createdAt: now,
			})
			.returning(),
	]);
}
