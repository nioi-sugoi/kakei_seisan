import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import { AmountInput } from "@/components/entry-form/AmountInput";
import {
	FormError,
	FormHeader,
	SubmitButton,
} from "@/components/entry-form/FormShared";
import {
	ImagePicker,
	type SelectedImage,
} from "@/components/entry-form/ImagePicker";
import { ImageThumbnail } from "@/components/ImageThumbnail";
import {
	getImageSource,
	useDeleteImage,
	useUploadImages,
} from "@/hooks/use-image-upload";
import { useSettlementDetail } from "@/hooks/use-settlement-detail";
import { useModifySettlementForm } from "@/hooks/use-settlement-form";

type ModifyTarget = {
	id: string;
	amount: number;
	occurredOn: string;
};

type ExistingImage = { id: string; displayOrder: number; createdAt: number };

function ModifySettlementForm({
	target,
	existingImages,
}: {
	target: ModifyTarget;
	existingImages: ExistingImage[];
}) {
	const { form, serverError, loading, goBack } =
		useModifySettlementForm(target);
	const uploadImages = useUploadImages("settlements");
	const deleteImage = useDeleteImage("settlements", target.id);
	const [newImages, setNewImages] = useState<SelectedImage[]>([]);

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			className="flex-1 bg-background"
		>
			<FormHeader title="精算を修正" goBack={goBack} />
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-4 py-5 gap-5"
				keyboardShouldPersistTaps="handled"
			>
				<form.Field name="amount">
					{(field) => (
						<AmountInput
							value={field.state.value}
							onChange={field.handleChange}
							error={field.state.meta.errors[0]?.message}
							label="精算額"
							required={false}
							accessibilityLabel="精算額"
						/>
					)}
				</form.Field>

				{/* 証跡画像 */}
				<View className="gap-2">
					<Text className="text-sm font-medium text-foreground">
						証跡画像
						<Text className="text-xs text-muted-foreground">
							{" "}
							任意・最大2枚
						</Text>
					</Text>
					{existingImages.length > 0 ? (
						<View className="flex-row flex-wrap gap-3">
							{existingImages.map((img, index) => (
								<View key={img.id} className="relative">
									<ImageThumbnail
										source={getImageSource("settlements", target.id, img.id)}
										accessibilityLabel={`証跡画像 ${index + 1}`}
									/>
									<Pressable
										onPress={() => {
											Alert.alert("画像の削除", "この画像を削除しますか？", [
												{ text: "キャンセル", style: "cancel" },
												{
													text: "削除する",
													style: "destructive",
													onPress: () => deleteImage.mutate(img.id),
												},
											]);
										}}
										accessibilityLabel={`画像${index + 1}を削除`}
										className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-destructive"
									>
										<Text className="text-xs font-bold text-white">✕</Text>
									</Pressable>
								</View>
							))}
						</View>
					) : null}
					{existingImages.length < 2 ? (
						<ImagePicker
							images={newImages}
							onChange={setNewImages}
							maxImages={2 - existingImages.length}
						/>
					) : null}
					{newImages.length > 0 ? (
						<Pressable
							onPress={() => {
								uploadImages.mutate(
									{ parentId: target.id, images: newImages },
									{ onSuccess: () => setNewImages([]) },
								);
							}}
							disabled={uploadImages.isPending}
							className="items-center rounded-xl border border-primary bg-card py-2 active:opacity-80"
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

				{serverError ? <FormError message={serverError} /> : null}
				<form.Subscribe selector={(state) => state.isDirty}>
					{(isDirty) => (
						<SubmitButton
							label="修正する"
							loading={loading}
							disabled={!isDirty}
							onPress={() => form.handleSubmit()}
						/>
					)}
				</form.Subscribe>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

export default function ModifySettlementScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { data: settlement, isPending, error } = useSettlementDetail(id);

	if (isPending) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (error || !settlement) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<Text className="text-lg text-destructive">
					{error?.message ?? "精算が見つかりません"}
				</Text>
			</View>
		);
	}

	const latestVersion = settlement.versions.find((v) => v.latest) ?? settlement;

	return (
		<ModifySettlementForm
			target={{
				id: settlement.originalId,
				amount: latestVersion.amount,
				occurredOn: latestVersion.occurredOn,
			}}
			existingImages={settlement.images}
		/>
	);
}
