import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { SentInvitation } from "@/hooks/use-partner-status";

type SentInvitationCardProps = {
	invitation: SentInvitation;
	isCancelling: boolean;
	onCancel: (id: string) => void;
};

function formatExpiresAt(expiresAt: number): string {
	const remaining = expiresAt - Date.now();
	if (remaining <= 0) return "期限切れ";
	const hours = Math.floor(remaining / (1000 * 60 * 60));
	const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
	if (hours > 0) return `残り ${hours}時間${minutes}分`;
	return `残り ${minutes}分`;
}

export function SentInvitationCard({
	invitation,
	isCancelling,
	onCancel,
}: SentInvitationCardProps) {
	return (
		<View className="rounded-xl bg-card p-4 gap-3">
			<Text className="text-sm text-muted-foreground">招待送信済み</Text>
			<View className="gap-1">
				<Text className="text-base text-foreground">
					{invitation.inviteeEmail}
				</Text>
				<Text className="text-xs text-muted-foreground">
					{formatExpiresAt(invitation.expiresAt)}
				</Text>
			</View>
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
		</View>
	);
}
