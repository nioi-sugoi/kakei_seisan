import * as ExpoImagePicker from "expo-image-picker";
import { Alert, Image, Pressable, Text, View } from "react-native";

const MAX_IMAGES = 2;

export type SelectedImage = {
	uri: string;
	mimeType: string;
	fileName: string;
};

type ImagePickerProps = {
	images: SelectedImage[];
	onChange: (images: SelectedImage[]) => void;
	/** 選択可能な最大枚数。省略時はデフォルト MAX_IMAGES */
	maxImages?: number;
	/** ラベルを非表示にする（外側でラベルを表示する場合） */
	hideLabel?: boolean;
};

function pickResultToImages(
	result: ExpoImagePicker.ImagePickerResult,
): SelectedImage[] {
	if (result.canceled) return [];
	return result.assets.map((asset) => ({
		uri: asset.uri,
		mimeType: asset.mimeType ?? "image/jpeg",
		fileName: asset.fileName ?? `image_${Date.now()}.jpg`,
	}));
}

export function ImagePicker({
	images,
	onChange,
	maxImages = MAX_IMAGES,
	hideLabel = false,
}: ImagePickerProps) {
	const canAdd = images.length < maxImages;

	const handleCamera = async () => {
		const permission = await ExpoImagePicker.requestCameraPermissionsAsync();
		if (!permission.granted) {
			Alert.alert(
				"カメラへのアクセス",
				"設定からカメラへのアクセスを許可してください。",
			);
			return;
		}

		const result = await ExpoImagePicker.launchCameraAsync({
			mediaTypes: ["images"],
			quality: 0.8,
		});

		const picked = pickResultToImages(result);
		if (picked.length > 0) {
			const remaining = maxImages - images.length;
			onChange([...images, ...picked.slice(0, remaining)]);
		}
	};

	const handleGallery = async () => {
		const permission =
			await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			Alert.alert(
				"写真ライブラリへのアクセス",
				"設定から写真ライブラリへのアクセスを許可してください。",
			);
			return;
		}

		const remaining = maxImages - images.length;
		const result = await ExpoImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			quality: 0.8,
			allowsMultipleSelection: remaining > 1,
			selectionLimit: remaining,
		});

		const picked = pickResultToImages(result);
		if (picked.length > 0) {
			onChange([...images, ...picked.slice(0, remaining)]);
		}
	};

	const handleRemove = (index: number) => {
		onChange(images.filter((_, i) => i !== index));
	};

	return (
		<View className="gap-2">
			{!hideLabel ? (
				<Text className="text-sm font-medium text-foreground">
					画像
					<Text className="text-xs text-muted-foreground">
						{" "}
						任意・最大{maxImages}枚
					</Text>
				</Text>
			) : null}

			{/* プレビュー */}
			{images.length > 0 ? (
				<View className="flex-row gap-3">
					{images.map((image, index) => (
						<View key={image.uri} className="relative">
							<Image
								source={{ uri: image.uri }}
								className="h-24 w-24 rounded-lg"
								accessibilityLabel={`画像 ${index + 1}`}
							/>
							<Pressable
								onPress={() => handleRemove(index)}
								accessibilityLabel={`画像${index + 1}を削除`}
								className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-destructive"
							>
								<Text className="text-xs font-bold text-white">✕</Text>
							</Pressable>
						</View>
					))}
				</View>
			) : null}

			{/* 追加ボタン */}
			{canAdd ? (
				<View className="flex-row gap-3">
					<Pressable
						onPress={handleCamera}
						accessibilityLabel="カメラで撮影"
						className="flex-1 items-center rounded-xl border border-border bg-card py-3 active:opacity-80"
					>
						<Text className="text-sm text-foreground">カメラで撮影</Text>
					</Pressable>
					<Pressable
						onPress={handleGallery}
						accessibilityLabel="ギャラリーから選択"
						className="flex-1 items-center rounded-xl border border-border bg-card py-3 active:opacity-80"
					>
						<Text className="text-sm text-foreground">ギャラリーから選択</Text>
					</Pressable>
				</View>
			) : null}
		</View>
	);
}
