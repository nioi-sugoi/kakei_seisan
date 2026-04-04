import { render, screen, waitFor } from "@testing-library/react-native";
import {
	makePartnerBalanceResponse,
	makePartnership,
	makePartnerTimelineEvent,
	mockJsonResponse,
	type PartnerTimelineResponse,
} from "@/testing/api-mocks";
import { TestQueryWrapper } from "@/testing/query-wrapper";

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");

jest.mock("expo-router", () => ({
	useRouter: () => ({ push: jest.fn() }),
}));

const mockPartnerGet = jest.fn();
const mockPartnerBalanceGet = jest.fn();
const mockPartnerTimelineGet = jest.fn();
const mockSentGet = jest.fn();
const mockPendingGet = jest.fn();

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			partner: {
				$get: (...args: unknown[]) => mockPartnerGet(...args),
				balance: {
					$get: (...args: unknown[]) => mockPartnerBalanceGet(...args),
				},
				timeline: {
					$get: (...args: unknown[]) => mockPartnerTimelineGet(...args),
				},
			},
			"partner-invitations": {
				sent: { $get: (...args: unknown[]) => mockSentGet(...args) },
				pending: { $get: (...args: unknown[]) => mockPendingGet(...args) },
			},
		},
	},
}));

jest.mock("@/lib/auth-client", () => ({
	authClient: {
		useSession: () => ({
			data: { user: { email: "test@example.com" } },
		}),
	},
}));

import PartnerScreen from "./partner";

function mockPartnership(data: ReturnType<typeof makePartnership> | null) {
	mockPartnerGet.mockImplementation(() =>
		Promise.resolve(mockJsonResponse({ data })),
	);
}

function mockPartnerBalance(balance: number) {
	mockPartnerBalanceGet.mockImplementation(() =>
		Promise.resolve(mockJsonResponse(makePartnerBalanceResponse({ balance }))),
	);
}

function mockPartnerTimeline(body: PartnerTimelineResponse) {
	mockPartnerTimelineGet.mockImplementation(() =>
		Promise.resolve(mockJsonResponse(body)),
	);
}

function mockInvitationsEmpty() {
	mockSentGet.mockImplementation(() =>
		Promise.resolve(mockJsonResponse({ data: [] })),
	);
	mockPendingGet.mockImplementation(() =>
		Promise.resolve(mockJsonResponse({ data: [] })),
	);
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("PartnerScreen - パートナー連携済み", () => {
	beforeEach(() => {
		mockPartnership(makePartnership());
		mockPartnerBalance(0);
		mockPartnerTimeline({ data: [], nextCursor: null });
	});

	it("パートナーの精算残高サマリーが表示される", async () => {
		render(<PartnerScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("パートナーの精算残高")).toBeOnTheScreen();
		});
		expect(screen.getByText("¥0")).toBeOnTheScreen();
	});

	it("パートナーの残高が正の場合「家計から受け取り」と表示される", async () => {
		mockPartnerBalance(5000);
		render(<PartnerScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥5,000")).toBeOnTheScreen();
		});
		expect(screen.getByText("家計から受け取り")).toBeOnTheScreen();
	});

	it("パートナーの残高が負の場合「家計へ入金」と表示される", async () => {
		mockPartnerBalance(-3000);
		render(<PartnerScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥3,000")).toBeOnTheScreen();
		});
		expect(screen.getByText("家計へ入金")).toBeOnTheScreen();
	});

	it("タイムラインが空の場合に空メッセージが表示される", async () => {
		render(<PartnerScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(
				screen.getByText("パートナーの支出履歴はまだありません"),
			).toBeOnTheScreen();
		});
	});

	it("パートナーの記録カードが表示される", async () => {
		mockPartnerTimeline({
			data: [makePartnerTimelineEvent()],
			nextCursor: null,
		});
		render(<PartnerScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("パートナーの買い物")).toBeOnTheScreen();
		});
		expect(screen.getByText("¥2,000")).toBeOnTheScreen();
	});

	it("パートナーの精算カードが表示される", async () => {
		mockPartnerTimeline({
			data: [
				makePartnerTimelineEvent({
					id: "stl-1",
					originalId: "stl-1",
					type: "settlement",
					category: "fromHousehold",
					amount: 8000,
					label: null,
				}),
			],
			nextCursor: null,
		});
		render(<PartnerScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥8,000")).toBeOnTheScreen();
		});
		const card = screen.getByLabelText("精算 ¥8,000");
		expect(card).toBeOnTheScreen();
	});

	it("月ごとのセクションヘッダーが表示される", async () => {
		mockPartnerTimeline({
			data: [
				makePartnerTimelineEvent({
					id: "e1",
					originalId: "e1",
					occurredOn: "2026-03-15",
				}),
				makePartnerTimelineEvent({
					id: "e2",
					originalId: "e2",
					occurredOn: "2026-02-10",
					label: "2月の記録",
				}),
			],
			nextCursor: null,
		});
		render(<PartnerScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("2026年3月")).toBeOnTheScreen();
		});
		expect(screen.getByText("2026年2月")).toBeOnTheScreen();
	});

	it("カテゴリフィルターが表示される", async () => {
		mockPartnerTimeline({
			data: [makePartnerTimelineEvent()],
			nextCursor: null,
		});
		render(<PartnerScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("パートナーの買い物")).toBeOnTheScreen();
		});
		expect(screen.getByLabelText("すべてで絞り込み")).toBeOnTheScreen();
		expect(screen.getByLabelText("立替で絞り込み")).toBeOnTheScreen();
		expect(screen.getByLabelText("預りで絞り込み")).toBeOnTheScreen();
		expect(screen.getByLabelText("精算で絞り込み")).toBeOnTheScreen();
	});

	it("FABボタンが表示されない", async () => {
		mockPartnerTimeline({
			data: [makePartnerTimelineEvent()],
			nextCursor: null,
		});
		render(<PartnerScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("パートナーの買い物")).toBeOnTheScreen();
		});
		expect(screen.queryByLabelText("記録を追加")).toBeNull();
	});
});

describe("PartnerScreen - パートナー未連携", () => {
	it("招待画面が表示される", async () => {
		mockPartnership(null);
		mockInvitationsEmpty();
		render(<PartnerScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("パートナー招待")).toBeOnTheScreen();
		});
	});
});

describe("PartnerScreen - ローディング", () => {
	it("パートナー情報取得中はコンテンツが表示されない", () => {
		mockPartnerGet.mockImplementation(() => new Promise(() => {}));
		render(<PartnerScreen />, { wrapper: TestQueryWrapper });

		expect(screen.queryByText("パートナーの精算残高")).toBeNull();
		expect(screen.queryByText("パートナー招待")).toBeNull();
	});
});
