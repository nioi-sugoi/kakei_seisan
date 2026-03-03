import { Text, View } from "react-native";

export default function PartnerScreen() {
	return (
		<View className="flex-1 items-center justify-center bg-background">
			<Text className="text-foreground text-2xl font-bold">パートナー</Text>
			<Text className="text-muted-foreground text-base mt-2">
				パートナーとの精算状況がここに表示されます
			</Text>
		</View>
	);
}
