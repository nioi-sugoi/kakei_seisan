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

| カラム | 型 | 制約 |
|--------|-----|------|
| `id` | TEXT | PK |
| `user_id` | TEXT | NOT NULL, FK → user.id |
| `category` | TEXT | NOT NULL |
| `operation` | TEXT | NOT NULL DEFAULT `'original'` |
| `amount` | INTEGER | NOT NULL |
| `date` | TEXT | NOT NULL |
| `label` | TEXT | NOT NULL |
| `memo` | TEXT | |
| `status` | TEXT | NOT NULL DEFAULT `'approved'` |
| `parent_id` | TEXT | FK → entries.id |
| `approved_by` | TEXT | FK → user.id |
| `approved_at` | INTEGER | |
| `approval_comment` | TEXT | |
| `created_at` | INTEGER | NOT NULL |
| `updated_at` | INTEGER | NOT NULL |

```sql
CHECK (category IN ('advance', 'deposit'))
CHECK (operation IN ('original', 'modification', 'cancellation'))
CHECK (status IN ('approved', 'pending', 'rejected'))
CHECK ((operation = 'original' AND parent_id IS NULL) OR (operation != 'original' AND parent_id IS NOT NULL))
CHECK (operation = 'original' AND amount >= 0 OR operation != 'original')
```

**Index**: `(user_id, status)`, `(user_id, date)`, `(parent_id)`

---

### `settlements`

| カラム | 型 | 制約 |
|--------|-----|------|
| `id` | TEXT | PK |
| `user_id` | TEXT | NOT NULL, FK → user.id |
| `operation` | TEXT | NOT NULL DEFAULT `'original'` |
| `amount` | INTEGER | NOT NULL |
| `date` | TEXT | NOT NULL |
| `status` | TEXT | NOT NULL DEFAULT `'approved'` |
| `parent_id` | TEXT | FK → settlements.id |
| `approved_by` | TEXT | FK → user.id |
| `approved_at` | INTEGER | |
| `approval_comment` | TEXT | |
| `created_at` | INTEGER | NOT NULL |
| `updated_at` | INTEGER | NOT NULL |

```sql
CHECK (operation IN ('original', 'modification', 'cancellation'))
CHECK (status IN ('approved', 'pending', 'rejected'))
CHECK ((operation = 'original' AND parent_id IS NULL) OR (operation != 'original' AND parent_id IS NOT NULL))
CHECK (operation = 'original' AND amount >= 0 OR operation != 'original')
```

**Index**: `(user_id, status)`, `(user_id, date)`, `(parent_id)`

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
- **`type`/`record_kind` → `category`/`operation`**（異なる軸を明確に命名）
- **画像テーブル分割**（`entry_images` / `settlement_images`）排他FK制約より素直なFK NOT NULLに
- **`approvals` テーブル廃止** → entries/settlements に承認カラム統合（承認撤回なし＝1:1、二重管理リスク排除）
- **承認撤回なし** → 取消フロー（cancellation）で代替。残高計算のシンプルさ維持
- **`is_managed` を `partnership` に配置** → パートナー関係がなければ管理モードも存在しないことをスキーマで表現
- **enum CHECK 制約** → SQLite に enum 型がないため、CHECK で値域を制限
- **金額の整合制約** → original は `amount >= 0`、modification/cancellation は負値許容
- **`settlement` に `date` 追加** → 精算日（業務日）を `created_at`（登録時刻）と分離
