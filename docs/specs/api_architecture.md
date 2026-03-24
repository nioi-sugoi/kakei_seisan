# APIアーキテクチャ設計方針

## 概要

API側のアーキテクチャ設計方針をまとめたドキュメント。
コーディングエージェントが高速にフィードバックループを回せるよう、DBに依存しないテスタブルな設計を前提としている。

## 背景

テスト戦略とアーキテクチャ設計をセットで検討し、以下の方針が決まった。
このドキュメントは今後の機能実装時にエージェント・開発者が参照する設計ガイドラインとなる。

## Feature-based Vertical Slice アーキテクチャ

`api/src/features/` に、ユーザーから見た業務領域単位でディレクトリを切る。
UIの画面単位やDBテーブル単位ではなく、「そのドメインのルールを一箇所で管理できる粒度」で分割する。

本アプリでは以下のfeatureを想定：

| feature | 業務領域 | 主なテーブル |
|---|---|---|
| `entries` | 記録の登録・修正・取り消し・画像 | `entries`, `entry_images` |
| `settlements` | 精算の登録・修正・取り消し | `settlements`, `settlement_images` |
| `balance` | 残高計算 | `entries`, `settlements`（読み取りのみ） |
| `timeline` | 統合タイムライン | `entries`, `settlements`（読み取りのみ） |
| `partner` | パートナー情報取得 | `partnerships` |
| `partner-invitations` | パートナー招待の送受信・承認 | `partner_invitations`, `partnerships` |

各featureは以下のファイルを持つ：

- `domain.ts` — ビジネスルール（純粋関数）
- `repository.ts` — DB操作（drizzle-orm）
- `route.ts` — APIエンドポイント（Hono）
- `types.ts` — 型定義
- `index.ts` — 公開API

ファイルが大きくなったらディレクトリに分割可（`index.ts` で公開APIを維持）。

## 依存ルール

- `domain.ts`: 他featureから参照OK。**`drizzle-orm` / `hono` を import しない**（テスタビリティの生命線）
- `types.ts`: 他featureから参照OK
- `repository.ts` 読み取り: 他featureから参照OK
- `repository.ts` 書き込み: 同一feature内のみ（テーブルへの書き込み所有権はfeature内に閉じる）
- `route.ts`: 外部非公開（appにマウントするだけ）
- 循環依存が発生したら `shared/` に切り出す

## 複数featureにまたがるロジック

feature横断のケースでは、**データの取得（repository）と計算ロジック（domain）を分けて考える**。

例: 精算残高の計算（`立替合計 − 預り合計 − 精算済み合計`）は entries と settlements の両方のデータが必要。

- **データ取得**: route層で各featureのrepositoryを呼び出して組み立てる
- **計算ロジック**: 結果を使う側のfeature（この場合 settlements）の domain に純粋関数として置く。他featureのデータは引数として受け取るだけで、repositoryを直接importしない

```typescript
// settlements/route.ts — データ取得の組み立て
const entries = await entriesRepository.findByUserId(db, userId);
const settlements = await settlementsRepository.findByUserId(db, userId);
const balance = calculateBalance(entries, settlements);

// settlements/domain.ts — 純粋関数（DB依存なし、テスト容易）
export function calculateBalance(entries, settlements): number { ... }
```

domain同士の依存（他featureの types.ts や domain.ts の参照）はOK。純粋関数はデータを引数で受け取るだけなのでテストに影響しない。

その他の方針：
- 最適化が必要な場合はそのfeature自身にrepositoryを持たせる
- shared/services のような共有サービス層は作らない

## route.ts の責務

- コントローラ（HTTP解析・レスポンス）とアプリケーションサービス（ユースケース組み立て）を兼任
- 同じオーケストレーションを複数経路から呼ぶ必要が出たら `service.ts` に分離

## テスト方針

- API: Vitest / Expo: Jest (expo-jest)
- `domain.ts` を純粋関数に保つことでDB不要の高速テスト
- テストファイルは実装と同階層に co-locate
- エージェント用に `check` スクリプト（型チェック + lint + ドメインテスト）を用意

## 命名規則

| 用語 | 英語名 | 意味 |
|------|--------|------|
| 記録 | `entry` | 立替・預りの記録。`entries` テーブルに対応 |
| 精算 | `settlement` | 家計⇔個人間の精算。`settlements` テーブルに対応 |
| イベント | `event` | 記録と精算の総称。タイムラインAPI の返却単位 |

- `entry` と `settlement` はそれぞれの業務領域に固有の名前として使う
- タイムラインのように記録と精算を区別せず扱う文脈では `event` を総称として使う
- フロントエンドの型名・コンポーネント名もこの規則に従う（例: `TimelineEvent`, `TimelineEventCard`）

## 関連

- [#60 テスト基盤の構築](https://github.com/nioi-sugoi/kakei_seisan/issues/60)
