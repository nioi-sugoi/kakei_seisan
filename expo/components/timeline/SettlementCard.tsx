import {
	Pressable,
	type StyleProp,
	Text,
	View,
	type ViewStyle,
} from "react-native";
import type { Settlement } from "@/hooks/use-settlements";
import { formatAmount, formatDateShort } from "@/lib/format";

const badgeBg = {
	settlement: { backgroundColor: "rgba(34, 197, 94, 0.1)" },
	amber: { backgroundColor: "rgba(217, 119, 6, 0.1)" },
	red: { backgroundColor: "rgba(239, 68, 68, 0.1)" },
} satisfies Record<string, StyleProp<ViewStyle>>;

function SettlementBadge() {
	return (
		<View style={badgeBg.settlement} className="rounded px-2 py-0.5">
			<Text className="text-xs font-medium text-green-600">精算</Text>
		</View>
	);
}

function VersionBadge({ type }: { type: "modified" | "cancelled" }) {
	const isCancel = type === "cancelled";
	return (
		<View
			style={isCancel ? badgeBg.red : badgeBg.amber}
			className="rounded px-2 py-0.5"
		>
			<Text
				className={`text-xs font-medium ${isCancel ? "text-red-500" : "text-amber-600"}`}
			>
				{isCancel ? "取消" : "修正"}
			</Text>
		</View>
	);
}

interface SettlementCardProps {
	settlement: Settlement;
	onPress: (settlement: Settlement) => void;
}

export function SettlementCard({ settlement, onPress }: SettlementCardProps) {
	const isV1 = settlement.id === settlement.originalId;
	const isLatest = settlement.latest;
	const isCancelled = settlement.cancelled;

	return (
		<Pressable
			onPress={() => onPress(settlement)}
			className={`rounded-xl bg-card px-4 py-3 active:opacity-80 ${!isLatest ? "opacity-50" : ""}`}
			accessibilityRole="button"
			accessibilityLabel={`精算 ${formatAmount(settlement.amount)}`}
		>
			<View className="flex-row items-center justify-between">
				<View className="flex-1 gap-1">
					<View className="flex-row items-center gap-2">
						<SettlementBadge />
						{!isV1 && !isCancelled && <VersionBadge type="modified" />}
						{isCancelled && <VersionBadge type="cancelled" />}
					</View>
					<Text className="text-xs text-muted-foreground">
						{formatDateShort(settlement.occurredOn)}
					</Text>
				</View>
				<Text
					className={`text-lg font-bold ${
						isCancelled
							? "line-through text-muted-foreground"
							: "text-green-600"
					}`}
				>
					{formatAmount(settlement.amount)}
				</Text>
			</View>
		</Pressable>
	);
}
