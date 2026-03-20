import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { client } from "@/lib/api-client";

type ModifyInput = {
	amount: number;
	label: string;
	memo?: string;
};

export function useModifyEntry(entryId: string) {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: ModifyInput) => {
			const res = await client.api.entries[":id"].modify.$post({
				param: { id: entryId },
				json: input,
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error("error" in body ? body.error : "修正に失敗しました");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["entries"] });
			router.replace("/(tabs)");
		},
	});
}
