import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { InferResponseType } from "hono/client";
import { useState } from "react";
import { client } from "@/lib/api-client";

type TimelineResponse = InferResponseType<typeof client.api.timeline.$get, 200>;
type TimelineEvent = TimelineResponse["data"][number];

export type CategoryFilter = "all" | "advance" | "deposit" | "settlement";
export type SortBy = "occurredOn" | "createdAt";
export type SortOrder = "desc" | "asc";
export type SortOption = { sortBy: SortBy; sortOrder: SortOrder };

export type TimelineItem =
	| { type: "header"; title: string }
	| { type: "record"; event: TimelineEvent };

function toMonthLabel(value: string | number) {
	const d = new Date(value);
	return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function buildTimelineItems(
	events: TimelineEvent[],
	sortBy: SortBy,
): TimelineItem[] {
	const items: TimelineItem[] = [];
	let currentMonth = "";

	for (const event of events) {
		const month = toMonthLabel(
			sortBy === "occurredOn" ? event.occurredOn : event.createdAt,
		);
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
	const [sort, setSort] = useState<SortOption>({
		sortBy: "occurredOn",
		sortOrder: "desc",
	});

	const query = useInfiniteQuery({
		queryKey: ["timeline", { category: categoryFilter, ...sort }],
		queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
			const res = await client.api.timeline.$get({
				query: {
					cursor: pageParam,
					category: categoryFilter !== "all" ? categoryFilter : undefined,
					sortBy: sort.sortBy,
					sortOrder: sort.sortOrder,
				},
			});
			if (!res.ok) throw new Error("タイムラインの取得に失敗しました");
			return res.json();
		},
		initialPageParam: undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});

	const allEvents = query.data?.pages.flatMap((page) => page.data) ?? [];
	const items = buildTimelineItems(allEvents, sort.sortBy);

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
		sort,
		setSort,
		handleEventPress,
		handleEndReached,
		handleAddPress,
	};
}
