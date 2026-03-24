import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { parseResponse } from "hono/client";
import type { SelectedImage } from "@/components/entry-form/ImagePicker";
import { client } from "@/lib/api-client";
import { useUploadSettlementImages } from "./use-image-upload";

type CreateSettlementInput = {
	category: "fromHousehold" | "fromUser";
	amount: number;
	occurredOn: string;
};

export function useCreateSettlement(selectedImages: SelectedImage[]) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const uploadImages = useUploadSettlementImages();

	return useMutation({
		mutationFn: (input: CreateSettlementInput) =>
			parseResponse(client.api.settlements.$post({ json: input })),
		onSuccess: async (settlement) => {
			// 画像アップロードは best-effort（失敗しても精算は残す）
			if (selectedImages.length > 0) {
				try {
					await uploadImages.mutateAsync({
						settlementId: settlement.id,
						images: selectedImages,
					});
				} catch {
					// 画像アップロード失敗は無視（詳細画面から再添付可能）
				}
			}
			queryClient.invalidateQueries({ queryKey: ["settlements"] });
			queryClient.invalidateQueries({ queryKey: ["balance"] });
			queryClient.invalidateQueries({ queryKey: ["timeline"] });
			router.replace("/(tabs)");
		},
	});
}
