import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { client } from "@/lib/api-client";

type PartnerApi = (typeof client.api)["partner"];
type PartnerInvitationsApi = (typeof client.api)["partner-invitations"];

type PartnerResponse = InferResponseType<PartnerApi["$get"], 200>;
export type Partnership = NonNullable<PartnerResponse["data"]>;

type SentInvitationsResponse = InferResponseType<
	PartnerInvitationsApi["sent"]["$get"],
	200
>;
export type SentInvitation = SentInvitationsResponse["data"][number];

type PendingInvitationsResponse = InferResponseType<
	PartnerInvitationsApi["pending"]["$get"],
	200
>;
export type ReceivedInvitation = PendingInvitationsResponse["data"][number];

export function usePartnership() {
	return useQuery({
		queryKey: ["partner"],
		queryFn: async () => {
			const res = await client.api.partner.$get();
			if (!res.ok) throw new Error("パートナー情報の取得に失敗しました");
			const json = await res.json();
			return json.data;
		},
	});
}

export function useSentInvitations() {
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
