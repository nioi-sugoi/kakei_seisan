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

const mockGetImageSource = jest.fn(
	(
		_resourceType: string,
		parentId: string,
		imageId: string,
		options?: { readonly?: boolean },
	) => ({
		uri: `mock://${options?.readonly ? "partner/" : ""}${parentId}/${imageId}`,
	}),
);

jest.mock("@/hooks/use-image-upload", () => ({
	getAuthHeaders: () => ({}),
	useUploadImages: () => ({
		mutate: jest.fn(),
		mutateAsync: jest.fn(),
		isPending: false,
	}),
	useDeleteImage: () => ({ mutate: jest.fn(), isPending: false }),
	getImageSource: (...args: unknown[]) =>
		// biome-ignore lint/suspicious/noExplicitAny: jest mock passthrough
		(mockGetImageSource as any)(...args),
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
	mockGetImageSource.mockClear();
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

	it("画像取得時に readonly オプション付きで getImageSource が呼ばれる", async () => {
		mockPartnerGet.mockResolvedValue(
			mockSettlementResponse({
				images: [{ id: "img-1", displayOrder: 0, createdAt: 1742000000000 }],
			}),
		);
		render(<PartnerSettlementDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("画像 1")).toBeOnTheScreen();
		});
		expect(mockGetImageSource).toHaveBeenCalledWith(
			"settlements",
			"partner-stl-1",
			"img-1",
			{ readonly: true },
		);
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
