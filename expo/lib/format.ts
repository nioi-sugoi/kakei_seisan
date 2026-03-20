import { format, parseISO } from "date-fns";

export function formatAmount(amount: number): string {
	return `¥${Math.abs(amount).toLocaleString()}`;
}

/** 符号付き金額表示（修正・取消レコード用） */
export function formatSignedAmount(amount: number): string {
	const prefix = amount >= 0 ? "+" : "-";
	return `${prefix}¥${Math.abs(amount).toLocaleString()}`;
}

export function formatDateShort(dateStr: string): string {
	return format(parseISO(dateStr), "M/d");
}

export function formatDateFull(dateStr: string): string {
	return format(parseISO(dateStr), "yyyy年M月d日");
}
