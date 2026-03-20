import { useInfiniteQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { client } from "@/lib/api-client";

type EntriesResponse = InferResponseType<typeof client.api.entries.$get, 200>;
export type Entry = EntriesResponse["data"][number];

export function useEntries() {
	return useInfiniteQuery({
		queryKey: ["entries"],
		queryFn: async ({ pageParam }: { pageParam: number | undefined }) => {
			const res = await client.api.entries.$get({
				query: { cursor: pageParam ? String(pageParam) : undefined },
			});
			if (!res.ok) throw new Error("記録一覧の取得に失敗しました");
			return res.json();
		},
		initialPageParam: undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});
}
