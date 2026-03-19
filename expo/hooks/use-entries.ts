import { useInfiniteQuery } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import { client } from "@/lib/api-client";

export type Entry = {
	id: string;
	userId: string;
	category: "advance" | "deposit";
	operation: "original" | "modification" | "cancellation";
	amount: number;
	date: string;
	label: string;
	memo: string | null;
	status: "approved" | "pending" | "rejected";
	parentId: string | null;
	approvedBy: string | null;
	approvedAt: number | null;
	approvalComment: string | null;
	createdAt: number;
	updatedAt: number;
};

type EntriesResponse = {
	data: Entry[];
	nextCursor: number | null;
};

export function useEntries() {
	return useInfiniteQuery({
		queryKey: ["entries"],
		queryFn: async ({ pageParam }) => {
			const query: Record<string, string> = {};
			if (pageParam) {
				query.cursor = String(pageParam);
			}
			const res = await client.api.entries.$get({ query });
			return (await parseResponse(res)) as EntriesResponse;
		},
		initialPageParam: undefined as number | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});
}
