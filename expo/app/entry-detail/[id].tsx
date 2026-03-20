import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useEntryDetail } from "@/hooks/use-entry-detail";
import { formatAmount, formatDateFull } from "@/lib/format";

const categoryLabels = { advance: "立替", deposit: "預り" } as const;
const categoryColors = {
	advance: "bg-blue-100 border-blue-200",
	deposit: "bg-orange-100 border-orange-200",
} as const;
const categoryTextColors = {
	advance: "text-primary",
	deposit: "text-orange-600",
} as const;

const badgeVariants = {
	amber: "border-amber-200 bg-amber-100",
	red: "border-red-200 bg-red-100",
} as const;
const badgeTextVariants = {
	amber: "text-amber-600",
	red: "text-red-500",
} as const;

function StatusBadge({
	label,
	variant,
}: {
	label: string;
	variant: "amber" | "red";
}) {
	return (
		<View className={`rounded-md border px-2 py-0.5 ${badgeVariants[variant]}`}>
			<Text className={`text-xs font-medium ${badgeTextVariants[variant]}`}>
				{label}
			</Text>
		</View>
	);
}

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

	const category = entry.category as "advance" | "deposit";
	const operation = entry.operation as string;
	const status = entry.status as string;

	return (
		<View className="flex-1 bg-background">
			<Header onBack={() => router.back()} />

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
						{operation === "modification" && (
							<StatusBadge label="修正" variant="amber" />
						)}
						{operation === "cancellation" && (
							<StatusBadge label="取消" variant="red" />
						)}
						{status === "pending" && (
							<StatusBadge label="承認待ち" variant="amber" />
						)}
						{status === "rejected" && (
							<StatusBadge label="差し戻し" variant="red" />
						)}
					</View>

					{/* Amount */}
					<View className="mt-4 items-center">
						<Text
							className={`text-3xl font-bold ${category === "deposit" ? "text-orange-600" : "text-foreground"}`}
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

				{/* Action Buttons */}
				{operation === "original" ? (
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
