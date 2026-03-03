import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, Text, View } from "react-native";

type SentMessageProps = {
	email: string;
	onReset: () => void;
};

export function SentMessage({ email, onReset }: SentMessageProps) {
	return (
		<View className="items-center gap-4 py-8">
			<View
				className="w-16 h-16 rounded-full items-center justify-center"
				style={{ backgroundColor: "rgba(0,169,121,0.1)" }}
			>
				<MaterialIcons name="check-circle" size={40} color="rgb(0,169,121)" />
			</View>

			<View className="items-center gap-2">
				<Text className="text-foreground text-lg font-semibold">
					メールを送信しました
				</Text>
				<Text className="text-muted-foreground text-sm text-center leading-5">
					{email} にログインリンクを送信しました。{"\n"}
					メール内のリンクをタップしてログインしてください。
				</Text>
			</View>

			<Pressable onPress={onReset} className="mt-2 active:opacity-80">
				<Text className="text-primary text-sm font-medium">
					別のメールアドレスで試す
				</Text>
			</Pressable>
		</View>
	);
}
