import {
	render,
	screen,
	userEvent,
	waitFor,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { TestQueryWrapper } from "@/testing/query-wrapper";

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
	useLocalSearchParams: () => ({ id: "entry-1" }),
	useRouter: () => ({ back: mockBack, push: mockPush }),
}));

const mockGet = jest.fn();
const mockCancelPost = jest.fn();

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			entries: {
				// biome-ignore lint/complexity/useLiteralKeys: Hono RPC client uses ":id" as computed key
				[":id"]: {
					$get: (...args: unknown[]) => mockGet(...args),
					cancel: {
						$post: (...args: unknown[]) => mockCancelPost(...args),
					},
				},
			},
		},
	},
}));

import EntryDetailScreen from "./[id]";

const jsonHeaders = { "Content-Type": "application/json" };

function mockEntryResponse(overrides: Record<string, unknown> = {}) {
	return new Response(
		JSON.stringify({
			id: "entry-1",
			userId: "user-1",
			category: "advance",
			amount: 4280,
			date: "2026-03-15",
			label: "スーパー買い物",
			memo: "夕食の材料",
			originalId: "entry-1",
			cancelled: false,
			latest: true,
			status: "approved",
			approvedBy: null,
			approvedAt: null,
			approvalComment: null,
			createdAt: 1742000000000,
			updatedAt: 1742000000000,
			versions: [
				{
					id: "entry-1",
					latest: true,
					cancelled: false,
					amount: 4280,
				},
			],
			original: undefined,
			...overrides,
		}),
		{ status: 200, headers: jsonHeaders },
	);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockGet.mockResolvedValue(mockEntryResponse());
	mockCancelPost.mockResolvedValue(
		new Response(JSON.stringify({}), { status: 201, headers: jsonHeaders }),
	);
});

describe("EntryDetailScreen", () => {
	it("記録の基本情報が表示される", async () => {
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

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
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("-¥3,000")).toBeOnTheScreen();
		});
		expect(screen.getByText("預り")).toBeOnTheScreen();
	});

	it("メモが空の場合はメモ行が表示されない", async () => {
		mockGet.mockResolvedValue(mockEntryResponse({ memo: null }));
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥4,280")).toBeOnTheScreen();
		});
		expect(screen.queryByText("メモ")).not.toBeOnTheScreen();
	});

	it("APIエラー時にエラーメッセージが表示される", async () => {
		mockGet.mockResolvedValue(
			new Response(JSON.stringify({ error: "記録が見つかりません" }), {
				status: 404,
				headers: jsonHeaders,
			}),
		);
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText(/記録が見つかりません/)).toBeOnTheScreen();
		});
	});

	it("元の記録には「修正する」「取り消す」ボタンが表示される", async () => {
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥4,280")).toBeOnTheScreen();
		});
		expect(screen.getByText("修正する")).toBeOnTheScreen();
		expect(screen.getByText("取り消す")).toBeOnTheScreen();
	});

	it("「修正する」を押すと修正フォームに遷移する", async () => {
		const user = userEvent.setup();
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("修正する")).toBeOnTheScreen();
		});

		await user.press(screen.getByText("修正する"));

		expect(mockPush).toHaveBeenCalledWith("/entry-form?modifyId=entry-1");
	});

	it("「取り消す」を押すと確認ダイアログが表示される", async () => {
		const alertSpy = jest.spyOn(Alert, "alert");
		const user = userEvent.setup();
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("取り消す")).toBeOnTheScreen();
		});

		await user.press(screen.getByText("取り消す"));

		expect(alertSpy).toHaveBeenCalledWith(
			"記録の取り消し",
			"この記録を取り消しますか？取り消しレコードが作成されます。",
			expect.arrayContaining([
				expect.objectContaining({ text: "キャンセル" }),
				expect.objectContaining({ text: "取り消す" }),
			]),
		);
	});

	it("取消済みの記録には修正・取消ボタンが表示されない", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				versions: [
					{ id: "entry-1", latest: false, cancelled: false },
					{
						id: "cancel-1",
						latest: true,
						cancelled: true,
						amount: 4280,
					},
				],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥4,280")).toBeOnTheScreen();
		});
		expect(screen.queryByText("修正する")).not.toBeOnTheScreen();
		expect(screen.queryByText("取り消す")).not.toBeOnTheScreen();
	});

	it("修正バージョン(v2+)の場合は「元の記録を見る」リンクが表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				id: "v2-entry",
				originalId: "entry-1",
				latest: true,
				versions: [
					{ id: "entry-1", latest: false, cancelled: false },
					{ id: "v2-entry", latest: true, cancelled: false },
				],
				original: { id: "entry-1", label: "元の記録" },
			}),
		);
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("元の記録を見る →")).toBeOnTheScreen();
		});
	});

	it("修正バージョンに「修正」バッジが表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				originalId: "parent-1",
				versions: [
					{ id: "parent-1", latest: false, cancelled: false },
					{ id: "entry-1", latest: true, cancelled: false },
				],
				original: { id: "parent-1" },
			}),
		);
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("修正")).toBeOnTheScreen();
		});
	});

	it("取消バージョンに「取消」バッジが表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				cancelled: true,
				originalId: "parent-1",
				versions: [
					{ id: "parent-1", latest: false, cancelled: false },
					{
						id: "entry-1",
						latest: true,
						cancelled: true,
					},
				],
				original: { id: "parent-1" },
			}),
		);
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("取消")).toBeOnTheScreen();
		});
	});
});
