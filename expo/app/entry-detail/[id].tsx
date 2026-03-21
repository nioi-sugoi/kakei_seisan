import { useLocalSearchParams, useRouter } from "expo-router";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { EntryInfoCard } from "@/components/entry-detail/EntryInfoCard";
import { useCancelEntry } from "@/hooks/use-cancel-entry";
import { useEntryDetail } from "@/hooks/use-entry-detail";

function Header({ onBack }: { onBack: () => void }) {
	return (
		<View className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-3 pt-14">
			<Pressable onPress={onBack} className="active:opacity-60">
				<Text className="text-base text-primary">戻る</Text>
			</Pressable>
			<Text className="flex-1 text-lg font-bold text-foreground">記録詳細</Text>
		</View>
	);
}

export default function EntryDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { data: entry, isPending, error } = useEntryDetail(id ?? "");
	const cancelMutation = useCancelEntry(id ?? "");

	if (isPending) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (error || !entry) {
		return (
			<View className="flex-1 bg-background">
				<Header onBack={() => router.back()} />
				<View className="flex-1 items-center justify-center px-4">
					<Text className="text-base text-destructive">
						{error?.message ?? "記録が見つかりません"}
					</Text>
				</View>
			</View>
		);
	}

	// グループの最新バージョンが取消済みかチェック
	const latestVersion = entry.versions.find((v) => v.latest);
	const groupCancelled = latestVersion?.cancelled ?? false;
	const canModify = !groupCancelled;

	const handleModify = () => {
		router.push(`/entry-form?modifyId=${entry.originalId}`);
	};

	const handleCancel = () => {
		Alert.alert(
			"記録の取り消し",
			"この記録を取り消しますか？取り消しレコードが作成されます。",
			[
				{ text: "キャンセル", style: "cancel" },
				{
					text: "取り消す",
					style: "destructive",
					onPress: () => cancelMutation.mutate(),
				},
			],
		);
	};

	return (
		<View className="flex-1 bg-background">
			<Header onBack={() => router.back()} />
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-4 py-5 gap-4"
			>
				<EntryInfoCard
					category={entry.category}
					version={entry.version}
					cancelled={entry.cancelled}
					amount={entry.amount}
					date={entry.date}
					label={entry.label}
					memo={entry.memo}
					isCancelled={groupCancelled}
				/>

				{/* 元の記録へのリンク（v2+ の場合） */}
				{entry.original ? (
					<Pressable
						onPress={() => router.push(`/entry-detail/${entry.original?.id}`)}
						className="flex-row items-center justify-center gap-1 py-2 active:opacity-60"
					>
						<Text className="text-sm text-primary">元の記録を見る →</Text>
					</Pressable>
				) : null}

				{/* 取消エラー */}
				{cancelMutation.error ? (
					<View
						style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
						className="rounded-xl px-4 py-3"
					>
						<Text className="text-sm text-destructive">
							{cancelMutation.error.message}
						</Text>
					</View>
				) : null}

				{/* アクションボタン */}
				{canModify ? (
					<View className="mt-4 flex-row gap-3">
						<Pressable
							onPress={handleModify}
							className="flex-1 items-center rounded-xl border border-border bg-card py-3 active:opacity-80"
						>
							<Text className="text-base font-medium text-foreground">
								修正する
							</Text>
						</Pressable>
						<Pressable
							onPress={handleCancel}
							disabled={cancelMutation.isPending}
							className="flex-1 items-center rounded-xl border border-destructive bg-card py-3 active:opacity-80"
						>
							{cancelMutation.isPending ? (
								<ActivityIndicator />
							) : (
								<Text className="text-base font-medium text-destructive">
									取り消す
								</Text>
							)}
						</Pressable>
					</View>
				) : null}
			</ScrollView>
		</View>
	);
}
