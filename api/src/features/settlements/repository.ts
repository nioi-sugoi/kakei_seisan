import { and, desc, eq, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { settlementImages, settlements } from "../../db/schema";
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

// ============================================================
// 画像関連
// ============================================================

/**
 * 画像メタデータを作成する（枚数制限超過時は null を返す）。
 * INSERT...SELECT で枚数チェックと displayOrder 算出をアトミックに行い、
 * 並行リクエストによる制限超過を防止する。
 */
export async function createImage(
	db: DrizzleD1Database,
	input: {
		settlementId: string;
		storagePath: string;
	},
): Promise<typeof settlementImages.$inferSelect | null> {
	const id = crypto.randomUUID();
	const now = Date.now();
	const result = await db.run(sql`
		INSERT INTO settlement_images (id, settlement_id, storage_path, display_order, created_at)
		SELECT ${id}, ${input.settlementId}, ${input.storagePath},
			COALESCE(MAX(display_order) + 1, 0), ${now}
		FROM settlement_images
		WHERE settlement_id = ${input.settlementId}
		HAVING COUNT(*) < 2
	`);
	if (!result.meta.rows_written || result.meta.rows_written === 0) {
		return null;
	}
	const row = await db
		.select()
		.from(settlementImages)
		.where(eq(settlementImages.id, id))
		.get();
	return row ?? null;
}

export function findImagesBySettlement(
	db: DrizzleD1Database,
	settlementId: string,
) {
	return db
		.select()
		.from(settlementImages)
		.where(eq(settlementImages.settlementId, settlementId))
		.orderBy(settlementImages.displayOrder)
		.all();
}

export function findImageById(db: DrizzleD1Database, imageId: string) {
	return db
		.select()
		.from(settlementImages)
		.where(eq(settlementImages.id, imageId))
		.get();
}

export function deleteImage(db: DrizzleD1Database, imageId: string) {
	return db
		.delete(settlementImages)
		.where(eq(settlementImages.id, imageId))
		.run();
}

/** 指定バージョンの画像を新バージョンにコピーする（deleteIds に含まれる画像は除外） */
export async function copyImagesToVersion(
	db: DrizzleD1Database,
	fromVersionId: string,
	toVersionId: string,
	deleteIds: string[],
) {
	const images = await findImagesBySettlement(db, fromVersionId);
	const deleteSet = new Set(deleteIds);
	const copied: (typeof settlementImages.$inferSelect)[] = [];
	for (const img of images) {
		if (deleteSet.has(img.id)) continue;
		const id = crypto.randomUUID();
		const now = Date.now();
		await db.insert(settlementImages).values({
			id,
			settlementId: toVersionId,
			storagePath: img.storagePath,
			displayOrder: img.displayOrder,
			createdAt: now,
		});
		const row = await db
			.select()
			.from(settlementImages)
			.where(eq(settlementImages.id, id))
			.get();
		if (row) copied.push(row);
	}
	return copied;
}

/** 指定 storagePath を参照している画像レコード数を返す（R2削除判定用） */
export async function countImageRefsByStoragePath(
	db: DrizzleD1Database,
	storagePath: string,
) {
	const result = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(settlementImages)
		.where(eq(settlementImages.storagePath, storagePath))
		.get();
	return result?.count ?? 0;
}

/** 指定精算の全バージョンに紐づく画像を検索（GET/DELETE での所有権チェック用） */
export async function findImageWithOwnershipCheck(
	db: DrizzleD1Database,
	imageId: string,
	originalId: string,
) {
	const image = await findImageById(db, imageId);
	if (!image) return null;
	const version = await db
		.select()
		.from(settlements)
		.where(
			and(
				eq(settlements.id, image.settlementId),
				eq(settlements.originalId, originalId),
			),
		)
		.get();
	if (!version) return null;
	return image;
}
