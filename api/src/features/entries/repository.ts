import { and, desc, eq, lt, sql } from "drizzle-orm";
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
	const isLatest = sql<boolean>`(
		${entries.createdAt} = (
			SELECT MAX(e2.created_at) FROM entries e2
			WHERE e2.original_id = ${entries.originalId}
		)
	)`.mapWith(Boolean);

	return db
		.select({
			id: entries.id,
			userId: entries.userId,
			category: entries.category,
			amount: entries.amount,
			date: entries.date,
			label: entries.label,
			memo: entries.memo,
			originalId: entries.originalId,
			cancelled: entries.cancelled,
			status: entries.status,
			approvedBy: entries.approvedBy,
			approvedAt: entries.approvedAt,
			approvalComment: entries.approvalComment,
			createdAt: entries.createdAt,
			isLatest,
		})
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
		.where(and(eq(entries.originalId, originalId), eq(entries.userId, userId)))
		.orderBy(desc(entries.createdAt))
		.limit(1)
		.get();
}

/**
 * 修正バージョンを作成する。
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
	return db
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
			createdAt: now,
		})
		.returning()
		.get();
}

/**
 * 取消を復元する。
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
	return db
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
			createdAt: now,
		})
		.returning()
		.get();
}

/**
 * 取り消しバージョンを作成する。
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
	return db
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
			createdAt: now,
		})
		.returning()
		.get();
}
