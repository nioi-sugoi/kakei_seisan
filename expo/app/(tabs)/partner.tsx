import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import {
	SafeAreaView,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BalanceSummary } from "@/components/balance/BalanceSummary";
import { InvitationForm } from "@/components/settings/InvitationForm";
import { ReceivedInvitationCard } from "@/components/settings/ReceivedInvitationCard";
import { SentInvitationCard } from "@/components/settings/SentInvitationCard";
import { TimelineList } from "@/components/timeline/TimelineList";
import { useAcceptInvitation } from "@/hooks/use-accept-invitation";
import { useCancelInvitation } from "@/hooks/use-cancel-invitation";
import {
	type Partnership,
	usePartnership,
	useReceivedInvitations,
	useSentInvitations,
} from "@/hooks/use-partner-status";
import { useSendInvitation } from "@/hooks/use-send-invitation";
import { useTimeline } from "@/hooks/use-timeline";
import { authClient } from "@/lib/auth-client";

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

function PartnerTimelineScreen({ partnership }: { partnership: Partnership }) {
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
	} = useTimeline({ userId: partnership.partnerId });

	const balanceTitle = `${partnership.partnerName}さんの精算残高`;

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
						<BalanceSummary
							userId={partnership.partnerId}
							title={balanceTitle}
							readOnly
						/>
					</View>
				}
				emptyAllMessage={
					<View className="flex-1">
						<View style={{ paddingTop: insets.top }}>
							<BalanceSummary
								userId={partnership.partnerId}
								title={balanceTitle}
								readOnly
							/>
						</View>
						<View className="flex-1 items-center justify-center">
							<Text className="text-base text-muted-foreground">
								{partnership.partnerName}さんの記録はまだありません
							</Text>
						</View>
					</View>
				}
			/>
		</View>
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
		return <PartnerTimelineScreen partnership={partnership.data} />;
	}

	return (
		<SafeAreaView className="flex-1 bg-background">
			<PartnerInvitationScreen userEmail={session?.user?.email ?? ""} />
		</SafeAreaView>
	);
}
