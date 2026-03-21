import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReceivedInvitation } from "@/hooks/use-partner-status";

type ReceivedInvitationCardProps = {
	invitation: ReceivedInvitation;
	isAccepting: boolean;
	onAccept: (id: string) => void;
};

function formatExpiresAt(expiresAt: number): string {
	const remaining = expiresAt - Date.now();
	if (remaining <= 0) return "期限切れ";
	const hours = Math.floor(remaining / (1000 * 60 * 60));
	const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
	if (hours > 0) return `残り ${hours}時間${minutes}分`;
	return `残り ${minutes}分`;
}

export function ReceivedInvitationCard({
	invitation,
	isAccepting,
	onAccept,
}: ReceivedInvitationCardProps) {
	return (
		<View className="rounded-xl bg-card p-4 gap-3">
			<Text className="text-sm text-muted-foreground">
				パートナー招待が届いています
			</Text>
			<View className="gap-1">
				<Text className="text-base font-medium text-foreground">
					{invitation.inviterName ?? invitation.inviterEmail}
				</Text>
				<Text className="text-sm text-muted-foreground">
					{invitation.inviterEmail}
				</Text>
				<Text className="text-xs text-muted-foreground">
					{formatExpiresAt(invitation.expiresAt)}
				</Text>
			</View>
			<Pressable
				className="bg-primary rounded-xl py-3.5 items-center active:opacity-80"
				onPress={() => onAccept(invitation.id)}
				disabled={isAccepting}
			>
				{isAccepting ? (
					<ActivityIndicator color="rgb(252,252,252)" />
				) : (
					<Text className="text-primary-foreground font-semibold text-base">
						承認する
					</Text>
				)}
			</Pressable>
		</View>
	);
}
