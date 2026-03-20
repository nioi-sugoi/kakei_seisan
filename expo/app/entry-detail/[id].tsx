import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { EntryInfoCard } from "@/components/entry-detail/EntryInfoCard";
import { useEntryDetail } from "@/hooks/use-entry-detail";

function Header({ onBack }: { onBack: () => void }) {
	return (
		<View className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-3 pt-14">
			<Pressable onPress={onBack} className="active:opacity-60">
				<Text className="text-base text-primary">戻る</Text>
			</Pressable>
			<Text className="flex-1 text-lg font-bold text-foreground">記録詳細</Text>
		</View>
	);
}

export default function EntryDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { data: entry, isPending, error } = useEntryDetail(id ?? "");

	if (isPending) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (error || !entry) {
		return (
			<View className="flex-1 bg-background">
				<Header onBack={() => router.back()} />
				<View className="flex-1 items-center justify-center px-4">
					<Text className="text-base text-destructive">
						{error?.message ?? "記録が見つかりません"}
					</Text>
				</View>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<Header onBack={() => router.back()} />
			<ScrollView className="flex-1" contentContainerClassName="px-4 py-5 gap-4">
				<EntryInfoCard
					category={
						entry.category === "deposit" ? "deposit" : "advance"
					}
					amount={entry.amount}
					date={entry.date}
					label={entry.label}
					memo={entry.memo}
				/>
			</ScrollView>
		</View>
	);
}
