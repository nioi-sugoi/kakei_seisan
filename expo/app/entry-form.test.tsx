import {
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from "@testing-library/react-native";
import { TestQueryWrapper } from "@/testing/query-wrapper";

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
	useRouter: () => ({ replace: mockReplace, back: mockBack }),
	useLocalSearchParams: () => mockSearchParams,
}));

jest.mock("expo-constants", () => ({
	default: { appOwnership: null },
}));

const mockPost = jest.fn();
const mockGet = jest.fn();
const mockModifyPost = jest.fn();

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			entries: {
				$post: (...args: unknown[]) => mockPost(...args),
				":id": {
					$get: (...args: unknown[]) => mockGet(...args),
				},
				":originalId": {
					modify: {
						$post: (...args: unknown[]) => mockModifyPost(...args),
					},
				},
			},
		},
	},
}));

import EntryFormScreen from "./entry-form";

beforeEach(() => {
	jest.clearAllMocks();
	mockSearchParams = {};
	mockPost.mockResolvedValue(new Response(JSON.stringify({}), { status: 201 }));
});

describe("EntryFormScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	// --- バリデーション ---

	it("金額が未入力の場合にエラーが表示される", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("ラベル"), "テスト");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			const amountField = screen.getByTestId("金額フィールド");
			expect(
				within(amountField).getByText("0以上の整数を入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockPost).not.toHaveBeenCalled();
	});

	it("ラベルが未入力の場合にエラーが表示される", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "1000");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			const labelField = screen.getByTestId("ラベルフィールド");
			expect(
				within(labelField).getByText("ラベルは必須です"),
			).toBeOnTheScreen();
		});
		expect(mockPost).not.toHaveBeenCalled();
	});

	it("ラベルが半角スペースのみの場合もバリデーションエラーになる", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "500");
		await user.type(screen.getByLabelText("ラベル"), "   ");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			const labelField = screen.getByTestId("ラベルフィールド");
			expect(
				within(labelField).getByText("ラベルは必須です"),
			).toBeOnTheScreen();
		});
		expect(mockPost).not.toHaveBeenCalled();
	});

	it("ラベルが全角スペースのみの場合もバリデーションエラーになる", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "500");
		await user.type(screen.getByLabelText("ラベル"), "\u3000\u3000\u3000");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			const labelField = screen.getByTestId("ラベルフィールド");
			expect(
				within(labelField).getByText("ラベルは必須です"),
			).toBeOnTheScreen();
		});
		expect(mockPost).not.toHaveBeenCalled();
	});

	it("小数の金額を入力するとバリデーションエラーになる", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "1.5");
		await user.type(screen.getByLabelText("ラベル"), "テスト");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			const amountField = screen.getByTestId("金額フィールド");
			expect(
				within(amountField).getByText("0以上の整数を入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockPost).not.toHaveBeenCalled();
	});

	it("負の金額を入力するとバリデーションエラーになる", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "-100");
		await user.type(screen.getByLabelText("ラベル"), "テスト");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			const amountField = screen.getByTestId("金額フィールド");
			expect(
				within(amountField).getByText("0以上の整数を入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockPost).not.toHaveBeenCalled();
	});

	it("数字以外の文字列を入力するとバリデーションエラーになる", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "abc");
		await user.type(screen.getByLabelText("ラベル"), "テスト");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			const amountField = screen.getByTestId("金額フィールド");
			expect(
				within(amountField).getByText("0以上の整数を入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockPost).not.toHaveBeenCalled();
	});

	// --- 送信時のトリム・値変換 ---

	it("ラベルの前後の空白がトリムされてAPIに渡される", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "1000");
		await user.type(screen.getByLabelText("ラベル"), "  食料品  ");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockPost).toHaveBeenCalledWith({
				json: expect.objectContaining({
					label: "食料品",
				}),
			});
		});
	});

	it("金額が文字列からNumberに変換されてAPIに渡される", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "2500");
		await user.type(screen.getByLabelText("ラベル"), "テスト");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			const call = mockPost.mock.calls[0];
			expect(call[0]).toEqual(
				expect.objectContaining({
					json: expect.objectContaining({
						amount: 2500,
					}),
				}),
			);
			expect(
				typeof (call[0] as { json: Record<string, unknown> }).json.amount,
			).toBe("number");
		});
	});

	it("金額0は有効な値としてAPIに渡される", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "0");
		await user.type(screen.getByLabelText("ラベル"), "テスト");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockPost).toHaveBeenCalledWith({
				json: expect.objectContaining({
					amount: 0,
				}),
			});
		});
	});

	// --- 正常送信 ---

	it("立替で入力して送信するとAPIに正しい値が渡る", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "1500");
		await user.type(screen.getByLabelText("ラベル"), "食料品");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockPost).toHaveBeenCalledWith({
				json: expect.objectContaining({
					category: "advance",
					amount: 1500,
					label: "食料品",
				}),
			});
		});
	});

	it("預りに切り替えて送信するとcategoryがdepositになる", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.press(screen.getByText("預り"));
		await user.type(screen.getByLabelText("金額"), "3000");
		await user.type(screen.getByLabelText("ラベル"), "生活費");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockPost).toHaveBeenCalledWith({
				json: expect.objectContaining({
					category: "deposit",
					amount: 3000,
					label: "生活費",
				}),
			});
		});
	});

	it("送信成功後にタイムラインへ遷移する", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "500");
		await user.type(screen.getByLabelText("ラベル"), "テスト");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
		});
	});

	it("メモが入力されるとAPIに渡される", async () => {
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "200");
		await user.type(screen.getByLabelText("ラベル"), "お菓子");
		await user.type(screen.getByLabelText("メモ"), "チョコ");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockPost).toHaveBeenCalledWith({
				json: expect.objectContaining({
					memo: "チョコ",
				}),
			});
		});
	});

	// --- APIエラー ---

	// --- 修正モード ---

	it("修正モードではカテゴリセレクターが操作できない", async () => {
		mockSearchParams = { modifyId: "entry-1" };
		mockGet.mockResolvedValue(
			new Response(
				JSON.stringify({
					id: "entry-1",
					userId: "user-1",
					category: "deposit",
					amount: 3000,
					date: "2026-03-15",
					label: "お釣り",
					memo: null,
					originalId: "entry-1",
					cancelled: false,
					createdAt: 1742000000000,
					versions: [
						{
							id: "entry-1",
							category: "deposit",
							amount: 3000,
							date: "2026-03-15",
							label: "お釣り",
							memo: null,
							cancelled: false,
							createdAt: 1742000000000,
						},
					],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);

		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("記録を修正")).toBeOnTheScreen();
		});

		// カテゴリセレクターの「立替」「預り」ボタンがdisabledであることを確認
		const advanceButton = screen.getByText("立替");
		const depositButton = screen.getByText("預り");
		expect(advanceButton).toBeDisabled();
		expect(depositButton).toBeDisabled();
	});

	it("修正モードでは変更がない場合「修正する」ボタンが無効になる", async () => {
		mockSearchParams = { modifyId: "entry-1" };
		mockGet.mockResolvedValue(
			new Response(
				JSON.stringify({
					id: "entry-1",
					userId: "user-1",
					category: "advance",
					amount: 1000,
					date: "2026-03-15",
					label: "テスト",
					memo: null,
					originalId: "entry-1",
					cancelled: false,
					createdAt: 1742000000000,
					versions: [
						{
							id: "entry-1",
							category: "advance",
							amount: 1000,
							date: "2026-03-15",
							label: "テスト",
							memo: null,
							cancelled: false,
							latest: true,
							createdAt: 1742000000000,
						},
					],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);

		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("修正する")).toBeOnTheScreen();
		});

		expect(screen.getByText("修正する")).toBeDisabled();
	});

	it("修正モードで値を変更すると「修正する」ボタンが有効になる", async () => {
		mockSearchParams = { modifyId: "entry-1" };
		mockGet.mockResolvedValue(
			new Response(
				JSON.stringify({
					id: "entry-1",
					userId: "user-1",
					category: "advance",
					amount: 1000,
					date: "2026-03-15",
					label: "テスト",
					memo: null,
					originalId: "entry-1",
					cancelled: false,
					createdAt: 1742000000000,
					versions: [
						{
							id: "entry-1",
							category: "advance",
							amount: 1000,
							date: "2026-03-15",
							label: "テスト",
							memo: null,
							cancelled: false,
							latest: true,
							createdAt: 1742000000000,
						},
					],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);

		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("修正する")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("金額"));
		await user.type(screen.getByLabelText("金額"), "2000");

		await waitFor(() => {
			expect(screen.getByText("修正する")).toBeEnabled();
		});
	});

	// --- APIエラー ---

	it("APIエラー時にエラーメッセージが表示される", async () => {
		mockPost.mockResolvedValue(
			new Response(JSON.stringify({ error: "サーバーエラー" }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			}),
		);
		render(<EntryFormScreen />, { wrapper: TestQueryWrapper });

		await user.type(screen.getByLabelText("金額"), "100");
		await user.type(screen.getByLabelText("ラベル"), "テスト");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(screen.getByText("エラーが発生しました")).toBeOnTheScreen();
		});
		expect(mockReplace).not.toHaveBeenCalled();
	});
});
