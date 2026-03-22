import { useLocalSearchParams } from "expo-router";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Text,
	View,
} from "react-native";
import { AmountInput } from "@/components/entry-form/AmountInput";
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
						<AmountInput
							value={field.state.value}
							onChange={field.handleChange}
							error={field.state.meta.errors[0]?.message}
							label="精算額"
							required={false}
							accessibilityLabel="精算額"
						/>
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
