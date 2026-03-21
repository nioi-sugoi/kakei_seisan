import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api-client";

export function useSendInvitation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (inviteeEmail: string) => {
			const res = await client.api["partner-invitations"].$post({
				json: { inviteeEmail },
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(
					"error" in body ? body.error : "招待の送信に失敗しました",
				);
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["partner-invitations"],
			});
		},
	});
}
