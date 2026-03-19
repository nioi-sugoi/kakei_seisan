import { useState } from "react";
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { format, parse } from "date-fns";
import { useEntryForm } from "@/hooks/use-entry-form";

// ネイティブモジュールが含まれないビルド（Expo Go等）ではフォールバック
let DateTimePicker: typeof import("@react-native-community/datetimepicker").default | null = null;
try {
	DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {
	// native module unavailable
}

export default function EntryFormScreen() {
	const {
		category,
		setCategory,
		amount,
		setAmount,
		date,
		setDate,
		label,
		setLabel,
		memo,
		setMemo,
		error,
		fieldErrors,
		loading,
		submit,
		goBack,
	} = useEntryForm();

	const [showDatePicker, setShowDatePicker] = useState(false);

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
					記録を登録
				</Text>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerClassName="px-4 py-5 gap-5"
				keyboardShouldPersistTaps="handled"
			>
				{/* Type Selector */}
				<View className="flex-row rounded-xl bg-secondary p-1">
					<Pressable
						onPress={() => setCategory("advance")}
						className={`flex-1 items-center rounded-lg py-2.5 ${
							category === "advance" ? "bg-primary" : ""
						}`}
					>
						<Text
							className={`text-sm font-semibold ${
								category === "advance"
									? "text-primary-foreground"
									: "text-muted-foreground"
							}`}
						>
							立替
						</Text>
					</Pressable>
					<Pressable
						onPress={() => setCategory("deposit")}
						className={`flex-1 items-center rounded-lg py-2.5 ${
							category === "deposit" ? "bg-orange-500" : ""
						}`}
					>
						<Text
							className={`text-sm font-semibold ${
								category === "deposit" ? "text-white" : "text-muted-foreground"
							}`}
						>
							預り
						</Text>
					</Pressable>
				</View>

				{/* Amount */}
				<View className="gap-2" testID="amount-field">
					<Text className="text-sm font-medium text-foreground">
						金額
						<Text className="text-xs text-destructive"> *必須</Text>
					</Text>
					<View className="flex-row items-center rounded-xl border border-border bg-card px-4">
						<Text className="text-xl font-bold text-muted-foreground">¥</Text>
						<TextInput
							value={amount}
							onChangeText={setAmount}
							placeholder="0"
							keyboardType="number-pad"
							accessibilityLabel="金額"
							className="flex-1 py-3.5 text-right text-2xl font-bold text-foreground"
							placeholderTextColor="#9ca3af"
						/>
					</View>
					{fieldErrors.amount ? (
						<Text className="text-sm text-destructive">
							{fieldErrors.amount}
						</Text>
					): null}
				</View>

				{/* Date */}
				<View className="gap-2">
					<Text className="text-sm font-medium text-foreground">
						日付
						<Text className="text-xs text-destructive"> *必須</Text>
					</Text>
					{DateTimePicker ? (
						<>
							<Pressable
								onPress={() => setShowDatePicker(true)}
								className="rounded-xl border border-border bg-card px-4 py-3.5"
							>
								<Text className="text-base text-foreground">
									{format(parse(date, "yyyy-MM-dd", new Date()), "yyyy年M月d日")}
								</Text>
							</Pressable>
							{showDatePicker && (
								<DateTimePicker
									value={parse(date, "yyyy-MM-dd", new Date())}
									mode="date"
									display="spinner"
									locale="ja"
									onChange={(_, selectedDate) => {
										setShowDatePicker(Platform.OS === "ios");
										if (selectedDate) {
											setDate(format(selectedDate, "yyyy-MM-dd"));
										}
									}}
								/>
							)}
							{Platform.OS === "ios" && showDatePicker && (
								<Pressable
									onPress={() => setShowDatePicker(false)}
									className="items-center py-2"
								>
									<Text className="text-sm font-medium text-primary">
										完了
									</Text>
								</Pressable>
							)}
						</>
					) : (
						<TextInput
							value={date}
							onChangeText={setDate}
							placeholder="YYYY-MM-DD"
							keyboardType="numbers-and-punctuation"
							className="rounded-xl border border-border bg-card px-4 py-3.5 text-base text-foreground"
							placeholderTextColor="#9ca3af"
						/>
					)}
					{fieldErrors.date ? (
						<Text className="text-sm text-destructive">{fieldErrors.date}</Text>
					): null}
				</View>

				{/* Label */}
				<View className="gap-2" testID="label-field">
					<Text className="text-sm font-medium text-foreground">
						ラベル
						<Text className="text-xs text-destructive"> *必須</Text>
					</Text>
					<TextInput
						value={label}
						onChangeText={setLabel}
						placeholder="例: スーパー買い物"
						accessibilityLabel="ラベル"
						className="rounded-xl border border-border bg-card px-4 py-3.5 text-base text-foreground"
						placeholderTextColor="#9ca3af"
					/>
					{fieldErrors.label ? (
						<Text className="text-sm text-destructive">
							{fieldErrors.label}
						</Text>
					): null}
				</View>

				{/* Memo */}
				<View className="gap-2">
					<Text className="text-sm font-medium text-foreground">
						メモ
						<Text className="text-xs text-muted-foreground"> 任意</Text>
					</Text>
					<TextInput
						value={memo}
						onChangeText={setMemo}
						placeholder="メモを入力..."
						accessibilityLabel="メモ"
						multiline
						numberOfLines={3}
						className="min-h-20 rounded-xl border border-border bg-card px-4 py-3.5 text-base text-foreground"
						placeholderTextColor="#9ca3af"
						textAlignVertical="top"
					/>
				</View>

				{/* Error */}
				{error ? (
					<View className="rounded-xl bg-destructive/10 px-4 py-3">
						<Text className="text-sm text-destructive">{error}</Text>
					</View>
				): null}

				{/* Submit */}
				<Pressable
					onPress={submit}
					disabled={loading}
					className={`mt-2 items-center rounded-xl py-3.5 bg-primary ${
						loading ? "opacity-60" : "active:opacity-80"
					}`}
				>
					{loading ? (
						<ActivityIndicator color="white" />
					) : (
						<Text className="text-base font-semibold text-primary-foreground">
							登録する
						</Text>
					)}
				</Pressable>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
