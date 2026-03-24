import type { InferResponseType } from "hono/client";
import { Pressable, Text, View } from "react-native";
import type { client } from "@/lib/api-client";
import { formatAmount, formatDateShort } from "@/lib/format";

type TimelineResponse = InferResponseType<typeof client.api.timeline.$get, 200>;
type TimelineRecord = TimelineResponse["data"][number];

const typeConfig = {
	advance: { label: "立替", className: "text-primary" },
	deposit: { label: "預り", className: "text-orange-600" },
} as const;

interface TimelineRecordCardProps {
	record: TimelineRecord;
	onPress: (record: TimelineRecord) => void;
}

export function TimelineRecordCard({
	record,
	onPress,
}: TimelineRecordCardProps) {
	const isV1 = record.id === record.originalId;
	const isCancelled = record.cancelled;
	const isEntry = record.type === "entry";
	const isModified = !isV1 && !isCancelled;
	const label = isEntry ? record.label : (record.label ?? "精算");

	const { category } = record;
	const entryConfig =
		category === "advance" || category === "deposit"
			? typeConfig[category]
			: null;
	const typeLabel = isEntry ? (entryConfig?.label ?? "立替") : "精算";
	const typeColor = isEntry
		? (entryConfig?.className ?? "text-primary")
		: "text-emerald-600";

	return (
		<Pressable
			onPress={() => onPress(record)}
			className={`rounded-xl bg-card px-4 py-3 active:opacity-80 ${isCancelled ? "opacity-50" : ""}`}
			accessibilityRole="button"
			accessibilityLabel={[
				isEntry
					? `${typeLabel} ${record.label} ${formatAmount(record.amount)}`
					: `精算 ${formatAmount(record.amount)}`,
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
							{formatDateShort(record.occurredOn)}
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
					{formatAmount(record.amount)}
				</Text>
			</View>
		</Pressable>
	);
}
