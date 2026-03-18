/** 今日の日付を YYYY-MM-DD 形式で返す */
export function formatToday(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD 形式を「YYYY年M月D日」に変換する */
export function formatDisplayDate(dateStr: string): string {
	const [y, m, d] = dateStr.split("-");
	return `${y}年${Number(m)}月${Number(d)}日`;
}
