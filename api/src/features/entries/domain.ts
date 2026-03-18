import type { CreateEntryInput } from "./types";

export type ValidationError = {
	field: string;
	message: string;
};

/**
 * valibot スキーマでカバーできないビジネスルールを検証する。
 * 型・形式チェック（category, amount, label, date format）は route.ts の valibot で実施済み。
 */
export function validateCreateEntry(
	input: CreateEntryInput,
): ValidationError[] {
	const errors: ValidationError[] = [];

	if (!isValidCalendarDate(input.date)) {
		errors.push({
			field: "date",
			message: "実在する日付を指定してください",
		});
	}

	return errors;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD 形式の文字列がカレンダー上に実在するか検証する */
function isValidCalendarDate(dateStr: string): boolean {
	if (!DATE_REGEX.test(dateStr)) return false;
	const [y, m, d] = dateStr.split("-").map(Number);
	const date = new Date(y, m - 1, d);
	return (
		date.getFullYear() === y &&
		date.getMonth() === m - 1 &&
		date.getDate() === d
	);
}
