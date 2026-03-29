import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/api-client";

interface UseBalanceOptions {
	userId?: string;
}

export function useBalance(options?: UseBalanceOptions) {
	const userId = options?.userId;
	return useQuery({
		queryKey: ["balance", { userId }],
		queryFn: async () => {
			const res = await client.api.balance.$get({
				query: { userId },
			});
			if (!res.ok) throw new Error("残高の取得に失敗しました");
			return res.json();
		},
	});
}
