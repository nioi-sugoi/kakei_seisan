import { Text, View } from "react-native";

type RejectionCommentProps = {
	status: string;
	comment: string | null;
};

export function RejectionComment({ status, comment }: RejectionCommentProps) {
	if (status !== "rejected" || !comment) return null;

	return (
		<View className="rounded-xl border-l-4 border-l-red-400 bg-card px-4 py-4">
			<Text className="text-xs font-medium text-red-500">
				差し戻しコメント
			</Text>
			<Text className="mt-1 text-sm leading-relaxed text-foreground">
				{comment}
			</Text>
		</View>
	);
}
