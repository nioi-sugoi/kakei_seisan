import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export function formatAmount(amount: number): string {
	return `¥${amount.toLocaleString()}`;
}

export function formatDateShort(date: string | number): string {
	const d = typeof date === "string" ? parseISO(date) : new Date(date);
	return format(d, "M月d日");
}

export function formatDateFull(dateStr: string): string {
	return format(parseISO(dateStr), "yyyy年M月d日");
}

export function formatRemainingTime(expiresAtMs: number): string {
	return `あと${formatDistanceToNow(new Date(expiresAtMs), { locale: ja })}`;
}
