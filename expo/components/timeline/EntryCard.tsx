import {
	Pressable,
	type StyleProp,
	Text,
	View,
	type ViewStyle,
} from "react-native";
import type { Entry } from "@/hooks/use-entries";

function formatAmount(amount: number) {
	return `¥${amount.toLocaleString()}`;
}

function formatDate(dateStr: string) {
	const date = new Date(dateStr);
	return `${date.getMonth() + 1}/${date.getDate()}`;
}

// NativeWind の bg-xxx/opacity を条件付き className で使うとクラッシュするため
// (nativewind#1466, #1711) バッジ背景は style prop で指定する
const badgeBg = {
	primary: { backgroundColor: "rgba(0, 126, 183, 0.1)" },
	warning: { backgroundColor: "rgba(223, 161, 26, 0.1)" },
	destructive: { backgroundColor: "rgba(231, 0, 11, 0.1)" },
} satisfies Record<string, StyleProp<ViewStyle>>;

function CategoryBadge({ category }: { category: Entry["category"] }) {
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

function OperationBadge({ operation }: { operation: Entry["operation"] }) {
	if (operation === "original") return null;
	const isModification = operation === "modification";
	return (
		<View
			style={isModification ? badgeBg.warning : badgeBg.destructive}
			className="rounded px-2 py-0.5"
		>
			<Text
				className={`text-xs font-medium ${isModification ? "text-warning" : "text-destructive"}`}
			>
				{isModification ? "修正" : "取消"}
			</Text>
		</View>
	);
}

interface EntryCardProps {
	entry: Entry;
	onPress: (entry: Entry) => void;
}

export function EntryCard({ entry, onPress }: EntryCardProps) {
	const isDeposit = entry.category === "deposit";
	const isCancelled = entry.operation === "cancellation";

	return (
		<Pressable
			onPress={() => onPress(entry)}
			className="rounded-xl bg-card px-4 py-3 active:opacity-80"
			accessibilityRole="button"
			accessibilityLabel={`${entry.category === "advance" ? "立替" : "預り"} ${entry.label} ${formatAmount(entry.amount)}`}
		>
			<View className="flex-row items-center justify-between">
				<View className="flex-1 gap-1">
					<View className="flex-row items-center gap-2">
						<CategoryBadge category={entry.category} />
						<OperationBadge operation={entry.operation} />
					</View>
					<Text className="text-sm font-medium text-foreground">
						{entry.label}
					</Text>
					<Text className="text-xs text-muted-foreground">
						{formatDate(entry.date)}
					</Text>
				</View>
				<Text
					className={`text-lg font-bold ${isDeposit ? "text-warning" : "text-foreground"} ${isCancelled ? "line-through opacity-50" : ""}`}
				>
					{isDeposit ? "-" : ""}
					{formatAmount(entry.amount)}
				</Text>
			</View>
		</Pressable>
	);
}
