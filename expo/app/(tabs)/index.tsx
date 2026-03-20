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

function groupEntriesByMonth(entries: Entry[]) {
	const groups: { title: string; data: Entry[] }[] = [];
	let currentKey = "";

	for (const entry of entries) {
		const d = new Date(entry.date);
		const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
		if (key !== currentKey) {
			currentKey = key;
			groups.push({ title: key, data: [] });
		}
		groups[groups.length - 1].data.push(entry);
	}

	return groups;
}

export default function TimelineScreen() {
	const router = useRouter();
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useEntries();

	const allEntries = data?.pages.flatMap((page) => page.data) ?? [];
	const groups = groupEntriesByMonth(allEntries);

	const flatItems: (
		| { type: "header"; title: string }
		| { type: "entry"; entry: Entry }
	)[] = [];
	for (const group of groups) {
		flatItems.push({ type: "header", title: group.title });
		for (const entry of group.data) {
			flatItems.push({ type: "entry", entry });
		}
	}

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
			>
				<Text className="text-4xl font-bold text-primary-foreground">＋</Text>
			</Pressable>
		</View>
	);
}
