import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmailForm } from "@/components/auth/email-form";
import { SentMessage } from "@/components/auth/sent-message";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { useLoginForm } from "@/hooks/use-login-form";

export default function LoginScreen() {
	const { email, setEmail, error, sent, loading, submit, reset } =
		useLoginForm();

	return (
		<SafeAreaView className="flex-1 bg-background">
			<KeyboardAvoidingView
				className="flex-1"
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				<ScrollView
					contentContainerClassName="flex-grow justify-center px-6 py-8"
					keyboardShouldPersistTaps="handled"
				>
					{sent ? (
						<SentMessage email={email} onReset={reset} />
					) : (
						<View className="gap-8">
							<View className="items-center gap-2">
								<Text className="text-foreground text-2xl font-bold">
									ログイン
								</Text>
								<Text className="text-muted-foreground text-sm text-center">
									メールアドレスまたはソーシャルアカウントで{"\n"}
									ログインしてください
								</Text>
							</View>

							<EmailForm
								email={email}
								onChangeEmail={setEmail}
								error={error}
								loading={loading}
								onSubmit={submit}
							/>

							<View className="flex-row items-center gap-4">
								<View className="flex-1 h-px bg-border" />
								<Text className="text-muted-foreground text-xs">または</Text>
								<View className="flex-1 h-px bg-border" />
							</View>

							<SocialLoginButtons />
						</View>
					)}
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
