import { and, desc, eq, lt, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { unionAll } from "drizzle-orm/sqlite-core";
import { entries, settlements } from "../../db/schema";

export function listByUser(
	db: DrizzleD1Database,
	userId: string,
	options: { limit: number; cursor?: number },
) {
	const cursorFilter = options.cursor
		? lt(entries.createdAt, options.cursor)
		: undefined;

	const entriesQuery = db
		.select({
			id: entries.id,
			userId: entries.userId,
			type: sql<string>`'entry'`.as("type"),
			category: sql<string>`${entries.category}`.as("category"),
			amount: entries.amount,
			occurredOn: entries.occurredOn,
			label: sql<string | null>`${entries.label}`.as("label"),
			memo: entries.memo,
			originalId: entries.originalId,
			cancelled: entries.cancelled,
			latest: entries.latest,
			status: entries.status,
			createdAt: entries.createdAt,
		})
		.from(entries)
		.where(
			and(eq(entries.userId, userId), eq(entries.latest, true), cursorFilter),
		);

	const settlementCursorFilter = options.cursor
		? lt(settlements.createdAt, options.cursor)
		: undefined;

	const settlementsQuery = db
		.select({
			id: settlements.id,
			userId: settlements.userId,
			type: sql<string>`'settlement'`.as("type"),
			category: sql<string>`${settlements.category}`.as("category"),
			amount: settlements.amount,
			occurredOn: settlements.occurredOn,
			label: sql<string | null>`null`.as("label"),
			memo: sql<string | null>`null`.as("memo"),
			originalId: settlements.originalId,
			cancelled: settlements.cancelled,
			latest: settlements.latest,
			status: settlements.status,
			createdAt: settlements.createdAt,
		})
		.from(settlements)
		.where(
			and(
				eq(settlements.userId, userId),
				eq(settlements.latest, true),
				settlementCursorFilter,
			),
		);

	return unionAll(entriesQuery, settlementsQuery)
		.orderBy(desc(sql`created_at`))
		.limit(options.limit);
}
