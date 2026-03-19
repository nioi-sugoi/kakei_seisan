import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function TimelineScreen() {
	const router = useRouter();

	return (
		<View className="flex-1 bg-background">
			<View className="flex-1 items-center justify-center">
				<Text className="text-foreground text-2xl font-bold">タイムライン</Text>
				<Text className="text-muted-foreground text-base mt-2">
					支出の履歴がここに表示されます
				</Text>
			</View>

			{/* FAB */}
			<Pressable
				onPress={() => router.push("/entry-form")}
				className="absolute bottom-6 right-5 h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
			>
				<Text className="text-4xl font-bold text-primary-foreground">＋</Text>
			</Pressable>
		</View>
	);
}
