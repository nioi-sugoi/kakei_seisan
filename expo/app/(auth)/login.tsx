import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmailForm } from "@/components/auth/email-form";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { useLoginForm } from "@/hooks/use-login-form";

export default function LoginScreen() {
	const { email, setEmail, error, loading, sendOtp } = useLoginForm();

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
					<View className="gap-8">
						<View className="items-center gap-3">
							<View className="w-16 h-16 rounded-2xl bg-primary items-center justify-center">
								<MaterialIcons
									name="account-balance-wallet"
									size={32}
									color="rgb(252,252,252)"
								/>
							</View>
							<Text className="text-foreground text-2xl font-bold">
								かんたん家計精算
							</Text>
							<Text className="text-muted-foreground text-sm text-center">
								家計の立替・預りをかんたんに精算
							</Text>
						</View>

						<EmailForm
							email={email}
							onChangeEmail={setEmail}
							error={error}
							loading={loading}
							onSubmit={sendOtp}
						/>

						<View className="flex-row items-center gap-4">
							<View className="flex-1 h-px bg-border" />
							<Text className="text-muted-foreground text-xs">または</Text>
							<View className="flex-1 h-px bg-border" />
						</View>

						<SocialLoginButtons />
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
