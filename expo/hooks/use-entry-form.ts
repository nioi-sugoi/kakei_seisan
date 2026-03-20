import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import { parseResponse } from "hono/client";
import * as v from "valibot";
import { client } from "@/lib/api-client";
import { useModifyEntry } from "./use-modify-entry";

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
	memo: v.optional(
		v.pipe(
			v.string(),
			v.transform((s) => s || undefined),
		),
	),
});

type ModifyTarget = {
	id: string;
	category: "advance" | "deposit";
	amount: number;
	date: string;
	label: string;
	memo: string | null;
};

export function useEntryForm(modifyTarget?: ModifyTarget) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const isModifyMode = !!modifyTarget;

	const createMutation = useMutation({
		mutationFn: (input: v.InferOutput<typeof createEntrySchema>) =>
			parseResponse(client.api.entries.$post({ json: input })),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["entries"] });
			router.replace("/(tabs)");
		},
	});

	const modifyMutation = useModifyEntry(modifyTarget?.id ?? "");

	const defaultValues: v.InferInput<typeof createEntrySchema> = modifyTarget
		? {
				category: modifyTarget.category,
				amount: String(modifyTarget.amount),
				date: modifyTarget.date,
				label: modifyTarget.label,
				memo: modifyTarget.memo ?? "",
			}
		: {
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
			const parsed = v.parse(createEntrySchema, value);
			if (isModifyMode) {
				modifyMutation.mutate({
					amount: parsed.amount,
					label: parsed.label,
					memo: parsed.memo,
				});
			} else {
				createMutation.mutate(parsed);
			}
		},
	});

	const activeMutation = isModifyMode ? modifyMutation : createMutation;

	return {
		form,
		isModifyMode,
		serverError: activeMutation.error
			? isModifyMode
				? activeMutation.error.message
				: "エラーが発生しました"
			: "",
		loading: activeMutation.isPending,
		goBack: () => router.back(),
	};
}
