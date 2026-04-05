import { and, asc, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { unionAll } from "drizzle-orm/sqlite-core";
import {
	entryImageVersions,
	entryVersions,
	settlementImageVersions,
	settlementVersions,
} from "../../db/schema";
import { parseCursor } from "./parse-cursor";

type SortBy = "occurredOn" | "createdAt";
type SortOrder = "desc" | "asc";

export type CursorValue =
	| { occurredOn: string; createdAt: number }
	| { createdAt: number };

const PAGE_LIMIT = 50;

export async function listByUserPaginated(
	db: DrizzleD1Database,
	userId: string,
	options: {
		cursorParam?: string;
		category?: "advance" | "deposit" | "settlement";
		sortBy: SortBy;
		sortOrder: SortOrder;
	},
): Promise<
	| { data: TimelineRow[]; nextCursor: string | null }
	| { error: string; status: 400 }
> {
	const { sortBy, sortOrder, cursorParam } = options;

	let cursor: CursorValue | undefined;
	if (cursorParam) {
		const parsed = parseCursor(cursorParam, sortBy);
		if (!parsed) {
			return { error: "Invalid cursor", status: 400 };
		}
		cursor = parsed;
	}

	const rows = await listByUser(db, userId, {
		limit: PAGE_LIMIT + 1,
		cursor,
		category: options.category,
		sortBy,
		sortOrder,
	});

	const hasMore = rows.length > PAGE_LIMIT;
	const data = hasMore ? rows.slice(0, PAGE_LIMIT) : rows;

	let nextCursor: string | null = null;
	if (hasMore) {
		const lastItem = data[data.length - 1];
		nextCursor =
			sortBy === "createdAt"
				? String(lastItem.createdAt)
				: `${lastItem.occurredOn},${lastItem.createdAt}`;
	}

	return { data, nextCursor };
}

type TimelineRow = Awaited<ReturnType<typeof listByUser>>[number];

async function listByUser(
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

	const rows = await buildTimelineQuery(
		db,
		userId,
		options.cursor,
		options.category,
		sortBy,
		sortOrder,
	)
		.orderBy(...orderBy)
		.limit(options.limit);

	return rows.map((row) => ({
		...row,
		cancelled: Boolean(row.cancelled),
		latest: Boolean(row.latest),
	}));
}

function buildTimelineQuery(
	db: DrizzleD1Database,
	userId: string,
	cursor: CursorValue | undefined,
	category: "advance" | "deposit" | "settlement" | undefined,
	sortBy: SortBy,
	sortOrder: SortOrder,
) {
	if (category === "settlement") {
		return buildSettlementsQuery(db, userId, cursor, sortBy, sortOrder);
	}

	if (category === "advance" || category === "deposit") {
		return buildEntriesQuery(db, userId, cursor, category, sortBy, sortOrder);
	}

	return unionAll(
		buildEntriesQuery(db, userId, cursor, undefined, sortBy, sortOrder),
		buildSettlementsQuery(db, userId, cursor, sortBy, sortOrder),
	);
}

function buildOrderBy(sortBy: SortBy, sortOrder: SortOrder) {
	const dir = sortOrder === "desc" ? desc : asc;
	if (sortBy === "createdAt") {
		return [dir(sql`created_at`)] as const;
	}
	return [dir(sql`occurred_on`), dir(sql`created_at`)] as const;
}

function buildCursorFilter(
	table: typeof entryVersions | typeof settlementVersions,
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
	const cursorFilter = buildCursorFilter(
		entryVersions,
		cursor,
		sortBy,
		sortOrder,
	);
	const categoryFilter = category
		? eq(entryVersions.category, category)
		: undefined;

	const entryImageCountSql = sql<number>`(SELECT COUNT(*) FROM ${entryImageVersions} WHERE ${entryImageVersions.entryVersionId} = "entry_versions"."id")`;

	return db
		.select({
			id: entryVersions.id,
			userId: entryVersions.userId,
			type: sql<string>`'entry'`.as("type"),
			category: sql<string>`${entryVersions.category}`,
			amount: entryVersions.amount,
			occurredOn: entryVersions.occurredOn,
			label: sql<string | null>`${entryVersions.label}`,
			memo: entryVersions.memo,
			originalId: entryVersions.originalId,
			cancelled: entryVersions.cancelled,
			latest: entryVersions.latest,
			status: entryVersions.status,
			approvalComment: entryVersions.approvalComment,
			createdAt: entryVersions.createdAt,
			imageCount: entryImageCountSql.as("image_count"),
		})
		.from(entryVersions)
		.where(
			and(
				eq(entryVersions.userId, userId),
				eq(entryVersions.latest, true),
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
		settlementVersions,
		cursor,
		sortBy,
		sortOrder,
	);

	const settlementImageCountSql = sql<number>`(SELECT COUNT(*) FROM ${settlementImageVersions} WHERE ${settlementImageVersions.settlementVersionId} = "settlement_versions"."id")`;

	return db
		.select({
			id: settlementVersions.id,
			userId: settlementVersions.userId,
			type: sql<string>`'settlement'`.as("type"),
			category: sql<string>`${settlementVersions.category}`,
			amount: settlementVersions.amount,
			occurredOn: settlementVersions.occurredOn,
			label: sql<string | null>`null`,
			memo: sql<string | null>`null`,
			originalId: settlementVersions.originalId,
			cancelled: settlementVersions.cancelled,
			latest: settlementVersions.latest,
			status: settlementVersions.status,
			approvalComment: settlementVersions.approvalComment,
			createdAt: settlementVersions.createdAt,
			imageCount: settlementImageCountSql.as("image_count"),
		})
		.from(settlementVersions)
		.where(
			and(
				eq(settlementVersions.userId, userId),
				eq(settlementVersions.latest, true),
				cursorFilter,
			),
		);
}
