import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { InferResponseType } from "hono/client";
import { client } from "@/lib/api-client";

type TimelineResponse = InferResponseType<typeof client.api.timeline.$get, 200>;
type TimelineEntry = TimelineResponse["data"][number];

export type TimelineItem =
	| { type: "header"; title: string }
	| { type: "record"; entry: TimelineEntry };

function toMonthLabel(date: string) {
	const d = new Date(date);
	return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function buildTimelineItems(entries: TimelineEntry[]): TimelineItem[] {
	const items: TimelineItem[] = [];
	let currentMonth = "";

	for (const entry of entries) {
		const month = toMonthLabel(entry.occurredOn);
		if (month !== currentMonth) {
			currentMonth = month;
			items.push({ type: "header", title: month });
		}
		items.push({ type: "record", entry });
	}

	return items;
}

export function useTimeline() {
	const router = useRouter();
	const query = useInfiniteQuery({
		queryKey: ["timeline"],
		queryFn: async ({ pageParam }: { pageParam: number | undefined }) => {
			const res = await client.api.timeline.$get({
				query: { cursor: pageParam ? String(pageParam) : undefined },
			});
			if (!res.ok) throw new Error("タイムラインの取得に失敗しました");
			return res.json();
		},
		initialPageParam: undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});

	const allEntries = query.data?.pages.flatMap((page) => page.data) ?? [];
	const latestOnly = allEntries.filter((r) => r.latest);
	const items = buildTimelineItems(latestOnly);

	const handleEntryPress = (entry: TimelineEntry) => {
		if (entry.type === "entry") {
			router.push(`/entry-detail/${entry.originalId}`);
		} else {
			router.push(`/settlement-detail/${entry.originalId}`);
		}
	};

	const handleEndReached = () => {
		if (query.hasNextPage && !query.isFetchingNextPage) {
			query.fetchNextPage();
		}
	};

	const handleAddPress = () => {
		router.push("/entry-form");
	};

	return {
		items,
		isLoading: query.isLoading,
		isEmpty: latestOnly.length === 0,
		isFetchingNextPage: query.isFetchingNextPage,
		handleEntryPress,
		handleEndReached,
		handleAddPress,
	};
}
