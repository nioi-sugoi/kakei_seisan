import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { partnerships } from "../db/schema";

/**
 * sqlite_master からユーザーテーブルを動的に取得し、全行削除する。
 * テーブルのハードコードが不要になり、スキーマ追加時の削除し忘れを防ぐ。
 *
 * sqlite_master はテーブル作成順で返すため、逆順にすると
 * 子テーブル → 親テーブルの FK 安全な削除順になる。
 */
export async function cleanAllTables() {
	const { results } = await env.DB.prepare(
		"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf_%'",
	).all<{ name: string }>();
	for (const { name } of results.reverse()) {
		await env.DB.exec(`DELETE FROM "${name}"`);
	}
}

export async function insertPartnership(inviterId: string, inviteeId: string) {
	const db = drizzle(env.DB);
	const [partnership] = await db
		.insert(partnerships)
		.values({
			id: crypto.randomUUID(),
			inviterId,
			inviteeId,
			createdAt: Date.now(),
		})
		.returning();
	return partnership;
}
