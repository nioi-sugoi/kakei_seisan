import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
	useRouter: () => ({ replace: mockReplace, back: mockBack }),
}));

jest.mock("expo-constants", () => ({
	default: { appOwnership: null },
}));

const mockPost = jest.fn();

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			entries: {
				$post: (...args: unknown[]) => mockPost(...args),
			},
		},
	},
}));

import EntryFormScreen from "./entry-form";

let queryClient: QueryClient;

function createWrapper() {
	queryClient = new QueryClient({
		defaultOptions: {
			queries: { gcTime: 0 },
			mutations: { retry: false, gcTime: 0 },
		},
	});
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockPost.mockResolvedValue(
		new Response(JSON.stringify({}), { status: 201 }),
	);
});

afterEach(() => {
	queryClient?.clear();
});

describe("EntryFormScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	// --- バリデーション ---

	it("金額が未入力の場合にエラーが表示される", async () => {
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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
			expect(typeof (call[0] as { json: Record<string, unknown> }).json.amount).toBe(
				"number",
			);
		});
	});

	it("金額0は有効な値としてAPIに渡される", async () => {
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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
		render(<EntryFormScreen />, { wrapper: createWrapper() });

		await user.type(screen.getByLabelText("金額"), "500");
		await user.type(screen.getByLabelText("ラベル"), "テスト");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
		});
	});

	it("メモが入力されるとAPIに渡される", async () => {
		render(<EntryFormScreen />, { wrapper: createWrapper() });

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

	it("APIエラー時にエラーメッセージが表示される", async () => {
		mockPost.mockResolvedValue(
			new Response(JSON.stringify({ error: "サーバーエラー" }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			}),
		);
		render(<EntryFormScreen />, { wrapper: createWrapper() });

		await user.type(screen.getByLabelText("金額"), "100");
		await user.type(screen.getByLabelText("ラベル"), "テスト");
		await user.press(screen.getByText("登録する"));

		await waitFor(() => {
			expect(screen.getByText("サーバーエラー")).toBeOnTheScreen();
		});
		expect(mockReplace).not.toHaveBeenCalled();
	});
});
