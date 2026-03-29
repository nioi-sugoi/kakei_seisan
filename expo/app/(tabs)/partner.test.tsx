import {
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from "@testing-library/react-native";
import {
	makeBalanceResponse,
	makePartnership,
	makeTimelineEvent,
	mockJsonResponse,
	type PartnerResponse,
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
const mockPartnerGet = jest.fn();
const mockSentGet = jest.fn();
const mockPendingGet = jest.fn();
const mockUseSession = jest.fn();

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			timeline: {
				$get: (...args: unknown[]) => mockTimelineGet(...args),
			},
			balance: {
				$get: (...args: unknown[]) => mockBalanceGet(...args),
			},
			partner: {
				$get: (...args: unknown[]) => mockPartnerGet(...args),
			},
			"partner-invitations": {
				sent: {
					$get: (...args: unknown[]) => mockSentGet(...args),
				},
				pending: {
					$get: (...args: unknown[]) => mockPendingGet(...args),
				},
			},
		},
	},
}));

jest.mock("@/lib/auth-client", () => ({
	authClient: {
		useSession: () => mockUseSession(),
	},
}));

import PartnerScreen from "./partner";

function mockPartnerResponse(data: PartnerResponse["data"]) {
	mockPartnerGet.mockImplementation(() =>
		Promise.resolve(mockJsonResponse({ data })),
	);
}

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

function mockInvitations({
	sent = [],
	pending = [],
}: {
	sent?: unknown[];
	pending?: unknown[];
} = {}) {
	mockSentGet.mockImplementation(() =>
		Promise.resolve(mockJsonResponse({ data: sent })),
	);
	mockPendingGet.mockImplementation(() =>
		Promise.resolve(mockJsonResponse({ data: pending })),
	);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockUseSession.mockReturnValue({
		data: { user: { email: "me@example.com" } },
	});
});

