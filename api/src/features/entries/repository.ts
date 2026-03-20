import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { entries, entryImages } from "../../db/schema";
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

type Entry = Awaited<ReturnType<typeof findById>>;

export async function findRelations(
	db: DrizzleD1Database,
	entry: NonNullable<Entry>,
) {
	const [images, children, parent] = await Promise.all([
		db
			.select()
			.from(entryImages)
			.where(eq(entryImages.entryId, entry.id))
			.orderBy(entryImages.displayOrder)
			.all(),
		db.select().from(entries).where(eq(entries.parentId, entry.id)).all(),
		entry.parentId
			? db.select().from(entries).where(eq(entries.id, entry.parentId)).get()
			: Promise.resolve(null),
	]);

	return { ...entry, images, children, parent };
}
