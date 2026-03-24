import type { InferResponseType } from "hono/client";
import { Pressable, Text, View } from "react-native";
import type { client } from "@/lib/api-client";
import { formatAmount, formatDateShort } from "@/lib/format";

type TimelineResponse = InferResponseType<typeof client.api.timeline.$get, 200>;
type TimelineEntry = TimelineResponse["data"][number];

const typeConfig = {
	advance: { label: "立替", className: "text-primary" },
	deposit: { label: "預り", className: "text-orange-600" },
} as const;

interface TimelineEntryCardProps {
	entry: TimelineEntry;
	onPress: (entry: TimelineEntry) => void;
}

export function TimelineEntryCard({ entry, onPress }: TimelineEntryCardProps) {
	const isV1 = entry.id === entry.originalId;
	const isCancelled = entry.cancelled;
	const isExpense = entry.type === "entry";
	const isModified = !isV1 && !isCancelled;
	const label = isExpense ? entry.label : (entry.label ?? "精算");

	const { category } = entry;
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
			onPress={() => onPress(entry)}
			className={`rounded-xl bg-card px-4 py-3 active:opacity-80 ${isCancelled ? "opacity-50" : ""}`}
			accessibilityRole="button"
			accessibilityLabel={[
				isExpense
					? `${typeLabel} ${entry.label} ${formatAmount(entry.amount)}`
					: `精算 ${formatAmount(entry.amount)}`,
				isModified ? "修正済み" : null,
				isCancelled ? "取消済み" : null,
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
							{formatDateShort(entry.occurredOn)}
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
				{/* 金額 */}
				<Text
					className={`text-2xl font-bold tabular-nums ${
						isCancelled
							? "line-through text-muted-foreground"
							: "text-foreground"
					}`}
				>
					{formatAmount(entry.amount)}
				</Text>
			</View>
		</Pressable>
	);
}
