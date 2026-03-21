import { Pressable, Text, View } from "react-native";
import { badgeBg, VersionBadge } from "@/components/ui/VersionBadge";
import type { Settlement } from "@/hooks/use-settlements";
import { formatAmount, formatDateShort } from "@/lib/format";

function SettlementBadge() {
	return (
		<View style={badgeBg.green} className="rounded px-2 py-0.5">
			<Text className="text-xs font-medium text-green-600">精算</Text>
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
