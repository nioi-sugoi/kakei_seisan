import { useLocalSearchParams, useRouter } from "expo-router";
import {
	ActivityIndicator,
	Image,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useEntryDetail } from "@/hooks/use-entry-detail";

const categoryLabels = { advance: "立替", deposit: "預り" } as const;
const categoryColors = {
	advance: "bg-blue-100 border-blue-200",
	deposit: "bg-orange-100 border-orange-200",
} as const;
const categoryTextColors = {
	advance: "text-primary",
	deposit: "text-orange-600",
} as const;

function formatAmount(amount: number) {
	return `¥${amount.toLocaleString()}`;
}

function formatDateFull(dateStr: string) {
	const d = new Date(dateStr);
	return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function hasActiveChildren(
	children: Array<{ operation: string }>,
): { modified: boolean; cancelled: boolean } {
	let modified = false;
	let cancelled = false;
	for (const child of children) {
		if (child.operation === "modification") modified = true;
		if (child.operation === "cancellation") cancelled = true;
	}
	return { modified, cancelled };
}

export default function EntryDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const router = useRouter();
	const { data: entry, isPending, error } = useEntryDetail(id ?? "");

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
				<View className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-3 pt-14">
					<Pressable onPress={() => router.back()} className="active:opacity-60">
						<Text className="text-base text-primary">戻る</Text>
					</Pressable>
					<Text className="flex-1 text-lg font-bold text-foreground">
						記録詳細
					</Text>
				</View>
				<View className="flex-1 items-center justify-center px-4">
					<Text className="text-base text-destructive">
						{error?.message ?? "記録が見つかりません"}
					</Text>
				</View>
			</View>
		);
	}

	const category = entry.category as "advance" | "deposit";
	const operation = entry.operation as string;
	const status = entry.status as string;
	const images = (entry as { images?: Array<{ id: string; storagePath: string; displayOrder: number }> }).images ?? [];
	const children = (entry as { children?: Array<{ id: string; operation: string }> }).children ?? [];
	const parent = (entry as { parent?: { id: string; operation: string; category: string; amount: number } | null }).parent;

	const { modified, cancelled } = hasActiveChildren(children);
	const isInactive = modified || cancelled;

	const modificationChild = children.find((c) => c.operation === "modification");
	const cancellationChild = children.find((c) => c.operation === "cancellation");

	return (
		<View className="flex-1 bg-background">
			{/* Header */}
			<View className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-3 pt-14">
				<Pressable onPress={() => router.back()} className="active:opacity-60">
					<Text className="text-base text-primary">戻る</Text>
				</Pressable>
				<Text className="flex-1 text-lg font-bold text-foreground">
					記録詳細
				</Text>
			</View>

			<ScrollView
				className="flex-1"
				contentContainerClassName="px-4 py-5 gap-4"
			>
				{/* Main Info Card */}
				<View className="rounded-xl bg-card px-5 py-5">
					{/* Badges */}
					<View className="flex-row items-center gap-2">
						<View
							className={`rounded-md border px-2 py-0.5 ${categoryColors[category]}`}
						>
							<Text
								className={`text-xs font-medium ${categoryTextColors[category]}`}
							>
								{categoryLabels[category]}
							</Text>
						</View>
						{modified && (
							<View className="rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5">
								<Text className="text-xs font-medium text-amber-600">
									修正済み
								</Text>
							</View>
						)}
						{cancelled && (
							<View className="rounded-md border border-red-200 bg-red-100 px-2 py-0.5">
								<Text className="text-xs font-medium text-red-500">
									取消済み
								</Text>
							</View>
						)}
						{operation === "modification" && (
							<View className="rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5">
								<Text className="text-xs font-medium text-amber-600">
									修正
								</Text>
							</View>
						)}
						{operation === "cancellation" && (
							<View className="rounded-md border border-red-200 bg-red-100 px-2 py-0.5">
								<Text className="text-xs font-medium text-red-500">
									取消
								</Text>
							</View>
						)}
						{status === "pending" && (
							<View className="rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5">
								<Text className="text-xs font-medium text-amber-600">
									承認待ち
								</Text>
							</View>
						)}
						{status === "rejected" && (
							<View className="rounded-md border border-red-200 bg-red-100 px-2 py-0.5">
								<Text className="text-xs font-medium text-red-500">
									差し戻し
								</Text>
							</View>
						)}
					</View>

					{/* Amount */}
					<View className="mt-4 items-center">
						<Text
							className={`text-3xl font-bold ${
								isInactive ? "line-through opacity-50" : ""
							} ${category === "deposit" ? "text-orange-600" : "text-foreground"}`}
						>
							{category === "deposit" ? "-" : ""}
							{formatAmount(entry.amount)}
						</Text>
					</View>

					{/* Separator */}
					<View className="my-4 h-px bg-border" />

					{/* Metadata */}
					<View className="gap-3">
						<View className="flex-row justify-between">
							<Text className="text-sm text-muted-foreground">日付</Text>
							<Text className="text-sm font-medium text-foreground">
								{formatDateFull(entry.date)}
							</Text>
						</View>
						<View className="flex-row justify-between">
							<Text className="text-sm text-muted-foreground">ラベル</Text>
							<Text className="text-sm font-medium text-foreground">
								{entry.label}
							</Text>
						</View>
						{entry.memo ? (
							<View className="flex-row justify-between">
								<Text className="text-sm text-muted-foreground">メモ</Text>
								<Text className="text-sm text-foreground">{entry.memo}</Text>
							</View>
						) : null}
					</View>
				</View>

				{/* Receipt Images */}
				{images.length > 0 ? (
					<View className="rounded-xl bg-card px-5 py-4">
						<Text className="text-sm font-medium text-foreground">
							レシート画像
						</Text>
						<View className="mt-3 flex-row gap-3">
							{images.map((img) => (
								<Pressable
									key={img.id}
									className="h-24 w-24 items-center justify-center rounded-lg bg-secondary active:opacity-80"
								>
									<Image
										source={{ uri: img.storagePath }}
										className="h-24 w-24 rounded-lg"
										resizeMode="cover"
									/>
								</Pressable>
							))}
						</View>
					</View>
				) : null}

				{/* Rejection Comment */}
				{status === "rejected" && entry.approvalComment ? (
					<View className="rounded-xl border-l-4 border-l-red-400 bg-card px-4 py-4">
						<Text className="text-xs font-medium text-red-500">
							差し戻しコメント
						</Text>
						<Text className="mt-1 text-sm leading-relaxed text-foreground">
							{entry.approvalComment}
						</Text>
					</View>
				) : null}

				{/* Related Entry Links */}
				{modificationChild ? (
					<Pressable
						onPress={() =>
							router.push(`/entry-detail/${modificationChild.id}`)
						}
						className="flex-row items-center justify-center gap-1 py-2 active:opacity-60"
					>
						<Text className="text-sm text-primary">
							修正後の記録を見る
						</Text>
						<Text className="text-sm text-primary">→</Text>
					</Pressable>
				) : null}
				{cancellationChild ? (
					<Pressable
						onPress={() =>
							router.push(`/entry-detail/${cancellationChild.id}`)
						}
						className="flex-row items-center justify-center gap-1 py-2 active:opacity-60"
					>
						<Text className="text-sm text-primary">
							取消記録を見る
						</Text>
						<Text className="text-sm text-primary">→</Text>
					</Pressable>
				) : null}
				{parent ? (
					<Pressable
						onPress={() => router.push(`/entry-detail/${parent.id}`)}
						className="flex-row items-center justify-center gap-1 py-2 active:opacity-60"
					>
						<Text className="text-sm text-primary">
							元の記録を見る
						</Text>
						<Text className="text-sm text-primary">→</Text>
					</Pressable>
				) : null}

				{/* Action Buttons (visible only for active original entries) */}
				{!isInactive && operation === "original" ? (
					<View className="mt-4 flex-row gap-3 pb-4">
						<Pressable className="flex-1 items-center rounded-xl border border-border py-3 active:opacity-80">
							<Text className="text-base font-medium text-foreground">
								修正する
							</Text>
						</Pressable>
						<Pressable className="flex-1 items-center rounded-xl border border-destructive py-3 active:opacity-80">
							<Text className="text-base font-medium text-destructive">
								取り消す
							</Text>
						</Pressable>
					</View>
				) : null}
			</ScrollView>
		</View>
	);
}
