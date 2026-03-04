import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSession, useSignOut } from "@/hooks/use-auth";

export default function SettingsScreen() {
	const { data: session } = useSession();
	const { signOut, isPending } = useSignOut();

	return (
		<View className="flex-1 bg-background px-6 pt-12">
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
				onPress={signOut}
				disabled={isPending}
				className="mt-6 items-center rounded-xl bg-destructive py-4"
			>
				{isPending ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text className="text-destructive-foreground text-base font-semibold">
						サインアウト
					</Text>
				)}
			</Pressable>
		</View>
	);
}
