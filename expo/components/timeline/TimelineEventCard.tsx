import type { InferResponseType } from "hono/client";
import { Pressable, Text, View } from "react-native";
import type { client } from "@/lib/api-client";
import { formatAmount, formatDateShort } from "@/lib/format";

type TimelineResponse = InferResponseType<typeof client.api.timeline.$get, 200>;
type TimelineEvent = TimelineResponse["data"][number];

const typeConfig = {
	advance: { label: "立替", className: "text-primary" },
	deposit: { label: "預り", className: "text-orange-600" },
} as const;

const statusConfig = {
	approved: { icon: "✓", label: "承認済み", className: "text-emerald-600" },
	pending: { icon: "●", label: "承認待ち", className: "text-amber-600" },
	rejected: { icon: "✕", label: "差し戻し", className: "text-red-500" },
} as const;

interface TimelineEventCardProps {
	event: TimelineEvent;
	onPress: (event: TimelineEvent) => void;
	showApprovalStatus?: boolean;
}

export function TimelineEventCard({
	event,
	onPress,
	showApprovalStatus = false,
}: TimelineEventCardProps) {
	const isV1 = event.id === event.originalId;
	const isCancelled = event.cancelled;
	const isExpense = event.type === "entry";
	const isModified = !isV1 && !isCancelled;
	const label = isExpense ? event.label : (event.label ?? "精算");

	const { category } = event;
	const entryConfig =
		category === "advance" || category === "deposit"
			? typeConfig[category]
			: null;
	const typeLabel = isExpense ? (entryConfig?.label ?? "立替") : "精算";
	const typeColor = isExpense
		? (entryConfig?.className ?? "text-primary")
		: "text-emerald-600";

	const status =
		event.status === "approved" ||
		event.status === "pending" ||
		event.status === "rejected"
			? statusConfig[event.status]
			: null;

	const showApprovalComment =
		showApprovalStatus &&
		(event.status === "rejected" || event.status === "approved") &&
		event.approvalComment;

	return (
		<Pressable
			onPress={() => onPress(event)}
			className={`rounded-xl bg-card px-4 py-3 active:opacity-80 ${isCancelled ? "opacity-50" : ""}`}
			accessibilityRole="button"
			accessibilityLabel={[
				isExpense
					? `${typeLabel} ${event.label} ${formatAmount(event.amount)}`
					: `精算 ${formatAmount(event.amount)}`,
				isModified ? "修正済み" : null,
				isCancelled ? "取消済み" : null,
				showApprovalStatus && status ? status.label : null,
			]
				.filter(Boolean)
				.join(" ")}
		>
			<View className="flex-row items-center justify-between">
				<View className="flex-1 gap-0.5">
					{/* Row 1: 種別 + 日付 + ✎ */}
					<View className="flex-row items-center gap-1.5">
						<Text className={`text-base font-bold ${typeColor}`}>
							{typeLabel}
						</Text>
						<Text className="text-base text-muted-foreground">
							{formatDateShort(event.occurredOn)}
						</Text>
						{isModified && (
							<Text
								className="text-base text-muted-foreground"
								accessibilityLabel="修正済み"
							>
								✎
							</Text>
						)}
					</View>
					{/* Row 2: ラベル */}
					{label ? (
						<Text className="text-lg font-medium text-foreground">{label}</Text>
					) : null}
				</View>
				<View className="items-end">
					<Text
						className={`text-2xl font-bold tabular-nums ${
							isCancelled
								? "line-through text-muted-foreground"
								: "text-foreground"
						}`}
					>
						{formatAmount(event.amount)}
					</Text>
					{showApprovalStatus && status ? (
						<Text className={`text-xs ${status.className}`}>
							{status.icon} {status.label}
						</Text>
					) : null}
				</View>
			</View>
			{showApprovalComment ? (
				<Text
					className={`mt-2 text-xs ${event.status === "rejected" ? "text-red-500" : "text-emerald-600"}`}
				>
					{event.approvalComment}
				</Text>
			) : null}
		</Pressable>
	);
}
