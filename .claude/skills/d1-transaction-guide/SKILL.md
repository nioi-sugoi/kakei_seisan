---
name: d1-transaction-guide
description: >
  Cloudflare D1 と Drizzle ORM でトランザクション・バッチ操作・アトミックな複数テーブル書き込みを実装する際のガイドライン。
  db.transaction, db.batch, INSERT, UPDATE, DELETE を複数テーブルにまたがって行う場合に参照する。
---

# Cloudflare D1 + Drizzle ORM トランザクションガイド

このプロジェクトは Cloudflare D1 (SQLite ベース) + Drizzle ORM を使用している。
D1 には通常の RDBMS と異なるトランザクション制約があるため、以下のルールに従うこと。

## 絶対に使ってはいけないもの

### `db.transaction()` は D1 で動かない

Drizzle の `db.transaction()` は内部で `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK` を発行するが、
D1 はこれらの SQL 文を **明示的にブロック** する。実行時エラーになる。

```typescript
// NG: D1 でランタイムエラーになる
await db.transaction(async (tx) => {
  await tx.insert(entries).values({ ... });
  await tx.insert(entryImages).values({ ... });
});
// => D1_ERROR: To execute a transaction, please use the state.storage.transaction() API
//    instead of the SQL BEGIN TRANSACTION or SAVEPOINT statements.
```

関連 Issue: drizzle-orm#2463, drizzle-orm#4212 (2026年3月時点で未修正)

### 生の SQL トランザクション文も禁止

`BEGIN TRANSACTION`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`, `RELEASE SAVEPOINT` はすべて D1 がブロックする。
`db.run(sql.raw("BEGIN TRANSACTION"))` のようなコードも書いてはならない。

## 正しいやり方: `db.batch()`

`db.batch()` は D1 のネイティブ Batch API にマッピングされ、**アトミックな実行** と **失敗時の全体ロールバック** が保証される。

```typescript
// OK: アトミックに実行される
const results = await db.batch([
  db.insert(entries).values({ id: entryId, type, amount, ... }),
  db.insert(entryImages).values({ id: imageId, entryId, imageKey, ... }),
  db.update(partnerships).set({ updatedAt: now }).where(eq(partnerships.id, pid)),
]);
```

### batch 内で使えるクエリビルダー

`db.insert()`, `db.update()`, `db.delete()`, `db.select()`,
`db.query.<table>.findMany()`, `db.query.<table>.findFirst()`,
`db.run()`, `db.all()`, `db.get()`, `db.values()`, `db.execute()`

### batch の制限: 前のクエリの結果を次のクエリで使えない

すべての SQL 文を **事前に組み立てる** 必要がある。
「INSERT して返った ID を次の INSERT で使う」パターンは batch 内では不可能。

## 依存クエリの回避策: UUID 事前生成

このプロジェクトは `text("id").primaryKey()` + `crypto.randomUUID()` を使っているため、
**ID を事前生成してから batch に渡す** のが最適解。

```typescript
// 推奨パターン: UUID を事前生成 → batch でアトミックに INSERT
async function createEntryWithImages(data: CreateEntryInput, images: ImageInput[]) {
  const entryId = crypto.randomUUID();

  await db.batch([
    db.insert(entries).values({
      id: entryId,
      type: data.type,
      amount: data.amount,
      date: data.date,
      ownerId: data.ownerId,
      partnershipId: data.partnershipId,
    }),
    ...images.map((img) =>
      db.insert(entryImages).values({
        id: crypto.randomUUID(),
        entryId,
        imageKey: img.key,
      })
    ),
  ]);

  return entryId;
}
```

## 単一テーブル操作はそのままでよい

D1 は個々の SQL 文を自動コミット (auto-commit) する。
単一テーブルへの INSERT / UPDATE / DELETE は通常どおり書けばよい。

```typescript
// 単一テーブル操作: batch 不要
await db.insert(entries).values({ id: crypto.randomUUID(), ... });
```

## D1 の主な制限値

| 項目 | Free | Paid |
|---|---|---|
| Worker 呼び出しあたりのクエリ数 | 50 | 1,000 |
| SQL 文の最大長 | 100 KB | 100 KB |
| クエリ実行タイムアウト | 30 秒 | 30 秒 |
| バインドパラメータ上限 | 100 | 100 |
| 同時接続数 (Worker あたり) | 6 | 6 |
| DB サイズ | 500 MB | 10 GB |

## チェックリスト

複数テーブルへの書き込みを実装する際は以下を確認:

- [ ] `db.transaction()` を使っていないか → `db.batch()` に置き換える
- [ ] 親子関係のある INSERT で UUID を事前生成しているか
- [ ] batch 内のクエリ数が D1 の上限を超えていないか
- [ ] 単一テーブル操作を不必要に batch で囲んでいないか
