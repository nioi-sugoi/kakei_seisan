import { useRouter } from "expo-router";
import {
	ActivityIndicator,
	Pressable,
	type StyleProp,
	Text,
	type TextStyle,
	View,
} from "react-native";
import { useBalance } from "@/hooks/use-balance";
import { formatAmount } from "@/lib/format";

// NativeWind の bg-xxx/opacity を条件付き className で使うとクラッシュするため style で指定
const subtitleStyle: StyleProp<TextStyle> = {
	opacity: 0.8,
};

interface BalanceSummaryProps {
	userId?: string;
	title?: string;
	readOnly?: boolean;
}

export function BalanceSummary({
	userId,
	title,
	readOnly,
}: BalanceSummaryProps) {
	const router = useRouter();
	const { data, isPending } = useBalance({ userId });

	if (isPending) {
		return (
			<View className="mx-4 mt-4 rounded-xl bg-primary px-5 py-5">
				<ActivityIndicator color="white" />
			</View>
		);
	}

	if (!data) return null;

	const { balance } = data;
	const absBalance = Math.abs(balance);
	const isPositive = balance >= 0;
	const hasBalance = balance !== 0;
	const showSettleButton = hasBalance && !readOnly;

	return (
		<View className="mx-4 mt-4 rounded-xl bg-primary px-5 py-5">
			<View className="items-center gap-1">
				<Text
					style={subtitleStyle}
					className="text-base font-medium text-primary-foreground"
				>
					{title ?? "現在の精算残高"}
				</Text>
				<Text className="text-4xl font-bold text-primary-foreground">
					{formatAmount(absBalance)}
				</Text>
				<Text className="text-lg font-semibold text-primary-foreground">
					{isPositive ? "家計から受け取り" : "家計へ入金"}
				</Text>
			</View>
			{showSettleButton ? (
				<Pressable
					onPress={() => router.push("/settlement-form")}
					className="mt-3 items-center rounded-xl bg-primary-foreground py-2.5 active:opacity-80"
					accessibilityRole="button"
					accessibilityLabel="精算する"
				>
					<Text className="text-lg font-semibold text-primary">精算する</Text>
				</Pressable>
			) : null}
		</View>
	);
}
