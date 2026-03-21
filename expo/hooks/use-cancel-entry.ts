import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { client } from "@/lib/api-client";

export function useCancelEntry(entryId: string) {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const res = await client.api.entries[":originalId"].cancel.$post({
				param: { originalId: entryId },
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(
					"error" in body ? body.error : "取り消しに失敗しました",
				);
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["entries"] });
			queryClient.invalidateQueries({ queryKey: ["balance"] });
			router.back();
		},
	});
}