describe("PartnerScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	describe("パートナー未連携時（招待画面）", () => {
		it("パートナー未連携時に招待画面が表示される", async () => {
			mockPartnerResponse(null);
			mockInvitations();
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("パートナー招待")).toBeOnTheScreen();
			});
		});

		it("招待フォームが表示される", async () => {
			mockPartnerResponse(null);
			mockInvitations();
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("招待する")).toBeOnTheScreen();
			});
		});
	});

	describe("パートナー連携済み（タイムライン表示）", () => {
		it("パートナー名入りの残高サマリーが表示される", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(3000);
			mockTimelineResponse({
				data: [makeTimelineEvent({ userId: "partner-user-1" })],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(
					screen.getByText("パートナー太郎さんの精算残高"),
				).toBeOnTheScreen();
			});
			expect(screen.getByText("¥3,000")).toBeOnTheScreen();
			expect(screen.getByText("家計から受け取り")).toBeOnTheScreen();
		});

		it("パートナーのタイムラインで userId パラメータ付きでAPIが呼ばれる", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({
				data: [makeTimelineEvent({ userId: "partner-user-1" })],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			expect(mockTimelineGet).toHaveBeenCalledWith({
				query: expect.objectContaining({ userId: "partner-user-1" }),
			});
		});

		it("パートナーの残高で userId パラメータ付きでAPIが呼ばれる", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({
				data: [makeTimelineEvent()],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			expect(mockBalanceGet).toHaveBeenCalledWith({
				query: expect.objectContaining({ userId: "partner-user-1" }),
			});
		});

		it("パートナーの記録カードが正しく表示される", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({
				data: [
					makeTimelineEvent({
						userId: "partner-user-1",
						label: "パートナーの食費",
						amount: 2500,
					}),
				],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("パートナーの食費")).toBeOnTheScreen();
			});
			expect(screen.getByText("¥2,500")).toBeOnTheScreen();
		});

		it("パートナーの精算カードが表示される", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({
				data: [
					makeTimelineEvent({
						id: "stl-1",
						originalId: "stl-1",
						type: "settlement",
						category: "fromHousehold",
						amount: 5000,
						label: null,
						userId: "partner-user-1",
					}),
				],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("¥5,000")).toBeOnTheScreen();
			});
			const card = screen.getByRole("button", { name: "精算 ¥5,000" });
			expect(within(card).getAllByText("精算")).toHaveLength(2);
		});

		it("記録カードをタップすると詳細画面に遷移する", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({
				data: [
					makeTimelineEvent({
						id: "abc-123",
						originalId: "abc-123",
						userId: "partner-user-1",
					}),
				],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			await user.press(screen.getByText("スーパー買い物"));

			expect(mockPush).toHaveBeenCalledWith("/entry-detail/abc-123");
		});

		it("精算カードをタップすると精算詳細画面に遷移する", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({
				data: [
					makeTimelineEvent({
						id: "stl-1",
						originalId: "stl-1",
						type: "settlement",
						category: "fromHousehold",
						amount: 5000,
						label: null,
						userId: "partner-user-1",
					}),
				],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("¥5,000")).toBeOnTheScreen();
			});

			await user.press(screen.getByRole("button", { name: "精算 ¥5,000" }));

			expect(mockPush).toHaveBeenCalledWith("/settlement-detail/stl-1");
		});

		it("FABボタン（記録を追加）が表示されない", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({
				data: [makeTimelineEvent({ userId: "partner-user-1" })],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
			});

			expect(screen.queryByRole("button", { name: "記録を追加" })).toBeNull();
		});

		it("精算するボタンが表示されない（読み取り専用）", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(5000);
			mockTimelineResponse({
				data: [makeTimelineEvent({ userId: "partner-user-1" })],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(
					screen.getByText("パートナー太郎さんの精算残高"),
				).toBeOnTheScreen();
			});

			expect(screen.queryByRole("button", { name: "精算する" })).toBeNull();
		});

		it("残高が負の場合「家計へ入金」と表示される", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(-2000);
			mockTimelineResponse({
				data: [makeTimelineEvent({ userId: "partner-user-1" })],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("家計へ入金")).toBeOnTheScreen();
			});
			expect(screen.getByText("¥2,000")).toBeOnTheScreen();
		});

		it("残高がゼロの場合も精算するボタンが表示されない", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({
				data: [makeTimelineEvent({ userId: "partner-user-1" })],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(
					screen.getByText("パートナー太郎さんの精算残高"),
				).toBeOnTheScreen();
			});

			expect(screen.queryByRole("button", { name: "精算する" })).toBeNull();
		});

		it("パートナーの記録がない場合に空メッセージが表示される", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({ data: [], nextCursor: null });
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(
					screen.getByText("パートナー太郎さんの記録はまだありません"),
				).toBeOnTheScreen();
			});
		});

		it("パートナー記録の空状態でも残高サマリーは表示される", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({ data: [], nextCursor: null });
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(
					screen.getByText("パートナー太郎さんの精算残高"),
				).toBeOnTheScreen();
			});
		});

		it("月ごとのセクションヘッダーが表示される", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({
				data: [
					makeTimelineEvent({
						id: "e1",
						originalId: "e1",
						occurredOn: "2026-03-15",
						userId: "partner-user-1",
					}),
					makeTimelineEvent({
						id: "e2",
						originalId: "e2",
						occurredOn: "2026-02-28",
						label: "電気代",
						userId: "partner-user-1",
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

		it("修正バージョンにペンシルアイコンが表示される", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({
				data: [
					makeTimelineEvent({
						id: "mod-1",
						originalId: "entry-1",
						latest: true,
						amount: 9000,
						label: "食費",
						userId: "partner-user-1",
					}),
				],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("食費")).toBeOnTheScreen();
			});
			expect(screen.getByText("¥9,000")).toBeOnTheScreen();
			expect(screen.getByLabelText("修正済み")).toBeOnTheScreen();
		});

		it("取消済みの記録が取消済みラベル付きで表示される", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
			mockTimelineResponse({
				data: [
					makeTimelineEvent({
						id: "cancel-1",
						originalId: "entry-1",
						cancelled: true,
						latest: true,
						userId: "partner-user-1",
					}),
				],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(
					screen.getByRole("button", { name: /取消済み/ }),
				).toBeOnTheScreen();
			});
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
					userId: "partner-user-1",
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
					userId: "partner-user-1",
					...overrides,
				});
			}

			it("種別フィルターピル（すべて / 立替 / 預り / 精算）が表示される", async () => {
				mockPartnerResponse(makePartnership());
				mockBalance(0);
				mockTimelineResponse({
					data: [makeAdvanceEvent()],
					nextCursor: null,
				});
				render(<PartnerScreen />, { wrapper: TestQueryWrapper });

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
				mockPartnerResponse(makePartnership());
				mockBalance(0);
				mockTimelineResponse({
					data: [makeAdvanceEvent()],
					nextCursor: null,
				});
				render(<PartnerScreen />, { wrapper: TestQueryWrapper });

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

			it("「立替」ピルをタップすると category=advance でAPIが呼ばれる", async () => {
				mockPartnerResponse(makePartnership());
				mockBalance(0);
				mockTimelineResponse({
					data: [makeAdvanceEvent(), makeDepositEvent()],
					nextCursor: null,
				});
				render(<PartnerScreen />, { wrapper: TestQueryWrapper });

				await waitFor(() => {
					expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
				});

				mockTimelineResponse({
					data: [makeAdvanceEvent()],
					nextCursor: null,
				});

				await user.press(
					screen.getByRole("button", { name: "立替で絞り込み" }),
				);

				await waitFor(() => {
					expect(screen.queryByText("お釣り預かり")).toBeNull();
				});

				expect(mockTimelineGet).toHaveBeenLastCalledWith({
					query: expect.objectContaining({
						category: "advance",
						userId: "partner-user-1",
					}),
				});
			});

			it("フィルター適用でAPIが空配列を返した場合、空状態メッセージが表示される", async () => {
				mockPartnerResponse(makePartnership());
				mockBalance(0);
				mockTimelineResponse({
					data: [makeAdvanceEvent()],
					nextCursor: null,
				});
				render(<PartnerScreen />, { wrapper: TestQueryWrapper });

				await waitFor(() => {
					expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
				});

				mockTimelineResponse({ data: [], nextCursor: null });
				await user.press(
					screen.getByRole("button", { name: "精算で絞り込み" }),
				);

				await waitFor(() => {
					expect(
						screen.getByText("該当するイベントはありません"),
					).toBeOnTheScreen();
				});
			});
		});

		describe("並び替え", () => {
			it("並び替えボタンが表示されデフォルトで「日付順（新しい順）」が選択されている", async () => {
				mockPartnerResponse(makePartnership());
				mockBalance(0);
				mockTimelineResponse({
					data: [makeTimelineEvent({ userId: "partner-user-1" })],
					nextCursor: null,
				});
				render(<PartnerScreen />, { wrapper: TestQueryWrapper });

				await waitFor(() => {
					expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
				});

				expect(
					screen.getByRole("button", {
						name: "並び替え: 日付順（新しい順）",
					}),
				).toBeOnTheScreen();
			});

			it("並び替えボタンをタップするとドロップダウンメニューが表示される", async () => {
				mockPartnerResponse(makePartnership());
				mockBalance(0);
				mockTimelineResponse({
					data: [makeTimelineEvent({ userId: "partner-user-1" })],
					nextCursor: null,
				});
				render(<PartnerScreen />, { wrapper: TestQueryWrapper });

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
						screen.getByRole("button", {
							name: "日付順（新しい順）で並び替え",
						}),
					).toBeOnTheScreen();
				});
				expect(
					screen.getByRole("button", {
						name: "更新順（新しい順）で並び替え",
					}),
				).toBeOnTheScreen();
			});

			it("「更新順（新しい順）」を選択すると sortBy=createdAt でAPIが呼ばれる", async () => {
				mockPartnerResponse(makePartnership());
				mockBalance(0);
				mockTimelineResponse({
					data: [makeTimelineEvent({ userId: "partner-user-1" })],
					nextCursor: null,
				});
				render(<PartnerScreen />, { wrapper: TestQueryWrapper });

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
						screen.getByRole("button", {
							name: "更新順（新しい順）で並び替え",
						}),
					).toBeOnTheScreen();
				});

				mockTimelineResponse({
					data: [makeTimelineEvent({ userId: "partner-user-1" })],
					nextCursor: null,
				});

				await user.press(
					screen.getByRole("button", {
						name: "更新順（新しい順）で並び替え",
					}),
				);

				await waitFor(() => {
					expect(mockTimelineGet).toHaveBeenLastCalledWith({
						query: expect.objectContaining({
							sortBy: "createdAt",
							sortOrder: "desc",
							userId: "partner-user-1",
						}),
					});
				});
			});
		});

		it("記録と精算が混在するタイムラインが正しく表示される", async () => {
			mockPartnerResponse(makePartnership());
			mockBalance(0);
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
						userId: "partner-user-1",
					}),
					makeTimelineEvent({
						id: "stl-1",
						originalId: "stl-1",
						type: "settlement",
						category: "fromHousehold",
						amount: 5000,
						label: null,
						occurredOn: "2026-03-18",
						userId: "partner-user-1",
					}),
					makeTimelineEvent({
						id: "e2",
						originalId: "e2",
						type: "entry",
						category: "deposit",
						amount: 3000,
						label: "お釣り",
						occurredOn: "2026-03-15",
						userId: "partner-user-1",
					}),
				],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("スーパー")).toBeOnTheScreen();
			});

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

		it("invitee ロールでもパートナー名が正しく表示される", async () => {
			mockPartnerResponse(
				makePartnership({
					role: "invitee",
					partnerName: "招待者",
					partnerId: "inviter-user-1",
				}),
			);
			mockBalance(0);
			mockTimelineResponse({
				data: [makeTimelineEvent({ userId: "inviter-user-1" })],
				nextCursor: null,
			});
			render(<PartnerScreen />, { wrapper: TestQueryWrapper });

			await waitFor(() => {
				expect(screen.getByText("招待者さんの精算残高")).toBeOnTheScreen();
			});
		});
	});
});
