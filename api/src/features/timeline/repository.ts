import { and, asc, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { unionAll } from "drizzle-orm/sqlite-core";
import {
	entries,
	entryImages,
	settlementImages,
	settlements,
} from "../../db/schema";

type SortBy = "occurredOn" | "createdAt";
type SortOrder = "desc" | "asc";

export type CursorValue =
	| { occurredOn: string; createdAt: number }
	| { createdAt: number };

export function listByUser(
	db: DrizzleD1Database,
	userId: string,
	options: {
		limit: number;
		cursor?: CursorValue;
		category?: "advance" | "deposit" | "settlement";
		sortBy: SortBy;
		sortOrder: SortOrder;
	},
) {
	const { sortBy, sortOrder } = options;
	const orderBy = buildOrderBy(sortBy, sortOrder);

	if (options.category === "settlement") {
		return buildSettlementsQuery(db, userId, options.cursor, sortBy, sortOrder)
			.orderBy(...orderBy)
			.limit(options.limit);
	}

	if (options.category === "advance" || options.category === "deposit") {
		return buildEntriesQuery(
			db,
			userId,
			options.cursor,
			options.category,
			sortBy,
			sortOrder,
		)
			.orderBy(...orderBy)
			.limit(options.limit);
	}

	return unionAll(
		buildEntriesQuery(db, userId, options.cursor, undefined, sortBy, sortOrder),
		buildSettlementsQuery(db, userId, options.cursor, sortBy, sortOrder),
	)
		.orderBy(...orderBy)
		.limit(options.limit);
}

function buildOrderBy(sortBy: SortBy, sortOrder: SortOrder) {
	const dir = sortOrder === "desc" ? desc : asc;
	if (sortBy === "createdAt") {
		return [dir(sql`created_at`)] as const;
	}
	return [dir(sql`occurred_on`), dir(sql`created_at`)] as const;
}

function buildCursorFilter(
	table: typeof entries | typeof settlements,
	cursor: CursorValue | undefined,
	sortBy: SortBy,
	sortOrder: SortOrder,
) {
	if (!cursor) return undefined;

	if (sortBy === "createdAt") {
		return sortOrder === "desc"
			? lt(table.createdAt, cursor.createdAt)
			: gt(table.createdAt, cursor.createdAt);
	}

	if ("occurredOn" in cursor) {
		const cmp = sortOrder === "desc" ? lt : gt;
		return or(
			cmp(table.occurredOn, cursor.occurredOn),
			and(
				eq(table.occurredOn, cursor.occurredOn),
				cmp(table.createdAt, cursor.createdAt),
			),
		);
	}

	return undefined;
}

function buildEntriesQuery(
	db: DrizzleD1Database,
	userId: string,
	cursor: CursorValue | undefined,
	category: "advance" | "deposit" | undefined,
	sortBy: SortBy,
	sortOrder: SortOrder,
) {
	const cursorFilter = buildCursorFilter(entries, cursor, sortBy, sortOrder);
	const categoryFilter = category ? eq(entries.category, category) : undefined;

	const entryImageCountSql = sql<number>`(SELECT COUNT(*) FROM ${entryImages} WHERE ${entryImages.entryId} = "entries"."id")`;

	return db
		.select({
			id: entries.id,
			userId: entries.userId,
			type: sql<string>`'entry'`.as("type"),
			category: sql<string>`${entries.category}`,
			amount: entries.amount,
			occurredOn: entries.occurredOn,
			label: sql<string | null>`${entries.label}`,
			memo: entries.memo,
			originalId: entries.originalId,
			cancelled: entries.cancelled,
			latest: entries.latest,
			status: entries.status,
			approvalComment: entries.approvalComment,
			createdAt: entries.createdAt,
			imageCount: entryImageCountSql.as("image_count"),
		})
		.from(entries)
		.where(
			and(
				eq(entries.userId, userId),
				eq(entries.latest, true),
				cursorFilter,
				categoryFilter,
			),
		);
}

function buildSettlementsQuery(
	db: DrizzleD1Database,
	userId: string,
	cursor: CursorValue | undefined,
	sortBy: SortBy,
	sortOrder: SortOrder,
) {
	const cursorFilter = buildCursorFilter(
		settlements,
		cursor,
		sortBy,
		sortOrder,
	);

	const settlementImageCountSql = sql<number>`(SELECT COUNT(*) FROM ${settlementImages} WHERE ${settlementImages.settlementId} = "settlements"."id")`;

	return db
		.select({
			id: settlements.id,
			userId: settlements.userId,
			type: sql<string>`'settlement'`.as("type"),
			category: sql<string>`${settlements.category}`,
			amount: settlements.amount,
			occurredOn: settlements.occurredOn,
			label: sql<string | null>`null`,
			memo: sql<string | null>`null`,
			originalId: settlements.originalId,
			cancelled: settlements.cancelled,
			latest: settlements.latest,
			status: settlements.status,
			approvalComment: settlements.approvalComment,
			createdAt: settlements.createdAt,
			imageCount: settlementImageCountSql.as("image_count"),
		})
		.from(settlements)
		.where(
			and(
				eq(settlements.userId, userId),
				eq(settlements.latest, true),
				cursorFilter,
			),
		);
}
