import type { CreateEntryInput } from "./types";

export type ValidationError = {
	field: string;
	message: string;
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(dateStr: string): boolean {
	if (!DATE_REGEX.test(dateStr)) return false;
	const [y, m, d] = dateStr.split("-").map(Number);
	const date = new Date(y, m - 1, d);
	return (
		date.getFullYear() === y &&
		date.getMonth() === m - 1 &&
		date.getDate() === d
	);
}

export function validateCreateEntry(
	input: CreateEntryInput,
): ValidationError[] {
	const errors: ValidationError[] = [];

	if (input.category !== "advance" && input.category !== "deposit") {
		errors.push({
			field: "category",
			message: "種別は advance または deposit を指定してください",
		});
	}

	if (!Number.isInteger(input.amount) || input.amount < 0) {
		errors.push({
			field: "amount",
			message: "金額は0以上の整数を指定してください",
		});
	}

	if (!isValidDate(input.date)) {
		errors.push({
			field: "date",
			message: "日付は YYYY-MM-DD 形式の実在する日付を指定してください",
		});
	}

	if (!input.label || input.label.trim().length === 0) {
		errors.push({
			field: "label",
			message: "ラベルは必須です",
		});
	}

	return errors;
}
