import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { entries } from "../../db/schema";
import type { CreateEntryInput } from "./types";

export function createEntry(
	db: DrizzleD1Database,
	userId: string,
	input: CreateEntryInput,
) {
	const now = Date.now();
	const id = crypto.randomUUID();
	return db
		.insert(entries)
		.values({
			id,
			userId,
			category: input.category,
			operation: "original",
			amount: input.amount,
			date: input.date,
			label: input.label.trim(),
			memo: input.memo?.trim() || null,
			status: "approved",
			createdAt: now,
			updatedAt: now,
		})
		.returning()
		.then((rows) => rows[0]);
}

export function findById(db: DrizzleD1Database, id: string) {
	return db
		.select()
		.from(entries)
		.where(eq(entries.id, id))
		.then((rows) => rows[0] ?? null);
}
