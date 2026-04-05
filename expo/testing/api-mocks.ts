import type { InferResponseType } from "hono/client";
import type { client } from "@/lib/api-client";

// ── APIレスポンス型の抽出 ──────────────────────────────────
// Hono RPC の型推論チェーンを利用して、各エンドポイントのレスポンス型を
// コンパイル時に取得する。API の route.ts が変更されるとここの型も連動し、
// ファクトリ関数の返り値と不整合があれば tsc --noEmit で検出できる。

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

// ── ファクトリ関数 ──────────────────────────────────────────

export function makeTimelineEvent(
	overrides?: Partial<TimelineEvent>,
): TimelineEvent {
	return {
		id: "entry-1",
		userId: "user-1",
		type: "entry",
		category: "advance",
		amount: 1500,
		occurredOn: "2026-03-15",
		label: "スーパー買い物",
		memo: null,
		originalId: "entry-1",
		cancelled: false,
		latest: true,
		status: "approved",
		approvalComment: null,
		createdAt: 1773676800000,
		imageCount: 0,
		...overrides,
	};
}

export function makeBalanceResponse(
	overrides?: Partial<BalanceResponse>,
): BalanceResponse {
	return {
		advanceTotal: 0,
		depositTotal: 0,
		fromHouseholdTotal: 0,
		fromUserTotal: 0,
		balance: 0,
		...overrides,
	};
}

export function makeEntryDetail(
	overrides?: Partial<EntryDetailResponse>,
): EntryDetailResponse {
	return {
		id: "entry-1",
		userId: "user-1",
		category: "advance",
		amount: 1500,
		occurredOn: "2026-03-15",
		label: "テスト",
		memo: null,
		originalId: "entry-1",
		cancelled: false,
		latest: true,
		status: "approved",
		approvedBy: null,
		approvedAt: null,
		approvalComment: null,
		createdAt: 1742000000000,
		images: [],
		versions: [],
		...overrides,
	};
}

export function makeEntryVersion(
	overrides?: Partial<EntryVersion>,
): EntryVersion {
	return {
		id: "entry-1",
		userId: "user-1",
		category: "advance",
		amount: 1500,
		occurredOn: "2026-03-15",
		label: "テスト",
		memo: null,
		originalId: "entry-1",
		cancelled: false,
		latest: true,
		status: "approved",
		approvedBy: null,
		approvedAt: null,
		approvalComment: null,
		createdAt: 1742000000000,
		...overrides,
	};
}

export function makeSettlementDetail(
	overrides?: Partial<SettlementDetailResponse>,
): SettlementDetailResponse {
	return {
		id: "stl-1",
		userId: "user-1",
		category: "fromHousehold",
		amount: 5000,
		occurredOn: "2026-03-15",
		originalId: "stl-1",
		cancelled: false,
		latest: true,
		status: "approved",
		approvedBy: null,
		approvedAt: null,
		approvalComment: null,
		createdAt: 1742000000000,
		images: [],
		versions: [],
		...overrides,
	};
}

export function makeSettlementVersion(
	overrides?: Partial<SettlementVersion>,
): SettlementVersion {
	return {
		id: "stl-1",
		userId: "user-1",
		category: "fromHousehold",
		amount: 5000,
		occurredOn: "2026-03-15",
		originalId: "stl-1",
		cancelled: false,
		latest: true,
		status: "approved",
		approvedBy: null,
		approvedAt: null,
		approvalComment: null,
		createdAt: 1742000000000,
		...overrides,
	};
}

export function makePartnership(overrides?: Partial<Partnership>): Partnership {
	return {
		id: "partnership-1",
		role: "inviter",
		partnerName: "パートナー太郎",
		partnerEmail: "partner@example.com",
		createdAt: 1742000000000,
		...overrides,
	};
}

export function makePartnerBalanceResponse(
	overrides?: Partial<PartnerBalanceResponse>,
): PartnerBalanceResponse {
	return {
		advanceTotal: 0,
		depositTotal: 0,
		fromHouseholdTotal: 0,
		fromUserTotal: 0,
		balance: 0,
		...overrides,
	};
}

export function makePartnerTimelineEvent(
	overrides?: Partial<PartnerTimelineEvent>,
): PartnerTimelineEvent {
	return {
		id: "partner-entry-1",
		userId: "partner-user-1",
		type: "entry",
		category: "advance",
		amount: 2000,
		occurredOn: "2026-03-15",
		label: "パートナーの買い物",
		memo: null,
		originalId: "partner-entry-1",
		cancelled: false,
		latest: true,
		status: "approved",
		approvalComment: null,
		createdAt: 1773676800000,
		imageCount: 0,
		...overrides,
	};
}

// ── レスポンスヘルパー ──────────────────────────────────────

export function mockJsonResponse<T>(body: T, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
