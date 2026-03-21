import type { InferResponseType } from "hono/client";
import { Pressable, Text, View } from "react-native";
import { badgeBg, VersionBadge } from "@/components/ui/VersionBadge";
import type { client } from "@/lib/api-client";
import { formatAmount, formatDateShort } from "@/lib/format";

type TimelineResponse = InferResponseType<typeof client.api.timeline.$get, 200>;
type TimelineRecord = TimelineResponse["data"][number];

function CategoryBadge({ category }: { category: string }) {
	const isDeposit = category === "deposit";
	return (
		<View
			style={isDeposit ? badgeBg.warning : badgeBg.primary}
			className="rounded px-2 py-0.5"
		>
			<Text
				className={`text-xs font-medium ${isDeposit ? "text-warning" : "text-primary"}`}
			>
				{isDeposit ? "預り" : "立替"}
			</Text>
		</View>
	);
}

function SettlementBadge() {
	return (
		<View style={badgeBg.green} className="rounded px-2 py-0.5">
			<Text className="text-xs font-medium text-green-600">精算</Text>
		</View>
	);
}

interface TimelineRecordCardProps {
	record: TimelineRecord;
	onPress: (record: TimelineRecord) => void;
}

export function TimelineRecordCard({
	record,
	onPress,
}: TimelineRecordCardProps) {
	const isV1 = record.id === record.originalId;
	const isLatest = record.latest;
	const isCancelled = record.cancelled;
	const isEntry = record.type === "entry";

	return (
		<Pressable
			onPress={() => onPress(record)}
			className={`rounded-xl bg-card px-4 py-3 active:opacity-80 ${!isLatest ? "opacity-50" : ""}`}
			accessibilityRole="button"
			accessibilityLabel={
				isEntry
					? `${record.category === "deposit" ? "預り" : "立替"} ${record.label} ${formatAmount(record.amount)}`
					: `精算 ${formatAmount(record.amount)}`
			}
		>
			<View className="flex-row items-center justify-between">
				<View className="flex-1 gap-1">
					<View className="flex-row items-center gap-2">
						{isEntry && record.category ? (
							<CategoryBadge category={record.category} />
						) : (
							<SettlementBadge />
						)}
						{!isV1 && !isCancelled && <VersionBadge type="modified" />}
						{isCancelled && <VersionBadge type="cancelled" />}
					</View>
					{isEntry && record.label ? (
						<Text className="text-sm font-medium text-foreground">
							{record.label}
						</Text>
					) : null}
					<Text className="text-xs text-muted-foreground">
						{formatDateShort(record.occurredOn)}
					</Text>
				</View>
				<Text
					className={`text-lg font-bold ${
						isCancelled
							? "line-through text-muted-foreground"
							: !isEntry
								? "text-green-600"
								: record.category === "deposit"
									? "text-warning"
									: "text-foreground"
					}`}
				>
					{formatAmount(record.amount)}
				</Text>
			</View>
		</Pressable>
	);
}
