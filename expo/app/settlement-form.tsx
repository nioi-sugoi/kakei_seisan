import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	type StyleProp,
	Text,
	View,
	type ViewStyle,
} from "react-native";
import { AmountInput } from "@/components/entry-form/AmountInput";
import {
	FormError,
	FormHeader,
	SubmitButton,
} from "@/components/entry-form/FormShared";
import { useBalance } from "@/hooks/use-balance";
import { useCreateSettlementForm } from "@/hooks/use-settlement-form";
import { formatAmount } from "@/lib/format";

// NativeWind の bg-xxx/opacity を条件付き className で使うとクラッシュするため style で指定
const balanceCardBg: StyleProp<ViewStyle> = {
	backgroundColor: "rgba(0, 126, 183, 0.05)",
};

function SettlementFormContent({ balance }: { balance: number }) {
	const absBalance = Math.abs(balance);
	const isPositive = balance >= 0;
	const { form, serverError, loading, goBack } =
		useCreateSettlementForm(balance);

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="flex-1 bg-background"
		>
			<FormHeader title="精算" goBack={goBack} />
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-4 py-5 gap-5"
				keyboardShouldPersistTaps="handled"
			>
				<View
					style={balanceCardBg}
					className="items-center gap-2 rounded-xl px-5 py-5"
				>
					<Text className="text-base text-muted-foreground">
						現在の精算残高
					</Text>
					<Text className="text-3xl font-bold text-foreground">
						{formatAmount(absBalance)}
					</Text>
					<Text className="text-lg font-semibold text-primary">
						{isPositive ? "家計から受け取り" : "家計へ入金"}
					</Text>
				</View>

				<form.Field name="amount">
					{(field) => (
						<>
							<AmountInput
								value={field.state.value}
								onChange={field.handleChange}
								error={field.state.meta.errors[0]?.message}
								label="精算額"
								required={false}
								accessibilityLabel="精算額"
							/>
							<Pressable
								onPress={() => field.handleChange(String(absBalance))}
								className="items-center rounded-xl border border-border bg-card py-2.5 active:opacity-80"
							>
								<Text className="text-base font-medium text-foreground">
									全額精算
								</Text>
							</Pressable>
						</>
					)}
				</form.Field>

				{serverError ? <FormError message={serverError} /> : null}

				<SubmitButton
					label="精算を実行する"
					loading={loading}
					onPress={() => form.handleSubmit()}
				/>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

export default function SettlementFormScreen() {
	const { data, isPending, error } = useBalance();

	if (isPending) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (error || !data) {
		return (
			<View className="flex-1 items-center justify-center bg-background px-4">
				<Text className="text-lg text-destructive">
					{error?.message ?? "残高の取得に失敗しました"}
				</Text>
			</View>
		);
	}

	return <SettlementFormContent balance={data.balance} />;
}
