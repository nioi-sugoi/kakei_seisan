import { useLocalSearchParams } from "expo-router";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { AmountInput } from "@/components/entry-form/AmountInput";
import { CategorySelector } from "@/components/entry-form/CategorySelector";
import { DateInput } from "@/components/entry-form/DateInput";
import { LabelInput } from "@/components/entry-form/LabelInput";
import { MemoInput } from "@/components/entry-form/MemoInput";
import { useEntryDetail } from "@/hooks/use-entry-detail";
import { useEntryForm } from "@/hooks/use-entry-form";

function EntryFormContent({
	modifyTarget,
}: {
	modifyTarget?: {
		id: string;
		category: "advance" | "deposit";
		amount: number;
		date: string;
		label: string;
		memo: string | null;
	};
}) {
	const { form, isModifyMode, serverError, loading, goBack } =
		useEntryForm(modifyTarget);

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="flex-1 bg-background"
		>
			{/* Header */}
			<View className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-3 pt-14">
				<Pressable onPress={goBack} className="active:opacity-60">
					<Text className="text-base text-primary">戻る</Text>
				</Pressable>
				<Text className="flex-1 text-lg font-bold text-foreground">
					{isModifyMode ? "記録を修正" : "記録を登録"}
				</Text>
			</View>

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
							disabled={isModifyMode}
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

				{/* Error */}
				{serverError ? (
					<View
						style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
						className="rounded-xl px-4 py-3"
					>
						<Text className="text-sm text-destructive">{serverError}</Text>
					</View>
				) : null}

				{/* Submit */}
				<Pressable
					onPress={() => form.handleSubmit()}
					disabled={loading}
					className={`mt-2 items-center rounded-xl py-3.5 bg-primary ${
						loading ? "opacity-60" : "active:opacity-80"
					}`}
				>
					{loading ? (
						<ActivityIndicator color="white" />
					) : (
						<Text className="text-base font-semibold text-primary-foreground">
							{isModifyMode ? "修正する" : "登録する"}
						</Text>
					)}
				</Pressable>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

export default function EntryFormScreen() {
	const { modifyId } = useLocalSearchParams<{ modifyId?: string }>();

	if (!modifyId) {
		return <EntryFormContent />;
	}

	return <ModifyFormLoader entryId={modifyId} />;
}

function ModifyFormLoader({ entryId }: { entryId: string }) {
	const { data: entry, isPending, error } = useEntryDetail(entryId);

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

	// 最新バージョンの値をそのまま使う（バージョン管理方式ではフルスナップショット）
	const latestVersion = entry.versions.find((v) => v.latest) ?? entry;

	return (
		<EntryFormContent
			modifyTarget={{
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
