import { Pressable, Text, View } from "react-native";

import type { Entry } from "@/hooks/use-entries";

function formatAmount(amount: number) {
	return `¥${amount.toLocaleString()}`;
}

function formatDate(dateStr: string) {
	const date = new Date(dateStr);
	return `${date.getMonth() + 1}/${date.getDate()}`;
}

function CategoryBadge({ category }: { category: Entry["category"] }) {
	const isDeposit = category === "deposit";
	return (
		<View
			className={`rounded px-2 py-0.5 ${isDeposit ? "bg-warning/10" : "bg-primary/10"}`}
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
			className={`rounded px-2 py-0.5 ${isModification ? "bg-warning/10" : "bg-destructive/10"}`}
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
