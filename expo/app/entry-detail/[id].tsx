import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function EntryDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();

	return (
		<View className="flex-1 bg-background">
			<View className="flex-row items-center px-4 pb-3 pt-14">
				<Pressable onPress={() => router.back()} accessibilityRole="button">
					<Text className="text-base text-primary">← 戻る</Text>
				</Pressable>
				<Text className="ml-4 text-lg font-bold text-foreground">
					記録の詳細
				</Text>
			</View>
			<View className="flex-1 items-center justify-center px-4">
				<Text className="text-muted-foreground">
					記録ID: {id}
				</Text>
				<Text className="mt-2 text-sm text-muted-foreground">
					詳細画面は別イシュー（#16）で実装予定です
				</Text>
			</View>
		</View>
	);
}
