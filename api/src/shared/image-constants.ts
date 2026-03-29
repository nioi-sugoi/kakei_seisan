import * as v from "valibot";

export const ALLOWED_IMAGE_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/heic",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MIME_TO_EXT: Record<AllowedImageType, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/heic": "heic",
};

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function isAllowedImageType(type: string): type is AllowedImageType {
	return (ALLOWED_IMAGE_TYPES as ReadonlyArray<string>).includes(type);
}

export function extensionForType(type: string): string {
	if (isAllowedImageType(type)) {
		return MIME_TO_EXT[type];
	}
	return "jpg";
}

/** 画像アップロード用 form スキーマ（専用エンドポイント向け） */
export const imageUploadSchema = v.object({
	image: v.instance(File),
});

export type ImageValidationError =
	| "サポートされていないファイル形式です"
	| "ファイルサイズは10MB以下にしてください";

export function validateImageFile(file: File): ImageValidationError | null {
	if (!isAllowedImageType(file.type)) {
		return "サポートされていないファイル形式です";
	}
	if (file.size > MAX_IMAGE_SIZE) {
		return "ファイルサイズは10MB以下にしてください";
	}
	return null;
}
