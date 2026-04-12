import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/api-client";

export function usePartnerEntryDetail(id: string) {
	return useQuery({
		queryKey: ["partner", "entries", id],
		queryFn: async () => {
			const res = await client.api.partner.entries[":id"].$get({
				param: { id },
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(
					"error" in body ? body.error : "記録の取得に失敗しました",
				);
			}
			return res.json();
		},
		enabled: !!id,
	});
}
