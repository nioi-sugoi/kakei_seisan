import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { InferResponseType } from "hono/client";
import { client } from "@/lib/api-client";

type TimelineResponse = InferResponseType<typeof client.api.timeline.$get, 200>;
type TimelineRecord = TimelineResponse["data"][number];

export type TimelineItem =
	| { type: "header"; title: string }
	| { type: "record"; record: TimelineRecord };

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
		items.push({ type: "record", record });
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

	const allRecords = query.data?.pages.flatMap((page) => page.data) ?? [];
	// originalId ごとに最新（createdAt が最大）のレコードのみ表示
	const latestByOriginal = new Map<string, TimelineRecord>();
	for (const r of allRecords) {
		const existing = latestByOriginal.get(r.originalId);
		if (!existing || r.createdAt > existing.createdAt) {
			latestByOriginal.set(r.originalId, r);
		}
	}
	const latestOnly = [...latestByOriginal.values()].sort(
		(a, b) => b.createdAt - a.createdAt,
	);
	const items = buildTimelineItems(latestOnly);

	const handleRecordPress = (record: TimelineRecord) => {
		if (record.type === "entry") {
			router.push(`/entry-detail/${record.originalId}`);
		} else {
			router.push(`/settlement-detail/${record.originalId}`);
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
		handleRecordPress,
		handleEndReached,
		handleAddPress,
	};
}
