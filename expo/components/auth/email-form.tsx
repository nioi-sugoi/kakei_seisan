import {
	ActivityIndicator,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";

type EmailFormProps = {
	email: string;
	onChangeEmail: (text: string) => void;
	error: string;
	loading: boolean;
	onSubmit: () => void;
};

export function EmailForm({
	email,
	onChangeEmail,
	error,
	loading,
	onSubmit,
}: EmailFormProps) {
	const colorScheme = useColorScheme();
	const placeholderColor =
		colorScheme === "dark" ? "rgb(161,161,161)" : "rgb(93,100,111)";

	return (
		<View className="gap-3">
			<TextInput
				className="border border-border rounded-xl px-4 py-3.5 text-base text-foreground bg-card"
				placeholder="メールアドレス"
				placeholderTextColor={placeholderColor}
				value={email}
				onChangeText={(text) => {
					onChangeEmail(text);
				}}
				keyboardType="email-address"
				autoCapitalize="none"
				autoComplete="email"
				editable={!loading}
			/>
			{error ? (
				<Text className="text-destructive text-sm ml-1">{error}</Text>
			) : null}
			<Pressable
				className="bg-primary rounded-xl py-3.5 items-center active:opacity-80"
				onPress={onSubmit}
				disabled={loading}
			>
				{loading ? (
					<ActivityIndicator color="rgb(252,252,252)" />
				) : (
					<Text className="text-primary-foreground font-semibold text-base">
						マジックリンクを送信
					</Text>
				)}
			</Pressable>
		</View>
	);
}
