import { useState } from "react";
import {
	ActivityIndicator,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InvitationFormProps = {
	userEmail: string;
	isPending: boolean;
	error: string;
	onSend: (email: string) => void;
};

export function InvitationForm({
	userEmail,
	isPending,
	error,
	onSend,
}: InvitationFormProps) {
	const [email, setEmail] = useState("");
	const [validationError, setValidationError] = useState("");

	const displayError = validationError || error;

	function handleSend() {
		const trimmed = email.trim();
		if (!trimmed) {
			setValidationError("メールアドレスを入力してください");
			return;
		}
		if (!EMAIL_REGEX.test(trimmed)) {
			setValidationError("正しいメールアドレスの形式で入力してください");
			return;
		}
		if (trimmed === userEmail) {
			setValidationError("自分自身を招待することはできません");
			return;
		}
		setValidationError("");
		onSend(trimmed);
	}

	return (
		<View className="gap-3">
			<Text className="text-sm text-muted-foreground">
				パートナーのメールアドレスを入力して招待を送信できます
			</Text>
			<TextInput
				className="border border-border rounded-xl px-4 py-3.5 text-base text-foreground bg-card"
				placeholder="メールアドレスを入力"
				placeholderTextColor="rgb(93,100,111)"
				value={email}
				onChangeText={(text) => {
					setEmail(text);
					if (validationError) setValidationError("");
				}}
				keyboardType="email-address"
				autoCapitalize="none"
				autoComplete="email"
				editable={!isPending}
			/>
			{displayError ? (
				<Text className="text-destructive text-sm ml-1">{displayError}</Text>
			) : null}
			<Pressable
				className="bg-primary rounded-xl py-3.5 items-center active:opacity-80"
				onPress={handleSend}
				disabled={isPending}
			>
				{isPending ? (
					<ActivityIndicator color="rgb(252,252,252)" />
				) : (
					<Text className="text-primary-foreground font-semibold text-base">
						招待する
					</Text>
				)}
			</Pressable>
		</View>
	);
}
