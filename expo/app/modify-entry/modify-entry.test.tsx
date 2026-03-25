import {
	render,
	screen,
	userEvent,
	waitFor,
} from "@testing-library/react-native";
import { TestQueryWrapper } from "@/testing/query-wrapper";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
	useRouter: () => ({ back: mockBack }),
	useLocalSearchParams: () => ({ id: "entry-1" }),
}));

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

const jsonHeaders = { "Content-Type": "application/json" };

function mockEntryResponse(overrides: Record<string, unknown> = {}) {
	return new Response(
		JSON.stringify({
			id: "entry-1",
			userId: "user-1",
			category: "deposit",
			amount: 3000,
			occurredOn: "2026-03-15",
			label: "お釣り",
			memo: null,
			originalId: "entry-1",
			cancelled: false,
			createdAt: 1742000000000,
			versions: [
				{
					id: "entry-1",
					category: "deposit",
					amount: 3000,
					occurredOn: "2026-03-15",
					label: "お釣り",
					memo: null,
					cancelled: false,
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
	mockModifyPost.mockResolvedValue(
		new Response(JSON.stringify({}), { status: 201, headers: jsonHeaders }),
	);
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
					{
						id: "entry-1",
						category: "advance",
						amount: 1000,
						occurredOn: "2026-03-15",
						label: "テスト",
						memo: null,
						cancelled: false,
						latest: true,
						createdAt: 1742000000000,
					},
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
					{
						id: "entry-1",
						category: "advance",
						amount: 1000,
						occurredOn: "2026-03-15",
						label: "テスト",
						memo: null,
						cancelled: false,
						latest: true,
						createdAt: 1742000000000,
					},
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
