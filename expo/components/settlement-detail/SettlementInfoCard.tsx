import { Text, View } from "react-native";
import { formatAmount, formatDateFull } from "@/lib/format";

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
			<View className="flex-row items-center gap-2">
				<Text className="text-base font-bold text-emerald-600">精算</Text>
				{!isOriginal && !cancelled && (
					<Text className="text-base font-bold text-amber-600">修正</Text>
				)}
				{cancelled && (
					<Text className="text-base font-bold text-red-500">取消</Text>
				)}
			</View>

			<View className="mt-4 items-center">
				<Text
					className={`text-4xl font-bold ${
						cancelled ? "line-through text-muted-foreground" : "text-foreground"
					}`}
				>
					{formatAmount(amount)}
				</Text>
			</View>

			<View className="my-4 h-px bg-border" />

			<View className="gap-3">
				<View className="flex-row justify-between">
					<Text className="text-base text-muted-foreground">日付</Text>
					<Text className="text-base font-medium text-foreground">
						{formatDateFull(occurredOn)}
					</Text>
				</View>
			</View>
		</View>
	);
}
