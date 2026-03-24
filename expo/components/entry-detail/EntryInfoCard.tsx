import { Text, View } from "react-native";
import { formatAmount, formatDateFull } from "@/lib/format";

const categoryLabels = { advance: "立替", deposit: "預り" } as const;
const categoryTextColors = {
	advance: "text-primary",
	deposit: "text-orange-600",
} as const;

type EntryInfoCardProps = {
	category: "advance" | "deposit";
	isOriginal: boolean;
	cancelled: boolean;
	amount: number;
	occurredOn: string;
	label: string;
	memo: string | null;
	isCancelled?: boolean;
};

export function EntryInfoCard({
	category,
	isOriginal,
	cancelled,
	amount,
	occurredOn,
	label,
	memo,
	isCancelled,
}: EntryInfoCardProps) {
	const isV1 = isOriginal;

	return (
		<View className="rounded-xl bg-card px-5 py-5">
			{/* Category + Version labels */}
			<View className="flex-row items-center gap-2">
				<Text className={`text-base font-bold ${categoryTextColors[category]}`}>
					{categoryLabels[category]}
				</Text>
				{!isV1 && !cancelled && (
					<Text className="text-base font-bold text-amber-600">修正</Text>
				)}
				{cancelled && (
					<Text className="text-base font-bold text-red-500">取消</Text>
				)}
			</View>

			{/* Amount */}
			<View className="mt-4 items-center">
				<Text
					className={`text-4xl font-bold ${
						isCancelled
							? "line-through text-muted-foreground"
							: "text-foreground"
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
					<Text className="text-base text-muted-foreground">日付</Text>
					<Text className="text-base font-medium text-foreground">
						{formatDateFull(occurredOn)}
					</Text>
				</View>
				<View className="flex-row justify-between">
					<Text className="text-base text-muted-foreground">ラベル</Text>
					<Text className="text-base font-medium text-foreground">{label}</Text>
				</View>
				{memo ? (
					<View className="flex-row justify-between">
						<Text className="text-base text-muted-foreground">メモ</Text>
						<Text className="text-base text-foreground">{memo}</Text>
					</View>
				) : null}
			</View>
		</View>
	);
}
