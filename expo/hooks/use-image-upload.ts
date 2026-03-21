import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import type { SelectedImage } from "@/components/entry-form/ImagePicker";
import { authClient } from "@/lib/auth-client";
import { config } from "@/lib/config";

type UploadedImage = {
	id: string;
	entryId: string;
	displayOrder: number;
	createdAt: number;
};

function getAuthHeaders(): Record<string, string> {
	if (Platform.OS === "web") return {};
	const cookie = authClient.getCookie();
	return cookie ? { Cookie: cookie } : {};
}

async function uploadImage(
	entryId: string,
	image: SelectedImage,
): Promise<UploadedImage> {
	const formData = new FormData();
	// React Native の FormData は Web API と異なり { uri, name, type } オブジェクトを受け付ける。
	// Blob 型への二重キャストは RN 固有の制約のため不可避
	formData.append("image", {
		uri: image.uri,
		name: image.fileName,
		type: image.mimeType,
	} as unknown as Blob);

	const res = await fetch(
		`${config.apiBaseUrl}/api/entries/${entryId}/images`,
		{
			method: "POST",
			body: formData,
			headers: getAuthHeaders(),
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
	const res = await fetch(
		`${config.apiBaseUrl}/api/entries/${entryId}/images/${imageId}`,
		{
			method: "DELETE",
			headers: getAuthHeaders(),
			credentials: "include",
		},
	);

	if (!res.ok) {
		const body = await res.json();
		throw new Error("error" in body ? body.error : "画像の削除に失敗しました");
	}
}

export function useUploadEntryImages() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			entryId,
			images,
		}: {
			entryId: string;
			images: SelectedImage[];
		}) => Promise.all(images.map((image) => uploadImage(entryId, image))),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["entries"] });
		},
	});
}

export function useDeleteEntryImage(entryId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (imageId: string) => deleteImage(entryId, imageId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["entries", entryId] });
		},
	});
}

export function getImageSource(entryId: string, imageId: string) {
	const headers = getAuthHeaders();
	return {
		uri: `${config.apiBaseUrl}/api/entries/${entryId}/images/${imageId}`,
		headers: Object.keys(headers).length > 0 ? headers : undefined,
	};
}
