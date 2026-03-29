import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { InferResponseType } from "hono/client";
import { useState } from "react";
import { client } from "@/lib/api-client";

type TimelineResponse = InferResponseType<typeof client.api.timeline.$get, 200>;
type TimelineEvent = TimelineResponse["data"][number];

export type CategoryFilter = "all" | "advance" | "deposit" | "settlement";

export type TimelineItem =
	| { type: "header"; title: string }
	| { type: "record"; event: TimelineEvent };

function toMonthLabel(date: string) {
	const d = new Date(date);
	return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function buildTimelineItems(events: TimelineEvent[]): TimelineItem[] {
	const items: TimelineItem[] = [];
	let currentMonth = "";

	for (const event of events) {
		const month = toMonthLabel(event.occurredOn);
		if (month !== currentMonth) {
			currentMonth = month;
			items.push({ type: "header", title: month });
		}
		items.push({ type: "record", event });
	}

	return items;
}

export function useTimeline() {
	const router = useRouter();
	const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

	const query = useInfiniteQuery({
		queryKey: ["timeline", { category: categoryFilter }],
		queryFn: async ({ pageParam }: { pageParam: number | undefined }) => {
			const res = await client.api.timeline.$get({
				query: {
					cursor: pageParam ? String(pageParam) : undefined,
					category: categoryFilter !== "all" ? categoryFilter : undefined,
				},
			});
			if (!res.ok) throw new Error("タイムラインの取得に失敗しました");
			return res.json();
		},
		initialPageParam: undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});

	const allEvents = query.data?.pages.flatMap((page) => page.data) ?? [];
	const items = buildTimelineItems(allEvents);

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
		isEmpty: allEvents.length === 0,
		isFetchingNextPage: query.isFetchingNextPage,
		categoryFilter,
		setCategoryFilter,
		handleEventPress,
		handleEndReached,
		handleAddPress,
	};
}
