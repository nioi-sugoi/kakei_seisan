import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
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
import { useCreateEntryForm } from "@/hooks/use-entry-form";

export default function CreateEntryScreen() {
	const { form, serverError, loading, goBack } = useCreateEntryForm();

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="flex-1 bg-background"
		>
			<FormHeader title="記録を登録" goBack={goBack} />
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
				<SubmitButton
					label="登録する"
					loading={loading}
					onPress={() => form.handleSubmit()}
				/>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
