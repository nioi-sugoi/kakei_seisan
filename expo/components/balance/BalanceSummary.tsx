import { useRouter } from "expo-router";
import {
	ActivityIndicator,
	Pressable,
	type StyleProp,
	Text,
	View,
	type ViewStyle,
} from "react-native";
import { useBalance } from "@/hooks/use-balance";
import { formatAmount } from "@/lib/format";

// NativeWind の bg-xxx/opacity を条件付き className で使うとクラッシュするため style で指定
const cardBg: StyleProp<ViewStyle> = {
	backgroundColor: "rgba(0, 126, 183, 0.05)",
};

export function BalanceSummary() {
	const router = useRouter();
	const { data, isPending } = useBalance();

	if (isPending) {
		return (
			<View style={cardBg} className="mx-4 mt-4 rounded-xl px-5 py-4">
				<ActivityIndicator />
			</View>
		);
	}

	if (!data) return null;

	const { balance } = data;
	const absBalance = Math.abs(balance);
	const isPositive = balance >= 0;
	const hasBalance = balance !== 0;

	return (
		<View style={cardBg} className="mx-4 mt-4 rounded-xl px-5 py-4">
			<View className="items-center gap-1">
				<Text className="text-sm text-muted-foreground">現在の残高</Text>
				<Text className="text-2xl font-bold text-foreground">
					{formatAmount(absBalance)}
				</Text>
				<Text className="text-sm font-medium text-primary">
					{isPositive ? "家計から受け取る額" : "家計に入金する額"}
				</Text>
			</View>
			{hasBalance ? (
				<Pressable
					onPress={() => router.push("/settlement-form")}
					className="mt-3 items-center rounded-xl bg-primary py-2.5 active:opacity-80"
					accessibilityRole="button"
					accessibilityLabel="精算する"
				>
					<Text className="text-base font-semibold text-primary-foreground">
						精算する
					</Text>
				</Pressable>
			) : null}
		</View>
	);
}
