import { render, screen, waitFor } from "@testing-library/react-native";
import {
	makeSettlementDetail,
	makeSettlementVersion,
	mockJsonResponse,
	type SettlementDetailResponse,
} from "@/testing/api-mocks";
import { TestQueryWrapper } from "@/testing/query-wrapper";

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
	useLocalSearchParams: () => ({ id: "partner-stl-1" }),
	useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock("@/hooks/use-image-upload", () => ({
	getAuthHeaders: () => ({}),
	useUploadImages: () => ({
		mutate: jest.fn(),
		mutateAsync: jest.fn(),
		isPending: false,
	}),
	useDeleteImage: () => ({ mutate: jest.fn(), isPending: false }),
	getImageSource: (
		resourceType: string,
		parentId: string,
		imageId: string,
		options?: { partner?: boolean },
	) => ({
		uri: `http://test/api/${options?.partner ? "partner/" : ""}${resourceType}/${parentId}/images/${imageId}`,
	}),
}));

const mockOwnerGet = jest.fn();
const mockPartnerGet = jest.fn();

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			settlements: {
				// biome-ignore lint/complexity/useLiteralKeys: Hono RPC client uses ":id" as computed key
				[":id"]: {
					$get: (...args: unknown[]) => mockOwnerGet(...args),
				},
			},
			partner: {
				settlements: {
					// biome-ignore lint/complexity/useLiteralKeys: Hono RPC client uses ":id" as computed key
					[":id"]: {
						$get: (...args: unknown[]) => mockPartnerGet(...args),
					},
				},
			},
		},
	},
}));

import PartnerSettlementDetailRoute from "./[id]";

function mockSettlementResponse(overrides?: Partial<SettlementDetailResponse>) {
	return mockJsonResponse(
		makeSettlementDetail({
			id: "partner-stl-1",
			userId: "partner-user-1",
			amount: 6500,
			originalId: "partner-stl-1",
			versions: [
				makeSettlementVersion({
					id: "partner-stl-1",
					userId: "partner-user-1",
					amount: 6500,
					originalId: "partner-stl-1",
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
	mockPartnerGet.mockResolvedValue(mockSettlementResponse());
});

describe("PartnerSettlementDetailRoute", () => {
	it("「パートナーの精算」タイトルが表示される", async () => {
		render(<PartnerSettlementDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("パートナーの精算")).toBeOnTheScreen();
		});
	});

	it("精算の基本情報が表示される", async () => {
		render(<PartnerSettlementDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥6,500")).toBeOnTheScreen();
		});
		expect(screen.getByText("精算")).toBeOnTheScreen();
	});

	it("修正・取消・復元ボタンが表示されない", async () => {
		render(<PartnerSettlementDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥6,500")).toBeOnTheScreen();
		});
		expect(screen.queryByText("修正する")).not.toBeOnTheScreen();
		expect(screen.queryByText("取り消す")).not.toBeOnTheScreen();
		expect(screen.queryByText("復元する")).not.toBeOnTheScreen();
	});

	it("APIエラー時にエラーメッセージが表示される", async () => {
		mockPartnerGet.mockResolvedValue(
			mockJsonResponse({ error: "精算が見つかりません" }, 404),
		);
		render(<PartnerSettlementDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText(/精算が見つかりません/)).toBeOnTheScreen();
		});
	});

	it("オーナー向けエンドポイントは呼ばれない", async () => {
		render(<PartnerSettlementDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥6,500")).toBeOnTheScreen();
		});
		expect(mockOwnerGet).not.toHaveBeenCalled();
		expect(mockPartnerGet).toHaveBeenCalled();
	});
});
