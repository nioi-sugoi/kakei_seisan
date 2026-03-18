import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { apiPost } from "@/lib/api-client";

type Category = "advance" | "deposit";

function formatToday(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function useRecordForm() {
	const router = useRouter();
	const [category, setCategory] = useState<Category>("advance");
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(formatToday);
	const [label, setLabel] = useState("");
	const [memo, setMemo] = useState("");
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);

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

	const submit = useCallback(async () => {
		if (!validate()) return;

		setError("");
		setLoading(true);

		try {
			const { error: apiError } = await apiPost("/entries", {
				category,
				amount: Number(amount),
				date,
				label: label.trim(),
				memo: memo.trim() || undefined,
			});

			if (apiError) {
				setError(apiError.message);
				if (apiError.issues) {
					const errs: Record<string, string> = {};
					for (const issue of apiError.issues) {
						errs[issue.field] = issue.message;
					}
					setFieldErrors(errs);
				}
				return;
			}

			router.replace("/(tabs)");
		} catch {
			setError("ネットワークエラーが発生しました");
		} finally {
			setLoading(false);
		}
	}, [category, amount, date, label, memo, validate, router]);

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
		loading,
		submit,
	};
}
