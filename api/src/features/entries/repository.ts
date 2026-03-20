import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { entries } from "../../db/schema";
import type { CreateEntryInput } from "./types";

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

export function findByOwner(
	db: DrizzleD1Database,
	id: string,
	userId: string,
) {
	return db
		.select()
		.from(entries)
		.where(and(eq(entries.id, id), eq(entries.userId, userId)))
		.get();
}
