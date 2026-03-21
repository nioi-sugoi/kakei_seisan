import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { client } from "@/lib/api-client";

type PartnerInvitationsApi = (typeof client.api)["partner-invitations"];

type PartnershipResponse = InferResponseType<
	PartnerInvitationsApi["partnership"]["$get"],
	200
>;
export type Partnership = NonNullable<PartnershipResponse["data"]>;

type SentInvitationResponse = InferResponseType<
	PartnerInvitationsApi["sent"]["$get"],
	200
>;
export type SentInvitation = NonNullable<SentInvitationResponse["data"]>;

type PendingInvitationsResponse = InferResponseType<
	PartnerInvitationsApi["pending"]["$get"],
	200
>;
export type ReceivedInvitation = PendingInvitationsResponse["data"][number];

export function usePartnership() {
	return useQuery({
		queryKey: ["partner-invitations", "partnership"],
		queryFn: async () => {
			const res = await client.api["partner-invitations"].partnership.$get();
			if (!res.ok) throw new Error("パートナー情報の取得に失敗しました");
			const json = await res.json();
			return json.data;
		},
	});
}

export function useSentInvitation() {
	return useQuery({
		queryKey: ["partner-invitations", "sent"],
		queryFn: async () => {
			const res = await client.api["partner-invitations"].sent.$get();
			if (!res.ok) throw new Error("送信済み招待の取得に失敗しました");
			const json = await res.json();
			return json.data;
		},
	});
}

export function useReceivedInvitations() {
	return useQuery({
		queryKey: ["partner-invitations", "pending"],
		queryFn: async () => {
			const res = await client.api["partner-invitations"].pending.$get();
			if (!res.ok) throw new Error("受信招待の取得に失敗しました");
			const json = await res.json();
			return json.data;
		},
	});
}
