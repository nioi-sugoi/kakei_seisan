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

function mockBalanceResponse(balance: number) {
	mockBalanceGet.mockImplementation(() =>
		Promise.resolve(
			new Response(
				JSON.stringify({
					advanceTotal: 0,
					depositTotal: 0,
					fromHouseholdTotal: 0,
					fromUserTotal: 0,
					balance,
				}),
				{ headers: { "Content-Type": "application/json" } },
			),
		),
	);
}

function makeEvent(overrides: Record<string, unknown> = {}) {
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
		mockTimelineResponse({ data: [makeEvent()], nextCursor: null });
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
				makeEvent({
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
				makeEvent({ id: "e1", originalId: "e1", occurredOn: "2026-03-15" }),
				makeEvent({
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
				makeEvent({
					id: "e1",
					originalId: "e1",
					occurredOn: "2026-03-20",
					label: "3月の記録A",
				}),
				makeEvent({
					id: "e2",
					originalId: "e2",
					occurredOn: "2026-03-10",
					label: "3月の記録B",
				}),
				makeEvent({
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
		const marchEntry = screen.getByText("3月の記録A");
		const febEntry = screen.getByText("2月の記録");

		const allTexts = screen.root.findAll(
			(node: { props: Record<string, unknown> }) => node.props.children,
		);
		const marchHeaderIdx = allTexts.indexOf(marchHeader);
		const marchEntryIdx = allTexts.indexOf(marchEntry);
		const febHeaderIdx = allTexts.indexOf(febHeader);
		const febEntryIdx = allTexts.indexOf(febEntry);

		expect(marchHeaderIdx).toBeLessThan(marchEntryIdx);
		expect(marchEntryIdx).toBeLessThan(febHeaderIdx);
		expect(febHeaderIdx).toBeLessThan(febEntryIdx);
	});

	it("記録カードをタップすると詳細画面に遷移する", async () => {
		mockTimelineResponse({
			data: [makeEvent({ id: "abc-123", originalId: "abc-123" })],
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
				makeEvent({
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

	it("取消済みの記録が取消済みラベル付きで表示される", async () => {
		mockTimelineResponse({
			data: [
				makeEvent({
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
				makeEvent({
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

	it("記録と精算が混在するタイムラインが正しく表示される", async () => {
		mockTimelineResponse({
			data: [
				makeEvent({
					id: "e1",
					originalId: "e1",
					type: "entry",
					category: "advance",
					amount: 1500,
					label: "スーパー",
					occurredOn: "2026-03-20",
				}),
				makeEvent({
					id: "stl-1",
					originalId: "stl-1",
					type: "settlement",
					category: null,
					amount: 5000,
					label: null,
					occurredOn: "2026-03-18",
				}),
				makeEvent({
					id: "e2",
					originalId: "e2",
					type: "entry",
					category: "deposit",
					amount: 3000,
					label: "お釣り",
					occurredOn: "2026-03-15",
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("立替")).toBeOnTheScreen();
		});
		expect(screen.getByText("スーパー")).toBeOnTheScreen();
		expect(screen.getByText("¥1,500")).toBeOnTheScreen();

		expect(screen.getAllByText("精算")).toHaveLength(2);
		expect(screen.getByText("¥5,000")).toBeOnTheScreen();

		expect(screen.getByText("預り")).toBeOnTheScreen();
		expect(screen.getByText("お釣り")).toBeOnTheScreen();
		expect(screen.getByText("¥3,000")).toBeOnTheScreen();
	});

	it("精算カードをタップすると精算詳細画面に遷移する", async () => {
		mockTimelineResponse({
			data: [
				makeEvent({
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

	it("残高が正の場合「家計から受け取り」と表示される", async () => {
		mockBalanceResponse(3000);
		mockTimelineResponse({ data: [makeEvent()], nextCursor: null });
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("家計から受け取り")).toBeOnTheScreen();
		});
		expect(screen.getByText("¥3,000")).toBeOnTheScreen();
	});

	it("残高がゼロの場合「精算する」ボタンが表示されない", async () => {
		mockBalanceResponse(0);
		mockTimelineResponse({ data: [makeEvent()], nextCursor: null });
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("現在の精算残高")).toBeOnTheScreen();
		});
		expect(screen.queryByRole("button", { name: "精算する" })).toBeNull();
	});

	it("残高が負の場合「家計へ入金」と表示される", async () => {
		mockBalanceResponse(-2000);
		mockTimelineResponse({ data: [makeEvent()], nextCursor: null });
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("家計へ入金")).toBeOnTheScreen();
		});
		expect(screen.getByText("¥2,000")).toBeOnTheScreen();
	});

	it("残高が負の場合「精算する」ボタンが表示される", async () => {
		mockBalanceResponse(-2000);
		mockTimelineResponse({ data: [makeEvent()], nextCursor: null });
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "精算する" }),
			).toBeOnTheScreen();
		});
	});

	it("残高が正の場合「精算する」ボタンが表示されタップで精算フォームに遷移する", async () => {
		mockBalanceResponse(5000);
		mockTimelineResponse({ data: [makeEvent()], nextCursor: null });
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "精算する" }),
			).toBeOnTheScreen();
		});

		await user.press(screen.getByRole("button", { name: "精算する" }));

		expect(mockPush).toHaveBeenCalledWith("/settlement-form");
	});
});

describe("TimelineScreen 承認ステータス表示", () => {
	it("showApprovalStatus=false の場合、承認ステータスインジケーターが表示されない", async () => {
		mockTimelineResponse({
			data: [makeEvent({ status: "pending", approvalComment: null })],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
		});

		expect(screen.queryByText("承認待ち")).toBeNull();
		expect(screen.queryByText("承認済み")).toBeNull();
		expect(screen.queryByText("差し戻し")).toBeNull();
	});

	it("showApprovalStatus=true の場合、承認待ちインジケーターが表示される", async () => {
		mockTimelineResponse({
			data: [makeEvent({ status: "pending", approvalComment: null })],
			nextCursor: null,
		});
		render(<TimelineScreen showApprovalStatus />, {
			wrapper: TestQueryWrapper,
		});

		await waitFor(() => {
			expect(screen.getByText(/承認待ち/)).toBeOnTheScreen();
		});
	});

	it("showApprovalStatus=true の場合、承認済みインジケーターが表示される", async () => {
		mockTimelineResponse({
			data: [makeEvent({ status: "approved", approvalComment: null })],
			nextCursor: null,
		});
		render(<TimelineScreen showApprovalStatus />, {
			wrapper: TestQueryWrapper,
		});

		await waitFor(() => {
			expect(screen.getByText(/承認済み/)).toBeOnTheScreen();
		});
	});

	it("showApprovalStatus=true の場合、差し戻しインジケーターが表示される", async () => {
		mockTimelineResponse({
			data: [
				makeEvent({
					status: "rejected",
					approvalComment: "金額を確認してください",
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen showApprovalStatus />, {
			wrapper: TestQueryWrapper,
		});

		await waitFor(() => {
			expect(screen.getByText(/差し戻し/)).toBeOnTheScreen();
		});
	});

	it("差し戻しコメントがインライン表示される", async () => {
		mockTimelineResponse({
			data: [
				makeEvent({
					status: "rejected",
					approvalComment: "金額を確認してください",
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen showApprovalStatus />, {
			wrapper: TestQueryWrapper,
		});

		await waitFor(() => {
			expect(screen.getByText("金額を確認してください")).toBeOnTheScreen();
		});
	});

	it("差し戻しコメントがない場合はコメントが表示されない", async () => {
		mockTimelineResponse({
			data: [makeEvent({ status: "rejected", approvalComment: null })],
			nextCursor: null,
		});
		render(<TimelineScreen showApprovalStatus />, {
			wrapper: TestQueryWrapper,
		});

		await waitFor(() => {
			expect(screen.getByText(/差し戻し/)).toBeOnTheScreen();
		});
		// コメントがないのでカード内にコメントテキストは表示されない
		expect(screen.queryByText("金額を確認してください")).toBeNull();
	});

	it("取消済みの記録にも承認ステータスインジケーターが表示される", async () => {
		mockTimelineResponse({
			data: [
				makeEvent({
					id: "cancel-1",
					originalId: "entry-1",
					cancelled: true,
					latest: true,
					status: "pending",
					approvalComment: null,
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen showApprovalStatus />, {
			wrapper: TestQueryWrapper,
		});

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /取消済み/ }),
			).toBeOnTheScreen();
		});
		expect(screen.getByText(/承認待ち/)).toBeOnTheScreen();
	});

	it("異なる承認ステータスの記録が混在して正しく表示される", async () => {
		mockTimelineResponse({
			data: [
				makeEvent({
					id: "e1",
					originalId: "e1",
					status: "approved",
					approvalComment: null,
					label: "承認済み記録",
				}),
				makeEvent({
					id: "e2",
					originalId: "e2",
					status: "pending",
					approvalComment: null,
					label: "承認待ち記録",
				}),
				makeEvent({
					id: "e3",
					originalId: "e3",
					status: "rejected",
					approvalComment: "要修正",
					label: "差し戻し記録",
				}),
			],
			nextCursor: null,
		});
		render(<TimelineScreen showApprovalStatus />, {
			wrapper: TestQueryWrapper,
		});

		await waitFor(() => {
			expect(screen.getByText("承認済み記録")).toBeOnTheScreen();
		});
		expect(screen.getByText(/✓ 承認済み/)).toBeOnTheScreen();
		expect(screen.getByText(/● 承認待ち/)).toBeOnTheScreen();
		expect(screen.getByText(/✕ 差し戻し/)).toBeOnTheScreen();
		expect(screen.getByText("要修正")).toBeOnTheScreen();
	});
});
