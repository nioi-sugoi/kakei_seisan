import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OtpForm } from "@/components/auth/otp-form";
import { useVerifyOtp } from "@/hooks/use-verify-otp";

export default function VerifyOtpScreen() {
	const {
		email,
		otp,
		setOtp,
		error,
		loading,
		verifyOtp,
		resendOtp,
		goBack,
	} = useVerifyOtp();

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
					<OtpForm
						email={email}
						otp={otp}
						onChangeOtp={setOtp}
						error={error}
						loading={loading}
						onSubmit={verifyOtp}
						onResend={resendOtp}
						onReset={goBack}
					/>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}
