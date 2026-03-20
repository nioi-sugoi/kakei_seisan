import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { DetailedError, parseResponse } from "hono/client";
import * as v from "valibot";
import { format } from "date-fns";
import { client } from "@/lib/api-client";

function getApiErrorMessage(error: Error): string {
	if (error instanceof DetailedError) {
		const data = error.detail?.data;
		if (data && typeof data === "object" && "error" in data) {
			return String(data.error);
		}
	}
	return error.message;
}

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

	const mutation = useMutation({
		mutationFn: (input: v.InferOutput<typeof createEntrySchema>) =>
			parseResponse(client.api.entries.$post({ json: input })),
		onSuccess: () => {
			router.replace("/(tabs)");
		},
	});

	const form = useForm({
		defaultValues: {
			category: "advance" as "advance" | "deposit",
			amount: "",
			date: format(new Date(), "yyyy-MM-dd"),
			label: "",
			memo: "",
		},
		validators: {
			onSubmit: ({ value }) => {
				const result = v.safeParse(createEntrySchema, {
					...value,
					memo: value.memo || undefined,
				});
				if (!result.success) {
					const flat = v.flatten(result.issues);
					const fields: Record<string, string> = {};
					for (const [key, messages] of Object.entries(flat.nested ?? {})) {
						if (messages?.[0]) fields[key] = messages[0];
					}
					return { fields };
				}
				return undefined;
			},
		},
		onSubmit: ({ value }) => {
			mutation.mutate(
				v.parse(createEntrySchema, {
					...value,
					memo: value.memo || undefined,
				}),
			);
		},
	});

	return {
		form,
		error: mutation.error ? getApiErrorMessage(mutation.error) : "",
		loading: mutation.isPending,
		goBack: () => router.back(),
	};
}
