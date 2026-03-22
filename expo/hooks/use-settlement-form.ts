import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import * as v from "valibot";
import { useCreateSettlement } from "./use-create-settlement";
import { useModifySettlement } from "./use-modify-settlement";

const settlementFieldSchema = {
	amount: v.pipe(
		v.string(),
		v.minLength(1, "1以上の整数を入力してください"),
		v.transform(Number),
		v.integer("1以上の整数を入力してください"),
		v.minValue(1, "1以上の整数を入力してください"),
	),
};

const createSettlementSchema = v.object(settlementFieldSchema);

type ModifyTarget = {
	id: string;
	amount: number;
	occurredOn: string;
};

export function useCreateSettlementForm(balance: number) {
	const router = useRouter();
	const mutation = useCreateSettlement();
	const absBalance = Math.abs(balance);

	const maxAmountSchema = v.object({
		amount: v.pipe(
			v.string(),
			v.minLength(1, "1以上の整数を入力してください"),
			v.transform(Number),
			v.integer("1以上の整数を入力してください"),
			v.minValue(1, "1以上の整数を入力してください"),
			v.maxValue(
				absBalance,
				`精算額は残高（¥${absBalance.toLocaleString()}）以下にしてください`,
			),
		),
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
				amount: parsed.amount,
				occurredOn: format(new Date(), "yyyy-MM-dd"),
			});
		},
	});

	return {
		form,
		serverError: mutation.error ? "エラーが発生しました" : "",
		loading: mutation.isPending,
		goBack: () => router.back(),
	};
}

export function useModifySettlementForm(target: ModifyTarget) {
	const router = useRouter();
	const modifyMutation = useModifySettlement(target.id);

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
			modifyMutation.mutate({
				amount: parsed.amount,
			});
		},
	});

	return {
		form,
		serverError: modifyMutation.error ? modifyMutation.error.message : "",
		loading: modifyMutation.isPending,
		goBack: () => router.back(),
	};
}
