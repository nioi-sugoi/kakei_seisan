import { useRef } from "react";
import {
	ActivityIndicator,
	Pressable,
	Text,
	TextInput,
	View,
	type TextInput as TextInputType,
} from "react-native";

const OTP_LENGTH = 6;

type OtpFormProps = {
	email: string;
	otp: string;
	onChangeOtp: (text: string) => void;
	error: string;
	loading: boolean;
	onSubmit: () => void;
	onResend: () => void;
	onReset: () => void;
};

export function OtpForm({
	email,
	otp,
	onChangeOtp,
	error,
	loading,
	onSubmit,
	onResend,
	onReset,
}: OtpFormProps) {
	const inputRefs = useRef<(TextInputType | null)[]>([]);
	const digits = otp.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH);

	function handleChange(index: number, value: string) {
		// 複数文字のペースト対応
		if (value.length > 1) {
			const pasted = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
			onChangeOtp(pasted);
			const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
			inputRefs.current[focusIndex]?.focus();
			return;
		}

		const filtered = value.replace(/\D/g, "");
		const newDigits = [...digits];
		newDigits[index] = filtered;
		onChangeOtp(newDigits.join(""));

		if (filtered && index < OTP_LENGTH - 1) {
			inputRefs.current[index + 1]?.focus();
		}
	}

	function handleKeyPress(index: number, key: string) {
		if (key === "Backspace" && !digits[index] && index > 0) {
			inputRefs.current[index - 1]?.focus();
			const newDigits = [...digits];
			newDigits[index - 1] = "";
			onChangeOtp(newDigits.join(""));
		}
	}

	return (
		<View className="items-center gap-4 py-8">
			<View className="items-center gap-2">
				<Text className="text-foreground text-lg font-semibold">
					認証コードを入力
				</Text>
				<Text className="text-muted-foreground text-sm text-center leading-5">
					{email} に認証コードを送信しました。
				</Text>
			</View>

			<View className="w-full gap-3">
				<View className="flex-row justify-center gap-2">
					{digits.map((digit, index) => (
						<TextInput
							key={index}
							ref={(ref) => { inputRefs.current[index] = ref; }}
							className="border border-border rounded-xl w-12 h-14 text-center text-2xl text-foreground bg-card"
							value={digit}
							onChangeText={(value) => handleChange(index, value)}
							onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
							keyboardType="number-pad"
							autoFocus={index === 0}
							editable={!loading}
							selectTextOnFocus
						/>
					))}
				</View>
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
							認証する
						</Text>
					)}
				</Pressable>
			</View>

			<View className="flex-row gap-4 mt-2">
				<Pressable onPress={onResend} disabled={loading} className="active:opacity-80">
					<Text className="text-primary text-sm font-medium">
						コードを再送信
					</Text>
				</Pressable>
				<Pressable onPress={onReset} className="active:opacity-80">
					<Text className="text-muted-foreground text-sm font-medium">
						別のメールアドレスで試す
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
