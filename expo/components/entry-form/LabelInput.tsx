import { Text, TextInput, View } from "react-native";

type LabelInputProps = {
	value: string;
	onChange: (value: string) => void;
	error?: string;
};

export function LabelInput({ value, onChange, error }: LabelInputProps) {
	return (
		<View className="gap-2" testID="ラベルフィールド">
			<Text className="text-base font-medium text-foreground">
				ラベル
				<Text className="text-sm text-destructive"> *必須</Text>
			</Text>
			<TextInput
				value={value}
				onChangeText={onChange}
				placeholder="例: スーパー買い物"
				accessibilityLabel="ラベル"
				className="rounded-xl border border-border bg-card px-4 py-3.5 text-lg text-foreground"
				placeholderTextColor="#9ca3af"
			/>
			{error ? (
				<Text className="text-base text-destructive">{error}</Text>
			) : null}
		</View>
	);
}
