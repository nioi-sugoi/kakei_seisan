import { Text, View } from "react-native";

export default function SettingsScreen() {
	return (
		<View className="flex-1 items-center justify-center bg-background">
			<Text className="text-foreground text-2xl font-bold">設定</Text>
			<Text className="text-muted-foreground text-base mt-2">
				アプリの設定がここに表示されます
			</Text>
		</View>
	);
}
