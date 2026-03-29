import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth-client";

export default function SettingsScreen() {
	const { data: session } = authClient.useSession();

	return (
		<SafeAreaView className="flex-1 bg-background">
			<ScrollView className="flex-1" contentContainerClassName="px-6 pb-8">
				<Text className="text-foreground text-2xl font-bold">設定</Text>

				<View className="mt-8 rounded-xl bg-card p-4">
					<Text className="text-muted-foreground text-sm">
						ログイン中のアカウント
					</Text>
					<Text className="text-foreground text-base mt-1">
						{session?.user?.email ?? "—"}
					</Text>
				</View>

				<Pressable
					onPress={() => authClient.signOut()}
					className="mt-8 items-center rounded-xl bg-destructive py-4"
				>
					<Text className="text-destructive-foreground text-base font-semibold">
						サインアウト
					</Text>
				</Pressable>
			</ScrollView>
		</SafeAreaView>
	);
}
