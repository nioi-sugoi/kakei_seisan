import { useRouter } from "expo-router";
import { type Entry, useEntries } from "./use-entries";
import { type Settlement, useSettlements } from "./use-settlements";

type TimelineRecord =
	| { kind: "entry"; occurredOn: string; createdAt: number; entry: Entry }
	| {
			kind: "settlement";
			occurredOn: string;
			createdAt: number;
			settlement: Settlement;
	  };

export type TimelineItem =
	| { type: "header"; title: string }
	| { type: "entry"; entry: Entry }
	| { type: "settlement"; settlement: Settlement };

function toMonthLabel(date: string) {
	const d = new Date(date);
	return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function buildTimelineItems(records: TimelineRecord[]): TimelineItem[] {
	const items: TimelineItem[] = [];
	let currentMonth = "";

	for (const record of records) {
		const month = toMonthLabel(record.occurredOn);
		if (month !== currentMonth) {
			currentMonth = month;
			items.push({ type: "header", title: month });
		}
		if (record.kind === "entry") {
			items.push({ type: "entry", entry: record.entry });
		} else {
			items.push({
				type: "settlement",
				settlement: record.settlement,
			});
		}
	}

	return items;
}

export function useTimeline() {
	const router = useRouter();
	const entriesQuery = useEntries();
	const settlementsQuery = useSettlements();

	const allEntries =
		entriesQuery.data?.pages.flatMap((page) => page.data) ?? [];
	const allSettlements =
		settlementsQuery.data?.pages.flatMap((page) => page.data) ?? [];

	// entries と settlements を createdAt 降順でマージ
	const records: TimelineRecord[] = [
		...allEntries.map(
			(entry) =>
				({
					kind: "entry",
					occurredOn: entry.occurredOn,
					createdAt: entry.createdAt,
					entry,
				}) as const,
		),
		...allSettlements.map(
			(settlement) =>
				({
					kind: "settlement",
					occurredOn: settlement.occurredOn,
					createdAt: settlement.createdAt,
					settlement,
				}) as const,
		),
	].sort((a, b) => b.createdAt - a.createdAt);

	const items = buildTimelineItems(records);

	const isLoading = entriesQuery.isLoading || settlementsQuery.isLoading;
	const isFetchingNextPage =
		entriesQuery.isFetchingNextPage || settlementsQuery.isFetchingNextPage;

	const handleEntryPress = (entry: Entry) => {
		router.push(`/entry-detail/${entry.originalId}`);
	};

	const handleSettlementPress = (settlement: Settlement) => {
		router.push(`/settlement-detail/${settlement.originalId}`);
	};

	const handleEndReached = () => {
		if (entriesQuery.hasNextPage && !entriesQuery.isFetchingNextPage) {
			entriesQuery.fetchNextPage();
		}
		if (settlementsQuery.hasNextPage && !settlementsQuery.isFetchingNextPage) {
			settlementsQuery.fetchNextPage();
		}
	};

	const handleAddPress = () => {
		router.push("/entry-form");
	};

	return {
		items,
		isLoading,
		isEmpty: allEntries.length === 0 && allSettlements.length === 0,
		isFetchingNextPage,
		handleEntryPress,
		handleSettlementPress,
		handleEndReached,
		handleAddPress,
	};
}
