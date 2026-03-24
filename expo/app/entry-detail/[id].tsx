import { Image as ExpoImage } from "expo-image";
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
import { EntryInfoCard } from "@/components/entry-detail/EntryInfoCard";
import {
	ImagePicker,
	type SelectedImage,
} from "@/components/entry-form/ImagePicker";
import { useCancelEntry } from "@/hooks/use-cancel-entry";
import { useEntryDetail } from "@/hooks/use-entry-detail";
import {
	getImageSource,
	useDeleteImage,
	useUploadImages,
} from "@/hooks/use-image-upload";
import { useRestoreEntry } from "@/hooks/use-restore-entry";
import { formatAmount, formatDateFull } from "@/lib/format";

function Header({ onBack }: { onBack: () => void }) {
	return (
		<View className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-3 pt-14">
			<Pressable onPress={onBack} className="active:opacity-60">
				<Text className="text-lg text-primary">戻る</Text>
			</Pressable>
			<Text className="flex-1 text-2xl font-bold text-foreground">
				記録詳細
			</Text>
		</View>
	);
}

export default function EntryDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { data: entry, isPending, error } = useEntryDetail(id);
	const cancelMutation = useCancelEntry(id);
	const restoreMutation = useRestoreEntry(id);
	const uploadImages = useUploadImages("entries");
	const deleteImage = useDeleteImage("entries", id);
	const [newImages, setNewImages] = useState<SelectedImage[]>([]);

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
					<Text className="text-lg text-destructive">
						{error?.message ?? "記録が見つかりません"}
					</Text>
				</View>
			</View>
		);
	}

	// 最新バージョンを特定（メイン表示用）
	const latestVersion = entry.versions.find((v) => v.latest) ?? entry;
	const canModify = !latestVersion.cancelled;

	const handleModify = () => {
		router.push(`/modify-entry/${entry.originalId}`);
	};

	const handleCancel = () => {
		Alert.alert("記録の取り消し", "この記録を取り消しますか？", [
			{ text: "キャンセル", style: "cancel" },
			{
				text: "取り消す",
				style: "destructive",
				onPress: () => cancelMutation.mutate(),
			},
		]);
	};

	const handleRestore = () => {
		Alert.alert("記録の復元", "取り消した記録を復元しますか？", [
			{ text: "キャンセル", style: "cancel" },
			{
				text: "復元する",
				onPress: () => restoreMutation.mutate(),
			},
		]);
	};

	// 操作履歴: 最新バージョンは上部に表示済みなので、2番目以降のみ表示
	const pastVersions = entry.versions.slice(1);

	return (
		<View className="flex-1 bg-background">
			<Header onBack={() => router.back()} />
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-4 py-5 gap-4"
			>
				<EntryInfoCard
					category={entry.category}
					isOriginal={latestVersion.id === entry.originalId}
					cancelled={latestVersion.cancelled}
					amount={latestVersion.amount ?? entry.amount}
					occurredOn={entry.occurredOn}
					label={latestVersion.label ?? entry.label}
					memo={latestVersion.memo ?? entry.memo}
					isCancelled={latestVersion.cancelled}
				/>

				{/* レシート画像 */}
				{entry.images.length > 0 || canModify ? (
					<View className="rounded-xl bg-card px-4 py-4">
						<Text className="mb-3 text-sm font-bold text-foreground">
							レシート画像
						</Text>
						{entry.images.length > 0 ? (
							<View className="flex-row flex-wrap gap-3">
								{entry.images.map((img, index) => (
									<View key={img.id} className="relative">
										<ExpoImage
											source={getImageSource(
												"entries",
												entry.originalId,
												img.id,
											)}
											style={{ width: 96, height: 96 }}
											className="rounded-lg"
											contentFit="cover"
											accessibilityLabel={`レシート画像 ${index + 1}`}
										/>
										{canModify ? (
											<Pressable
												onPress={() => {
													Alert.alert(
														"画像の削除",
														"この画像を削除しますか？",
														[
															{
																text: "キャンセル",
																style: "cancel",
															},
															{
																text: "削除する",
																style: "destructive",
																onPress: () => deleteImage.mutate(img.id),
															},
														],
													);
												}}
												accessibilityLabel={`画像${index + 1}を削除`}
												className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-destructive"
											>
												<Text className="text-xs font-bold text-white">✕</Text>
											</Pressable>
										) : null}
									</View>
								))}
							</View>
						) : null}
						{canModify && entry.images.length < 2 ? (
							<View className="mt-3">
								<ImagePicker
									images={newImages}
									onChange={setNewImages}
									maxImages={2 - entry.images.length}
								/>
								{newImages.length > 0 ? (
									<Pressable
										onPress={() => {
											uploadImages.mutate(
												{
													parentId: entry.originalId,
													images: newImages,
												},
												{
													onSuccess: () => setNewImages([]),
												},
											);
										}}
										disabled={uploadImages.isPending}
										className="mt-3 items-center rounded-xl border border-primary bg-card py-2 active:opacity-80"
									>
										{uploadImages.isPending ? (
											<ActivityIndicator />
										) : (
											<Text className="text-sm font-medium text-primary">
												アップロード
											</Text>
										)}
									</Pressable>
								) : null}
							</View>
						) : null}
					</View>
				) : null}

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
									{v.occurredOn ? (
										<Text className="text-sm text-muted-foreground">
											{formatDateFull(v.occurredOn)}
											{v.label ? ` · ${v.label}` : ""}
										</Text>
									) : null}
								</View>
							</View>
						))}
					</View>
				) : null}

				{/* エラー表示 */}
				{cancelMutation.error || restoreMutation.error ? (
					<View
						style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
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
