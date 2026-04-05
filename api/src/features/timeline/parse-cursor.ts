import type { CursorValue } from "./repository";

export function parseCursor(
	cursor: string,
	sortBy: "occurredOn" | "createdAt",
): CursorValue | null {
	if (sortBy === "createdAt") {
		const createdAt = Number(cursor);
		if (!Number.isInteger(createdAt)) return null;
		return { createdAt };
	}

	const commaIdx = cursor.indexOf(",");
	if (commaIdx === -1) return null;

	const occurredOn = cursor.slice(0, commaIdx);
	const createdAt = Number(cursor.slice(commaIdx + 1));
	if (!occurredOn || !Number.isInteger(createdAt)) return null;

	return { occurredOn, createdAt };
}
