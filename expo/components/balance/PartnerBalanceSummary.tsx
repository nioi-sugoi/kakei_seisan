import {
	ActivityIndicator,
	type StyleProp,
	Text,
	type TextStyle,
	View,
} from "react-native";
import { usePartnerBalance } from "@/hooks/use-partner-balance";
import { formatAmount } from "@/lib/format";

const subtitleStyle: StyleProp<TextStyle> = {
	opacity: 0.8,
};

export function PartnerBalanceSummary() {
	const { data, isPending } = usePartnerBalance();

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

	return (
		<View className="mx-4 mt-4 rounded-xl bg-primary px-5 py-5">
			<View className="items-center gap-1">
				<Text
					style={subtitleStyle}
					className="text-base font-medium text-primary-foreground"
				>
					パートナーの精算残高
				</Text>
				<Text className="text-4xl font-bold text-primary-foreground">
					{formatAmount(absBalance)}
				</Text>
				<Text className="text-lg font-semibold text-primary-foreground">
					{isPositive ? "家計から受け取り" : "家計へ入金"}
				</Text>
			</View>
		</View>
	);
}
