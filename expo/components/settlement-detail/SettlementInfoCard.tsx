import { type StyleProp, Text, View, type ViewStyle } from "react-native";
import { formatAmount, formatDateFull } from "@/lib/format";

const versionBadgeBg = {
	modified: { backgroundColor: "rgba(217, 119, 6, 0.1)" },
	cancelled: { backgroundColor: "rgba(239, 68, 68, 0.1)" },
} satisfies Record<string, StyleProp<ViewStyle>>;

const settlementBadgeBg: StyleProp<ViewStyle> = {
	backgroundColor: "rgba(34, 197, 94, 0.1)",
};

type SettlementInfoCardProps = {
	isOriginal: boolean;
	cancelled: boolean;
	amount: number;
	occurredOn: string;
};

export function SettlementInfoCard({
	isOriginal,
	cancelled,
	amount,
	occurredOn,
}: SettlementInfoCardProps) {
	return (
		<View className="rounded-xl bg-card px-5 py-5">
			{/* Badges */}
			<View className="flex-row items-center gap-2">
				<View
					style={settlementBadgeBg}
					className="rounded-md border border-green-200 px-2 py-0.5"
				>
					<Text className="text-xs font-medium text-green-600">精算</Text>
				</View>
				{!isOriginal && !cancelled && (
					<View
						style={versionBadgeBg.modified}
						className="rounded-md border border-amber-200 px-2 py-0.5"
					>
						<Text className="text-xs font-medium text-amber-600">修正</Text>
					</View>
				)}
				{cancelled && (
					<View
						style={versionBadgeBg.cancelled}
						className="rounded-md border border-red-200 px-2 py-0.5"
					>
						<Text className="text-xs font-medium text-red-500">取消</Text>
					</View>
				)}
			</View>

			{/* Amount */}
			<View className="mt-4 items-center">
				<Text
					className={`text-3xl font-bold ${
						cancelled ? "line-through text-muted-foreground" : "text-foreground"
					}`}
				>
					{formatAmount(amount)}
				</Text>
			</View>

			{/* Separator */}
			<View className="my-4 h-px bg-border" />

			{/* Metadata */}
			<View className="gap-3">
				<View className="flex-row justify-between">
					<Text className="text-sm text-muted-foreground">日付</Text>
					<Text className="text-sm font-medium text-foreground">
						{formatDateFull(occurredOn)}
					</Text>
				</View>
			</View>
		</View>
	);
}
