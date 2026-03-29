import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import * as v from "valibot";
import type { SelectedImage } from "@/components/entry-form/ImagePicker";
import { client } from "@/lib/api-client";
import { config } from "@/lib/config";
import { getAuthHeaders } from "./use-image-upload";

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

// React Native の FormData は Web API と異なり { uri, name, type } オブジェクトを受け付ける
function appendImageToFormData(
	formData: FormData,
	fieldName: string,
	image: SelectedImage,
) {
	formData.append(fieldName, {
		uri: image.uri,
		name: image.fileName,
		type: image.mimeType,
	} as unknown as Blob);
}

async function throwResponseError(res: {
	json: () => Promise<unknown>;
}): Promise<never> {
	const body = await res.json();
	throw new Error(
		body !== null &&
			typeof body === "object" &&
			"error" in body &&
			typeof body.error === "string"
			? body.error
			: "エラーが発生しました",
	);
}

export function useCreateSettlementForm(balance: number) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
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
		mutationFn: async (input: {
			category: "fromHousehold" | "fromUser";
			amount: number;
			occurredOn: string;
		}) => {
			if (selectedImages.length > 0) {
				// File uploads require raw fetch on React Native
				const formData = new FormData();
				formData.append("category", input.category);
				formData.append("amount", String(input.amount));
				formData.append("occurredOn", input.occurredOn);
				selectedImages.forEach((img, i) => {
					appendImageToFormData(formData, `image${i + 1}`, img);
				});

				const res = await fetch(`${config.apiBaseUrl}/api/settlements`, {
					method: "POST",
					body: formData,
					headers: getAuthHeaders(),
					credentials: "include",
				});
				if (!res.ok) await throwResponseError(res);
				return res.json();
			}
			// Text-only: use Hono RPC client
			return parseResponse(
				client.api.settlements.$post({
					form: {
						category: input.category,
						amount: String(input.amount),
						occurredOn: input.occurredOn,
					},
				}),
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
			const hasNewImages = imageOps.newImages.length > 0;
			const deleteImageIds =
				imageOps.pendingDeletes.length > 0
					? imageOps.pendingDeletes.join(",")
					: undefined;

			if (hasNewImages) {
				// File uploads require raw fetch on React Native
				const formData = new FormData();
				formData.append("amount", String(parsed.amount));
				imageOps.newImages.forEach((img, i) => {
					appendImageToFormData(formData, `image${i + 1}`, img);
				});
				if (deleteImageIds) formData.append("deleteImageIds", deleteImageIds);

				const res = await fetch(
					`${config.apiBaseUrl}/api/settlements/${target.id}/modify`,
					{
						method: "POST",
						body: formData,
						headers: getAuthHeaders(),
						credentials: "include",
					},
				);
				if (!res.ok) await throwResponseError(res);
			} else {
				// Text-only: use Hono RPC client
				const res = await client.api.settlements[":originalId"].modify.$post({
					param: { originalId: target.id },
					form: { amount: String(parsed.amount), deleteImageIds },
				});
				if (!res.ok) await throwResponseError(res);
			}
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
