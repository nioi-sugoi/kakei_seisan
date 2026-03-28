import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import * as v from "valibot";
import type { SelectedImage } from "@/components/entry-form/ImagePicker";
import { client } from "@/lib/api-client";
import {
	deleteImageRaw,
	uploadImageRaw,
	useUploadImages,
} from "./use-image-upload";

const settlementFieldSchema = {
	amount: v.pipe(
		v.string(),
		v.minLength(1, "0より大きい整数を入力してください"),
		v.transform(Number),
		v.integer("0より大きい整数を入力してください"),
		v.minValue(1, "0より大きい整数を入力してください"),
	),
};

const createSettlementSchema = v.object(settlementFieldSchema);

type ModifyTarget = {
	id: string;
	amount: number;
	occurredOn: string;
};

export function useCreateSettlementForm(balance: number) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
	const uploadImages = useUploadImages("settlements");
	const absBalance = Math.abs(balance);

	const maxAmountSchema = v.object({
		amount: v.pipe(
			v.string(),
			v.minLength(1, "0より大きい整数を入力してください"),
			v.transform(Number),
			v.integer("0より大きい整数を入力してください"),
			v.minValue(1, "0より大きい整数を入力してください"),
			v.maxValue(
				absBalance,
				`精算額は残高（¥${absBalance.toLocaleString()}）以下にしてください`,
			),
		),
	});

	const mutation = useMutation({
		mutationFn: (input: {
			category: "fromHousehold" | "fromUser";
			amount: number;
			occurredOn: string;
		}) => parseResponse(client.api.settlements.$post({ json: input })),
		onSuccess: async (settlement) => {
			// 画像アップロードは best-effort（失敗しても精算は残す）
			if (selectedImages.length > 0) {
				try {
					await uploadImages.mutateAsync({
						parentId: settlement.id,
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

	const defaultValues = {
		amount: String(absBalance),
	};

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: maxAmountSchema,
		},
		onSubmit: ({ value }) => {
			const parsed = v.parse(maxAmountSchema, value);
			mutation.mutate({
				category: balance >= 0 ? "fromHousehold" : "fromUser",
				amount: parsed.amount,
				occurredOn: format(new Date(), "yyyy-MM-dd"),
			});
		},
	});

	return {
		form,
		serverError: mutation.error ? "エラーが発生しました" : "",
		loading: mutation.isPending,
		selectedImages,
		setSelectedImages,
		goBack: () => router.back(),
	};
}

export type ModifySettlementImageOps = {
	newImages: SelectedImage[];
	pendingDeletes: string[];
};

export function useModifySettlementForm(
	target: ModifyTarget,
	imageOps: ModifySettlementImageOps,
) {
	const router = useRouter();
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (parsed: { amount: number }) => {
			const fieldsChanged = parsed.amount !== target.amount;

			if (fieldsChanged) {
				const res = await client.api.settlements[":originalId"].modify.$post({
					param: { originalId: target.id },
					json: parsed,
				});
				if (!res.ok) {
					const body = await res.json();
					throw new Error("error" in body ? body.error : "修正に失敗しました");
				}
			}

			await Promise.all(
				imageOps.newImages.map((img) =>
					uploadImageRaw("settlements", target.id, img),
				),
			);
			await Promise.all(
				imageOps.pendingDeletes.map((id) =>
					deleteImageRaw("settlements", target.id, id),
				),
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settlements"] });
			queryClient.invalidateQueries({ queryKey: ["balance"] });
			queryClient.invalidateQueries({ queryKey: ["timeline"] });
			router.replace("/(tabs)");
		},
	});

	const defaultValues = {
		amount: String(target.amount),
	};

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: createSettlementSchema,
		},
		onSubmit: ({ value }) => {
			const parsed = v.parse(createSettlementSchema, value);
			mutation.mutate({
				amount: parsed.amount,
			});
		},
	});

	const hasImageChanges =
		imageOps.newImages.length > 0 || imageOps.pendingDeletes.length > 0;

	return {
		form,
		serverError: mutation.error ? mutation.error.message : "",
		loading: mutation.isPending,
		hasImageChanges,
		goBack: () => router.back(),
	};
}
