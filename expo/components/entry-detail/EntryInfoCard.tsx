import { type StyleProp, Text, View, type ViewStyle } from "react-native";
import { formatAmount, formatDateFull, formatSignedAmount } from "@/lib/format";

const categoryLabels = { advance: "立替", deposit: "預り" } as const;
const categoryColors = {
	advance: "bg-blue-100 border-blue-200",
	deposit: "bg-orange-100 border-orange-200",
} as const;
const categoryTextColors = {
	advance: "text-primary",
	deposit: "text-orange-600",
} as const;

// NativeWind の bg-xxx/opacity を条件付き className で使うとクラッシュするため style で指定
const operationBadgeBg = {
	modification: {
		backgroundColor: "rgba(217, 119, 6, 0.1)",
	} as StyleProp<ViewStyle>,
	cancellation: {
		backgroundColor: "rgba(239, 68, 68, 0.1)",
	} as StyleProp<ViewStyle>,
} as const;

type EntryInfoCardProps = {
	category: "advance" | "deposit";
	operation: "original" | "modification" | "cancellation";
	amount: number;
	date: string;
	label: string;
	memo: string | null;
	isCancelled?: boolean;
};

export function EntryInfoCard({
	category,
	operation,
	amount,
	date,
	label,
	memo,
	isCancelled,
}: EntryInfoCardProps) {
	const isOriginal = operation === "original";

	// 金額表示
	const displayAmount = isOriginal
		? `${category === "deposit" ? "-" : ""}${formatAmount(amount)}`
		: formatSignedAmount(amount);

	return (
		<View className="rounded-xl bg-card px-5 py-5">
			{/* Category + Operation Badges */}
			<View className="flex-row items-center gap-2">
				<View
					className={`rounded-md border px-2 py-0.5 ${categoryColors[category]}`}
				>
					<Text
						className={`text-xs font-medium ${categoryTextColors[category]}`}
					>
						{categoryLabels[category]}
					</Text>
				</View>
				{operation === "modification" && (
					<View
						style={operationBadgeBg.modification}
						className="rounded-md border border-amber-200 px-2 py-0.5"
					>
						<Text className="text-xs font-medium text-amber-600">修正</Text>
					</View>
				)}
				{operation === "cancellation" && (
					<View
						style={operationBadgeBg.cancellation}
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
						isCancelled
							? "line-through text-muted-foreground"
							: !isOriginal
								? amount < 0
									? "text-red-500"
									: "text-emerald-600"
								: category === "deposit"
									? "text-orange-600"
									: "text-foreground"
					}`}
				>
					{displayAmount}
				</Text>
			</View>

			{/* Separator */}
			<View className="my-4 h-px bg-border" />

			{/* Metadata */}
			<View className="gap-3">
				<View className="flex-row justify-between">
					<Text className="text-sm text-muted-foreground">日付</Text>
					<Text className="text-sm font-medium text-foreground">
						{formatDateFull(date)}
					</Text>
				</View>
				<View className="flex-row justify-between">
					<Text className="text-sm text-muted-foreground">ラベル</Text>
					<Text className="text-sm font-medium text-foreground">{label}</Text>
				</View>
				{memo ? (
					<View className="flex-row justify-between">
						<Text className="text-sm text-muted-foreground">メモ</Text>
						<Text className="text-sm text-foreground">{memo}</Text>
					</View>
				) : null}
			</View>
		</View>
	);
}
