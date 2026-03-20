import { render, screen, waitFor } from "@testing-library/react-native";
import { createQueryWrapper } from "@/testing/query-wrapper";

jest.mock("expo-router", () => ({
	useLocalSearchParams: () => ({ id: "entry-1" }),
	useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
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

let cleanupQuery: () => void;
let wrapper: ReturnType<typeof createQueryWrapper>["wrapper"];

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
			...overrides,
		}),
		{ status: 200, headers: jsonHeaders },
	);
}

beforeEach(() => {
	jest.clearAllMocks();
	const result = createQueryWrapper();
	wrapper = result.wrapper;
	cleanupQuery = result.cleanup;
	mockGet.mockResolvedValue(mockEntryResponse());
});

afterEach(() => {
	cleanupQuery();
});

describe("EntryDetailScreen", () => {
	it("記録の基本情報が表示される", async () => {
		render(<EntryDetailScreen />, { wrapper });

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
		render(<EntryDetailScreen />, { wrapper });

		await waitFor(() => {
			expect(screen.getByText("-¥3,000")).toBeOnTheScreen();
		});
		expect(screen.getByText("預り")).toBeOnTheScreen();
	});

	it("メモが空の場合はメモ行が表示されない", async () => {
		mockGet.mockResolvedValue(mockEntryResponse({ memo: null }));
		render(<EntryDetailScreen />, { wrapper });

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
		render(<EntryDetailScreen />, { wrapper });

		await waitFor(() => {
			expect(screen.getByText(/記録が見つかりません/)).toBeOnTheScreen();
		});
	});
});
