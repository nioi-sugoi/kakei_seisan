import { ActivityIndicator, Pressable, Text, View } from "react-native";

export function FormHeader({
	title,
	goBack,
}: {
	title: string;
	goBack: () => void;
}) {
	return (
		<View className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-3 pt-14">
			<Pressable onPress={goBack} className="active:opacity-60">
				<Text className="text-lg text-primary">戻る</Text>
			</Pressable>
			<Text className="flex-1 text-2xl font-bold text-foreground">{title}</Text>
		</View>
	);
}

export function FormError({ message }: { message: string }) {
	return (
		<View
			style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
			className="rounded-xl px-4 py-3"
		>
			<Text className="text-base text-destructive">{message}</Text>
		</View>
	);
}

export function SubmitButton({
	label,
	loading,
	disabled,
	onPress,
}: {
	label: string;
	loading: boolean;
	disabled?: boolean;
	onPress: () => void;
}) {
	const isDisabled = loading || disabled;
	return (
		<Pressable
			onPress={onPress}
			disabled={isDisabled}
			className={`mt-2 items-center rounded-xl py-3.5 bg-primary ${
				isDisabled ? "opacity-60" : "active:opacity-80"
			}`}
		>
			{loading ? (
				<ActivityIndicator color="white" />
			) : (
				<Text className="text-lg font-semibold text-primary-foreground">
					{label}
				</Text>
			)}
		</Pressable>
	);
}
