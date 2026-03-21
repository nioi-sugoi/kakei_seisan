import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/api-client";

export function useBalance() {
	return useQuery({
		queryKey: ["balance"],
		queryFn: async () => {
			const res = await client.api.balance.$get();
			if (!res.ok) throw new Error("残高の取得に失敗しました");
			return res.json();
		},
	});
}
