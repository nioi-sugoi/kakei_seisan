import { Pressable, Text, View } from "react-native";

type EntryActionButtonsProps = {
	operation: string;
};

export function EntryActionButtons({ operation }: EntryActionButtonsProps) {
	if (operation !== "original") return null;

	return (
		<View className="mt-4 flex-row gap-3 pb-4">
			<Pressable className="flex-1 items-center rounded-xl border border-border py-3 active:opacity-80">
				<Text className="text-base font-medium text-foreground">修正する</Text>
			</Pressable>
			<Pressable className="flex-1 items-center rounded-xl border border-destructive py-3 active:opacity-80">
				<Text className="text-base font-medium text-destructive">
					取り消す
				</Text>
			</Pressable>
		</View>
	);
}
