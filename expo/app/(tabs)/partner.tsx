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
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { PartnerBalanceSummary } from "@/components/balance/PartnerBalanceSummary";
import { InvitationForm } from "@/components/settings/InvitationForm";
import { ReceivedInvitationCard } from "@/components/settings/ReceivedInvitationCard";
import { SentInvitationCard } from "@/components/settings/SentInvitationCard";
import { TimelineEventCard } from "@/components/timeline/TimelineEventCard";
import { useAcceptInvitation } from "@/hooks/use-accept-invitation";
import { useCancelInvitation } from "@/hooks/use-cancel-invitation";
import {
	usePartnership,
	useReceivedInvitations,
	useSentInvitations,
} from "@/hooks/use-partner-status";
import {
	type PartnerTimelineItem,
	usePartnerTimeline,
} from "@/hooks/use-partner-timeline";
import { useSendInvitation } from "@/hooks/use-send-invitation";
import { authClient } from "@/lib/auth-client";
import { CATEGORY_FILTERS, SORT_OPTIONS } from "@/lib/timeline-utils";

function PartnerHomeScreen() {
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
		handleEndReached,
	} = usePartnerTimeline();

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
				<ScrollView contentContainerClassName="flex-1">
					<View style={{ paddingTop: insets.top }}>
						<PartnerBalanceSummary />
					</View>
					<View className="flex-1 items-center justify-center pb-20">
						<Text className="text-base text-muted-foreground">
							パートナーの支出履歴はまだありません
						</Text>
					</View>
				</ScrollView>
			) : (
				<FlatList<PartnerTimelineItem>
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
									updatedAt={
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
						<View style={{ paddingTop: insets.top }}>
							<PartnerBalanceSummary />
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
		</View>
	);
}

function PartnerInvitationScreen({ userEmail }: { userEmail: string }) {
	const sentInvitations = useSentInvitations();
	const receivedInvitations = useReceivedInvitations();

	const sendMutation = useSendInvitation();
	const cancelMutation = useCancelInvitation();
	const acceptMutation = useAcceptInvitation();

	const [sendError, setSendError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const isLoading = sentInvitations.isPending || receivedInvitations.isPending;

	const hasActivePendingInvitation = sentInvitations.data?.some(
		(inv) => inv.status === "pending" && inv.expiresAt > Date.now(),
	);

	function handleSend(email: string) {
		setSendError("");
		setSuccessMessage("");
		sendMutation.mutate(email, {
			onSuccess: () => {
				setSuccessMessage(
					"招待を送信しました。相手がアプリにログインすると招待が届きます",
				);
			},
			onError: (err) => {
				setSendError(err.message);
			},
		});
	}

	function handleCancel(id: string) {
		setSuccessMessage("");
		cancelMutation.mutate(id, {
			onSuccess: () => {
				setSuccessMessage("招待を取り消しました");
			},
		});
	}

	function handleAccept(id: string) {
		setSuccessMessage("");
		acceptMutation.mutate(id);
	}

	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator />
			</View>
		);
	}

	return (
		<ScrollView className="flex-1" contentContainerClassName="px-6 pb-8">
			<Text className="text-foreground text-2xl font-bold">パートナー招待</Text>

			<View className="mt-8 gap-3">
				{successMessage ? (
					<View className="rounded-xl bg-card p-4">
						<Text className="text-primary text-sm">{successMessage}</Text>
					</View>
				) : null}

				{/* 受信招待 */}
				{receivedInvitations.data?.map((invitation) => (
					<ReceivedInvitationCard
						key={invitation.id}
						invitation={invitation}
						isAccepting={acceptMutation.isPending}
						onAccept={handleAccept}
					/>
				))}

				{/* 招待フォーム（有効なpending招待がない場合に表示） */}
				{hasActivePendingInvitation ? null : (
					<InvitationForm
						userEmail={userEmail}
						isPending={sendMutation.isPending}
						error={sendError}
						onSend={handleSend}
					/>
				)}

				{/* 送信済み招待一覧 */}
				{sentInvitations.data?.map((invitation) => (
					<SentInvitationCard
						key={invitation.id}
						invitation={invitation}
						isCancelling={cancelMutation.isPending}
						onCancel={handleCancel}
					/>
				))}
			</View>
		</ScrollView>
	);
}

export default function PartnerScreen() {
	const { data: session } = authClient.useSession();
	const partnership = usePartnership();

	if (partnership.isPending) {
		return (
			<SafeAreaView className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator />
			</SafeAreaView>
		);
	}

	if (partnership.data) {
		return <PartnerHomeScreen />;
	}

	return (
		<SafeAreaView className="flex-1 bg-background">
			<PartnerInvitationScreen userEmail={session?.user?.email ?? ""} />
		</SafeAreaView>
	);
}
