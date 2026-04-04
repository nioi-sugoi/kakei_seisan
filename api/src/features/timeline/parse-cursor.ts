import type { CursorValue } from "./repository";

export function parseCursor(
	cursorParam: string,
	sortBy: "occurredOn" | "createdAt",
): CursorValue | null {
	if (sortBy === "createdAt") {
		const createdAt = Number(cursorParam);
		if (!Number.isInteger(createdAt)) return null;
		return { createdAt };
	}

	const commaIdx = cursorParam.indexOf(",");
	if (commaIdx === -1) return null;

	const occurredOn = cursorParam.slice(0, commaIdx);
	const createdAt = Number(cursorParam.slice(commaIdx + 1));
	if (!occurredOn || !Number.isInteger(createdAt)) return null;

	return { occurredOn, createdAt };
}
