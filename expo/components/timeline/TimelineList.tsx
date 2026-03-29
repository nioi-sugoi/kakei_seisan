import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type ReactNode, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { TimelineEventCard } from "@/components/timeline/TimelineEventCard";
import {
	CATEGORY_FILTERS,
	type CategoryFilter,
	SORT_OPTIONS,
	type SortOption,
	type TimelineItem,
} from "@/hooks/use-timeline";

type TimelineEvent = Extract<TimelineItem, { type: "record" }>["event"];

interface TimelineListProps {
	items: TimelineItem[];
	isLoading: boolean;
	isEmpty: boolean;
	isFetchingNextPage: boolean;
	categoryFilter: CategoryFilter;
	setCategoryFilter: (filter: CategoryFilter) => void;
	sort: SortOption;
	setSort: (sort: SortOption) => void;
	onEventPress: (event: TimelineEvent) => void;
	onEndReached: () => void;
	headerTop: ReactNode;
	emptyAllMessage: ReactNode;
}

export function TimelineList({
	items,
	isLoading,
	isEmpty,
	isFetchingNextPage,
	categoryFilter,
	setCategoryFilter,
	sort,
	setSort,
	onEventPress,
	onEndReached,
	headerTop,
	emptyAllMessage,
}: TimelineListProps) {
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

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center">
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (isEmpty && categoryFilter === "all") {
		return <>{emptyAllMessage}</>;
	}

	return (
		<>
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
							<Text className="px-4 pb-2 pt-4 text-base font-semibold text-muted-foreground">
								{item.title}
							</Text>
						);
					}
					return (
						<View className="px-4 pb-2">
							<TimelineEventCard
								event={item.event}
								onPress={onEventPress}
								updatedAt={
									sort.sortBy === "createdAt" ? item.event.createdAt : undefined
								}
							/>
						</View>
					);
				}}
				onEndReached={onEndReached}
				onEndReachedThreshold={0.5}
				ListHeaderComponent={
					<>
						{headerTop}
						{filterPills}
						{sortButton}
					</>
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
		</>
	);
}
