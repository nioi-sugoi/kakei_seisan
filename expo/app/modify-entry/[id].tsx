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
import { CategorySelector } from "@/components/entry-form/CategorySelector";
import { DateInput } from "@/components/entry-form/DateInput";
import {
	FormError,
	FormHeader,
	SubmitButton,
} from "@/components/entry-form/FormShared";
import { LabelInput } from "@/components/entry-form/LabelInput";
import { MemoInput } from "@/components/entry-form/MemoInput";
import { useEntryDetail } from "@/hooks/use-entry-detail";
import { useModifyEntryForm } from "@/hooks/use-entry-form";

type ModifyTarget = {
	id: string;
	category: "advance" | "deposit";
	amount: number;
	date: string;
	label: string;
	memo: string | null;
};

function ModifyEntryForm({ target }: { target: ModifyTarget }) {
	const { form, serverError, loading, goBack } = useModifyEntryForm(target);

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="flex-1 bg-background"
		>
			<FormHeader title="記録を修正" goBack={goBack} />
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-4 py-5 gap-5"
				keyboardShouldPersistTaps="handled"
			>
				<form.Field name="category">
					{(field) => (
						<CategorySelector
							value={field.state.value}
							onChange={field.handleChange}
							disabled
						/>
					)}
				</form.Field>
				<form.Field name="amount">
					{(field) => (
						<AmountInput
							value={field.state.value}
							onChange={field.handleChange}
							error={field.state.meta.errors[0]?.message}
						/>
					)}
				</form.Field>
				<form.Field name="date">
					{(field) => (
						<DateInput
							value={field.state.value}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>
				<form.Field name="label">
					{(field) => (
						<LabelInput
							value={field.state.value}
							onChange={field.handleChange}
							error={field.state.meta.errors[0]?.message}
						/>
					)}
				</form.Field>
				<form.Field name="memo">
					{(field) => (
						<MemoInput
							value={field.state.value ?? ""}
							onChange={field.handleChange}
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

export default function ModifyEntryScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { data: entry, isPending, error } = useEntryDetail(id);

	if (isPending) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (error || !entry) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Text className="text-base text-destructive">
					{error?.message ?? "記録が見つかりません"}
				</Text>
			</View>
		);
	}

	const latestVersion = entry.versions.find((v) => v.latest) ?? entry;

	return (
		<ModifyEntryForm
			target={{
				id: entry.originalId,
				category: latestVersion.category,
				amount: latestVersion.amount,
				date: latestVersion.date,
				label: latestVersion.label,
				memo: latestVersion.memo,
			}}
		/>
	);
}
