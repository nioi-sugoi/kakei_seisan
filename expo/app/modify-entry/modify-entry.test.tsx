import {
	render,
	screen,
	userEvent,
	waitFor,
} from "@testing-library/react-native";
import {
	type EntryDetailResponse,
	makeEntryDetail,
	makeEntryVersion,
	mockJsonResponse,
} from "@/testing/api-mocks";
import { TestQueryWrapper } from "@/testing/query-wrapper";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
	useRouter: () => ({ back: mockBack }),
	useLocalSearchParams: () => ({ id: "entry-1" }),
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
		_resourceType: string,
		parentId: string,
		imageId: string,
	) => ({
		uri: `mock://${parentId}/${imageId}`,
	}),
}));

const mockGet = jest.fn();
const mockModifyPost = jest.fn();

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			entries: {
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

import ModifyEntryScreen from "./[id]";

function mockEntryResponse(overrides?: Partial<EntryDetailResponse>) {
	return mockJsonResponse(
		makeEntryDetail({
			category: "deposit",
			amount: 3000,
			label: "お釣り",
			versions: [
				makeEntryVersion({
					category: "deposit",
					amount: 3000,
					label: "お釣り",
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
	mockGet.mockResolvedValue(mockEntryResponse());
	mockModifyPost.mockResolvedValue(mockJsonResponse({}, 201));
});

describe("ModifyEntryScreen", () => {
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		user = userEvent.setup();
	});

	it("カテゴリセレクターが操作できない", async () => {
		render(<ModifyEntryScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("記録を修正")).toBeOnTheScreen();
		});

		expect(screen.getByText("立替")).toBeDisabled();
		expect(screen.getByText("預り")).toBeDisabled();
	});

	it("変更がない場合「修正する」ボタンが無効になる", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				category: "advance",
				amount: 1000,
				label: "テスト",
				versions: [
					makeEntryVersion({
						category: "advance",
						amount: 1000,
						label: "テスト",
						createdAt: 1742000000000,
					}),
				],
			}),
		);

		render(<ModifyEntryScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("修正する")).toBeOnTheScreen();
		});

		expect(screen.getByText("修正する")).toBeDisabled();
	});

	it("値を変更すると「修正する」ボタンが有効になる", async () => {
		mockGet.mockResolvedValue(
			mockEntryResponse({
				category: "advance",
				amount: 1000,
				label: "テスト",
				versions: [
					makeEntryVersion({
						category: "advance",
						amount: 1000,
						label: "テスト",
						createdAt: 1742000000000,
					}),
				],
			}),
		);

		render(<ModifyEntryScreen />, { wrapper: TestQueryWrapper });

		await waitFor(() => {
			expect(screen.getByText("修正する")).toBeOnTheScreen();
		});

		await user.clear(screen.getByLabelText("金額"));
		await user.type(screen.getByLabelText("金額"), "2000");

		await waitFor(() => {
			expect(screen.getByText("修正する")).toBeEnabled();
		});
	});
});
