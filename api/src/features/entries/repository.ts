import { and, count, desc, eq, lt } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { entries, entryImages } from "../../db/schema";
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
			occurredOn: input.occurredOn,
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
				eq(entries.userId, userId),
				eq(entries.latest, true),
			),
		)
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
		occurredOn: string;
	},
	input: ModifyEntryInput,
) {
	const newId = crypto.randomUUID();
	const now = Date.now();
	return db.batch([
		db
			.update(entries)
			.set({ latest: false })
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
				occurredOn: original.occurredOn,
				label: input.label,
				memo: input.memo || null,
				originalId: original.originalId,
				cancelled: false,
				latest: true,
				createdAt: now,
			})
			.returning(),
	]);
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
		occurredOn: string;
		label: string;
		memo: string | null;
	},
) {
	const newId = crypto.randomUUID();
	const now = Date.now();
	return db.batch([
		db
			.update(entries)
			.set({ latest: false })
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
				occurredOn: latestEntry.occurredOn,
				label: latestEntry.label,
				memo: latestEntry.memo,
				originalId: latestEntry.originalId,
				cancelled: false,
				latest: true,
				createdAt: now,
			})
			.returning(),
	]);
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
		occurredOn: string;
		label: string;
		memo: string | null;
	},
) {
	const newId = crypto.randomUUID();
	const now = Date.now();
	return db.batch([
		db
			.update(entries)
			.set({ latest: false })
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
				occurredOn: latestEntry.occurredOn,
				label: latestEntry.label,
				memo: latestEntry.memo,
				originalId: latestEntry.originalId,
				cancelled: true,
				latest: true,
				createdAt: now,
			})
			.returning(),
	]);
}

// ============================================================
// 画像関連
// ============================================================

/** エントリーに紐づく画像メタデータを作成する */
export function createImage(
	db: DrizzleD1Database,
	input: {
		entryId: string;
		storagePath: string;
		displayOrder: number;
	},
) {
	const id = crypto.randomUUID();
	return db
		.insert(entryImages)
		.values({
			id,
			entryId: input.entryId,
			storagePath: input.storagePath,
			displayOrder: input.displayOrder,
			createdAt: Date.now(),
		})
		.returning()
		.get();
}

/** エントリーに紐づく画像一覧を取得する（displayOrder 昇順） */
export function findImagesByEntry(db: DrizzleD1Database, entryId: string) {
	return db
		.select()
		.from(entryImages)
		.where(eq(entryImages.entryId, entryId))
		.orderBy(entryImages.displayOrder)
		.all();
}

/** 画像 ID で1件取得する */
export function findImageById(db: DrizzleD1Database, imageId: string) {
	return db.select().from(entryImages).where(eq(entryImages.id, imageId)).get();
}

/** エントリーに紐づく画像数を取得する */
export async function countImagesByEntry(
	db: DrizzleD1Database,
	entryId: string,
): Promise<number> {
	const result = await db
		.select({ value: count() })
		.from(entryImages)
		.where(eq(entryImages.entryId, entryId))
		.get();
	return result?.value ?? 0;
}

/** 画像メタデータを削除する */
export function deleteImage(db: DrizzleD1Database, imageId: string) {
	return db.delete(entryImages).where(eq(entryImages.id, imageId)).run();
}
