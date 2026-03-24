import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import type { SelectedImage } from "@/components/entry-form/ImagePicker";
import { authClient } from "@/lib/auth-client";
import { config } from "@/lib/config";

export type ImageResourceType = "entries" | "settlements";

function getAuthHeaders(): Record<string, string> {
	if (Platform.OS === "web") return {};
	const cookie = authClient.getCookie();
	return cookie ? { Cookie: cookie } : {};
}

// React Native の FormData は Web API と異なり { uri, name, type } オブジェクトを受け付ける。
// Blob 型への二重キャストは RN 固有の制約のため不可避
function buildImageFormData(image: SelectedImage): FormData {
	const formData = new FormData();
	formData.append("image", {
		uri: image.uri,
		name: image.fileName,
		type: image.mimeType,
	} as unknown as Blob);
	return formData;
}

async function uploadImage(
	resourceType: ImageResourceType,
	parentId: string,
	image: SelectedImage,
): Promise<{ id: string; displayOrder: number; createdAt: number }> {
	const res = await fetch(
		`${config.apiBaseUrl}/api/${resourceType}/${parentId}/images`,
		{
			method: "POST",
			body: buildImageFormData(image),
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

async function deleteImageRequest(
	resourceType: ImageResourceType,
	parentId: string,
	imageId: string,
): Promise<void> {
	const res = await fetch(
		`${config.apiBaseUrl}/api/${resourceType}/${parentId}/images/${imageId}`,
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

export function useUploadImages(resourceType: ImageResourceType) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			parentId,
			images,
		}: {
			parentId: string;
			images: SelectedImage[];
		}) =>
			Promise.all(
				images.map((image) => uploadImage(resourceType, parentId, image)),
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [resourceType] });
		},
	});
}

export function useDeleteImage(
	resourceType: ImageResourceType,
	parentId: string,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (imageId: string) =>
			deleteImageRequest(resourceType, parentId, imageId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [resourceType, parentId],
			});
		},
	});
}

export function getImageSource(
	resourceType: ImageResourceType,
	parentId: string,
	imageId: string,
) {
	const headers = getAuthHeaders();
	return {
		uri: `${config.apiBaseUrl}/api/${resourceType}/${parentId}/images/${imageId}`,
		headers: Object.keys(headers).length > 0 ? headers : undefined,
	};
}
