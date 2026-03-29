import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BalanceSummary } from "@/components/balance/BalanceSummary";
import { TimelineList } from "@/components/timeline/TimelineList";
import { useTimeline } from "@/hooks/use-timeline";

export default function TimelineScreen() {
	const insets = useSafeAreaInsets();
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

	return (
		<View className="flex-1 bg-background">
			<TimelineList
				items={items}
				isLoading={isLoading}
				isEmpty={isEmpty}
				isFetchingNextPage={isFetchingNextPage}
				categoryFilter={categoryFilter}
				setCategoryFilter={setCategoryFilter}
				sort={sort}
				setSort={setSort}
				onEventPress={handleEventPress}
				onEndReached={handleEndReached}
				headerTop={
					<View style={{ paddingTop: insets.top }}>
						<BalanceSummary />
					</View>
				}
				emptyAllMessage={
					<View className="flex-1 items-center justify-center">
						<Text className="text-2xl font-bold text-foreground">
							タイムライン
						</Text>
						<Text className="mt-2 text-base text-muted-foreground">
							支出の履歴がここに表示されます
						</Text>
					</View>
				}
			/>

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
