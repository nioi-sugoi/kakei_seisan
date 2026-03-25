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

interface TimelineEventCardProps {
	event: TimelineEvent;
	onPress: (event: TimelineEvent) => void;
}

export function TimelineEventCard({ event, onPress }: TimelineEventCardProps) {
	const isV1 = event.id === event.originalId;
	const isCancelled = event.cancelled;
	const isExpense = event.type === "entry";
	const isModified = !isV1 && !isCancelled;
	const hasImages = event.imageCount > 0;
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

	return (
		<Pressable
			onPress={() => onPress(event)}
			className={`rounded-xl bg-card px-4 py-3 active:opacity-80 ${isCancelled ? "opacity-50" : ""}`}
			accessibilityRole="button"
			accessibilityLabel={[
				isExpense
					? `${typeLabel} ${event.label} ${formatAmount(event.amount)}`
					: `精算 ${formatAmount(event.amount)}`,
				hasImages ? "画像あり" : null,
				isModified ? "修正済み" : null,
				isCancelled ? "取消済み" : null,
			]
				.filter(Boolean)
				.join(" ")}
		>
			<View className="flex-row items-center justify-between">
				<View className="flex-1 gap-0.5">
					{/* Row 1: 種別 + 日付 + 📎 + ✎ */}
					<View className="flex-row items-center gap-1.5">
						<Text className={`text-base font-bold ${typeColor}`}>
							{typeLabel}
						</Text>
						<Text className="text-base text-muted-foreground">
							{formatDateShort(event.occurredOn)}
						</Text>
						{hasImages && (
							<Text
								className="text-sm text-muted-foreground"
								accessibilityLabel="画像あり"
							>
								📎
							</Text>
						)}
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
				{/* 金額 */}
				<Text
					className={`text-2xl font-bold tabular-nums ${
						isCancelled
							? "line-through text-muted-foreground"
							: "text-foreground"
					}`}
				>
					{formatAmount(event.amount)}
				</Text>
			</View>
		</Pressable>
	);
}
