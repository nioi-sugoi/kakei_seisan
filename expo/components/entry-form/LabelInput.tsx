import { Text, TextInput, View } from "react-native";

type LabelInputProps = {
	value: string;
	onChange: (value: string) => void;
	error?: string;
};

export function LabelInput({ value, onChange, error }: LabelInputProps) {
	return (
		<View className="gap-2" accessibilityLabel="ラベルフィールド">
			<Text className="text-sm font-medium text-foreground">
				ラベル
				<Text className="text-xs text-destructive"> *必須</Text>
			</Text>
			<TextInput
				value={value}
				onChangeText={onChange}
				placeholder="例: スーパー買い物"
				accessibilityLabel="ラベル"
				className="rounded-xl border border-border bg-card px-4 py-3.5 text-base text-foreground"
				placeholderTextColor="#9ca3af"
			/>
			{error ? (
				<Text className="text-sm text-destructive">{error}</Text>
			) : null}
		</View>
	);
}
