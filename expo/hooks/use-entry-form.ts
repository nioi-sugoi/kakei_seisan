import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { parseResponse } from "hono/client";
import * as v from "valibot";
import { format } from "date-fns";
import { client } from "@/lib/api-client";

const createEntrySchema = v.object({
	category: v.picklist(["advance", "deposit"]),
	amount: v.pipe(
		v.string(),
		v.minLength(1, "0以上の整数を入力してください"),
		v.transform(Number),
		v.integer("0以上の整数を入力してください"),
		v.minValue(0, "0以上の整数を入力してください"),
	),
	date: v.pipe(v.string(), v.isoDate("日付を選択してください")),
	label: v.pipe(
		v.string(),
		v.transform((s: string) => s.trim()),
		v.minLength(1, "ラベルは必須です"),
	),
	memo: v.optional(v.pipe(
		v.string(),
		v.transform((s) => s || undefined),
	)),
});

export function useEntryForm() {
	const router = useRouter();
	const mutation = useMutation({
		mutationFn: (input: v.InferOutput<typeof createEntrySchema>) =>
			parseResponse(client.api.entries.$post({ json: input })),
		onSuccess: () => {
			router.replace("/(tabs)");
		},
	});

	const defaultValues: v.InferInput<typeof createEntrySchema> = {
		category: "advance",
		amount: "",
		date: format(new Date(), "yyyy-MM-dd"),
		label: "",
		memo: "",
	};

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: createEntrySchema,
		},
		onSubmit: ({ value }) => {
			// バリデーション通過済みのため parse は必ず成功する
			mutation.mutate(v.parse(createEntrySchema, value));
		},
	});

	return {
		form,
		serverError: mutation.error ? "エラーが発生しました" : "",
		loading: mutation.isPending,
		goBack: () => router.back(),
	};
}
