import { Text, TextInput, View } from "react-native";

type AmountInputProps = {
	value: string;
	onChange: (value: string) => void;
	error?: string;
};

export function AmountInput({ value, onChange, error }: AmountInputProps) {
	return (
		<View className="gap-2" testID="金額フィールド">
			<Text className="text-sm font-medium text-foreground">
				金額
				<Text className="text-xs text-destructive"> *必須</Text>
			</Text>
			<View className="flex-row items-center rounded-xl border border-border bg-card px-4">
				<Text className="text-xl font-bold text-muted-foreground">¥</Text>
				<TextInput
					value={value}
					onChangeText={onChange}
					placeholder="0"
					keyboardType="number-pad"
					accessibilityLabel="金額"
					className="flex-1 py-3.5 text-right text-2xl font-bold text-foreground"
					placeholderTextColor="#9ca3af"
				/>
			</View>
			{error ? <Text className="text-sm text-destructive">{error}</Text> : null}
		</View>
	);
}
