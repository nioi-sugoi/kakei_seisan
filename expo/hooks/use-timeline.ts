import { useRouter } from "expo-router";
import { type Entry, useEntries } from "./use-entries";

export type TimelineItem =
	| { type: "header"; title: string }
	| { type: "entry"; entry: Entry };

function toMonthLabel(date: string) {
	const d = new Date(date);
	return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function buildTimelineItems(entries: Entry[]): TimelineItem[] {
	const items: TimelineItem[] = [];
	let currentMonth = "";

	for (const entry of entries) {
		const month = toMonthLabel(entry.date);
		if (month !== currentMonth) {
			currentMonth = month;
			items.push({ type: "header", title: month });
		}
		items.push({ type: "entry", entry });
	}

	return items;
}

export function useTimeline() {
	const router = useRouter();
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useEntries();

	const allEntries = data?.pages.flatMap((page) => page.data) ?? [];
	const items = buildTimelineItems(allEntries);

	const handleEntryPress = (entry: Entry) => {
		router.push(`/entry-detail/${entry.originalId}`);
	};

	const handleEndReached = () => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	};

	const handleAddPress = () => {
		router.push("/entry-form");
	};

	return {
		items,
		isLoading,
		isEmpty: allEntries.length === 0,
		isFetchingNextPage,
		handleEntryPress,
		handleEndReached,
		handleAddPress,
	};
}
