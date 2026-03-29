import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { useState } from "react";
import * as v from "valibot";
import type { SelectedImage } from "@/components/entry-form/ImagePicker";
import { client } from "@/lib/api-client";
import { uploadImageRaw } from "./use-image-upload";

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

export function useCreateEntryForm() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);

	const mutation = useMutation({
		mutationFn: async (input: v.InferOutput<typeof createEntrySchema>) => {
			const res = await client.api.entries.$post({
				json: {
					category: input.category,
					amount: input.amount,
					occurredOn: input.occurredOn,
					label: input.label,
					memo: input.memo,
				},
			});
			if (!res.ok) await throwResponseError(res);
			const entry = await res.json();
			if ("error" in entry) throw new Error(entry.error);

			if (selectedImages.length > 0) {
				await Promise.all(
					selectedImages.map((img) =>
						uploadImageRaw("entries", entry.originalId, img),
					),
				);
			}

			return entry;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["entries"] });
			queryClient.invalidateQueries({ queryKey: ["balance"] });
			queryClient.invalidateQueries({ queryKey: ["timeline"] });
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

export type ModifyEntryImageOps = {
	newImages: SelectedImage[];
	pendingDeletes: string[];
};

export function useModifyEntryForm(
	target: ModifyTarget,
	imageOps: ModifyEntryImageOps,
) {
	const router = useRouter();
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (parsed: {
			amount: number;
			label: string;
			memo?: string;
		}) => {
			const deleteImageIds =
				imageOps.pendingDeletes.length > 0
					? imageOps.pendingDeletes
					: undefined;

			const hasTextChanges =
				parsed.amount !== target.amount ||
				parsed.label !== target.label ||
				(parsed.memo ?? null) !== (target.memo ?? null);

			if (hasTextChanges || (deleteImageIds && deleteImageIds.length > 0)) {
				const res = await client.api.entries[":originalId"].modify.$post({
					param: { originalId: target.id },
					json: {
						amount: parsed.amount,
						label: parsed.label,
						memo: parsed.memo,
						deleteImageIds,
					},
				});
				if (!res.ok) await throwResponseError(res);
			}

			if (imageOps.newImages.length > 0) {
				await Promise.all(
					imageOps.newImages.map((img) =>
						uploadImageRaw("entries", target.id, img),
					),
				);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["entries"] });
			queryClient.invalidateQueries({ queryKey: ["balance"] });
			queryClient.invalidateQueries({ queryKey: ["timeline"] });
			router.replace("/(tabs)");
		},
	});

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
			mutation.mutate({
				amount: parsed.amount,
				label: parsed.label,
				memo: parsed.memo,
			});
		},
	});

	const hasImageChanges =
		imageOps.newImages.length > 0 || imageOps.pendingDeletes.length > 0;

	return {
		form,
		isModifyMode: true as const,
		serverError: mutation.error ? mutation.error.message : "",
		loading: mutation.isPending,
		hasImageChanges,
		goBack: () => router.back(),
	};
}
