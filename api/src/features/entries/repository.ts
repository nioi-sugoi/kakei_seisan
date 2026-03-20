import { and, desc, eq, inArray, lt } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { entries } from "../../db/schema";
import type { CreateEntryInput, ModifyEntryInput } from "./types";

export function createEntry(
	db: DrizzleD1Database,
	userId: string,
	input: CreateEntryInput,
) {
	return db
		.insert(entries)
		.values({
			userId,
			category: input.category,
			amount: input.amount,
			date: input.date,
			label: input.label,
			memo: input.memo || null,
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

/**
 * 指定した親エントリ群に対して、子エントリの operation 種別を取得する。
 * タイムラインで「修正済み」「取消済み」バッジを表示するために使用。
 */
export function getChildOperations(db: DrizzleD1Database, parentIds: string[]) {
	if (parentIds.length === 0) return Promise.resolve([]);
	return db
		.select({
			parentId: entries.parentId,
			operation: entries.operation,
		})
		.from(entries)
		.where(inArray(entries.parentId, parentIds))
		.all();
}

/** 特定エントリの子エントリ（修正・取消）を取得する */
export function findChildren(db: DrizzleD1Database, parentId: string) {
	return db
		.select()
		.from(entries)
		.where(eq(entries.parentId, parentId))
		.orderBy(desc(entries.createdAt))
		.all();
}

/**
 * 修正エントリを作成する。
 * amount は差分（新しい金額 - 現在の実効金額）として渡される。
 */
export function createModification(
	db: DrizzleD1Database,
	userId: string,
	parentId: string,
	original: { category: "advance" | "deposit"; date: string },
	input: ModifyEntryInput,
) {
	return db
		.insert(entries)
		.values({
			userId,
			category: original.category,
			operation: "modification",
			amount: input.amount,
			date: original.date,
			label: input.label,
			memo: input.memo || null,
			parentId,
		})
		.returning()
		.get();
}

/** 取り消しエントリを作成する */
export function createCancellation(
	db: DrizzleD1Database,
	userId: string,
	parentId: string,
	original: {
		category: "advance" | "deposit";
		date: string;
		label: string;
	},
	effectiveAmount: number,
) {
	return db
		.insert(entries)
		.values({
			userId,
			category: original.category,
			operation: "cancellation",
			amount: -effectiveAmount,
			date: original.date,
			label: original.label,
			memo: null,
			parentId,
		})
		.returning()
		.get();
}
