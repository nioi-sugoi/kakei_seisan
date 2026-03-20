import {
	Pressable,
	type StyleProp,
	Text,
	View,
	type ViewStyle,
} from "react-native";
import type { Entry } from "@/hooks/use-entries";
import {
	formatAmount,
	formatDateShort,
	formatSignedAmount,
} from "@/lib/format";

// NativeWind の bg-xxx/opacity を条件付き className で使うとクラッシュするため
// (nativewind#1466, #1711) バッジ背景は style prop で指定する
const badgeBg = {
	primary: { backgroundColor: "rgba(0, 126, 183, 0.1)" },
	warning: { backgroundColor: "rgba(223, 161, 26, 0.1)" },
	amber: { backgroundColor: "rgba(217, 119, 6, 0.1)" },
	red: { backgroundColor: "rgba(239, 68, 68, 0.1)" },
	muted: { backgroundColor: "rgba(107, 114, 128, 0.1)" },
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

function OperationBadge({
	operation,
}: {
	operation: "modification" | "cancellation";
}) {
	const isCancel = operation === "cancellation";
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

function StatusBadge({ status }: { status: "modified" | "cancelled" }) {
	const isCancel = status === "cancelled";
	return (
		<View style={badgeBg.muted} className="rounded px-2 py-0.5">
			<Text className="text-xs font-medium text-gray-500">
				{isCancel ? "取消済み" : "修正済み"}
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
	const isOriginal = entry.operation === "original";
	const hasCancellation = entry.childOperations.includes("cancellation");
	const hasModification = entry.childOperations.includes("modification");

	// 金額表示: 修正・取消レコードは差分の符号をそのまま表示
	const displayAmount = isOriginal
		? `${isDeposit ? "-" : ""}${formatAmount(entry.amount)}`
		: formatSignedAmount(entry.amount);

	return (
		<Pressable
			onPress={() => onPress(entry)}
			className={`rounded-xl bg-card px-4 py-3 active:opacity-80 ${hasCancellation ? "opacity-50" : ""}`}
			accessibilityRole="button"
			accessibilityLabel={`${entry.category === "advance" ? "立替" : "預り"} ${entry.label} ${formatAmount(entry.amount)}`}
		>
			<View className="flex-row items-center justify-between">
				<View className="flex-1 gap-1">
					<View className="flex-row items-center gap-2">
						<CategoryBadge category={entry.category} />
						{entry.operation === "modification" && (
							<OperationBadge operation="modification" />
						)}
						{entry.operation === "cancellation" && (
							<OperationBadge operation="cancellation" />
						)}
						{isOriginal && hasModification && !hasCancellation && (
							<StatusBadge status="modified" />
						)}
						{isOriginal && hasCancellation && (
							<StatusBadge status="cancelled" />
						)}
					</View>
					<Text
						className={`text-sm font-medium text-foreground ${hasCancellation ? "line-through" : ""}`}
					>
						{entry.label}
					</Text>
					<Text className="text-xs text-muted-foreground">
						{formatDateShort(entry.date)}
					</Text>
				</View>
				<Text
					className={`text-lg font-bold ${
						hasCancellation
							? "line-through text-muted-foreground"
							: !isOriginal
								? entry.amount < 0
									? "text-red-500"
									: "text-emerald-600"
								: isDeposit
									? "text-warning"
									: "text-foreground"
					}`}
				>
					{displayAmount}
				</Text>
			</View>
		</Pressable>
	);
}
