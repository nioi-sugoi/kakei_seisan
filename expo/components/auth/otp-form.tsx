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
const EMPTY_DIGITS = Array<string>(OTP_LENGTH).fill("");

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

/**
 * otp は固定長6文字のスロット文字列として管理する。
 * 空スロットはスペースで保持し、位置がずれないようにする。
 * 例: "1 3   " = slot0='1', slot1=' ', slot2='3', slot3-5=' '
 *
 * 外部に渡す際はスペースを除去してcompact stringにする。
 */
function digitsFromOtp(otp: string): string[] {
	const padded = otp.padEnd(OTP_LENGTH, " ");
	return Array.from({ length: OTP_LENGTH }, (_, i) =>
		padded[i] === " " ? "" : padded[i],
	);
}

function digitsToOtp(digits: string[]): string {
	return digits.map((d) => d || " ").join("");
}

/** 送信用にスペースを除去した値を返す */
function compactOtp(otp: string): string {
	return otp.replace(/\s/g, "");
}

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
	const digits = digitsFromOtp(otp);

	function handleChange(index: number, value: string) {
		const cleaned = value.replace(/\D/g, "");

		// 複数文字のペースト対応（既存の1文字を超える入力）
		if (cleaned.length > 1) {
			// 既存の桁が先頭に含まれている場合は除去してペースト部分だけ取り出す
			const existing = digits[index];
			const pasted =
				existing && cleaned.startsWith(existing)
					? cleaned.slice(existing.length)
					: cleaned;
			const pastedDigits = pasted.slice(0, OTP_LENGTH).split("");
			const newDigits = [...digits];
			for (let i = 0; i < pastedDigits.length && index + i < OTP_LENGTH; i++) {
				newDigits[index + i] = pastedDigits[i];
			}
			onChangeOtp(digitsToOtp(newDigits));
			const focusIndex = Math.min(index + pastedDigits.length, OTP_LENGTH - 1);
			inputRefs.current[focusIndex]?.focus();
			return;
		}

		const newDigits = [...digits];
		newDigits[index] = cleaned;
		onChangeOtp(digitsToOtp(newDigits));

		if (cleaned && index < OTP_LENGTH - 1) {
			inputRefs.current[index + 1]?.focus();
		}
	}

	function handleKeyPress(index: number, key: string) {
		if (key === "Backspace" && !digits[index] && index > 0) {
			inputRefs.current[index - 1]?.focus();
			const newDigits = [...digits];
			newDigits[index - 1] = "";
			onChangeOtp(digitsToOtp(newDigits));
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

export { compactOtp };
