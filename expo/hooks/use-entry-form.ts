import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import * as v from "valibot";
import { format } from "date-fns";
import { apiPost } from "@/lib/api-client";

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
	memo: v.optional(v.string()),
});

type ApiError = {
	message: string;
	issues?: { field: string; message: string }[];
};

export function useEntryForm() {
	const router = useRouter();
	const [category, setCategory] = useState<"advance" | "deposit">("advance");
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
	const [label, setLabel] = useState("");
	const [memo, setMemo] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const mutation = useMutation({
		mutationFn: async (input: v.InferOutput<typeof createEntrySchema>) => {
			const { data, error } = await apiPost("/entries", input);
			if (error) {
				throw error;
			}
			return data;
		},
		onSuccess: () => {
			router.replace("/(tabs)");
		},
		onError: (err: ApiError) => {
			if (err.issues) {
				const errs: Record<string, string> = {};
				for (const issue of err.issues) {
					errs[issue.field] = issue.message;
				}
				setFieldErrors(errs);
			}
		},
	});

	const goBack = useCallback(() => {
		router.back();
	}, [router]);

	const submit = useCallback(() => {
		const result = v.safeParse(createEntrySchema, {
			category,
			amount,
			date,
			label,
			memo: memo || undefined,
		});

		if (!result.success) {
			const flat = v.flatten(result.issues);
			const errors: Record<string, string> = {};
			for (const [key, messages] of Object.entries(flat.nested ?? {})) {
				if (messages?.[0]) {
					errors[key] = messages[0];
				}
			}
			setFieldErrors(errors);
			return;
		}

		setFieldErrors({});
		mutation.mutate(result.output);
	}, [category, amount, date, label, memo, mutation]);

	const error = mutation.error?.message ?? "";

	return {
		category,
		setCategory,
		amount,
		setAmount,
		date,
		setDate,
		label,
		setLabel,
		memo,
		setMemo,
		error,
		fieldErrors,
		loading: mutation.isPending,
		submit,
		goBack,
	};
}
