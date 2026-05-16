import type {
	BalanceResponse,
	EntryDetailResponse,
	EntryVersion,
	PartnerBalanceResponse,
	Partnership,
	PartnerTimelineEvent,
	PartnerTimelineResponse,
	SettlementDetailResponse,
	SettlementVersion,
	TimelineEvent,
} from "@/lib/api-types";

export type {
	BalanceResponse,
	EntryDetailResponse,
	EntryVersion,
	PartnerBalanceResponse,
	PartnerResponse,
	Partnership,
	PartnerTimelineEvent,
	PartnerTimelineResponse,
	SettlementDetailResponse,
	SettlementVersion,
	TimelineEvent,
	TimelineResponse,
} from "@/lib/api-types";

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
