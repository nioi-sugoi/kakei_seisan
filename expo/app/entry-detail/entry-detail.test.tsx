import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	render,
	screen,
	userEvent,
	waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
	useLocalSearchParams: () => ({ id: "entry-1" }),
	useRouter: () => ({ back: mockBack, push: mockPush }),
}));

const mockGet = jest.fn();

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			entries: {
				// biome-ignore lint/complexity/useLiteralKeys: Hono RPC client uses ":id" as computed key
				[":id"]: {
					$get: (...args: unknown[]) => mockGet(...args),
				},
			},
		},
	},
}));

import EntryDetailScreen from "./[id]";

let queryClient: QueryClient;

function createWrapper() {
	queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
		},
	});
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

const jsonHeaders = { "Content-Type": "application/json" };

function mockEntryResponse(overrides: Record<string, unknown> = {}) {
	return new Response(
		JSON.stringify({
			id: "entry-1",
			userId: "user-1",
			category: "advance",
			operation: "original",
			amount: 4280,
			date: "2026-03-15",
			label: "スーパー買い物",
			memo: "夕食の材料",
			status: "approved",
			parentId: null,
			approvedBy: null,
			approvedAt: null,
			approvalComment: null,
			createdAt: 1742000000000,
			updatedAt: 1742000000000,
			images: [],
			children: [],
			parent: null,
			...overrides,
		}),
		{ status: 200, headers: jsonHeaders },
	);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockGet.mockResolvedValue(mockEntryResponse());
});

afterEach(() => {
	queryClient?.clear();
});

describe("EntryDetailScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	it("記録の基本情報が表示される", async () => {
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("¥4,280")).toBeOnTheScreen();
		});
		expect(screen.getByText("立替")).toBeOnTheScreen();
		expect(screen.getByText("2026年3月15日")).toBeOnTheScreen();
		expect(screen.getByText("スーパー買い物")).toBeOnTheScreen();
		expect(screen.getByText("夕食の材料")).toBeOnTheScreen();
	});

	it("預りカテゴリの場合はマイナス符号付きで金額が表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({ category: "deposit", amount: 3000 }),
		);
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("-¥3,000")).toBeOnTheScreen();
		});
		expect(screen.getByText("預り")).toBeOnTheScreen();
	});

	it("メモが空の場合はメモ行が表示されない", async () => {
		mockGet.mockResolvedValue(mockEntryResponse({ memo: null }));
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("¥4,280")).toBeOnTheScreen();
		});
		expect(screen.queryByText("メモ")).not.toBeOnTheScreen();
	});

	it("戻るボタンで前の画面に戻る", async () => {
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("¥4,280")).toBeOnTheScreen();
		});
		await user.press(screen.getByText("戻る"));

		expect(mockBack).toHaveBeenCalled();
	});

	it("修正済みの記録は修正済みバッジが表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				children: [{ id: "child-1", operation: "modification" }],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("修正済み")).toBeOnTheScreen();
		});
	});

	it("取消済みの記録は取消済みバッジが表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				children: [{ id: "child-1", operation: "cancellation" }],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("取消済み")).toBeOnTheScreen();
		});
	});

	it("修正レコードは修正バッジが表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				operation: "modification",
				parentId: "parent-1",
				parent: {
					id: "parent-1",
					operation: "original",
					category: "advance",
					amount: 5000,
				},
			}),
		);
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("修正")).toBeOnTheScreen();
		});
	});

	it("取消レコードは取消バッジが表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				operation: "cancellation",
				parentId: "parent-1",
				parent: {
					id: "parent-1",
					operation: "original",
					category: "advance",
					amount: 5000,
				},
			}),
		);
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("取消")).toBeOnTheScreen();
		});
	});

	it("修正済みの記録から修正後の記録へ遷移できる", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				children: [{ id: "mod-1", operation: "modification" }],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("修正後の記録を見る")).toBeOnTheScreen();
		});
		await user.press(screen.getByText("修正後の記録を見る"));

		expect(mockPush).toHaveBeenCalledWith("/entry-detail/mod-1");
	});

	it("取消済みの記録から取消記録へ遷移できる", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				children: [{ id: "cancel-1", operation: "cancellation" }],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("取消記録を見る")).toBeOnTheScreen();
		});
		await user.press(screen.getByText("取消記録を見る"));

		expect(mockPush).toHaveBeenCalledWith("/entry-detail/cancel-1");
	});

	it("修正・取消レコードから元の記録へ遷移できる", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				operation: "modification",
				parentId: "parent-1",
				parent: {
					id: "parent-1",
					operation: "original",
					category: "advance",
					amount: 5000,
				},
			}),
		);
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("元の記録を見る")).toBeOnTheScreen();
		});
		await user.press(screen.getByText("元の記録を見る"));

		expect(mockPush).toHaveBeenCalledWith("/entry-detail/parent-1");
	});

	it("アクティブなオリジナル記録には修正・取り消しボタンが表示される", async () => {
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("修正する")).toBeOnTheScreen();
		});
		expect(screen.getByText("取り消す")).toBeOnTheScreen();
	});

	it("修正済みの記録には修正・取り消しボタンが表示されない", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				children: [{ id: "child-1", operation: "modification" }],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("修正済み")).toBeOnTheScreen();
		});
		expect(screen.queryByText("修正する")).not.toBeOnTheScreen();
		expect(screen.queryByText("取り消す")).not.toBeOnTheScreen();
	});

	it("差し戻しコメントが表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				status: "rejected",
				approvalComment: "金額を確認してください",
			}),
		);
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("差し戻しコメント")).toBeOnTheScreen();
		});
		expect(screen.getByText("金額を確認してください")).toBeOnTheScreen();
	});

	it("承認待ちの場合はバッジが表示される", async () => {
		mockGet.mockResolvedValue(mockEntryResponse({ status: "pending" }));
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText("承認待ち")).toBeOnTheScreen();
		});
	});

	it("APIエラー時にエラーメッセージが表示される", async () => {
		mockGet.mockResolvedValue(
			new Response(JSON.stringify({ error: "記録が見つかりません" }), {
				status: 404,
				headers: jsonHeaders,
			}),
		);
		render(<EntryDetailScreen />, { wrapper: createWrapper() });

		await waitFor(() => {
			expect(screen.getByText(/記録が見つかりません/)).toBeOnTheScreen();
		});
	});

	it("ローディング中はインジケーターが表示される", () => {
		mockGet.mockReturnValue(new Promise(() => {}));
		const { toJSON } = render(<EntryDetailScreen />, {
			wrapper: createWrapper(),
		});
		const tree = JSON.stringify(toJSON());
		expect(tree).toContain("ActivityIndicator");
	});
});
