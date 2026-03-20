import { format, parse } from "date-fns";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

const isNativeAvailable =
	Platform.OS !== "web" && Constants.appOwnership !== "expo";

const NativeDateTimePicker = isNativeAvailable
	? (require("@react-native-community/datetimepicker")
			.default as typeof import("@react-native-community/datetimepicker").default)
	: null;

type DateInputProps = {
	value: string;
	onChange: (date: string) => void;
};

export function DateInput({ value, onChange }: DateInputProps) {
	const [showPicker, setShowPicker] = useState(false);

	if (!NativeDateTimePicker) {
		return (
			<View className="gap-2" testID="日付フィールド">
				<Text className="text-sm font-medium text-foreground">
					日付
					<Text className="text-xs text-destructive"> *必須</Text>
				</Text>
				<TextInput
					value={value}
					onChangeText={onChange}
					placeholder="YYYY-MM-DD"
					keyboardType="numbers-and-punctuation"
					accessibilityLabel="日付"
					className="rounded-xl border border-border bg-card px-4 py-3.5 text-base text-foreground"
					placeholderTextColor="#9ca3af"
				/>
			</View>
		);
	}

	return (
		<View className="gap-2" testID="日付フィールド">
			<Text className="text-sm font-medium text-foreground">
				日付
				<Text className="text-xs text-destructive"> *必須</Text>
			</Text>
			<Pressable
				onPress={() => setShowPicker(true)}
				accessibilityLabel="日付"
				className="rounded-xl border border-border bg-card px-4 py-3.5"
			>
				<Text className="text-base text-foreground">
					{format(parse(value, "yyyy-MM-dd", new Date()), "yyyy年M月d日")}
				</Text>
			</Pressable>
			{showPicker && (
				<NativeDateTimePicker
					value={parse(value, "yyyy-MM-dd", new Date())}
					mode="date"
					display="spinner"
					locale="ja"
					onChange={(_, selectedDate) => {
						setShowPicker(Platform.OS === "ios");
						if (selectedDate) {
							onChange(format(selectedDate, "yyyy-MM-dd"));
						}
					}}
				/>
			)}
			{Platform.OS === "ios" && showPicker && (
				<Pressable
					onPress={() => setShowPicker(false)}
					className="items-center py-2"
				>
					<Text className="text-sm font-medium text-primary">完了</Text>
				</Pressable>
			)}
		</View>
	);
}
