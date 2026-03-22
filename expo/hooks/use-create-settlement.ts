import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { parseResponse } from "hono/client";
import { client } from "@/lib/api-client";

type CreateSettlementInput = {
	amount: number;
	occurredOn: string;
};

export function useCreateSettlement() {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateSettlementInput) =>
			parseResponse(client.api.settlements.$post({ json: input })),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settlements"] });
			queryClient.invalidateQueries({ queryKey: ["balance"] });
			queryClient.invalidateQueries({ queryKey: ["timeline"] });
			router.replace("/(tabs)");
		},
	});
}
