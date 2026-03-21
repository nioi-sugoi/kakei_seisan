import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import type { SelectedImage } from "@/components/entry-form/ImagePicker";
import { authClient } from "@/lib/auth-client";
import { config } from "@/lib/config";

type UploadedImage = {
	id: string;
	entryId: string;
	storagePath: string;
	displayOrder: number;
	createdAt: number;
};

async function buildAuthHeaders(): Promise<Record<string, string>> {
	if (Platform.OS === "web") return {};
	const cookie = authClient.getCookie();
	if (cookie) return { Cookie: cookie };
	return {};
}

async function uploadImage(
	entryId: string,
	image: SelectedImage,
): Promise<UploadedImage> {
	const formData = new FormData();
	// React Native の FormData は { uri, name, type } を受け付ける
	formData.append("image", {
		uri: image.uri,
		name: image.fileName,
		type: image.mimeType,
	} as unknown as Blob);

	const headers = await buildAuthHeaders();
	const res = await fetch(
		`${config.apiBaseUrl}/api/entries/${entryId}/images`,
		{
			method: "POST",
			body: formData,
			headers,
			credentials: "include",
		},
	);

	if (!res.ok) {
		const body = await res.json();
		throw new Error(
			"error" in body ? body.error : "画像のアップロードに失敗しました",
		);
	}

	return res.json();
}

async function deleteImage(entryId: string, imageId: string): Promise<void> {
	const headers = await buildAuthHeaders();
	const res = await fetch(
		`${config.apiBaseUrl}/api/entries/${entryId}/images/${imageId}`,
		{
			method: "DELETE",
			headers,
			credentials: "include",
		},
	);

	if (!res.ok) {
		const body = await res.json();
		throw new Error("error" in body ? body.error : "画像の削除に失敗しました");
	}
}

/**
 * エントリー作成後に画像をアップロードするフック。
 * 複数画像を順番にアップロードする。
 */
export function useUploadEntryImages() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			entryId,
			images,
		}: {
			entryId: string;
			images: SelectedImage[];
		}) => {
			const results: UploadedImage[] = [];
			for (const image of images) {
				const uploaded = await uploadImage(entryId, image);
				results.push(uploaded);
			}
			return results;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["entries"] });
		},
	});
}

/**
 * エントリーの画像を削除するフック。
 */
export function useDeleteEntryImage(entryId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (imageId: string) => deleteImage(entryId, imageId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["entries", entryId] });
		},
	});
}

/**
 * 画像ダウンロード用の URL とヘッダを生成するユーティリティ。
 * expo-image の source に渡す。
 */
export function getImageSource(entryId: string, imageId: string) {
	const cookie = Platform.OS !== "web" ? authClient.getCookie() : undefined;
	return {
		uri: `${config.apiBaseUrl}/api/entries/${entryId}/images/${imageId}`,
		headers: cookie ? { Cookie: cookie } : undefined,
	};
}
