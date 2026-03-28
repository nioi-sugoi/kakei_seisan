import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { InferResponseType } from "hono/client";
import { client } from "@/lib/api-client";

type TimelineResponse = InferResponseType<typeof client.api.timeline.$get, 200>;
type TimelineEvent = TimelineResponse["data"][number];

export type TimelineItem =
	| { type: "header"; title: string; key: string }
	| { type: "record"; event: TimelineEvent };

function toMonthLabel(date: string) {
	const d = new Date(date);
	return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function buildTimelineItems(events: TimelineEvent[]): TimelineItem[] {
	const items: TimelineItem[] = [];
	let currentMonth = "";
	let headerSeq = 0;

	for (const event of events) {
		const month = toMonthLabel(event.occurredOn);
		if (month !== currentMonth) {
			currentMonth = month;
			headerSeq++;
			items.push({ type: "header", title: month, key: `header-${headerSeq}` });
		}
		items.push({ type: "record", event });
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

	const allEvents = query.data?.pages.flatMap((page) => page.data) ?? [];
	const latestOnly = allEvents.filter((r) => r.latest);
	const items = buildTimelineItems(latestOnly);

	const handleEventPress = (event: TimelineEvent) => {
		if (event.type === "entry") {
			router.push(`/entry-detail/${event.originalId}`);
		} else {
			router.push(`/settlement-detail/${event.originalId}`);
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
		handleEventPress,
		handleEndReached,
		handleAddPress,
	};
}
