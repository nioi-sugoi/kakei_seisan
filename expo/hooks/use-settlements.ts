import { useInfiniteQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { client } from "@/lib/api-client";

type SettlementsResponse = InferResponseType<
	typeof client.api.settlements.$get,
	200
>;
export type Settlement = SettlementsResponse["data"][number];

export function useSettlements() {
	return useInfiniteQuery({
		queryKey: ["settlements"],
		queryFn: async ({ pageParam }: { pageParam: number | undefined }) => {
			const res = await client.api.settlements.$get({
				query: { cursor: pageParam ? String(pageParam) : undefined },
			});
			if (!res.ok) throw new Error("精算一覧の取得に失敗しました");
			return res.json();
		},
		initialPageParam: undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});
}
