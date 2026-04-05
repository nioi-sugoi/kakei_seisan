export type CategoryFilter = "all" | "advance" | "deposit" | "settlement";
export type SortBy = "occurredOn" | "createdAt";
export type SortOrder = "desc" | "asc";
export type SortOption = { sortBy: SortBy; sortOrder: SortOrder };

export const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
	{ value: "all", label: "すべて" },
	{ value: "advance", label: "立替" },
	{ value: "deposit", label: "預り" },
	{ value: "settlement", label: "精算" },
];

export const SORT_OPTIONS: {
	sortBy: SortOption["sortBy"];
	sortOrder: SortOption["sortOrder"];
	label: string;
}[] = [
	{ sortBy: "occurredOn", sortOrder: "desc", label: "日付順（新しい順）" },
	{ sortBy: "occurredOn", sortOrder: "asc", label: "日付順（古い順）" },
	{ sortBy: "createdAt", sortOrder: "desc", label: "更新順（新しい順）" },
	{ sortBy: "createdAt", sortOrder: "asc", label: "更新順（古い順）" },
];

export function toMonthLabel(value: string | number) {
	if (typeof value === "string") {
		// "YYYY-MM-DD" をカレンダー日付として解釈（new Date() だとUTCになりTZ次第で月がずれる）
		const [year, month] = value.split("-");
		return `${Number(year)}年${Number(month)}月`;
	}
	const d = new Date(value);
	return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

export type TimelineItemOf<TEvent> =
	| { type: "header"; title: string; key: string }
	| { type: "record"; event: TEvent };

export function buildTimelineItems<
	TEvent extends { occurredOn: string; createdAt: number },
>(events: TEvent[], sortBy: SortBy): TimelineItemOf<TEvent>[] {
	const items: TimelineItemOf<TEvent>[] = [];
	let currentMonth = "";
	let headerSeq = 0;

	for (const event of events) {
		const month = toMonthLabel(
			sortBy === "occurredOn" ? event.occurredOn : event.createdAt,
		);
		if (month !== currentMonth) {
			currentMonth = month;
			headerSeq++;
			items.push({ type: "header", title: month, key: `header-${headerSeq}` });
		}
		items.push({ type: "record", event });
	}

	return items;
}
