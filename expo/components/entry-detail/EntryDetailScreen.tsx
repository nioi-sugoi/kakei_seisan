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
import { FormHeader } from "@/components/entry-form/FormShared";
import { ImageThumbnail } from "@/components/ImageThumbnail";
import { ImageViewerModal } from "@/components/ImageViewerModal";
import { useCancelEntry } from "@/hooks/use-cancel-entry";
import { useEntryDetail } from "@/hooks/use-entry-detail";
import { getImageSource } from "@/hooks/use-image-upload";
import { usePartnerEntryDetail } from "@/hooks/use-partner-entry-detail";
import { useRestoreEntry } from "@/hooks/use-restore-entry";
import type { EntryDetailResponse } from "@/lib/api-types";
import { formatAmount, formatDateFull } from "@/lib/format";

type EntryDetailScreenProps = {
	readonly?: boolean;
};

export function EntryDetailScreen({
	readonly = false,
}: EntryDetailScreenProps) {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const [viewerIndex, setViewerIndex] = useState(-1);

	const useDetailQuery = readonly ? usePartnerEntryDetail : useEntryDetail;
	const { data: entry, isPending, error } = useDetailQuery(id);

	if (isPending) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator size="large" />
			</View>
		);
	}

	const title = readonly ? "パートナーの記録" : "記録詳細";

	if (error || !entry) {
		return (
			<View className="flex-1 bg-background">
				<FormHeader title={title} goBack={() => router.back()} />
				<View className="flex-1 items-center justify-center px-4">
					<Text className="text-lg text-destructive">
						{error?.message ?? "記録が見つかりません"}
					</Text>
				</View>
			</View>
		);
	}

	const latestVersion = entry.versions.find((v) => v.latest) ?? entry;
	const pastVersions = entry.versions.slice(1);

	return (
		<View className="flex-1 bg-background">
			<FormHeader title={title} goBack={() => router.back()} />
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

				{/* 画像 */}
				{entry.images.length > 0 ? (
					<View className="rounded-xl bg-card px-4 py-4">
						<Text className="mb-3 text-sm font-bold text-foreground">画像</Text>
						<View className="flex-row flex-wrap gap-3">
							{entry.images.map((img, index) => (
								<ImageThumbnail
									key={img.id}
									source={getImageSource("entries", entry.originalId, img.id, {
										readonly,
									})}
									onPress={() => setViewerIndex(index)}
									accessibilityLabel={`画像 ${index + 1}`}
								/>
							))}
						</View>
					</View>
				) : null}

				<ImageViewerModal
					visible={viewerIndex >= 0}
					images={entry.images.map((img) =>
						getImageSource("entries", entry.originalId, img.id, { readonly }),
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

				{!readonly ? (
					<EntryActions
						id={id}
						entry={entry}
						canModify={!latestVersion.cancelled}
					/>
				) : null}
			</ScrollView>
		</View>
	);
}

function EntryActions({
	id,
	entry,
	canModify,
}: {
	id: string;
	entry: EntryDetailResponse;
	canModify: boolean;
}) {
	const router = useRouter();
	const cancelMutation = useCancelEntry(id);
	const restoreMutation = useRestoreEntry(id);

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

	return (
		<>
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
							<Text className="text-lg font-medium text-primary">復元する</Text>
						)}
					</Pressable>
				</View>
			)}
		</>
	);
}
