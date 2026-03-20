import { env } from "cloudflare:test";

/**
 * sqlite_master からユーザーテーブルを動的に取得し、全行削除する。
 * テーブルのハードコードが不要になり、スキーマ追加時の削除し忘れを防ぐ。
 *
 * D1 は PRAGMA foreign_keys = OFF をサポートしないため、
 * FK 制約で失敗したテーブルをリトライして依存順を自動解決する。
 */
export async function cleanAllTables() {
	const { results } = await env.DB.prepare(
		"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf_%'",
	).all<{ name: string }>();
	let remaining = results.map((r) => r.name);
	for (let pass = 0; pass < 3 && remaining.length > 0; pass++) {
		const failed: string[] = [];
		for (const name of remaining) {
			try {
				await env.DB.exec(`DELETE FROM "${name}"`);
			} catch {
				failed.push(name);
			}
		}
		remaining = failed;
	}
}
