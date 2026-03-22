import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/api-client";

export function useSettlementDetail(id: string) {
	return useQuery({
		queryKey: ["settlements", id],
		queryFn: async () => {
			const res = await client.api.settlements[":id"].$get({
				param: { id },
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(
					"error" in body ? body.error : "精算の取得に失敗しました",
				);
			}
			return res.json();
		},
		enabled: !!id,
	});
}
