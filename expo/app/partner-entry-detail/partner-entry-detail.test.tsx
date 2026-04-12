import { render, screen, waitFor } from "@testing-library/react-native";
import {
	type EntryDetailResponse,
	makeEntryDetail,
	makeEntryVersion,
	mockJsonResponse,
} from "@/testing/api-mocks";
import { TestQueryWrapper } from "@/testing/query-wrapper";

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
	useLocalSearchParams: () => ({ id: "partner-entry-1" }),
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
			entries: {
				// biome-ignore lint/complexity/useLiteralKeys: Hono RPC client uses ":id" as computed key
				[":id"]: {
					$get: (...args: unknown[]) => mockOwnerGet(...args),
				},
			},
			partner: {
				entries: {
					// biome-ignore lint/complexity/useLiteralKeys: Hono RPC client uses ":id" as computed key
					[":id"]: {
						$get: (...args: unknown[]) => mockPartnerGet(...args),
					},
				},
			},
		},
	},
}));

import PartnerEntryDetailRoute from "./[id]";

function mockEntryResponse(overrides?: Partial<EntryDetailResponse>) {
	return mockJsonResponse(
		makeEntryDetail({
			id: "partner-entry-1",
			userId: "partner-user-1",
			amount: 2800,
			label: "パートナーの買い物",
			memo: "夕食の材料",
			originalId: "partner-entry-1",
			versions: [
				makeEntryVersion({
					id: "partner-entry-1",
					userId: "partner-user-1",
					amount: 2800,
					label: "パートナーの買い物",
					memo: "夕食の材料",
					originalId: "partner-entry-1",
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
	mockPartnerGet.mockResolvedValue(mockEntryResponse());
});

describe("PartnerEntryDetailRoute", () => {
	it("「パートナーの記録」タイトルが表示される", async () => {
		render(<PartnerEntryDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("パートナーの記録")).toBeOnTheScreen();
		});
	});

	it("記録の基本情報が表示される", async () => {
		render(<PartnerEntryDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥2,800")).toBeOnTheScreen();
		});
		expect(screen.getByText("立替")).toBeOnTheScreen();
		expect(screen.getByText("パートナーの買い物")).toBeOnTheScreen();
		expect(screen.getByText("夕食の材料")).toBeOnTheScreen();
	});

	it("修正・取消・復元ボタンが表示されない", async () => {
		render(<PartnerEntryDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥2,800")).toBeOnTheScreen();
		});
		expect(screen.queryByText("修正する")).not.toBeOnTheScreen();
		expect(screen.queryByText("取り消す")).not.toBeOnTheScreen();
		expect(screen.queryByText("復元する")).not.toBeOnTheScreen();
	});

	it("取消済みのパートナー記録でも復元ボタンは表示されない", async () => {
		mockPartnerGet.mockResolvedValue(
			mockEntryResponse({
				cancelled: true,
				versions: [
					makeEntryVersion({
						id: "cancel-1",
						cancelled: true,
						amount: 2800,
						originalId: "partner-entry-1",
						createdAt: 1742000100000,
					}),
					makeEntryVersion({
						id: "partner-entry-1",
						amount: 2800,
						latest: false,
						originalId: "partner-entry-1",
						createdAt: 1742000000000,
					}),
				],
			}),
		);
		render(<PartnerEntryDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getAllByText("¥2,800").length).toBeGreaterThan(0);
		});
		expect(screen.queryByText("復元する")).not.toBeOnTheScreen();
	});

	it("画像取得時に readonly オプション付きで getImageSource が呼ばれる", async () => {
		mockPartnerGet.mockResolvedValue(
			mockEntryResponse({
				images: [{ id: "img-1", displayOrder: 0, createdAt: 1742000000000 }],
			}),
		);
		render(<PartnerEntryDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByLabelText("画像 1")).toBeOnTheScreen();
		});
		expect(mockGetImageSource).toHaveBeenCalledWith(
			"entries",
			"partner-entry-1",
			"img-1",
			{ readonly: true },
		);
	});

	it("APIエラー時にエラーメッセージが表示される", async () => {
		mockPartnerGet.mockResolvedValue(
			mockJsonResponse({ error: "記録が見つかりません" }, 404),
		);
		render(<PartnerEntryDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText(/記録が見つかりません/)).toBeOnTheScreen();
		});
	});

	it("オーナー向けエンドポイントは呼ばれない", async () => {
		render(<PartnerEntryDetailRoute />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("¥2,800")).toBeOnTheScreen();
		});
		expect(mockOwnerGet).not.toHaveBeenCalled();
		expect(mockPartnerGet).toHaveBeenCalled();
	});
});
