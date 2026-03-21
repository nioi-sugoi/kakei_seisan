import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/api-client";

export function useAcceptInvitation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (invitationId: string) => {
			const res = await client.api["partner-invitations"][":id"].accept.$post({
				param: { id: invitationId },
			});
			if (!res.ok) {
				const body = await res.json();
				throw new Error(
					"error" in body ? body.error : "招待の承認に失敗しました",
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
