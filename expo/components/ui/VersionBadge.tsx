import { type StyleProp, Text, View, type ViewStyle } from "react-native";

// NativeWind の bg-xxx/opacity を条件付き className で使うとクラッシュするため
// (nativewind#1466, #1711) バッジ背景は style prop で指定する
export const badgeBg = {
	primary: { backgroundColor: "rgba(0, 126, 183, 0.1)" },
	warning: { backgroundColor: "rgba(223, 161, 26, 0.1)" },
	amber: { backgroundColor: "rgba(217, 119, 6, 0.1)" },
	red: { backgroundColor: "rgba(239, 68, 68, 0.1)" },
	green: { backgroundColor: "rgba(34, 197, 94, 0.1)" },
	muted: { backgroundColor: "rgba(107, 114, 128, 0.1)" },
} satisfies Record<string, StyleProp<ViewStyle>>;

export function VersionBadge({ type }: { type: "modified" | "cancelled" }) {
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
