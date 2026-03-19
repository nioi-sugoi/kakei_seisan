import {
	render,
	screen,
	userEvent,
	waitFor,
} from "@testing-library/react-native";

jest.mock("expo-router", () => ({
	useRouter: jest.fn(() => ({ replace: jest.fn(), back: jest.fn() })),
}));

jest.mock("@/lib/api-client", () => ({
	apiPost: jest.fn(),
}));

import { useRouter } from "expo-router";
import { apiPost } from "@/lib/api-client";
import EntryFormScreen from "./entry-form";

const mockApiPost = jest.mocked(apiPost);
const mockUseRouter = jest.mocked(useRouter);

const mockReplace = jest.fn();
const mockBack = jest.fn();

beforeEach(() => {
	jest.clearAllMocks();
	mockUseRouter.mockReturnValue({
		replace: mockReplace,
		back: mockBack,
	} as ReturnType<typeof useRouter>);
	mockApiPost.mockResolvedValue({ data: {}, error: null });
});

describe("EntryFormScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	// --- バリデーション ---

	it("金額とラベルが空のまま送信するとエラーが表示される", async () => {
		render(<EntryFormScreen />);

		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(
				screen.getByText("0以上の整数を入力してください"),
			).toBeOnTheScreen();
			expect(screen.getByText("ラベルは必須です")).toBeOnTheScreen();
		});
		expect(mockApiPost).not.toHaveBeenCalled();
	});

	it("ラベルが空のまま送信するとラベルエラーのみ表示される", async () => {
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "1000");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(screen.getByText("ラベルは必須です")).toBeOnTheScreen();
		});
		expect(mockApiPost).not.toHaveBeenCalled();
	});

	it("ラベルがスペースのみの場合もバリデーションエラーになる", async () => {
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "500");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"   ",
		);
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(screen.getByText("ラベルは必須です")).toBeOnTheScreen();
		});
		expect(mockApiPost).not.toHaveBeenCalled();
	});

	it("小数の金額を入力するとバリデーションエラーになる", async () => {
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "1.5");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"テスト",
		);
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(
				screen.getByText("0以上の整数を入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockApiPost).not.toHaveBeenCalled();
	});

	it("負の金額を入力するとバリデーションエラーになる", async () => {
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "-100");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"テスト",
		);
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(
				screen.getByText("0以上の整数を入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockApiPost).not.toHaveBeenCalled();
	});

	// --- 送信時のトリム・値変換 ---

	it("ラベルの前後の空白がトリムされてAPIに渡される", async () => {
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "1000");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"  食料品  ",
		);
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockApiPost).toHaveBeenCalledWith(
				"/entries",
				expect.objectContaining({
					label: "食料品",
				}),
			);
		});
	});

	it("メモの前後の空白がトリムされてAPIに渡される", async () => {
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "500");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"お菓子",
		);
		await user.type(screen.getByPlaceholderText("メモを入力..."), "  チョコ  ");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockApiPost).toHaveBeenCalledWith(
				"/entries",
				expect.objectContaining({
					memo: "チョコ",
				}),
			);
		});
	});

	it("メモがスペースのみの場合はundefinedとしてAPIに渡される", async () => {
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "500");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"テスト",
		);
		await user.type(screen.getByPlaceholderText("メモを入力..."), "   ");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockApiPost).toHaveBeenCalledWith(
				"/entries",
				expect.objectContaining({
					memo: undefined,
				}),
			);
		});
	});

	it("金額が文字列からNumberに変換されてAPIに渡される", async () => {
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "2500");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"テスト",
		);
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			const call = mockApiPost.mock.calls[0];
			expect(call[1]).toEqual(
				expect.objectContaining({
					amount: 2500,
				}),
			);
			expect(typeof (call[1] as Record<string, unknown>).amount).toBe(
				"number",
			);
		});
	});

	it("金額0は有効な値としてAPIに渡される", async () => {
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "0");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"テスト",
		);
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockApiPost).toHaveBeenCalledWith(
				"/entries",
				expect.objectContaining({
					amount: 0,
				}),
			);
		});
	});

	// --- 正常送信 ---

	it("立替で入力して送信するとAPIに正しい値が渡る", async () => {
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "1500");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"食料品",
		);
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockApiPost).toHaveBeenCalledWith(
				"/entries",
				expect.objectContaining({
					category: "advance",
					amount: 1500,
					label: "食料品",
				}),
			);
		});
	});

	it("預りに切り替えて送信するとcategoryがdepositになる", async () => {
		render(<EntryFormScreen />);

		await user.press(screen.getByText("預り"));
		await user.type(screen.getByPlaceholderText("0"), "3000");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"生活費",
		);
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockApiPost).toHaveBeenCalledWith(
				"/entries",
				expect.objectContaining({
					category: "deposit",
					amount: 3000,
					label: "生活費",
				}),
			);
		});
	});

	it("送信成功後にタイムラインへ遷移する", async () => {
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "500");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"テスト",
		);
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
		});
	});

	it("メモが入力されるとAPIに渡される", async () => {
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "200");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"お菓子",
		);
		await user.type(screen.getByPlaceholderText("メモを入力..."), "チョコ");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockApiPost).toHaveBeenCalledWith(
				"/entries",
				expect.objectContaining({
					memo: "チョコ",
				}),
			);
		});
	});

	// --- APIエラー ---

	it("APIエラー時にエラーメッセージが表示される", async () => {
		mockApiPost.mockResolvedValue({
			data: null,
			error: { message: "サーバーエラー" },
		});
		render(<EntryFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "100");
		await user.type(
			screen.getByPlaceholderText("例: スーパー買い物"),
			"テスト",
		);
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(screen.getByText("サーバーエラー")).toBeOnTheScreen();
		});
		expect(mockReplace).not.toHaveBeenCalled();
	});

	// --- ナビゲーション ---

	it("戻るボタンでrouter.backが呼ばれる", async () => {
		render(<EntryFormScreen />);

		await user.press(screen.getByText("戻る"));

		expect(mockBack).toHaveBeenCalled();
	});
});
