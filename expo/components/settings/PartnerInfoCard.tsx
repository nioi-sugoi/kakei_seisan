import { Text, View } from "react-native";
import type { Partnership } from "@/hooks/use-partner-status";

type PartnerInfoCardProps = {
	partnership: Partnership;
};

export function PartnerInfoCard({ partnership }: PartnerInfoCardProps) {
	return (
		<View className="rounded-xl bg-card p-4 gap-2">
			<Text className="text-sm text-muted-foreground">パートナー連携中</Text>
			<Text className="text-base font-medium text-foreground">
				{partnership.partnerName}
			</Text>
			<Text className="text-sm text-muted-foreground">
				{partnership.partnerEmail}
			</Text>
		</View>
	);
}
