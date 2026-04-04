import { useInfiniteQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { useState } from "react";
import { client } from "@/lib/api-client";

type PartnerTimelineResponse = InferResponseType<
	typeof client.api.partner.timeline.$get,
	200
>;
type PartnerTimelineEvent = PartnerTimelineResponse["data"][number];

export type CategoryFilter = "all" | "advance" | "deposit" | "settlement";
export type SortBy = "occurredOn" | "createdAt";
export type SortOrder = "desc" | "asc";
export type SortOption = { sortBy: SortBy; sortOrder: SortOrder };

export type PartnerTimelineItem =
	| { type: "header"; title: string; key: string }
	| { type: "record"; event: PartnerTimelineEvent };

function toMonthLabel(value: string | number) {
	if (typeof value === "string") {
		const [year, month] = value.split("-");
		return `${Number(year)}年${Number(month)}月`;
	}
	const d = new Date(value);
	return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function buildTimelineItems(
	events: PartnerTimelineEvent[],
	sortBy: SortBy,
): PartnerTimelineItem[] {
	const items: PartnerTimelineItem[] = [];
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
