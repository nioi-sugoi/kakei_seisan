import {
	Pressable,
	type StyleProp,
	Text,
	View,
	type ViewStyle,
} from "react-native";
import type { Entry } from "@/hooks/use-entries";
import { formatAmount, formatDateShort } from "@/lib/format";

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

function VersionBadge({ type }: { type: "modified" | "cancelled" }) {
	const isCancel = type === "cancelled";
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
	const isV1 = entry.id === entry.originalId;
	const isLatest = entry.latest;
	const isCancelled = entry.cancelled;
	const groupCancelled = entry.groupCancelled;

	return (
		<Pressable
			onPress={() => onPress(entry)}
			className={`rounded-xl bg-card px-4 py-3 active:opacity-80 ${!isLatest ? "opacity-50" : ""}`}
			accessibilityRole="button"
			accessibilityLabel={`${isDeposit ? "預り" : "立替"} ${entry.label} ${formatAmount(entry.amount)}`}
		>
			<View className="flex-row items-center justify-between">
				<View className="flex-1 gap-1">
					<View className="flex-row items-center gap-2">
						<CategoryBadge category={entry.category} />
						{!isV1 && !isCancelled && <VersionBadge type="modified" />}
						{isCancelled && <VersionBadge type="cancelled" />}
						{isV1 && !isLatest && !groupCancelled && (
							<StatusBadge status="modified" />
						)}
						{isV1 && !isLatest && groupCancelled && (
							<StatusBadge status="cancelled" />
						)}
					</View>
					<Text
						className="text-sm font-medium text-foreground"
					>
						{entry.label}
					</Text>
					<Text className="text-xs text-muted-foreground">
						{formatDateShort(entry.date)}
					</Text>
				</View>
				<Text
					className={`text-lg font-bold ${
						isDeposit ? "text-warning" : "text-foreground"
					}`}
				>
					{isDeposit ? "-" : ""}
					{formatAmount(entry.amount)}
				</Text>
			</View>
		</Pressable>
	);
}
