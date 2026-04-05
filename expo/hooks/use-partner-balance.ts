import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/api-client";

export function usePartnerBalance() {
	return useQuery({
		queryKey: ["partner", "balance"],
		queryFn: async () => {
			const res = await client.api.partner.balance.$get();
			if (!res.ok) throw new Error("パートナーの残高取得に失敗しました");
			return res.json();
		},
	});
}
