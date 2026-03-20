import { format, parseISO } from "date-fns";

export function formatAmount(amount: number): string {
	return `¥${amount.toLocaleString()}`;
}

export function formatDateShort(dateStr: string): string {
	return format(parseISO(dateStr), "M/d");
}

export function formatDateFull(dateStr: string): string {
	return format(parseISO(dateStr), "yyyy年M月d日");
}
