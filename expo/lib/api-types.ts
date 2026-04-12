import type { InferResponseType } from "hono/client";
import type { client } from "@/lib/api-client";

type TimelineEndpoint = (typeof client.api)["timeline"]["$get"];
type TimelineSuccessResponse = InferResponseType<TimelineEndpoint, 200>;
export type TimelineEvent = TimelineSuccessResponse["data"][number];
export type TimelineResponse = TimelineSuccessResponse;

type BalanceEndpoint = (typeof client.api)["balance"]["$get"];
export type BalanceResponse = InferResponseType<BalanceEndpoint, 200>;

type PartnerEndpoint = (typeof client.api)["partner"]["$get"];
export type PartnerResponse = InferResponseType<PartnerEndpoint, 200>;
export type Partnership = NonNullable<PartnerResponse["data"]>;

type PartnerBalanceEndpoint = (typeof client.api)["partner"]["balance"]["$get"];
export type PartnerBalanceResponse = InferResponseType<
	PartnerBalanceEndpoint,
	200
>;

type PartnerTimelineEndpoint =
	(typeof client.api)["partner"]["timeline"]["$get"];
export type PartnerTimelineResponse = InferResponseType<
	PartnerTimelineEndpoint,
	200
>;
export type PartnerTimelineEvent = PartnerTimelineResponse["data"][number];

type EntryDetailEndpoint = (typeof client.api)["entries"][":id"]["$get"];
export type EntryDetailResponse = InferResponseType<EntryDetailEndpoint, 200>;
export type EntryVersion = EntryDetailResponse["versions"][number];

type SettlementDetailEndpoint =
	(typeof client.api)["settlements"][":id"]["$get"];
export type SettlementDetailResponse = InferResponseType<
	SettlementDetailEndpoint,
	200
>;
export type SettlementVersion = SettlementDetailResponse["versions"][number];
