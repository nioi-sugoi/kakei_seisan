import {
	ActivityIndicator,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";

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
				<TextInput
					className="border border-border rounded-xl px-4 py-3.5 text-center text-2xl tracking-[8px] text-foreground bg-card"
					placeholder="000000"
					placeholderTextColor="rgb(93,100,111)"
					value={otp}
					onChangeText={onChangeOtp}
					keyboardType="number-pad"
					maxLength={6}
					autoFocus
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
							認証する
						</Text>
					)}
				</Pressable>
			</View>

			<View className="flex-row gap-4 mt-2">
				<Pressable onPress={onResend} className="active:opacity-80">
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
