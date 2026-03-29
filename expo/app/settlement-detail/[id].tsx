import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { FormHeader } from "@/components/entry-form/FormShared";
import { ImageThumbnail } from "@/components/ImageThumbnail";
import { ImageViewerModal } from "@/components/ImageViewerModal";
import { SettlementInfoCard } from "@/components/settlement-detail/SettlementInfoCard";
import { useCancelSettlement } from "@/hooks/use-cancel-settlement";
import { getImageSource } from "@/hooks/use-image-upload";
import { useRestoreSettlement } from "@/hooks/use-restore-settlement";
import { useSettlementDetail } from "@/hooks/use-settlement-detail";
import { formatAmount } from "@/lib/format";

export default function SettlementDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { data: settlement, isPending, error } = useSettlementDetail(id);
	const cancelMutation = useCancelSettlement(id);
	const restoreMutation = useRestoreSettlement(id);
	const [viewerIndex, setViewerIndex] = useState(-1);

	if (isPending) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (error || !settlement) {
		return (
			<View className="flex-1 bg-background">
				<FormHeader title="精算詳細" goBack={() => router.back()} />
				<View className="flex-1 items-center justify-center px-4">
					<Text className="text-lg text-destructive">
						{error?.message ?? "精算が見つかりません"}
					</Text>
				</View>
			</View>
		);
	}

	const latestVersion = settlement.versions.find((v) => v.latest) ?? settlement;
	const canModify = !latestVersion.cancelled;

	const handleModify = () => {
		router.push(`/modify-settlement/${settlement.originalId}`);
	};

	const handleCancel = () => {
		Alert.alert("精算の取り消し", "この精算を取り消しますか？", [
			{ text: "キャンセル", style: "cancel" },
			{
				text: "取り消す",
				style: "destructive",
				onPress: () => cancelMutation.mutate(),
			},
		]);
	};

	const handleRestore = () => {
		Alert.alert("精算の復元", "取り消した精算を復元しますか？", [
			{ text: "キャンセル", style: "cancel" },
			{
				text: "復元する",
				onPress: () => restoreMutation.mutate(),
			},
		]);
	};

	const pastVersions = settlement.versions.slice(1);

	return (
		<View className="flex-1 bg-background">
			<FormHeader title="精算詳細" goBack={() => router.back()} />
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-4 py-5 gap-4"
			>
				<SettlementInfoCard
					isOriginal={latestVersion.id === settlement.originalId}
					cancelled={latestVersion.cancelled}
					amount={latestVersion.amount ?? settlement.amount}
					occurredOn={settlement.occurredOn}
				/>

				{/* 画像 */}
				{settlement.images.length > 0 ? (
					<View className="rounded-xl bg-card px-4 py-4">
						<Text className="mb-3 text-sm font-bold text-foreground">画像</Text>
						<View className="flex-row flex-wrap gap-3">
							{settlement.images.map((img, index) => (
								<ImageThumbnail
									key={img.id}
									source={getImageSource(
										"settlements",
										settlement.originalId,
										img.id,
									)}
									onPress={() => setViewerIndex(index)}
									accessibilityLabel={`画像 ${index + 1}`}
								/>
							))}
						</View>
					</View>
				) : null}

				<ImageViewerModal
					visible={viewerIndex >= 0}
					images={settlement.images.map((img) =>
						getImageSource("settlements", settlement.originalId, img.id),
					)}
					initialIndex={viewerIndex >= 0 ? viewerIndex : 0}
					onClose={() => setViewerIndex(-1)}
				/>

				{/* 操作履歴 */}
				{pastVersions.length > 0 ? (
					<View className="rounded-xl bg-card px-4 py-4">
						<Text className="mb-3 text-base font-bold text-foreground">
							操作履歴
						</Text>
						{pastVersions.map((v, i) => (
							<View
								key={v.id}
								className={`flex-row items-center justify-between py-2 ${i < pastVersions.length - 1 ? "border-b border-border" : ""}`}
							>
								<View className="flex-1 gap-0.5">
									<View className="flex-row items-center gap-2">
										<Text className="text-base text-foreground">
											{v.amount != null ? formatAmount(v.amount) : ""}
										</Text>
										{v.cancelled && (
											<Text className="text-sm font-semibold text-destructive">
												取消
											</Text>
										)}
										{!v.cancelled && pastVersions[i + 1]?.cancelled && (
											<Text className="text-sm font-semibold text-green-600">
												復元
											</Text>
										)}
									</View>
								</View>
							</View>
						))}
					</View>
				) : null}

				{/* エラー表示 */}
				{cancelMutation.error || restoreMutation.error ? (
					<View
						style={{
							backgroundColor: "rgba(239, 68, 68, 0.1)",
						}}
						className="rounded-xl px-4 py-3"
					>
						<Text className="text-base text-destructive">
							{cancelMutation.error?.message ?? restoreMutation.error?.message}
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
							<Text className="text-lg font-medium text-foreground">
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
								<Text className="text-lg font-medium text-destructive">
									取り消す
								</Text>
							)}
						</Pressable>
					</View>
				) : (
					<View className="mt-4">
						<Pressable
							onPress={handleRestore}
							disabled={restoreMutation.isPending}
							className="items-center rounded-xl border border-primary bg-card py-3 active:opacity-80"
						>
							{restoreMutation.isPending ? (
								<ActivityIndicator />
							) : (
								<Text className="text-lg font-medium text-primary">
									復元する
								</Text>
							)}
						</Pressable>
					</View>
				)}
			</ScrollView>
		</View>
	);
}
