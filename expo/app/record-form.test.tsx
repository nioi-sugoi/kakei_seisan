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

import RecordFormScreen from "./record-form";
import { apiPost } from "@/lib/api-client";
import { useRouter } from "expo-router";

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

describe("RecordFormScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	// --- 初期表示 ---

	it("フォームの各項目が表示される", () => {
		render(<RecordFormScreen />);

		expect(screen.getByText("記録を登録")).toBeOnTheScreen();
		expect(screen.getByText("立替")).toBeOnTheScreen();
		expect(screen.getByText("預り")).toBeOnTheScreen();
		expect(screen.getByText("金額")).toBeOnTheScreen();
		expect(screen.getByPlaceholderText("例: スーパー買い物")).toBeOnTheScreen();
		expect(screen.getByPlaceholderText("メモを入力...")).toBeOnTheScreen();
		expect(screen.getByText("登録する")).toBeOnTheScreen();
	});

	// --- バリデーション ---

	it("金額とラベルが空のまま送信するとエラーが表示される", async () => {
		render(<RecordFormScreen />);

		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(screen.getByText("0以上の整数を入力してください")).toBeOnTheScreen();
			expect(screen.getByText("ラベルは必須です")).toBeOnTheScreen();
		});
		expect(mockApiPost).not.toHaveBeenCalled();
	});

	it("ラベルが空のまま送信するとラベルエラーのみ表示される", async () => {
		render(<RecordFormScreen />);

		await user.type(screen.getByPlaceholderText("0"), "1000");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(screen.getByText("ラベルは必須です")).toBeOnTheScreen();
		});
		expect(mockApiPost).not.toHaveBeenCalled();
	});

	// --- 正常送信 ---

	it("立替で入力して送信するとAPIに正しい値が渡る", async () => {
		render(<RecordFormScreen />);

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
		render(<RecordFormScreen />);

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
		render(<RecordFormScreen />);

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
		render(<RecordFormScreen />);

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
		render(<RecordFormScreen />);

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
		render(<RecordFormScreen />);

		await user.press(screen.getByText("戻る"));

		expect(mockBack).toHaveBeenCalled();
	});
});
