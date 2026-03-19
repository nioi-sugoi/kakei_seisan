import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { apiPost } from "@/lib/api-client";
import { formatToday } from "@/lib/date";

type Category = "advance" | "deposit";

type ApiError = {
	message: string;
	issues?: { field: string; message: string }[];
};

export function useEntryForm() {
	const router = useRouter();
	const [category, setCategory] = useState<Category>("advance");
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(formatToday);
	const [label, setLabel] = useState("");
	const [memo, setMemo] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const mutation = useMutation({
		mutationFn: async (input: {
			category: Category;
			amount: number;
			date: string;
			label: string;
			memo?: string;
		}) => {
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

	const validate = useCallback((): boolean => {
		const errors: Record<string, string> = {};

		const parsedAmount = Number(amount);
		if (!amount || !Number.isInteger(parsedAmount) || parsedAmount < 0) {
			errors.amount = "0以上の整数を入力してください";
		}

		if (!label.trim()) {
			errors.label = "ラベルは必須です";
		}

		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			errors.date = "日付を選択してください";
		}

		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	}, [amount, label, date]);

	const goBack = useCallback(() => {
		router.back();
	}, [router]);

	const submit = useCallback(() => {
		if (!validate()) return;

		mutation.mutate({
			category,
			amount: Number(amount),
			date,
			label: label.trim(),
			memo: memo.trim() || undefined,
		});
	}, [category, amount, date, label, memo, validate, mutation]);

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
