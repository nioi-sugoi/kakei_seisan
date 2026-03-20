import { format, parseISO } from "date-fns";

export function formatAmount(amount: number): string {
	return `¥${amount.toLocaleString()}`;
}

export function formatDateFull(dateStr: string): string {
	return format(parseISO(dateStr), "yyyy年M月d日");
}
