import {
	render,
	screen,
	userEvent,
	waitFor,
	within,
} from "@testing-library/react-native";
import {
	makeSettlementDetail,
	makeSettlementVersion,
	mockJsonResponse,
	type SettlementDetailResponse,
} from "@/testing/api-mocks";
import { TestQueryWrapper } from "@/testing/query-wrapper";

const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
	useRouter: () => ({ replace: mockReplace, back: mockBack }),
	useLocalSearchParams: () => ({ id: "stl-1" }),
}));

const mockGet = jest.fn();
const mockModifyPost = jest.fn();

jest.mock("@/hooks/use-image-upload", () => ({
	useUploadImages: () => ({
		mutate: jest.fn(),
		mutateAsync: jest.fn(),
		isPending: false,
	}),
	useDeleteImage: () => ({ mutate: jest.fn(), isPending: false }),
	getImageSource: (
		_resourceType: string,
		parentId: string,
		imageId: string,
	) => ({
		uri: `mock://${parentId}/${imageId}`,
	}),
}));

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

function mockSettlementResponse(overrides?: Partial<SettlementDetailResponse>) {
	return mockJsonResponse(
		makeSettlementDetail({
			amount: 5000,
			occurredOn: "2026-03-20",
			versions: [
				makeSettlementVersion({
					amount: 5000,
					occurredOn: "2026-03-20",
					createdAt: 1742000000000,
				}),
			],
			images: [],
			...overrides,
		}),
	);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockGet.mockResolvedValue(mockSettlementResponse());
	mockModifyPost.mockResolvedValue(mockJsonResponse({}, 201));
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
				json: { amount: 3000, hasImageChanges: false },
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
			mockJsonResponse({ error: "精算が見つかりません" }, 404),
		);
		render(<ModifySettlementScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("精算が見つかりません")).toBeOnTheScreen();
		});
	});

	it("修正APIエラー時にエラーメッセージが表示される", async () => {
		mockModifyPost.mockResolvedValue(
			mockJsonResponse({ error: "変更がありません" }, 400),
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
