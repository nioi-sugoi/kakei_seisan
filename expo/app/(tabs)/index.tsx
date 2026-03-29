import {
	ActivityIndicator,
	FlatList,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";

import { BalanceSummary } from "@/components/balance/BalanceSummary";
import { TimelineEventCard } from "@/components/timeline/TimelineEventCard";
import {
	type CategoryFilter,
	type TimelineItem,
	useTimeline,
} from "@/hooks/use-timeline";

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
	{ value: "all", label: "すべて" },
	{ value: "advance", label: "立替" },
	{ value: "deposit", label: "預り" },
	{ value: "settlement", label: "精算" },
];

export default function TimelineScreen() {
	const {
		items,
		isLoading,
		isEmpty,
		isFetchingNextPage,
		categoryFilter,
		setCategoryFilter,
		handleEventPress,
		handleEndReached,
		handleAddPress,
	} = useTimeline();

	const filterPills = (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className="px-4 pb-2 pt-3"
		>
			{CATEGORY_FILTERS.map((f) => (
				<Pressable
					key={f.value}
					onPress={() => setCategoryFilter(f.value)}
					className={`mr-2 rounded-full px-4 py-1.5 ${
						categoryFilter === f.value ? "bg-primary" : "bg-card"
					}`}
					accessibilityRole="button"
					accessibilityLabel={`${f.label}で絞り込み`}
					accessibilityState={{ selected: categoryFilter === f.value }}
				>
					<Text
						className={`text-sm font-medium ${
							categoryFilter === f.value
								? "text-primary-foreground"
								: "text-muted-foreground"
						}`}
					>
						{f.label}
					</Text>
				</Pressable>
			))}
		</ScrollView>
	);

	return (
		<View className="flex-1 bg-background">
			{isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" />
				</View>
			) : isEmpty && categoryFilter === "all" ? (
				<View className="flex-1 items-center justify-center">
					<Text className="text-2xl font-bold text-foreground">
						タイムライン
					</Text>
					<Text className="mt-2 text-base text-muted-foreground">
						支出の履歴がここに表示されます
					</Text>
				</View>
			) : (
				<FlatList<TimelineItem>
					data={items}
					keyExtractor={(item) =>
						item.type === "header"
							? item.key
							: `${item.event.type}-${item.event.id}`
					}
					renderItem={({ item }) => {
						if (item.type === "header") {
							return (
								<Text className="px-4 pb-2 pt-4 text-lg font-semibold text-muted-foreground">
									{item.title}
								</Text>
							);
						}
						return (
							<View className="px-4 pb-2">
								<TimelineEventCard
									event={item.event}
									onPress={handleEventPress}
								/>
							</View>
						);
					}}
					onEndReached={handleEndReached}
					onEndReachedThreshold={0.5}
					ListHeaderComponent={
						<View className="pt-14">
							<BalanceSummary />
							{filterPills}
						</View>
					}
					ListEmptyComponent={
						<View className="items-center py-12">
							<Text className="text-base text-muted-foreground">
								該当するイベントはありません
							</Text>
						</View>
					}
					ListFooterComponent={
						isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null
					}
					contentContainerClassName="pb-24"
				/>
			)}

			{/* FAB */}
			<Pressable
				onPress={handleAddPress}
				className="absolute bottom-6 right-5 h-20 w-20 items-center justify-center rounded-full bg-primary active:opacity-80"
				accessibilityRole="button"
				accessibilityLabel="記録を追加"
			>
				<Text className="text-4xl font-bold text-primary-foreground">＋</Text>
			</Pressable>
		</View>
	);
}
