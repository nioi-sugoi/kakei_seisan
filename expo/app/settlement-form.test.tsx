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

jest.mock("expo-router", () => ({
	useRouter: () => ({ replace: mockReplace, back: mockBack }),
}));

const mockBalanceGet = jest.fn();
const mockSettlementsPost = jest.fn();

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			balance: {
				$get: (...args: unknown[]) => mockBalanceGet(...args),
			},
			settlements: {
				$post: (...args: unknown[]) => mockSettlementsPost(...args),
			},
		},
	},
}));

import SettlementFormScreen from "./settlement-form";

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

beforeEach(() => {
	jest.clearAllMocks();
	mockSettlementsPost.mockResolvedValue(
		new Response(JSON.stringify({}), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		}),
	);
});

describe("SettlementFormScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	// --- 表示 ---

	it("残高が正の場合に「家計から受け取ります」と金額付きで表示される", async () => {
		mockBalanceResponse(5000);
		render(<SettlementFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(
				screen.getByText("¥5,000を家計から受け取ります"),
			).toBeOnTheScreen();
		});
	});

	it("残高が負の場合に「家計へ入金します」と金額付きで表示される", async () => {
		mockBalanceResponse(-3000);
		render(<SettlementFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥3,000を家計へ入金します")).toBeOnTheScreen();
		});
	});

	it("精算額に残高の絶対値がデフォルトで入力されている", async () => {
		mockBalanceResponse(5000);
		render(<SettlementFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});
		expect(screen.getByLabelText("精算額").props.value).toBe("5000");
	});

	// --- 全額精算ボタン ---

	it("金額を変更した後「全額精算」ボタンで残高全額が入力される", async () => {
		mockBalanceResponse(5000);
		render(<SettlementFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("精算額"));
		await user.type(screen.getByLabelText("精算額"), "1000");
		await user.press(screen.getByText("全額精算"));

		expect(screen.getByLabelText("精算額").props.value).toBe("5000");
	});

	// --- バリデーション ---

	it("金額が空の場合にバリデーションエラーが表示される", async () => {
		mockBalanceResponse(5000);
		render(<SettlementFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("精算額"));
		await user.press(screen.getByText("精算を実行する"));

		await waitFor(() => {
			const amountField = screen.getByTestId("金額フィールド");
			expect(
				within(amountField).getByText("0より大きい整数を入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockSettlementsPost).not.toHaveBeenCalled();
	});

	it("金額が残高を超える場合にバリデーションエラーが表示される", async () => {
		mockBalanceResponse(3000);
		render(<SettlementFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("精算額"));
		await user.type(screen.getByLabelText("精算額"), "5000");
		await user.press(screen.getByText("精算を実行する"));

		await waitFor(() => {
			const amountField = screen.getByTestId("金額フィールド");
			expect(
				within(amountField).getByText(
					/精算額は残高（¥3,000）以下にしてください/,
				),
			).toBeOnTheScreen();
		});
		expect(mockSettlementsPost).not.toHaveBeenCalled();
	});

	it("小数の金額を入力するとバリデーションエラーになる", async () => {
		mockBalanceResponse(5000);
		render(<SettlementFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("精算額"));
		await user.type(screen.getByLabelText("精算額"), "1.5");
		await user.press(screen.getByText("精算を実行する"));

		await waitFor(() => {
			const amountField = screen.getByTestId("金額フィールド");
			expect(
				within(amountField).getByText("0より大きい整数を入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockSettlementsPost).not.toHaveBeenCalled();
	});

	// --- 正常送信 ---

	it("精算残高が正の場合に精算を新規作成するとcategory=fromHouseholdでAPIに渡される", async () => {
		mockBalanceResponse(5000);
		render(<SettlementFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.press(screen.getByText("精算を実行する"));

		await waitFor(() => {
			expect(mockSettlementsPost).toHaveBeenCalledWith({
				json: expect.objectContaining({
					category: "fromHousehold",
					amount: 5000,
				}),
			});
		});
	});

	it("精算残高が負の場合に精算を新規作成するとcategory=fromUserでAPIに渡される", async () => {
		mockBalanceResponse(-2000);
		render(<SettlementFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.press(screen.getByText("精算を実行する"));

		await waitFor(() => {
			expect(mockSettlementsPost).toHaveBeenCalledWith({
				json: expect.objectContaining({
					category: "fromUser",
					amount: 2000,
				}),
			});
		});
	});

	it("送信成功後にタイムラインへ遷移する", async () => {
		mockBalanceResponse(5000);
		render(<SettlementFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.press(screen.getByText("精算を実行する"));

		await waitFor(() => {
			expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
		});
	});

	it("金額を変更して送信すると変更後の金額がAPIに渡される", async () => {
		mockBalanceResponse(5000);
		render(<SettlementFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("精算額"));
		await user.type(screen.getByLabelText("精算額"), "2000");
		await user.press(screen.getByText("精算を実行する"));

		await waitFor(() => {
			expect(mockSettlementsPost).toHaveBeenCalledWith({
				json: expect.objectContaining({
					amount: 2000,
				}),
			});
		});
	});

	// --- APIエラー ---

	it("APIエラー時にエラーメッセージが表示される", async () => {
		mockSettlementsPost.mockResolvedValue(
			new Response(JSON.stringify({ error: "サーバーエラー" }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			}),
		);
		mockBalanceResponse(5000);
		render(<SettlementFormScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.press(screen.getByText("精算を実行する"));

		await waitFor(() => {
			expect(screen.getByText("エラーが発生しました")).toBeOnTheScreen();
		});
		expect(mockReplace).not.toHaveBeenCalled();
	});
});
