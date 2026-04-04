import { useInfiniteQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { useState } from "react";
import { client } from "@/lib/api-client";
import {
	buildTimelineItems,
	type CategoryFilter,
	type SortOption,
	type TimelineItemOf,
} from "@/lib/timeline-utils";

type PartnerTimelineResponse = InferResponseType<
	typeof client.api.partner.timeline.$get,
	200
>;
type PartnerTimelineEvent = PartnerTimelineResponse["data"][number];

export type { CategoryFilter, SortOption };
export type PartnerTimelineItem = TimelineItemOf<PartnerTimelineEvent>;

export function usePartnerTimeline() {
	const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
	const [sort, setSort] = useState<SortOption>({
		sortBy: "occurredOn",
		sortOrder: "desc",
	});

	const query = useInfiniteQuery({
		queryKey: ["partner", "timeline", { category: categoryFilter, ...sort }],
		queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
			const res = await client.api.partner.timeline.$get({
				query: {
					cursor: pageParam,
					category: categoryFilter !== "all" ? categoryFilter : undefined,
					sortBy: sort.sortBy,
					sortOrder: sort.sortOrder,
				},
			});
			if (!res.ok)
				throw new Error("パートナーのタイムライン取得に失敗しました");
			return res.json();
		},
		initialPageParam: undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});

	const allEvents = query.data?.pages.flatMap((page) => page.data) ?? [];
	const items = buildTimelineItems(allEvents, sort.sortBy);

	const handleEndReached = () => {
		if (query.hasNextPage && !query.isFetchingNextPage) {
			query.fetchNextPage();
		}
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
		handleEndReached,
	};
}
