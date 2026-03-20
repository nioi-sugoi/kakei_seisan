import { useRouter } from "expo-router";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	Text,
	View,
} from "react-native";

import { EntryCard } from "@/components/timeline/EntryCard";
import { type Entry, useEntries } from "@/hooks/use-entries";

type TimelineItem =
	| { type: "header"; title: string }
	| { type: "entry"; entry: Entry };

function toMonthLabel(date: string) {
	const d = new Date(date);
	return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function buildTimelineItems(entries: Entry[]): TimelineItem[] {
	const items: TimelineItem[] = [];
	let currentMonth = "";

	for (const entry of entries) {
		const month = toMonthLabel(entry.date);
		if (month !== currentMonth) {
			currentMonth = month;
			items.push({ type: "header", title: month });
		}
		items.push({ type: "entry", entry });
	}

	return items;
}

export default function TimelineScreen() {
	const router = useRouter();
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useEntries();

	const allEntries = data?.pages.flatMap((page) => page.data) ?? [];
	const flatItems = buildTimelineItems(allEntries);

	const handleEntryPress = (entry: Entry) => {
		router.push(`/entry-detail/${entry.id}`);
	};

	const handleEndReached = () => {
		if (hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	};

	return (
		<View className="flex-1 bg-background">
			{isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" />
				</View>
			) : allEntries.length === 0 ? (
				<View className="flex-1 items-center justify-center">
					<Text className="text-2xl font-bold text-foreground">
						タイムライン
					</Text>
					<Text className="mt-2 text-base text-muted-foreground">
						支出の履歴がここに表示されます
					</Text>
				</View>
			) : (
				<FlatList
					data={flatItems}
					keyExtractor={(item) =>
						item.type === "header"
							? `header-${item.title}`
							: `entry-${item.entry.id}`
					}
					renderItem={({ item }) => {
						if (item.type === "header") {
							return (
								<Text className="px-4 pb-2 pt-4 text-sm font-semibold text-muted-foreground">
									{item.title}
								</Text>
							);
						}
						return (
							<View className="px-4 pb-2">
								<EntryCard entry={item.entry} onPress={handleEntryPress} />
							</View>
						);
					}}
					onEndReached={handleEndReached}
					onEndReachedThreshold={0.5}
					ListFooterComponent={
						isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null
					}
					contentContainerClassName="pb-24"
				/>
			)}

			{/* FAB */}
			<Pressable
				onPress={() => router.push("/entry-form")}
				className="absolute bottom-6 right-5 h-20 w-20 items-center justify-center rounded-full bg-primary active:opacity-80"
				accessibilityRole="button"
				accessibilityLabel="記録を追加"
			>
				<Text className="text-4xl font-bold text-primary-foreground">＋</Text>
			</Pressable>
		</View>
	);
}
