import { render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";

jest.mock("@/lib/api-client", () => ({
	client: {
		api: {
			timeline: {
				$get: jest.fn(),
			},
		},
	},
}));

import { TimelineEventCard } from "./TimelineEventCard";

type TimelineEvent = ComponentProps<typeof TimelineEventCard>["event"];

function makeEvent(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
	return {
		id: "entry-1",
		userId: "user-1",
		type: "entry",
		category: "advance",
		amount: 1500,
		occurredOn: "2026-03-15",
		label: "スーパー買い物",
		memo: null,
		originalId: "entry-1",
		cancelled: false,
		latest: true,
		status: "approved",
		approvalComment: null,
		createdAt: 1773676800000,
		...overrides,
	};
}

const mockOnPress = jest.fn();

beforeEach(() => {
	jest.clearAllMocks();
});

describe("TimelineEventCard 承認ステータス表示", () => {
	it("showApprovalStatus=false の場合、承認ステータスインジケーターが表示されない", () => {
		render(
			<TimelineEventCard
				event={makeEvent({ status: "pending" })}
				onPress={mockOnPress}
			/>,
		);

		expect(screen.queryByText(/承認待ち/)).toBeNull();
		expect(screen.queryByText(/承認済み/)).toBeNull();
		expect(screen.queryByText(/差し戻し/)).toBeNull();
	});

	it("showApprovalStatus=true の場合、承認待ちインジケーターが表示される", () => {
		render(
			<TimelineEventCard
				event={makeEvent({ status: "pending" })}
				onPress={mockOnPress}
				showApprovalStatus
			/>,
		);

		expect(screen.getByText(/● 承認待ち/)).toBeOnTheScreen();
	});

	it("showApprovalStatus=true の場合、承認済みインジケーターが表示される", () => {
		render(
			<TimelineEventCard
				event={makeEvent({ status: "approved" })}
				onPress={mockOnPress}
				showApprovalStatus
			/>,
		);

		expect(screen.getByText(/✓ 承認済み/)).toBeOnTheScreen();
	});

	it("showApprovalStatus=true の場合、差し戻しインジケーターが表示される", () => {
		render(
			<TimelineEventCard
				event={makeEvent({
					status: "rejected",
					approvalComment: "金額を確認してください",
				})}
				onPress={mockOnPress}
				showApprovalStatus
			/>,
		);

		expect(screen.getByText(/✕ 差し戻し/)).toBeOnTheScreen();
	});

	it("差し戻しコメントがインライン表示される", () => {
		render(
			<TimelineEventCard
				event={makeEvent({
					status: "rejected",
					approvalComment: "金額を確認してください",
				})}
				onPress={mockOnPress}
				showApprovalStatus
			/>,
		);

		expect(screen.getByText("金額を確認してください")).toBeOnTheScreen();
	});

	it("差し戻しコメントがない場合はコメントが表示されない", () => {
		render(
			<TimelineEventCard
				event={makeEvent({ status: "rejected", approvalComment: null })}
				onPress={mockOnPress}
				showApprovalStatus
			/>,
		);

		expect(screen.getByText(/✕ 差し戻し/)).toBeOnTheScreen();
		expect(screen.queryByText("金額を確認してください")).toBeNull();
	});

	it("承認コメントがインライン表示される", () => {
		render(
			<TimelineEventCard
				event={makeEvent({
					status: "approved",
					approvalComment: "確認しました",
				})}
				onPress={mockOnPress}
				showApprovalStatus
			/>,
		);

		expect(screen.getByText("確認しました")).toBeOnTheScreen();
	});

	it("承認コメントがない場合はコメントが表示されない", () => {
		render(
			<TimelineEventCard
				event={makeEvent({ status: "approved", approvalComment: null })}
				onPress={mockOnPress}
				showApprovalStatus
			/>,
		);

		expect(screen.getByText(/✓ 承認済み/)).toBeOnTheScreen();
		expect(screen.queryByText("確認しました")).toBeNull();
	});

	it("取消済みの記録にも承認ステータスインジケーターが表示される", () => {
		render(
			<TimelineEventCard
				event={makeEvent({
					id: "cancel-1",
					originalId: "entry-1",
					cancelled: true,
					latest: true,
					status: "pending",
				})}
				onPress={mockOnPress}
				showApprovalStatus
			/>,
		);

		expect(screen.getByRole("button", { name: /取消済み/ })).toBeOnTheScreen();
		expect(screen.getByText(/● 承認待ち/)).toBeOnTheScreen();
	});

	it("承認ステータスがアクセシビリティラベルに含まれる", () => {
		render(
			<TimelineEventCard
				event={makeEvent({ status: "pending" })}
				onPress={mockOnPress}
				showApprovalStatus
			/>,
		);

		expect(screen.getByRole("button", { name: /承認待ち/ })).toBeOnTheScreen();
	});
});
