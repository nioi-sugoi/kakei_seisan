import {
	render,
	screen,
	userEvent,
	waitFor,
} from "@testing-library/react-native";
import { TestQueryWrapper } from "@/testing/query-wrapper";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
	useRouter: () => ({ push: mockPush }),
}));

const mockGet = jest.fn();

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			entries: {
				$get: (...args: unknown[]) => mockGet(...args),
			},
		},
	},
}));

import TimelineScreen from "./index";

function mockApiResponse(body: unknown) {
	mockGet.mockImplementation(() =>
		Promise.resolve(
			new Response(JSON.stringify(body), {
				headers: { "Content-Type": "application/json" },
			}),
		),
	);
}

function makeEntry(overrides: Record<string, unknown> = {}) {
	return {
		id: "entry-1",
		userId: "user-1",
		category: "advance",
		operation: "original",
		amount: 1500,
		date: "2026-03-15",
		label: "スーパー買い物",
		memo: null,
		status: "approved",
		parentId: null,
		approvedBy: null,
		approvedAt: null,
		approvalComment: null,
		createdAt: 1773676800000,
		updatedAt: 1773676800000,
		...overrides,
	};
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("TimelineScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	it("記録がない場合に空の状態メッセージが表示される", async () => {
		mockApiResponse({ data: [], nextCursor: null });
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(
				screen.getByText("支出の履歴がここに表示されます"),
			).toBeOnTheScreen();
		});
	});

	it("立替の記録カードが正しく表示される", async () => {
		mockApiResponse({ data: [makeEntry()], nextCursor: null });
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("立替")).toBeOnTheScreen();
		});
		expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
		expect(screen.getByText("¥1,500")).toBeOnTheScreen();
		expect(screen.getByText("3/15")).toBeOnTheScreen();
	});

	it("預りの記録カードが正しく表示される", async () => {
		mockApiResponse({
			data: [
				makeEntry({
					id: "entry-2",
					category: "deposit",
					amount: 3000,
					label: "お釣り預かり",
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("預り")).toBeOnTheScreen();
		});
		expect(screen.getByText("お釣り預かり")).toBeOnTheScreen();
		expect(screen.getByText("-¥3,000")).toBeOnTheScreen();
	});

	it("月ごとのセクションヘッダーが表示される", async () => {
		mockApiResponse({
			data: [
				makeEntry({ id: "e1", date: "2026-03-15" }),
				makeEntry({ id: "e2", date: "2026-02-28", label: "電気代" }),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("2026年3月")).toBeOnTheScreen();
		});
		expect(screen.getByText("2026年2月")).toBeOnTheScreen();
	});

	it("記録カードをタップすると詳細画面に遷移する", async () => {
		mockApiResponse({
			data: [makeEntry({ id: "abc-123" })],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
		});

		await user.press(screen.getByText("スーパー買い物"));

		expect(mockPush).toHaveBeenCalledWith("/entry-detail/abc-123");
	});

	it("FABボタンが表示されタップで記録登録フォームへ遷移する", async () => {
		mockApiResponse({ data: [], nextCursor: null });
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		const fab = await screen.findByRole("button", { name: "記録を追加" });

		await user.press(fab);

		expect(mockPush).toHaveBeenCalledWith("/entry-form");
	});
});
