import { sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";

export type TimelineRow = {
	id: string;
	userId: string;
	type: "entry" | "settlement";
	category: string | null;
	amount: number;
	occurredOn: string;
	label: string | null;
	memo: string | null;
	originalId: string;
	cancelled: number;
	latest: number;
	status: string;
	createdAt: number;
};

export function listByUser(
	db: DrizzleD1Database,
	userId: string,
	options: { limit: number; cursor?: number },
) {
	const cursorClause = options.cursor
		? sql`AND created_at < ${options.cursor}`
		: sql``;

	return db.all<TimelineRow>(sql`
		SELECT id, user_id AS userId, 'entry' AS type,
			category, amount, occurred_on AS occurredOn, label, memo,
			original_id AS originalId, cancelled, latest, status, created_at AS createdAt
		FROM entries
		WHERE user_id = ${userId} ${cursorClause}
		UNION ALL
		SELECT id, user_id AS userId, 'settlement' AS type,
			category, amount, occurred_on AS occurredOn, NULL AS label, NULL AS memo,
			original_id AS originalId, cancelled, latest, status, created_at AS createdAt
		FROM settlements
		WHERE user_id = ${userId} ${cursorClause}
		ORDER BY createdAt DESC
		LIMIT ${options.limit}
	`);
}
