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
	useLocalSearchParams: () => ({ id: "stl-1" }),
}));

const mockGet = jest.fn();
const mockModifyPost = jest.fn();

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			settlements: {
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

import ModifySettlementScreen from "./[id]";

const jsonHeaders = { "Content-Type": "application/json" };

function mockSettlementResponse(overrides: Record<string, unknown> = {}) {
	return new Response(
		JSON.stringify({
			id: "stl-1",
			userId: "user-1",
			category: "fromHousehold",
			amount: 5000,
			occurredOn: "2026-03-20",
			originalId: "stl-1",
			cancelled: false,
			createdAt: 1742000000000,
			versions: [
				{
					id: "stl-1",
					category: "fromHousehold",
					amount: 5000,
					occurredOn: "2026-03-20",
					cancelled: false,
					latest: true,
					createdAt: 1742000000000,
				},
			],
			...overrides,
		}),
		{ status: 200, headers: jsonHeaders },
	);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockGet.mockResolvedValue(mockSettlementResponse());
	mockModifyPost.mockResolvedValue(
		new Response(JSON.stringify({}), { status: 201, headers: jsonHeaders }),
	);
});

describe("ModifySettlementScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	// --- 表示 ---

	it("精算額に現在の金額がデフォルトで入力されている", async () => {
		render(<ModifySettlementScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});
		expect(screen.getByLabelText("精算額").props.value).toBe("5000");
	});

	it("ヘッダーに「精算を修正」と表示される", async () => {
		render(<ModifySettlementScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("精算を修正")).toBeOnTheScreen();
		});
	});

	// --- 修正ボタンの状態 ---

	it("変更がない場合「修正する」ボタンが無効になる", async () => {
		render(<ModifySettlementScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("修正する")).toBeOnTheScreen();
		});

		expect(screen.getByText("修正する")).toBeDisabled();
	});

	it("金額を変更すると「修正する」ボタンが有効になる", async () => {
		render(<ModifySettlementScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("修正する")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("精算額"));
		await user.type(screen.getByLabelText("精算額"), "3000");

		await waitFor(() => {
			expect(screen.getByText("修正する")).toBeEnabled();
		});
	});

	// --- バリデーション ---

	it("金額が空の場合にバリデーションエラーが表示される", async () => {
		render(<ModifySettlementScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("精算額"));
		await user.type(screen.getByLabelText("精算額"), "1");
		await user.clear(screen.getByLabelText("精算額"));
		await user.press(screen.getByText("修正する"));

		await waitFor(() => {
			const amountField = screen.getByTestId("金額フィールド");
			expect(
				within(amountField).getByText("0より大きい整数を入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockModifyPost).not.toHaveBeenCalled();
	});

	it("小数の金額を入力するとバリデーションエラーになる", async () => {
		render(<ModifySettlementScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("精算額"));
		await user.type(screen.getByLabelText("精算額"), "1.5");
		await user.press(screen.getByText("修正する"));

		await waitFor(() => {
			const amountField = screen.getByTestId("金額フィールド");
			expect(
				within(amountField).getByText("0より大きい整数を入力してください"),
			).toBeOnTheScreen();
		});
		expect(mockModifyPost).not.toHaveBeenCalled();
	});

	// --- 正常送信 ---

	it("金額を変更して送信すると変更後の金額がAPIに渡される", async () => {
		render(<ModifySettlementScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("精算額"));
		await user.type(screen.getByLabelText("精算額"), "3000");
		await user.press(screen.getByText("修正する"));

		await waitFor(() => {
			expect(mockModifyPost).toHaveBeenCalledWith({
				param: { originalId: "stl-1" },
				json: { amount: 3000 },
			});
		});
	});

	it("送信成功後にタイムラインへ遷移する", async () => {
		render(<ModifySettlementScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("精算額"));
		await user.type(screen.getByLabelText("精算額"), "3000");
		await user.press(screen.getByText("修正する"));

		await waitFor(() => {
			expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
		});
	});

	// --- エラー ---

	it("精算データの取得に失敗した場合にエラーメッセージが表示される", async () => {
		mockGet.mockResolvedValue(
			new Response(JSON.stringify({ error: "精算が見つかりません" }), {
				status: 404,
				headers: jsonHeaders,
			}),
		);
		render(<ModifySettlementScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("精算が見つかりません")).toBeOnTheScreen();
		});
	});

	it("修正APIエラー時にエラーメッセージが表示される", async () => {
		mockModifyPost.mockResolvedValue(
			new Response(JSON.stringify({ error: "変更がありません" }), {
				status: 400,
				headers: jsonHeaders,
			}),
		);
		render(<ModifySettlementScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("精算額")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("精算額"));
		await user.type(screen.getByLabelText("精算額"), "3000");
		await user.press(screen.getByText("修正する"));

		await waitFor(() => {
			expect(screen.getByText("変更がありません")).toBeOnTheScreen();
		});
		expect(mockReplace).not.toHaveBeenCalled();
	});
});
