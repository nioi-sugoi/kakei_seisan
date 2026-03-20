import { useQuery } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import { client } from "@/lib/api-client";

export function useEntryDetail(id: string) {
	return useQuery({
		queryKey: ["entries", id],
		queryFn: async () => {
			try {
				return await parseResponse(
					client.api.entries[":id"].$get({ param: { id } }),
				);
			} catch (e) {
				const detail = (e as { detail?: { data?: { error?: string } } })?.detail
					?.data?.error;
				throw new Error(detail ?? "記録の取得に失敗しました");
			}
		},
		enabled: !!id,
	});
}
