import {
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from "@testing-library/react-native";
import {
	makeBalanceResponse,
	makeTimelineEvent,
	mockJsonResponse,
	type TimelineResponse,
} from "@/testing/api-mocks";
import { TestQueryWrapper } from "@/testing/query-wrapper";

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");

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

function mockTimelineResponse(body: TimelineResponse) {
	mockTimelineGet.mockImplementation(() =>
		Promise.resolve(mockJsonResponse(body)),
	);
}

function mockBalance(balance: number) {
	mockBalanceGet.mockImplementation(() =>
		Promise.resolve(mockJsonResponse(makeBalanceResponse({ balance }))),
	);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockBalance(0);
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
		mockTimelineResponse({
			data: [makeTimelineEvent()],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
		});
		expect(screen.getByText("¥1,500")).toBeOnTheScreen();
		expect(screen.getByText("3月15日")).toBeOnTheScreen();
	});

	it("預りの記録カードが正しく表示される", async () => {
		mockTimelineResponse({
			data: [
				makeTimelineEvent({
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
			expect(screen.getByText("お釣り預かり")).toBeOnTheScreen();
		});
		expect(screen.getByText("¥3,000")).toBeOnTheScreen();
	});

	it("月ごとのセクションヘッダーが表示される", async () => {
		mockTimelineResponse({
			data: [
				makeTimelineEvent({
					id: "e1",
					originalId: "e1",
					occurredOn: "2026-03-15",
				}),
				makeTimelineEvent({
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
				makeTimelineEvent({
					id: "e1",
					originalId: "e1",
					occurredOn: "2026-03-20",
					label: "3月の記録A",
				}),
				makeTimelineEvent({
					id: "e2",
					originalId: "e2",
					occurredOn: "2026-03-10",
					label: "3月の記録B",
				}),
				makeTimelineEvent({
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
			data: [makeTimelineEvent({ id: "abc-123", originalId: "abc-123" })],
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
				makeTimelineEvent({
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
				makeTimelineEvent({
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
				makeTimelineEvent({
					id: "stl-1",
					originalId: "stl-1",
					type: "settlement",
					category: "fromHousehold",
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
		// 精算カード内にバッジ「精算」とラベル「精算」が表示される
		const settlementCard = screen.getByRole("button", {
			name: "精算 ¥5,000",
		});
		expect(within(settlementCard).getAllByText("精算")).toHaveLength(2);
	});

	it("記録と精算が混在するタイムラインが正しく表示される", async () => {
		mockTimelineResponse({
			data: [
				makeTimelineEvent({
					id: "e1",
					originalId: "e1",
					type: "entry",
					category: "advance",
					amount: 1500,
					label: "スーパー",
					occurredOn: "2026-03-20",
				}),
				makeTimelineEvent({
					id: "stl-1",
					originalId: "stl-1",
					type: "settlement",
					category: "fromHousehold",
					amount: 5000,
					label: null,
					occurredOn: "2026-03-18",
				}),
				makeTimelineEvent({
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
			expect(screen.getByText("スーパー")).toBeOnTheScreen();
		});

		// 各カード内の内容をスコープを絞って検証
		const advanceCard = screen.getByRole("button", {
			name: /立替 スーパー/,
		});
		expect(within(advanceCard).getByText("¥1,500")).toBeOnTheScreen();

		const settlementCard = screen.getByRole("button", {
			name: /精算 ¥5,000/,
		});
		expect(within(settlementCard).getAllByText("精算")).toHaveLength(2);

		const depositCard = screen.getByRole("button", {
			name: /預り お釣り/,
		});
		expect(within(depositCard).getByText("¥3,000")).toBeOnTheScreen();
	});

	it("精算カードをタップすると精算詳細画面に遷移する", async () => {
		mockTimelineResponse({
			data: [
				makeTimelineEvent({
					id: "stl-1",
					originalId: "stl-1",
					type: "settlement",
					category: "fromHousehold",
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
		mockBalance(3000);
		mockTimelineResponse({
			data: [makeTimelineEvent()],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("家計から受け取り")).toBeOnTheScreen();
		});
		expect(screen.getByText("¥3,000")).toBeOnTheScreen();
	});

	it("残高がゼロの場合「精算する」ボタンが表示されない", async () => {
		mockBalance(0);
		mockTimelineResponse({
			data: [makeTimelineEvent()],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("現在の精算残高")).toBeOnTheScreen();
		});
		expect(screen.queryByRole("button", { name: "精算する" })).toBeNull();
	});

	it("残高が負の場合「家計へ入金」と表示される", async () => {
		mockBalance(-2000);
		mockTimelineResponse({
			data: [makeTimelineEvent()],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("家計へ入金")).toBeOnTheScreen();
		});
		expect(screen.getByText("¥2,000")).toBeOnTheScreen();
	});

	it("残高が負の場合「精算する」ボタンが表示される", async () => {
		mockBalance(-2000);
		mockTimelineResponse({
			data: [makeTimelineEvent()],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "精算する" }),
			).toBeOnTheScreen();
		});
	});

	it("残高が正の場合「精算する」ボタンが表示されタップで精算フォームに遷移する", async () => {
		mockBalance(5000);
		mockTimelineResponse({
			data: [makeTimelineEvent()],
			nextCursor: null,
		});
		render(<TimelineScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "精算する" }),
			).toBeOnTheScreen();
		});

		await user.press(screen.getByRole("button", { name: "精算する" }));

		expect(mockPush).toHaveBeenCalledWith("/settlement-form");
	});

	describe("種別フィルター", () => {
		function makeAdvanceEvent(overrides: Record<string, unknown> = {}) {
			return makeTimelineEvent({
				id: "adv-1",
				originalId: "adv-1",
				category: "advance",
				label: "スーパー買い物",
				amount: 1500,
				occurredOn: "2026-03-15",
				...overrides,
			});
		}

		function makeDepositEvent(overrides: Record<string, unknown> = {}) {
			return makeTimelineEvent({
				id: "dep-1",
				originalId: "dep-1",
				category: "deposit",
				label: "お釣り預かり",
				amount: 3000,
				occurredOn: "2026-03-14",
				...overrides,
			});
		}

		function makeSettlementEvent(overrides: Record<string, unknown> = {}) {
			return makeTimelineEvent({
				id: "stl-1",
				originalId: "stl-1",
				type: "settlement",
				category: "fromHousehold",
				label: null,
				amount: 5000,
				occurredOn: "2026-03-13",
				...overrides,
			});
		}

		it("種別フィルターピル（すべて / 立替 / 預り / 精算）が表示される", async () => {
			mockTimelineResponse({
				data: [makeAdvanceEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			expect(
				screen.getByRole("button", { name: "すべてで絞り込み" }),
			).toBeOnTheScreen();
			expect(
				screen.getByRole("button", { name: "立替で絞り込み" }),
			).toBeOnTheScreen();
			expect(
				screen.getByRole("button", { name: "預りで絞り込み" }),
			).toBeOnTheScreen();
			expect(
				screen.getByRole("button", { name: "精算で絞り込み" }),
			).toBeOnTheScreen();
		});

		it("デフォルトで「すべて」が選択状態になっている", async () => {
			mockTimelineResponse({
				data: [makeAdvanceEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			expect(
				screen.getByRole("button", {
					name: "すべてで絞り込み",
					selected: true,
				}),
			).toBeOnTheScreen();
			expect(
				screen.getByRole("button", {
					name: "立替で絞り込み",
					selected: false,
				}),
			).toBeOnTheScreen();
		});

		it("「立替」ピルをタップすると category=advance でAPIが呼ばれ、立替記録のみ表示される", async () => {
			mockTimelineResponse({
				data: [makeAdvanceEvent(), makeDepositEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});
			expect(screen.getByText("お釣り預かり")).toBeOnTheScreen();

			mockTimelineResponse({
				data: [makeAdvanceEvent()],
				nextCursor: null,
			});

			await user.press(screen.getByRole("button", { name: "立替で絞り込み" }));

			await waitFor(() => {
				expect(screen.queryByText("お釣り預かり")).toBeNull();
			});
			expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();

			expect(mockTimelineGet).toHaveBeenLastCalledWith({
				query: expect.objectContaining({ category: "advance" }),
			});
		});

		it("「預り」ピルをタップすると category=deposit でAPIが呼ばれ、預り記録のみ表示される", async () => {
			mockTimelineResponse({
				data: [makeAdvanceEvent(), makeDepositEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			mockTimelineResponse({
				data: [makeDepositEvent()],
				nextCursor: null,
			});

			await user.press(screen.getByRole("button", { name: "預りで絞り込み" }));

			await waitFor(() => {
				expect(screen.queryByText("スーパー買い物")).toBeNull();
			});
			expect(screen.getByText("お釣り預かり")).toBeOnTheScreen();

			expect(mockTimelineGet).toHaveBeenLastCalledWith({
				query: expect.objectContaining({ category: "deposit" }),
			});
		});

		it("「精算」ピルをタップすると category=settlement でAPIが呼ばれ、精算記録のみ表示される", async () => {
			mockTimelineResponse({
				data: [makeAdvanceEvent(), makeSettlementEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			mockTimelineResponse({
				data: [makeSettlementEvent()],
				nextCursor: null,
			});

			await user.press(screen.getByRole("button", { name: "精算で絞り込み" }));

			await waitFor(() => {
				expect(screen.queryByText("スーパー買い物")).toBeNull();
			});
			expect(screen.getByText("¥5,000")).toBeOnTheScreen();

			expect(mockTimelineGet).toHaveBeenLastCalledWith({
				query: expect.objectContaining({ category: "settlement" }),
			});
		});

		it("フィルター適用中に「すべて」をタップすると category なしでAPIが呼ばれ、全種別が再表示される", async () => {
			mockTimelineResponse({
				data: [makeAdvanceEvent(), makeDepositEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			// 立替フィルター適用
			mockTimelineResponse({
				data: [makeAdvanceEvent()],
				nextCursor: null,
			});
			await user.press(screen.getByRole("button", { name: "立替で絞り込み" }));

			await waitFor(() => {
				expect(screen.queryByText("お釣り預かり")).toBeNull();
			});

			// 「すべて」に戻す
			mockTimelineResponse({
				data: [makeAdvanceEvent(), makeDepositEvent()],
				nextCursor: null,
			});
			await user.press(
				screen.getByRole("button", { name: "すべてで絞り込み" }),
			);

			await waitFor(() => {
				expect(screen.getByText("お釣り預かり")).toBeOnTheScreen();
			});
			expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();

			expect(mockTimelineGet).toHaveBeenLastCalledWith({
				query: expect.not.objectContaining({ category: expect.anything() }),
			});
		});

		it("選択中のピルが切り替わりアクティブ状態が更新される", async () => {
			mockTimelineResponse({
				data: [makeAdvanceEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			expect(
				screen.getByRole("button", {
					name: "すべてで絞り込み",
					selected: true,
				}),
			).toBeOnTheScreen();
			expect(
				screen.getByRole("button", {
					name: "立替で絞り込み",
					selected: false,
				}),
			).toBeOnTheScreen();

			mockTimelineResponse({
				data: [makeAdvanceEvent()],
				nextCursor: null,
			});
			await user.press(screen.getByRole("button", { name: "立替で絞り込み" }));

			await waitFor(() => {
				expect(
					screen.getByRole("button", {
						name: "立替で絞り込み",
						selected: true,
					}),
				).toBeOnTheScreen();
			});
			expect(
				screen.getByRole("button", {
					name: "すべてで絞り込み",
					selected: false,
				}),
			).toBeOnTheScreen();
		});

		it("フィルター適用で該当月の記録がなくなるとその月のセクション区切りも消える", async () => {
			// 初回: 3月と2月に記録がある（2月は預りのみ）
			mockTimelineResponse({
				data: [
					makeAdvanceEvent({
						id: "adv-1",
						originalId: "adv-1",
						occurredOn: "2026-03-15",
						label: "3月の立替",
					}),
					makeDepositEvent({
						id: "dep-1",
						originalId: "dep-1",
						occurredOn: "2026-02-10",
						label: "2月の預り",
					}),
				],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("2026年3月")).toBeOnTheScreen();
			});
			expect(screen.getByText("2026年2月")).toBeOnTheScreen();

			// 立替フィルター適用 → 3月の立替のみ（2月の預りは除外）
			mockTimelineResponse({
				data: [
					makeAdvanceEvent({
						id: "adv-1",
						originalId: "adv-1",
						occurredOn: "2026-03-15",
						label: "3月の立替",
					}),
				],
				nextCursor: null,
			});
			await user.press(screen.getByRole("button", { name: "立替で絞り込み" }));

			await waitFor(() => {
				expect(screen.queryByText("2026年2月")).toBeNull();
			});
			expect(screen.getByText("2026年3月")).toBeOnTheScreen();
			expect(screen.getByText("3月の立替")).toBeOnTheScreen();
		});

		it("フィルター適用でAPIが空配列を返した場合、空状態メッセージが表示される", async () => {
			mockTimelineResponse({
				data: [makeAdvanceEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			// 精算フィルター適用 → 0件
			mockTimelineResponse({ data: [], nextCursor: null });
			await user.press(screen.getByRole("button", { name: "精算で絞り込み" }));

			await waitFor(() => {
				expect(
					screen.getByText("該当するイベントはありません"),
				).toBeOnTheScreen();
			});
			// フィルターピルは引き続き表示される
			expect(
				screen.getByRole("button", { name: "精算で絞り込み" }),
			).toBeOnTheScreen();
			expect(
				screen.getByRole("button", { name: "すべてで絞り込み" }),
			).toBeOnTheScreen();
		});

		it("フィルター適用中に追加読み込みしても同じ category パラメータが送信される", async () => {
			mockTimelineResponse({
				data: [makeAdvanceEvent()],
				nextCursor: "2026-03-15,1000",
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			// 立替フィルターを適用
			mockTimelineResponse({
				data: [makeAdvanceEvent()],
				nextCursor: "2026-03-15,2000",
			});
			await user.press(screen.getByRole("button", { name: "立替で絞り込み" }));

			await waitFor(() => {
				expect(mockTimelineGet).toHaveBeenLastCalledWith({
					query: expect.objectContaining({ category: "advance" }),
				});
			});

			// 追加読み込みのレスポンスを設定
			mockTimelineResponse({
				data: [
					makeAdvanceEvent({
						id: "adv-old",
						originalId: "adv-old",
						label: "古い立替",
						occurredOn: "2026-02-01",
					}),
				],
				nextCursor: null,
			});

			// FlatListのonEndReachedを手動で発火
			const { FlatList } = require("react-native");
			const flatList = screen.UNSAFE_getByType(FlatList);
			flatList.props.onEndReached();

			await waitFor(() => {
				expect(screen.getByText("古い立替")).toBeOnTheScreen();
			});

			// 追加読み込み時も category=advance が送信される
			expect(mockTimelineGet).toHaveBeenLastCalledWith({
				query: expect.objectContaining({ category: "advance" }),
			});
		});

		it("フィルターを切り替えると最初のページから再取得される", async () => {
			mockTimelineResponse({
				data: [makeAdvanceEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			mockTimelineGet.mockClear();

			mockTimelineResponse({
				data: [makeDepositEvent()],
				nextCursor: null,
			});
			await user.press(screen.getByRole("button", { name: "預りで絞り込み" }));

			await waitFor(() => {
				expect(screen.getByText("お釣り預かり")).toBeOnTheScreen();
			});

			// cursor なし（最初のページ）で呼ばれること
			expect(mockTimelineGet).toHaveBeenCalledWith({
				query: expect.objectContaining({
					category: "deposit",
					cursor: undefined,
				}),
			});
		});
	});

	describe("並び替え", () => {
		it("並び替えボタンが表示されデフォルトで「日付順（新しい順）」が選択されている", async () => {
			mockTimelineResponse({
				data: [makeTimelineEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			const sortButton = screen.getByRole("button", {
				name: "並び替え: 日付順（新しい順）",
			});
			expect(sortButton).toBeOnTheScreen();
		});

		it("並び替えボタンをタップするとドロップダウンメニューが表示される", async () => {
			mockTimelineResponse({
				data: [makeTimelineEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			await user.press(
				screen.getByRole("button", {
					name: "並び替え: 日付順（新しい順）",
				}),
			);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "日付順（新しい順）で並び替え" }),
				).toBeOnTheScreen();
			});
			expect(
				screen.getByRole("button", { name: "日付順（古い順）で並び替え" }),
			).toBeOnTheScreen();
			expect(
				screen.getByRole("button", { name: "更新順（新しい順）で並び替え" }),
			).toBeOnTheScreen();
			expect(
				screen.getByRole("button", { name: "更新順（古い順）で並び替え" }),
			).toBeOnTheScreen();
		});

		it("「更新順（新しい順）」を選択すると sortBy=createdAt, sortOrder=desc でAPIが呼ばれる", async () => {
			mockTimelineResponse({
				data: [makeTimelineEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			// ドロップダウンを開く
			await user.press(
				screen.getByRole("button", {
					name: "並び替え: 日付順（新しい順）",
				}),
			);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "更新順（新しい順）で並び替え" }),
				).toBeOnTheScreen();
			});

			mockTimelineResponse({
				data: [makeTimelineEvent()],
				nextCursor: null,
			});

			// 「更新順（新しい順）」を選択
			await user.press(
				screen.getByRole("button", { name: "更新順（新しい順）で並び替え" }),
			);

			await waitFor(() => {
				expect(mockTimelineGet).toHaveBeenLastCalledWith({
					query: expect.objectContaining({
						sortBy: "createdAt",
						sortOrder: "desc",
					}),
				});
			});

			// ドロップダウンが閉じ、ラベルが更新される
			expect(
				screen.getByRole("button", {
					name: "並び替え: 更新順（新しい順）",
				}),
			).toBeOnTheScreen();
		});

		it("「日付順（古い順）」を選択すると sortBy=occurredOn, sortOrder=asc でAPIが呼ばれる", async () => {
			mockTimelineResponse({
				data: [makeTimelineEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			await user.press(
				screen.getByRole("button", {
					name: "並び替え: 日付順（新しい順）",
				}),
			);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "日付順（古い順）で並び替え" }),
				).toBeOnTheScreen();
			});

			mockTimelineResponse({
				data: [makeTimelineEvent()],
				nextCursor: null,
			});

			await user.press(
				screen.getByRole("button", { name: "日付順（古い順）で並び替え" }),
			);

			await waitFor(() => {
				expect(mockTimelineGet).toHaveBeenLastCalledWith({
					query: expect.objectContaining({
						sortBy: "occurredOn",
						sortOrder: "asc",
					}),
				});
			});
		});

		it("更新順ソート時に createdAt を基準に月グルーピングされる", async () => {
			mockTimelineResponse({
				data: [makeTimelineEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			// 登録日ソートに切り替え
			await user.press(
				screen.getByRole("button", {
					name: "並び替え: 日付順（新しい順）",
				}),
			);

			await waitFor(() => {
				expect(
					screen.getByRole("button", {
						name: "更新順（新しい順）で並び替え",
					}),
				).toBeOnTheScreen();
			});

			// createdAt が 2026年2月 のイベント（occurredOn は 2026年3月）
			const feb2026Timestamp = new Date("2026-02-15T00:00:00").getTime();
			mockTimelineResponse({
				data: [
					makeTimelineEvent({
						id: "e1",
						originalId: "e1",
						occurredOn: "2026-03-15",
						createdAt: feb2026Timestamp,
						label: "2月に登録した記録",
					}),
				],
				nextCursor: null,
			});

			await user.press(
				screen.getByRole("button", { name: "更新順（新しい順）で並び替え" }),
			);

			// createdAt 基準の月ヘッダーが表示される（2026年2月）
			await waitFor(() => {
				expect(screen.getByText("2026年2月")).toBeOnTheScreen();
			});
			expect(screen.getByText("2月に登録した記録")).toBeOnTheScreen();
			// occurredOn 基準の月ヘッダーは表示されない
			expect(screen.queryByText("2026年3月")).toBeNull();
			// カード上の日付も createdAt ベース（2月15日）
			expect(screen.getByText("2月15日")).toBeOnTheScreen();
		});

		it("ソート選択でドロップダウンのアクティブ状態が正しく更新される", async () => {
			mockTimelineResponse({
				data: [makeTimelineEvent()],
				nextCursor: null,
			});
			render(<TimelineScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			// ドロップダウンを開く
			await user.press(
				screen.getByRole("button", {
					name: "並び替え: 日付順（新しい順）",
				}),
			);

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: "日付順（新しい順）で並び替え" }),
				).toBeOnTheScreen();
			});

			// デフォルトで「日付順（新しい順）」が selected
			expect(
				screen.getByRole("button", {
					name: "日付順（新しい順）で並び替え",
					selected: true,
				}),
			).toBeOnTheScreen();
			expect(
				screen.getByRole("button", {
					name: "更新順（新しい順）で並び替え",
					selected: false,
				}),
			).toBeOnTheScreen();
		});
	});
});
