import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { parseResponse } from "hono/client";
import { client } from "@/lib/api-client";

type CreateSettlementInput = {
	category: "fromHousehold" | "fromUser";
	amount: number;
	occurredOn: string;
};

export function useCreateSettlement() {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateSettlementInput) =>
			parseResponse(
				client.api.settlements.$post({
					form: {
						category: input.category,
						amount: String(input.amount),
						occurredOn: input.occurredOn,
					},
				}),
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settlements"] });
			queryClient.invalidateQueries({ queryKey: ["balance"] });
			queryClient.invalidateQueries({ queryKey: ["timeline"] });
			router.replace("/(tabs)");
		},
	});
}
