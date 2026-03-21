import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useAcceptInvitation } from "@/hooks/use-accept-invitation";
import { useCancelInvitation } from "@/hooks/use-cancel-invitation";
import {
	usePartnership,
	useReceivedInvitations,
	useSentInvitations,
} from "@/hooks/use-partner-status";
import { useSendInvitation } from "@/hooks/use-send-invitation";
import { InvitationForm } from "./InvitationForm";
import { PartnerInfoCard } from "./PartnerInfoCard";
import { ReceivedInvitationCard } from "./ReceivedInvitationCard";
import { SentInvitationCard } from "./SentInvitationCard";

type PartnerSectionProps = {
	userEmail: string;
};

export function PartnerSection({ userEmail }: PartnerSectionProps) {
	const partnership = usePartnership();
	const sentInvitations = useSentInvitations();
	const receivedInvitations = useReceivedInvitations();

	const sendMutation = useSendInvitation();
	const cancelMutation = useCancelInvitation();
	const acceptMutation = useAcceptInvitation();

	const [sendError, setSendError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const isLoading =
		partnership.isPending ||
		sentInvitations.isPending ||
		receivedInvitations.isPending;

	const hasActivePendingInvitation = sentInvitations.data?.some(
		(inv) => inv.status === "pending" && inv.expiresAt > Date.now(),
	);

	if (isLoading) {
		return (
			<View className="gap-3">
				<Text className="text-foreground text-lg font-bold">
					パートナー管理
				</Text>
				<View className="rounded-xl bg-card p-4 items-center">
					<ActivityIndicator />
				</View>
			</View>
		);
	}

	if (partnership.data) {
		return (
			<View className="gap-3">
				<Text className="text-foreground text-lg font-bold">
					パートナー管理
				</Text>
				<PartnerInfoCard partnership={partnership.data} />
			</View>
		);
	}

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

	return (
		<View className="gap-3">
			<Text className="text-foreground text-lg font-bold">パートナー管理</Text>

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
	);
}
