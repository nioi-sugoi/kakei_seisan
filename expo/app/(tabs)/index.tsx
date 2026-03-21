import {
	ActivityIndicator,
	FlatList,
	Pressable,
	Text,
	View,
} from "react-native";

import { BalanceSummary } from "@/components/balance/BalanceSummary";
import { EntryCard } from "@/components/timeline/EntryCard";
import { SettlementCard } from "@/components/timeline/SettlementCard";
import { type TimelineItem, useTimeline } from "@/hooks/use-timeline";

export default function TimelineScreen() {
	const {
		items,
		isLoading,
		isEmpty,
		isFetchingNextPage,
		handleEntryPress,
		handleSettlementPress,
		handleEndReached,
		handleAddPress,
	} = useTimeline();

	return (
		<View className="flex-1 bg-background">
			{isLoading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" />
				</View>
			) : isEmpty ? (
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
					keyExtractor={(item) => {
						if (item.type === "header") return `header-${item.title}`;
						if (item.type === "entry") return `entry-${item.entry.id}`;
						return `settlement-${item.settlement.id}`;
					}}
					renderItem={({ item }) => {
						if (item.type === "header") {
							return (
								<Text className="px-4 pb-2 pt-4 text-sm font-semibold text-muted-foreground">
									{item.title}
								</Text>
							);
						}
						if (item.type === "settlement") {
							return (
								<View className="px-4 pb-2">
									<SettlementCard
										settlement={item.settlement}
										onPress={handleSettlementPress}
									/>
								</View>
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
					ListHeaderComponent={
						<>
							<View className="border-b border-border bg-card px-4 py-3 pt-14">
								<Text className="text-lg font-bold text-foreground">
									タイムライン
								</Text>
							</View>
							<BalanceSummary />
						</>
					}
					ListFooterComponent={
						isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null
					}
					contentContainerClassName="pb-24"
					stickyHeaderIndices={[0]}
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
