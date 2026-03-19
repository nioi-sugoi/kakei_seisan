import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { DetailedError, parseResponse } from "hono/client";
import { useState } from "react";
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
	memo: v.optional(v.string()),
});

export function useEntryForm() {
	const router = useRouter();
	const [category, setCategory] = useState<"advance" | "deposit">("advance");
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
	const [label, setLabel] = useState("");
	const [memo, setMemo] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const mutation = useMutation({
		mutationFn: (input: v.InferOutput<typeof createEntrySchema>) =>
			parseResponse(client.api.entries.$post({ json: input })),
		onSuccess: () => {
			router.replace("/(tabs)");
		},
		onError: (err) => {
			if (err instanceof DetailedError) {
				const detail = err.detail as {
					error: string;
					issues?: { field: string; message: string }[];
				};
				if (detail.issues) {
					const errs: Record<string, string> = {};
					for (const issue of detail.issues) {
						errs[issue.field] = issue.message;
					}
					setFieldErrors(errs);
				}
			}
		},
	});

	const goBack = () => {
		router.back();
	};

	const submit = () => {
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
	};

	const error =
		mutation.error instanceof DetailedError
			? (mutation.error.detail as { error: string }).error
			: (mutation.error?.message ?? "");

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
