# DBスキーマ設計（草案）

> **NOTE: このドキュメントは草案（draft）です。**
> Issue #7 のコメントで議論・決定された内容をドキュメント化したものであり、今後の実装を通じて変更される可能性があります。
> 実装コード（`api/src/db/schema.ts`）が正とし、乖離がある場合はコード側を優先してください。

## Better Auth 管理テーブル

Better Auth が管理する `user`, `session`, `account`, `verification` テーブルはフレームワークの仕様に準拠。
詳細は Better Auth ドキュメントを参照。

## アプリケーションテーブル

### `partnerships`

| カラム | 型 | 制約 |
|--------|-----|------|
| `id` | TEXT | PK |
| `inviter_id` | TEXT | NOT NULL, FK → user.id, UNIQUE |
| `invitee_id` | TEXT | NOT NULL, FK → user.id, UNIQUE |
| `inviter_is_managed` | INTEGER | NOT NULL DEFAULT 0 |
| `invitee_is_managed` | INTEGER | NOT NULL DEFAULT 0 |
| `created_at` | INTEGER | NOT NULL |

```sql
CHECK (inviter_id != invitee_id)
```

---

### `partner_invitations`

| カラム | 型 | 制約 |
|--------|-----|------|
| `id` | TEXT | PK |
| `inviter_id` | TEXT | NOT NULL, FK → user.id |
| `invitee_email` | TEXT | NOT NULL |
| `status` | TEXT | NOT NULL DEFAULT `'pending'` |
| `expires_at` | INTEGER | NOT NULL |
| `created_at` | INTEGER | NOT NULL |

```sql
CHECK (status IN ('pending', 'accepted', 'expired'))
```

---

### `entries`

記録のバージョン管理テーブル。修正・取り消しは新しいバージョンのレコードを作成することで表現する。

| カラム | 型 | 制約 |
|--------|-----|------|
| `id` | TEXT | PK |
| `user_id` | TEXT | NOT NULL, FK → user.id |
| `category` | TEXT | NOT NULL |
| `amount` | INTEGER | NOT NULL |
| `occurred_on` | TEXT | NOT NULL |
| `label` | TEXT | NOT NULL |
| `memo` | TEXT | |
| `original_id` | TEXT | NOT NULL, FK → entries.id |
| `cancelled` | INTEGER | NOT NULL DEFAULT 0 |
| `latest` | INTEGER | NOT NULL DEFAULT 1 |
| `status` | TEXT | NOT NULL DEFAULT `'approved'` |
| `approved_by` | TEXT | FK → user.id |
| `approved_at` | INTEGER | |
| `approval_comment` | TEXT | |
| `created_at` | INTEGER | NOT NULL |
| `updated_at` | INTEGER | NOT NULL |

```sql
CHECK (category IN ('advance', 'deposit'))
CHECK (amount >= 0)
CHECK (status IN ('approved', 'pending', 'rejected'))
CHECK (cancelled IN (0, 1))
CHECK (latest IN (0, 1))
```

**Index**: `(user_id, status)`, `(user_id, occurred_on)`, `(original_id)`, `(user_id, latest)`

**バージョン管理の仕組み:**

- 新規作成: `original_id = 自身の id`, `latest = true`
- 修正: `original_id = 初版の id`, `latest = true`。旧バージョンは `latest = false` に更新。バージョン順は `created_at` で判定
- 取り消し: 修正と同様に新バージョンを作成し `cancelled = true` を設定。`amount` には取消直前の金額を保持（表示用）
- **残高計算**: `latest = true AND cancelled = false` のレコードのみ対象。`SUM(CASE WHEN category = 'advance' THEN amount ELSE -amount END)`

---

### `settlements`

精算のバージョン管理テーブル。entries と同様のバージョン管理構造を持つ。

| カラム | 型 | 制約 |
|--------|-----|------|
| `id` | TEXT | PK |
| `user_id` | TEXT | NOT NULL, FK → user.id |
| `amount` | INTEGER | NOT NULL |
| `occurred_on` | TEXT | NOT NULL |
| `original_id` | TEXT | NOT NULL, FK → settlements.id |
| `cancelled` | INTEGER | NOT NULL DEFAULT 0 |
| `latest` | INTEGER | NOT NULL DEFAULT 1 |
| `status` | TEXT | NOT NULL DEFAULT `'approved'` |
| `approved_by` | TEXT | FK → user.id |
| `approved_at` | INTEGER | |
| `approval_comment` | TEXT | |
| `created_at` | INTEGER | NOT NULL |
| `updated_at` | INTEGER | NOT NULL |

```sql
CHECK (amount >= 0)
CHECK (status IN ('approved', 'pending', 'rejected'))
CHECK (cancelled IN (0, 1))
CHECK (latest IN (0, 1))
```

**Index**: `(user_id, status)`, `(user_id, occurred_on)`, `(original_id)`, `(user_id, latest)`

---

### `entry_images`

| カラム | 型 | 制約 |
|--------|-----|------|
| `id` | TEXT | PK |
| `entry_id` | TEXT | NOT NULL, FK → entries.id |
| `storage_path` | TEXT | NOT NULL |
| `display_order` | INTEGER | NOT NULL DEFAULT 0 |
| `created_at` | INTEGER | NOT NULL |

**Index**: `(entry_id)`

---

### `settlement_images`

| カラム | 型 | 制約 |
|--------|-----|------|
| `id` | TEXT | PK |
| `settlement_id` | TEXT | NOT NULL, FK → settlements.id |
| `storage_path` | TEXT | NOT NULL |
| `display_order` | INTEGER | NOT NULL DEFAULT 0 |
| `created_at` | INTEGER | NOT NULL |

**Index**: `(settlement_id)`

---

## 主な設計判断

- **`profiles` 廃止** → Better Auth の `user` テーブルを直接利用（Better Auth テーブルも自前管理のため分離不要）
- **招待コード廃止** → メールアドレス指定方式に変更（ブルートフォースリスク排除）
- **`records` → `entries`**（DB用語との混同回避）
- **画像テーブル分割**（`entry_images` / `settlement_images`）排他FK制約より素直なFK NOT NULLに
- **`approvals` テーブル廃止** → entries/settlements に承認カラム統合（承認撤回なし＝1:1、二重管理リスク排除）
- **承認撤回なし** → 取消フロー（cancellation）で代替。残高計算のシンプルさ維持
- **`is_managed` を `partnership` に配置** → パートナー関係がなければ管理モードも存在しないことをスキーマで表現
- **enum CHECK 制約** → SQLite に enum 型がないため、CHECK で値域を制限
- **金額は常に正** → `amount >= 0` を全バージョンで保証。差分レコード方式の負値許容を廃止
- **`settlement` に `occurred_on` 追加** → 精算日（業務日）を `created_at`（登録時刻）と分離
- **バージョン管理方式** → 差分レコード（operation: modification/cancellation）方式を廃止。修正・取消は新バージョンのレコードとしてフルスナップショットを保存。金額が常に正で意味が明確
- **`latest` カラム（非正規化）** → 最新バージョンを即座にクエリ可能にするためのフラグ。新バージョン作成時にバッチ操作で旧バージョンの `latest` を `false` に更新
- **`original_id` は NOT NULL** → 初版は自身の ID を `original_id` に設定。バージョングループの識別が常に `original_id` で統一的に行える
