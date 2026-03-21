import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { SentInvitation } from "@/hooks/use-partner-status";
import { formatRemainingTime } from "@/lib/format";

type SentInvitationCardProps = {
	invitation: SentInvitation;
	isCancelling: boolean;
	onCancel: (id: string) => void;
};

function getStatusInfo(invitation: SentInvitation): {
	label: string;
	color: string;
} {
	if (invitation.status === "accepted") {
		return { label: "承認済み", color: "text-primary" };
	}
	if (invitation.status === "cancelled") {
		return { label: "取り消し済み", color: "text-muted-foreground" };
	}
	// pending
	if (invitation.expiresAt <= Date.now()) {
		return { label: "期限切れ", color: "text-destructive" };
	}
	return { label: "招待中", color: "text-primary" };
}

function isActivePending(invitation: SentInvitation): boolean {
	return invitation.status === "pending" && invitation.expiresAt > Date.now();
}

export function SentInvitationCard({
	invitation,
	isCancelling,
	onCancel,
}: SentInvitationCardProps) {
	const statusInfo = getStatusInfo(invitation);
	const active = isActivePending(invitation);

	return (
		<View className="rounded-xl bg-card p-4 gap-3">
			<View className="flex-row items-center justify-between">
				<Text className="text-sm text-muted-foreground">招待送信済み</Text>
				<Text className={`text-xs font-semibold ${statusInfo.color}`}>
					{statusInfo.label}
				</Text>
			</View>
			<View className="gap-1">
				<Text className="text-base text-foreground">
					{invitation.inviteeEmail}
				</Text>
				{active ? (
					<Text className="text-xs text-muted-foreground">
						{formatRemainingTime(invitation.expiresAt)}
					</Text>
				) : null}
			</View>
			{active ? (
				<>
					<Text className="text-xs text-muted-foreground">
						相手がアプリにログインすると招待が届きます
					</Text>
					<Pressable
						className="border border-destructive rounded-xl py-3 items-center active:opacity-80"
						onPress={() => onCancel(invitation.id)}
						disabled={isCancelling}
					>
						{isCancelling ? (
							<ActivityIndicator color="rgb(239,68,68)" />
						) : (
							<Text className="text-destructive font-semibold text-sm">
								招待を取り消す
							</Text>
						)}
					</Pressable>
				</>
			) : null}
		</View>
	);
}
