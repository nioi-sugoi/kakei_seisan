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
