import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { parseResponse } from "hono/client";
import { useState } from "react";
import * as v from "valibot";
import type { SelectedImage } from "@/components/entry-form/ImagePicker";
import { client } from "@/lib/api-client";
import { useUploadEntryImages } from "./use-image-upload";
import { useModifyEntry } from "./use-modify-entry";

const entryFieldSchema = {
	category: v.picklist(["advance", "deposit"]),
	amount: v.pipe(
		v.string(),
		v.minLength(1, "0以上の整数を入力してください"),
		v.transform(Number),
		v.integer("0以上の整数を入力してください"),
		v.minValue(0, "0以上の整数を入力してください"),
	),
	occurredOn: v.pipe(v.string(), v.isoDate("日付を選択してください")),
	label: v.pipe(
		v.string(),
		v.transform((s: string) => s.trim()),
		v.minLength(1, "ラベルは必須です"),
	),
	memo: v.optional(
		v.pipe(
			v.string(),
			v.transform((s) => s || undefined),
		),
	),
};

const createEntrySchema = v.object(entryFieldSchema);

type ModifyTarget = {
	id: string;
	category: "advance" | "deposit";
	amount: number;
	occurredOn: string;
	label: string;
	memo: string | null;
};

export function useCreateEntryForm() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
	const uploadImages = useUploadEntryImages();

	const mutation = useMutation({
		mutationFn: async (input: v.InferOutput<typeof createEntrySchema>) => {
			const entry = await parseResponse(
				client.api.entries.$post({ json: input }),
			);
			// エントリー作成後に画像をアップロード
			if (selectedImages.length > 0) {
				await uploadImages.mutateAsync({
					entryId: entry.id,
					images: selectedImages,
				});
			}
			return entry;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["entries"] });
			router.replace("/(tabs)");
		},
	});

	const defaultValues: v.InferInput<typeof createEntrySchema> = {
		category: "advance",
		amount: "",
		occurredOn: format(new Date(), "yyyy-MM-dd"),
		label: "",
		memo: "",
	};

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: createEntrySchema,
		},
		onSubmit: ({ value }) => {
			const parsed = v.parse(createEntrySchema, value);
			mutation.mutate(parsed);
		},
	});

	return {
		form,
		isModifyMode: false as const,
		serverError: mutation.error ? "エラーが発生しました" : "",
		loading: mutation.isPending,
		selectedImages,
		setSelectedImages,
		goBack: () => router.back(),
	};
}

export function useModifyEntryForm(target: ModifyTarget) {
	const router = useRouter();
	const modifyMutation = useModifyEntry(target.id);

	const defaultValues: v.InferInput<typeof createEntrySchema> = {
		category: target.category,
		amount: String(target.amount),
		occurredOn: target.occurredOn,
		label: target.label,
		memo: target.memo ?? "",
	};

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: createEntrySchema,
		},
		onSubmit: ({ value }) => {
			const parsed = v.parse(createEntrySchema, value);
			modifyMutation.mutate({
				amount: parsed.amount,
				label: parsed.label,
				memo: parsed.memo,
			});
		},
	});

	return {
		form,
		isModifyMode: true as const,
		serverError: modifyMutation.error ? modifyMutation.error.message : "",
		loading: modifyMutation.isPending,
		goBack: () => router.back(),
	};
}
