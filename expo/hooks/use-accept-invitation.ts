import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import { client } from "@/lib/api-client";

export function useAcceptInvitation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (invitationId: string) =>
			parseResponse(
				client.api["partner-invitations"][":id"].accept.$post({
					param: { id: invitationId },
				}),
			),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["partner-invitations"],
			});
			queryClient.invalidateQueries({
				queryKey: ["partner"],
			});
		},
	});
}
