import { format, parse } from "date-fns";

const ISO_DATE_FORMAT = "yyyy-MM-dd";

/** 今日の日付を YYYY-MM-DD 形式で返す */
export function formatToday(): string {
	return format(new Date(), ISO_DATE_FORMAT);
}

/** Date オブジェクトを YYYY-MM-DD 形式に変換する */
export function formatDate(date: Date): string {
	return format(date, ISO_DATE_FORMAT);
}

/** YYYY-MM-DD 形式を Date オブジェクトに変換する */
export function parseDate(dateStr: string): Date {
	return parse(dateStr, ISO_DATE_FORMAT, new Date());
}

/** YYYY-MM-DD 形式を「YYYY年M月D日」に変換する */
export function formatDisplayDate(dateStr: string): string {
	return format(
		parse(dateStr, ISO_DATE_FORMAT, new Date()),
		"yyyy年M月d日",
	);
}
