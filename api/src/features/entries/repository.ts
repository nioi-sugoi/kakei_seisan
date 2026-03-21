import { and, desc, eq, lt } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { entries } from "../../db/schema";
import type { CreateEntryInput, ModifyEntryInput } from "./types";

export function createEntry(
	db: DrizzleD1Database,
	userId: string,
	input: CreateEntryInput,
) {
	const id = crypto.randomUUID();
	return db
		.insert(entries)
		.values({
			id,
			userId,
			category: input.category,
			amount: input.amount,
			date: input.date,
			label: input.label,
			memo: input.memo || null,
			originalId: id,
		})
		.returning()
		.get();
}

export function findById(db: DrizzleD1Database, id: string) {
	return db.select().from(entries).where(eq(entries.id, id)).get();
}

export function findByOwner(db: DrizzleD1Database, id: string, userId: string) {
	return db
		.select()
		.from(entries)
		.where(and(eq(entries.id, id), eq(entries.userId, userId)))
		.get();
}

export function listByUser(
	db: DrizzleD1Database,
	userId: string,
	options: { limit: number; cursor?: number },
) {
	const conditions = [eq(entries.userId, userId)];
	if (options.cursor) {
		conditions.push(lt(entries.createdAt, options.cursor));
	}
	return db
		.select()
		.from(entries)
		.where(and(...conditions))
		.orderBy(desc(entries.createdAt))
		.limit(options.limit)
		.all();
}

/** 同じ original_id グループの全バージョンを取得 */
export function findVersions(db: DrizzleD1Database, originalId: string) {
	return db
		.select()
		.from(entries)
		.where(eq(entries.originalId, originalId))
		.orderBy(desc(entries.createdAt))
		.all();
}

/** originalId + userId で最新バージョンを取得（所有者チェック付き） */
export function findMyLatestVersion(
	db: DrizzleD1Database,
	originalId: string,
	userId: string,
) {
	return db
		.select()
		.from(entries)
		.where(
			and(
				eq(entries.originalId, originalId),
				eq(entries.latest, true),
				eq(entries.userId, userId),
			),
		)
		.get();
}

/**
 * 修正バージョンを作成する（バッチ操作でlatest更新 + 新規挿入）。
 * 修正後のフルスナップショットを保存する。
 */
export function createModification(
	db: DrizzleD1Database,
	userId: string,
	original: {
		originalId: string;
		category: "advance" | "deposit";
		date: string;
	},
	input: ModifyEntryInput,
) {
	const newId = crypto.randomUUID();
	const now = Date.now();
	return db.batch([
		db
			.update(entries)
			.set({ latest: false, updatedAt: now })
			.where(
				and(
					eq(entries.originalId, original.originalId),
					eq(entries.latest, true),
				),
			),
		db
			.insert(entries)
			.values({
				id: newId,
				userId,
				category: original.category,
				amount: input.amount,
				date: original.date,
				label: input.label,
				memo: input.memo || null,
				originalId: original.originalId,
				cancelled: false,
				latest: true,
				createdAt: now,
				updatedAt: now,
			})
			.returning(),
	]);
}

/**
 * 取消を復元する（バッチ操作でlatest更新 + 新規挿入）。
 * cancelled = false の新バージョンを作成する。
 */
export function createRestoration(
	db: DrizzleD1Database,
	userId: string,
	latestEntry: {
		originalId: string;
		category: "advance" | "deposit";
		amount: number;
		date: string;
		label: string;
		memo: string | null;
	},
) {
	const newId = crypto.randomUUID();
	const now = Date.now();
	return db.batch([
		db
			.update(entries)
			.set({ latest: false, updatedAt: now })
			.where(
				and(
					eq(entries.originalId, latestEntry.originalId),
					eq(entries.latest, true),
				),
			),
		db
			.insert(entries)
			.values({
				id: newId,
				userId,
				category: latestEntry.category,
				amount: latestEntry.amount,
				date: latestEntry.date,
				label: latestEntry.label,
				memo: latestEntry.memo,
				originalId: latestEntry.originalId,
				cancelled: false,
				latest: true,
				createdAt: now,
				updatedAt: now,
			})
			.returning(),
	]);
}

/**
 * 取り消しバージョンを作成する（バッチ操作でlatest更新 + 新規挿入）。
 */
export function createCancellation(
	db: DrizzleD1Database,
	userId: string,
	latestEntry: {
		originalId: string;
		category: "advance" | "deposit";
		amount: number;
		date: string;
		label: string;
		memo: string | null;
	},
) {
	const newId = crypto.randomUUID();
	const now = Date.now();
	return db.batch([
		db
			.update(entries)
			.set({ latest: false, updatedAt: now })
			.where(
				and(
					eq(entries.originalId, latestEntry.originalId),
					eq(entries.latest, true),
				),
			),
		db
			.insert(entries)
			.values({
				id: newId,
				userId,
				category: latestEntry.category,
				amount: latestEntry.amount,
				date: latestEntry.date,
				label: latestEntry.label,
				memo: latestEntry.memo,
				originalId: latestEntry.originalId,
				cancelled: true,
				latest: true,
				createdAt: now,
				updatedAt: now,
			})
			.returning(),
	]);
}
