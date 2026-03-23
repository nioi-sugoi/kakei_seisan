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

const mockTimelineGet = jest.fn();
const mockBalanceGet = jest.fn();

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			timeline: {
				$get: (...args: unknown[]) => mockTimelineGet(...args),
			},
			balance: {
				$get: (...args: unknown[]) => mockBalanceGet(...args),
			},
		},
	},
}));

import TimelineScreen from "./index";

function mockTimelineResponse(body: unknown) {
	mockTimelineGet.mockImplementation(() =>
		Promise.resolve(
			new Response(JSON.stringify(body), {
				headers: { "Content-Type": "application/json" },
			}),
		),
	);
}

function makeRecord(overrides: Record<string, unknown> = {}) {
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
		createdAt: 1773676800000,
		...overrides,
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	mockBalanceGet.mockImplementation(() =>
		Promise.resolve(
			new Response(
				JSON.stringify({
					advanceTotal: 0,
					depositTotal: 0,
					fromHouseholdTotal: 0,
					fromUserTotal: 0,
					balance: 0,
				}),
				{ headers: { "Content-Type": "application/json" } },
			),
		),
	);
});

describe("TimelineScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	it("記録がない場合に空の状態メッセージが表示される", async () => {
		mockTimelineResponse({ data: [], nextCursor: null });
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(
				screen.getByText("支出の履歴がここに表示されます"),
			).toBeOnTheScreen();
		});
	});

	it("立替の記録カードが正しく表示される", async () => {
		mockTimelineResponse({ data: [makeRecord()], nextCursor: null });
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("立替")).toBeOnTheScreen();
		});
		expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
		expect(screen.getByText("¥1,500")).toBeOnTheScreen();
		expect(screen.getByText("3月15日")).toBeOnTheScreen();
	});

	it("預りの記録カードが正しく表示される", async () => {
		mockTimelineResponse({
			data: [
				makeRecord({
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
		expect(screen.getByText("¥3,000")).toBeOnTheScreen();
	});

	it("月ごとのセクションヘッダーが表示される", async () => {
		mockTimelineResponse({
			data: [
				makeRecord({ id: "e1", originalId: "e1", occurredOn: "2026-03-15" }),
				makeRecord({
					id: "e2",
					originalId: "e2",
					occurredOn: "2026-02-28",
					label: "電気代",
				}),
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
		mockTimelineResponse({
			data: [
				makeRecord({
					id: "e1",
					originalId: "e1",
					occurredOn: "2026-03-20",
					label: "3月の記録A",
				}),
				makeRecord({
					id: "e2",
					originalId: "e2",
					occurredOn: "2026-03-10",
					label: "3月の記録B",
				}),
				makeRecord({
					id: "e3",
					originalId: "e3",
					occurredOn: "2026-02-15",
					label: "2月の記録",
				}),
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
		mockTimelineResponse({
			data: [makeRecord({ id: "abc-123", originalId: "abc-123" })],
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
		mockTimelineResponse({ data: [], nextCursor: null });
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		const fab = await screen.findByRole("button", { name: "記録を追加" });

		await user.press(fab);

		expect(mockPush).toHaveBeenCalledWith("/entry-form");
	});

	it("修正バージョン(v2)にペンシルアイコンが表示される", async () => {
		mockTimelineResponse({
			data: [
				makeRecord({
					id: "mod-1",
					originalId: "entry-1",
					latest: true,
					amount: 9000,
					label: "食費",
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("食費")).toBeOnTheScreen();
		});
		expect(screen.getByText("¥9,000")).toBeOnTheScreen();
		expect(screen.getByLabelText("修正済み")).toBeOnTheScreen();
	});

	it("取消バージョンが薄く表示される", async () => {
		mockTimelineResponse({
			data: [
				makeRecord({
					id: "cancel-1",
					originalId: "entry-1",
					cancelled: true,
					latest: true,
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /取消済み/ }),
			).toBeOnTheScreen();
		});
	});

	it("精算カードにバッジとラベルが表示される", async () => {
		mockTimelineResponse({
			data: [
				makeRecord({
					id: "stl-1",
					originalId: "stl-1",
					type: "settlement",
					category: null,
					amount: 5000,
					label: null,
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥5,000")).toBeOnTheScreen();
		});
		// バッジ「精算」とラベル「精算」の2つが表示される
		expect(screen.getAllByText("精算")).toHaveLength(2);
	});

	it("精算カードをタップすると精算詳細画面に遷移する", async () => {
		mockTimelineResponse({
			data: [
				makeRecord({
					id: "stl-1",
					originalId: "stl-1",
					type: "settlement",
					category: null,
					amount: 5000,
					label: null,
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥5,000")).toBeOnTheScreen();
		});

		await user.press(screen.getByRole("button", { name: "精算 ¥5,000" }));

		expect(mockPush).toHaveBeenCalledWith("/settlement-detail/stl-1");
	});
});
