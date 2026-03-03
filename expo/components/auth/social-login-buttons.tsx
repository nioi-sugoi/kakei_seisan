import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, Text, View } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";

export function SocialLoginButtons() {
	const colorScheme = useColorScheme();
	const iconColor = colorScheme === "dark" ? "#fff" : "#000";

	return (
		<View className="gap-3">
			<Pressable
				className="flex-row items-center justify-center gap-3 border border-border bg-card rounded-xl py-3.5 active:opacity-80"
				onPress={() => {
					// Google ログインは後続イシューで実装
				}}
			>
				<MaterialCommunityIcons name="google" size={20} color={iconColor} />
				<Text className="text-foreground font-semibold text-base">
					Google でログイン
				</Text>
			</Pressable>

			<Pressable
				className="flex-row items-center justify-center gap-3 border border-border bg-card rounded-xl py-3.5 active:opacity-80"
				onPress={() => {
					// Apple ログインは後続イシューで実装
				}}
			>
				<MaterialIcons name="apple" size={22} color={iconColor} />
				<Text className="text-foreground font-semibold text-base">
					Apple でログイン
				</Text>
			</Pressable>
		</View>
	);
}
