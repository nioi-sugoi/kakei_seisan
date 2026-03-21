import { type StyleProp, Text, View, type ViewStyle } from "react-native";
import { formatAmount, formatDateFull } from "@/lib/format";

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
const versionBadgeBg = {
	modified: { backgroundColor: "rgba(217, 119, 6, 0.1)" },
	cancelled: { backgroundColor: "rgba(239, 68, 68, 0.1)" },
} satisfies Record<string, StyleProp<ViewStyle>>;

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
			{/* Category + Version Badges */}
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
				{!isV1 && !cancelled && (
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
						isCancelled
							? "line-through text-muted-foreground"
							: category === "deposit"
								? "text-orange-600"
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
					<Text className="text-sm text-muted-foreground">日付</Text>
					<Text className="text-sm font-medium text-foreground">
						{formatDateFull(occurredOn)}
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
