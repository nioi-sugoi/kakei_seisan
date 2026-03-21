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
		amount: 1500,
		date: "2026-03-15",
		label: "スーパー買い物",
		memo: null,
		originalId: "entry-1",
		cancelled: false,
		latest: true,
		status: "approved",
		approvedBy: null,
		approvedAt: null,
		approvalComment: null,
		createdAt: 1773676800000,
		updatedAt: 1773676800000,
		groupCancelled: false,
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

	it("記録が月ごとに正しくグルーピングされている", async () => {
		mockApiResponse({
			data: [
				makeEntry({ id: "e1", date: "2026-03-20", label: "3月の記録A" }),
				makeEntry({ id: "e2", date: "2026-03-10", label: "3月の記録B" }),
				makeEntry({ id: "e3", date: "2026-02-15", label: "2月の記録" }),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("2026年3月")).toBeOnTheScreen();
		});

		expect(screen.getByText("3月の記録A")).toBeOnTheScreen();
		expect(screen.getByText("3月の記録B")).toBeOnTheScreen();
		expect(screen.getByText("2月の記録")).toBeOnTheScreen();

		const marchHeader = screen.getByText("2026年3月");
		const febHeader = screen.getByText("2026年2月");
		const marchRecord = screen.getByText("3月の記録A");
		const febRecord = screen.getByText("2月の記録");

		const allTexts = screen.root.findAll(
			(node: { props: Record<string, unknown> }) => node.props.children,
		);
		const marchHeaderIdx = allTexts.indexOf(marchHeader);
		const marchRecordIdx = allTexts.indexOf(marchRecord);
		const febHeaderIdx = allTexts.indexOf(febHeader);
		const febRecordIdx = allTexts.indexOf(febRecord);

		expect(marchHeaderIdx).toBeLessThan(marchRecordIdx);
		expect(marchRecordIdx).toBeLessThan(febHeaderIdx);
		expect(febHeaderIdx).toBeLessThan(febRecordIdx);
	});

	it("記録カードをタップすると詳細画面に遷移する", async () => {
		mockApiResponse({
			data: [makeEntry({ id: "abc-123", originalId: "abc-123" })],
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

	// --- バージョン管理バッジのテスト ---

	it("修正バージョン(v2)に「修正」バッジが表示される", async () => {
		mockApiResponse({
			data: [
				makeEntry({
					id: "mod-1",
					originalId: "entry-1",
					latest: true,
					amount: 9000,
					label: "食費修正",
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("修正")).toBeOnTheScreen();
		});
		expect(screen.getByText("食費修正")).toBeOnTheScreen();
		expect(screen.getByText("¥9,000")).toBeOnTheScreen();
	});

	it("取消バージョンに「取消」バッジが表示される", async () => {
		mockApiResponse({
			data: [
				makeEntry({
					id: "cancel-1",
					originalId: "entry-1",
					cancelled: true,
					latest: true,
					groupCancelled: true,
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("取消")).toBeOnTheScreen();
		});
	});

	it("修正済みの v1 エントリに「修正済み」バッジが表示される", async () => {
		mockApiResponse({
			data: [
				makeEntry({
					id: "entry-1",
					latest: false,
					groupCancelled: false,
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("修正済み")).toBeOnTheScreen();
		});
	});

	it("取消済みの v1 エントリに「取消済み」バッジが表示される", async () => {
		mockApiResponse({
			data: [
				makeEntry({
					id: "entry-1",
					latest: false,
					groupCancelled: true,
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("取消済み")).toBeOnTheScreen();
		});
	});

	it("金額は常に正の値で表示される（バージョン管理方式）", async () => {
		mockApiResponse({
			data: [
				makeEntry({
					id: "mod-1",
					originalId: "entry-1",
					amount: 9000,
					latest: true,
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥9,000")).toBeOnTheScreen();
		});
	});
});
