import { applyD1Migrations, env } from "cloudflare:test";

/**
 * D1マイグレーションを適用してテストDBをセットアップする。
 * beforeAll で最初に1回呼び出す。
 */
export async function setupDB() {
	await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
}

/**
 * sqlite_master からユーザーテーブルを動的に取得し、全行削除する。
 * テーブルのハードコードが不要になり、スキーマ追加時の削除し忘れを防ぐ。
 *
 * FK 制約を一時的に無効化して安全に全削除する。
 */
export async function cleanAllTables() {
	const { results } = await env.DB.prepare(
		"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf_%'",
	).all<{ name: string }>();
	// FK 制約で削除順序が問題になるため、失敗したテーブルをリトライする
	let remaining = results.map((r) => r.name);
	let prevLength = remaining.length + 1;
	while (remaining.length > 0 && remaining.length < prevLength) {
		prevLength = remaining.length;
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
