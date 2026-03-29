import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
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
	type SortOption,
	type TimelineItem,
	useTimeline,
} from "@/hooks/use-timeline";

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
	{ value: "all", label: "すべて" },
	{ value: "advance", label: "立替" },
	{ value: "deposit", label: "預り" },
	{ value: "settlement", label: "精算" },
];

const SORT_OPTIONS: {
	sortBy: SortOption["sortBy"];
	sortOrder: SortOption["sortOrder"];
	label: string;
}[] = [
	{ sortBy: "occurredOn", sortOrder: "desc", label: "日付順（新しい順）" },
	{ sortBy: "occurredOn", sortOrder: "asc", label: "日付順（古い順）" },
	{ sortBy: "createdAt", sortOrder: "desc", label: "更新順（新しい順）" },
	{ sortBy: "createdAt", sortOrder: "asc", label: "更新順（古い順）" },
];

export default function TimelineScreen() {
	const {
		items,
		isLoading,
		isEmpty,
		isFetchingNextPage,
		categoryFilter,
		setCategoryFilter,
		sort,
		setSort,
		handleEventPress,
		handleEndReached,
		handleAddPress,
	} = useTimeline();

	const [sortMenuOpen, setSortMenuOpen] = useState(false);

	const currentSortLabel =
		SORT_OPTIONS.find(
			(o) => o.sortBy === sort.sortBy && o.sortOrder === sort.sortOrder,
		)?.label ?? SORT_OPTIONS[0].label;

	const filterPills = (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className="px-4 pt-3"
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

	const sortButton = (
		<Pressable
			onPress={() => setSortMenuOpen((prev) => !prev)}
			className="flex-row items-center gap-1 px-4 pb-1 pt-2"
			accessibilityRole="button"
			accessibilityLabel={`並び替え: ${currentSortLabel}`}
		>
			<MaterialIcons name="swap-vert" size={16} color="rgb(93, 100, 111)" />
			<Text className="text-sm font-medium text-primary">
				{currentSortLabel}
			</Text>
			<MaterialIcons name="expand-more" size={14} color="rgb(0, 126, 183)" />
		</Pressable>
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
							? `header-${item.title}`
							: `${item.event.type}-${item.event.id}`
					}
					renderItem={({ item }) => {
						if (item.type === "header") {
							return (
								<Text className="px-4 pb-2 pt-4 text-base font-semibold text-muted-foreground">
									{item.title}
								</Text>
							);
						}
						return (
							<View className="px-4 pb-2">
								<TimelineEventCard
									event={item.event}
									onPress={handleEventPress}
									displayDate={
										sort.sortBy === "createdAt"
											? item.event.createdAt
											: undefined
									}
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
							{sortButton}
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

			{/* FlatList内だとRNTLのアクセシビリティクエリで検出できないため外に配置 */}
			{sortMenuOpen && (
				<View className="absolute left-4 top-52 z-10 rounded-lg border border-border bg-card">
					{SORT_OPTIONS.map((option) => {
						const isSelected =
							sort.sortBy === option.sortBy &&
							sort.sortOrder === option.sortOrder;
						return (
							<Pressable
								key={option.label}
								onPress={() => {
									setSort({
										sortBy: option.sortBy,
										sortOrder: option.sortOrder,
									});
									setSortMenuOpen(false);
								}}
								className={`px-4 py-2 ${isSelected ? "bg-muted" : ""}`}
								accessibilityRole="button"
								accessibilityLabel={`${option.label}で並び替え`}
								accessibilityState={{ selected: isSelected }}
							>
								<Text
									className={`text-sm ${isSelected ? "font-semibold text-primary" : "text-foreground"}`}
								>
									{option.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
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
