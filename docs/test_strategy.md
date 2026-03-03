# テスト戦略: かんたん家計精算

## Context

React Native / Expo / Supabase アプリの実装開始前にテスト戦略を策定する。
このアプリはビジネスロジック（残高計算、差分レコードによる修正/取消、承認フロー、モード切替）が複雑で、金額に関わるため計算ミスの影響が大きい。
UIの複雑さは中程度。**ビジネスロジックを純粋関数としてUIから分離し、ユニットテストで厚くカバーする**のが最も費用対効果が高い。

---

## テストピラミッド

```
         /  E2E  \           5%  — Maestro: 2-3本のクリティカルパス
        /----------\
       / Integration \       10% — Supabase ローカル: RLS・RPC・招待コード
      /----------------\
     / Component Tests   \   25% — RNTL: 画面描画・インタラクション
    /----------------------\
   /    Unit Tests           \  60% — Jest: 残高計算・修正取消・バリデーション・状態遷移
  /--------------------------\
```

---

## ツール選定

| 用途 | ツール | 理由 |
|------|--------|------|
| テストランナー | **Jest** (expo-jest プリセット) | Expo SDK 同梱。設定最小限 |
| コンポーネントテスト | **React Native Testing Library** | RN 推奨。アクセシビリティベースのクエリ |
| API モック | **MSW** | Supabase クライアントの HTTP をインターセプト。実コードパスを通る |
| Integration | **Supabase CLI ローカル** + Jest | `supabase start` で RLS・RPC を実 DB 上で検証 |
| E2E | **Maestro** | YAML ベースで記述が簡潔。Detox より導入が容易 |

---

## テスト優先順位

### Tier 1: 必ず書く（実装と同時、TDD推奨）

| 対象 | テスト内容 | リスク |
|------|-----------|--------|
| **残高計算** | 立替−預り−精算の集計、承認待ち除外、cancelled/modified除外、マイナス残高 | 金額誤表示 |
| **差分レコード生成** | 修正時の差分計算、取消時の打ち消し、承認待ちの直接編集判定 | データ不整合 |
| **精算バリデーション** | 精算額≤残高、0以下禁止、マイナス残高時の絶対値比較 | 過払い発生 |
| **承認状態遷移** | pending→approved/rejected、残高反映可否 | 残高不一致 |
| **モード切替** | 管理→共有で自動承認、共有→管理で既存に影響なし、変更権限チェック | 状態矛盾 |

### Tier 2: コア画面実装後

- 記録登録フォーム（金額≥0、ラベル必須、画像2枚制限）
- タイムライン（フィルタ、月セクション、修正/取消バッジ）
- 精算画面（残高表示、全額精算ボタン、プラス/マイナス表現切替）
- Supabase RLS ポリシー（自分の記録のみ書込可、パートナーは読取のみ）

### Tier 3: 安定期

- E2E: 記録登録→精算の一連フロー
- E2E: パートナー招待→承認フロー
- 招待コードの有効期限・使い切り

---

## 書かないテスト（意図的に省略）

- NativeWind スタイリング — 視覚確認に頼る。スナップショットテストは壊れやすいので不使用
- Supabase Auth 認証詳細 — SDK 責務。テスト環境では認証バイパス
- ナビゲーション遷移の網羅 — E2E で間接カバー

---

## テストデータ戦略

- **ユニット/コンポーネント**: `createRecord()` ファクトリ関数 + シナリオ別フィクスチャ
- **Integration**: `supabase/seed.sql` で初期データ、テストごとにリセット
- **MSW**: デフォルト成功レスポンス + テストごとのオーバーライド
- 元データ: `docs/v0_design/sample-data.ts` と `docs/v0_design/types.ts` をベースに構成

---

## ファイル配置

```
src/
  lib/
    balance.ts / __tests__/balance.test.ts
    record-modification.ts / __tests__/record-modification.test.ts
    settlement-validation.ts / __tests__/settlement-validation.test.ts
    mode-transition.ts / __tests__/mode-transition.test.ts
    invitation.ts / __tests__/invitation.test.ts
  screens/__tests__/          — 画面のコンポーネントテスト
  components/__tests__/       — 共通コンポーネントのテスト
  test/
    fixtures/records.ts       — 共通フィクスチャ
    mocks/handlers.ts         — MSW ハンドラー
  __integration__/            — Supabase 連携テスト
e2e/                          — Maestro YAML
supabase/
  seed.sql                    — テスト用初期データ
```

---

## CI パイプライン

```
PR Push:
  1. tsc --noEmit                                    — 数秒
  2. Biome lint                                      — 数秒
  3. Jest (ユニット + コンポーネント)                — 30秒-1分
  4. Jest (Integration / Supabase ローカル)          — 1-2分

main マージ時のみ追加:
  5. Maestro E2E                                     — 3-5分
```

---

## 段階的導入ロードマップ

| Phase | タイミング | 内容 |
|-------|-----------|------|
| 1 | プロジェクト初期設定 | Jest + RNTL + MSW セットアップ、ファクトリ関数作成、CI設定 |
| 2 | コアロジック実装時 | Tier 1 ユニットテスト（TDD推奨） |
| 3 | 画面実装時 | Tier 2 コンポーネントテスト + MSW |
| 4 | Supabase スキーマ確定後 | RLS / RPC の Integration テスト + seed.sql |
| 5 | 主要フロー完成後 | Maestro E2E 2-3本 |
