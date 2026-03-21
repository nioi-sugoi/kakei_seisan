import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { client } from "@/lib/api-client";

type ModifyInput = {
	amount: number;
};

export function useModifySettlement(settlementId: string) {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: ModifyInput) => {
			const res = await client.api.settlements[":originalId"].modify.$post({
				param: { originalId: settlementId },
				json: input,
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error("error" in body ? body.error : "修正に失敗しました");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settlements"] });
			queryClient.invalidateQueries({ queryKey: ["balance"] });
			router.replace("/(tabs)");
		},
	});
}
