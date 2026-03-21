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

jest.mock("@/hooks/use-image-upload", () => ({
	useUploadEntryImages: () => ({
		mutate: jest.fn(),
		mutateAsync: jest.fn(),
		isPending: false,
	}),
	useDeleteEntryImage: () => ({ mutate: jest.fn(), isPending: false }),
	getImageSource: (entryId: string, imageId: string) => ({
		uri: `mock://${entryId}/${imageId}`,
	}),
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
			occurredOn: "2026-03-15",
			label: "スーパー買い物",
			memo: "夕食の材料",
			originalId: "entry-1",
			cancelled: false,
			status: "approved",
			approvedBy: null,
			approvedAt: null,
			approvalComment: null,
			createdAt: 1742000000000,
			versions: [
				{
					id: "entry-1",
					cancelled: false,
					amount: 4280,
					latest: true,
					createdAt: 1742000000000,
				},
			],
			images: [],
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

	it("預りカテゴリの場合も金額はプラスで表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				category: "deposit",
				amount: 3000,
				versions: [
					{
						id: "entry-1",
						cancelled: false,
						amount: 3000,
						latest: true,
						createdAt: 1742000000000,
					},
				],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥3,000")).toBeOnTheScreen();
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

	it("取消されていない記録には「修正する」「取り消す」ボタンが表示される", async () => {
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

		expect(mockPush).toHaveBeenCalledWith("/modify-entry/entry-1");
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
			"この記録を取り消しますか？",
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
					{
						id: "cancel-1",
						cancelled: true,
						amount: 4280,
						latest: true,
						createdAt: 1742000100000,
					},
					{
						id: "entry-1",
						cancelled: false,
						amount: 4280,
						latest: false,
						createdAt: 1742000000000,
					},
				],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getAllByText("¥4,280").length).toBeGreaterThan(0);
		});
		expect(screen.queryByText("修正する")).not.toBeOnTheScreen();
		expect(screen.queryByText("取り消す")).not.toBeOnTheScreen();
	});

	it("複数バージョンがある場合は操作履歴が表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				versions: [
					{
						id: "v2-entry",
						cancelled: false,
						amount: 3000,
						latest: true,
						createdAt: 1742000100000,
					},
					{
						id: "entry-1",
						cancelled: false,
						amount: 4280,
						latest: false,
						createdAt: 1742000000000,
					},
				],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("操作履歴")).toBeOnTheScreen();
		});
	});

	it("修正バージョンに「修正」バッジが表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				originalId: "parent-1",
				versions: [
					{
						id: "entry-1",
						cancelled: false,
						amount: 4280,
						latest: true,
						createdAt: 1742000100000,
					},
					{
						id: "parent-1",
						cancelled: false,
						amount: 4280,
						latest: false,
						createdAt: 1742000000000,
					},
				],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("修正")).toBeOnTheScreen();
		});
	});

	it("取消済みの操作履歴で元の記録にはラベルがつかない", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				versions: [
					{
						id: "cancel-1",
						cancelled: true,
						amount: 4280,
						latest: true,
						createdAt: 1742000100000,
					},
					{
						id: "entry-1",
						cancelled: false,
						amount: 4280,
						latest: false,
						createdAt: 1742000000000,
					},
				],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("操作履歴")).toBeOnTheScreen();
		});
		expect(screen.queryByText("復元")).not.toBeOnTheScreen();
		expect(screen.queryByText("修正")).not.toBeOnTheScreen();
	});

	it("復元バージョンの操作履歴に「復元」ラベルが表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				originalId: "entry-1",
				versions: [
					{
						id: "modify-1",
						cancelled: false,
						amount: 5000,
						latest: true,
						createdAt: 1742000300000,
					},
					{
						id: "restore-1",
						cancelled: false,
						amount: 4280,
						latest: false,
						createdAt: 1742000200000,
					},
					{
						id: "cancel-1",
						cancelled: true,
						amount: 4280,
						latest: false,
						createdAt: 1742000100000,
					},
					{
						id: "entry-1",
						cancelled: false,
						amount: 4280,
						latest: false,
						createdAt: 1742000000000,
					},
				],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("操作履歴")).toBeOnTheScreen();
		});
		expect(screen.getByText("復元")).toBeOnTheScreen();
	});

	it("取消バージョンに「取消」バッジが表示される", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				cancelled: true,
				originalId: "parent-1",
				versions: [
					{
						id: "entry-1",
						cancelled: true,
						amount: 4280,
						latest: true,
						createdAt: 1742000100000,
					},
					{
						id: "parent-1",
						cancelled: false,
						amount: 4280,
						latest: false,
						createdAt: 1742000000000,
					},
				],
			}),
		);
		render(<EntryDetailScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getAllByText("取消").length).toBeGreaterThan(0);
		});
	});
});
