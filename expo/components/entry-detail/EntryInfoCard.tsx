import { Text, View } from "react-native";
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

type EntryInfoCardProps = {
	category: "advance" | "deposit";
	amount: number;
	date: string;
	label: string;
	memo: string | null;
};

export function EntryInfoCard({
	category,
	amount,
	date,
	label,
	memo,
}: EntryInfoCardProps) {
	return (
		<View className="rounded-xl bg-card px-5 py-5">
			{/* Category Badge */}
			<View className="flex-row items-center gap-2">
				<View className={`rounded-md border px-2 py-0.5 ${categoryColors[category]}`}>
					<Text className={`text-xs font-medium ${categoryTextColors[category]}`}>
						{categoryLabels[category]}
					</Text>
				</View>
			</View>

			{/* Amount */}
			<View className="mt-4 items-center">
				<Text
					className={`text-3xl font-bold ${category === "deposit" ? "text-orange-600" : "text-foreground"}`}
				>
					{category === "deposit" ? "-" : ""}
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
