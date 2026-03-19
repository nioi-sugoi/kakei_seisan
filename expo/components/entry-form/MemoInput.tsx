import { Text, TextInput, View } from "react-native";

type MemoInputProps = {
	value: string;
	onChange: (value: string) => void;
};

export function MemoInput({ value, onChange }: MemoInputProps) {
	return (
		<View className="gap-2">
			<Text className="text-sm font-medium text-foreground">
				メモ
				<Text className="text-xs text-muted-foreground"> 任意</Text>
			</Text>
			<TextInput
				value={value}
				onChangeText={onChange}
				placeholder="メモを入力..."
				accessibilityLabel="メモ"
				multiline
				numberOfLines={3}
				className="min-h-20 rounded-xl border border-border bg-card px-4 py-3.5 text-base text-foreground"
				placeholderTextColor="#9ca3af"
				textAlignVertical="top"
			/>
		</View>
	);
}
