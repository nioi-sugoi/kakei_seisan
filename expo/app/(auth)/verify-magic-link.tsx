import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VerifyMagicLinkScreen() {
	const { error } = useLocalSearchParams<{ error?: string }>();
	const router = useRouter();

	return (
		<SafeAreaView className="flex-1 bg-background">
			<View className="flex-1 justify-center items-center px-6 gap-6">
				<View className="w-16 h-16 rounded-2xl bg-destructive/10 items-center justify-center">
					<MaterialIcons name="error-outline" size={32} color="#ef4444" />
				</View>

				<View className="gap-2 items-center">
					<Text className="text-foreground text-xl font-bold text-center">
						認証に失敗しました
					</Text>
					<Text className="text-muted-foreground text-sm text-center">
						{error === "EXPIRED"
							? "リンクの有効期限が切れています。もう一度お試しください。"
							: "リンクが無効です。もう一度お試しください。"}
					</Text>
				</View>

				<Text
					className="text-primary text-sm font-semibold"
					onPress={() => router.replace("/(auth)/login")}
				>
					ログイン画面に戻る
				</Text>
			</View>
		</SafeAreaView>
	);
}
