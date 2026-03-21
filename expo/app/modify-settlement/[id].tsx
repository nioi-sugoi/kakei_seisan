import { useLocalSearchParams } from "expo-router";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import {
	FormError,
	FormHeader,
	SubmitButton,
} from "@/components/entry-form/FormShared";
import { useSettlementDetail } from "@/hooks/use-settlement-detail";
import { useModifySettlementForm } from "@/hooks/use-settlement-form";

type ModifyTarget = {
	id: string;
	amount: number;
	occurredOn: string;
};

function ModifySettlementForm({ target }: { target: ModifyTarget }) {
	const { form, serverError, loading, goBack } =
		useModifySettlementForm(target);

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="flex-1 bg-background"
		>
			<FormHeader title="精算を修正" goBack={goBack} />
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-4 py-5 gap-5"
				keyboardShouldPersistTaps="handled"
			>
				<form.Field name="amount">
					{(field) => (
						<View className="gap-2">
							<Text className="text-sm font-medium text-foreground">
								精算額
							</Text>
							<View className="flex-row items-center rounded-xl border border-border bg-card px-4">
								<Text className="text-xl font-bold text-muted-foreground">
									¥
								</Text>
								<TextInput
									value={field.state.value}
									onChangeText={field.handleChange}
									placeholder="0"
									keyboardType="number-pad"
									accessibilityLabel="精算額"
									className="flex-1 py-3.5 text-right text-2xl font-bold text-foreground"
									placeholderTextColor="#9ca3af"
								/>
							</View>
							{field.state.meta.errors[0]?.message ? (
								<Text className="text-sm text-destructive">
									{field.state.meta.errors[0].message}
								</Text>
							) : null}
						</View>
					)}
				</form.Field>
				{serverError ? <FormError message={serverError} /> : null}
				<form.Subscribe selector={(state) => state.isDirty}>
					{(isDirty) => (
						<SubmitButton
							label="修正する"
							loading={loading}
							disabled={!isDirty}
							onPress={() => form.handleSubmit()}
						/>
					)}
				</form.Subscribe>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

export default function ModifySettlementScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { data: settlement, isPending, error } = useSettlementDetail(id);

	if (isPending) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (error || !settlement) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Text className="text-base text-destructive">
					{error?.message ?? "精算が見つかりません"}
				</Text>
			</View>
		);
	}

	const latestVersion = settlement.versions.find((v) => v.latest) ?? settlement;

	return (
		<ModifySettlementForm
			target={{
				id: settlement.originalId,
				amount: latestVersion.amount,
				occurredOn: latestVersion.occurredOn,
			}}
		/>
	);
}
