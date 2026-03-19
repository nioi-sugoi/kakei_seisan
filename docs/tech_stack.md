# 技術スタック

## 方針

Cloudflare のエッジコンピューティング基盤を中心に構成する。従量課金の無料枠内で運用できるスタックを選定し、個人開発の規模ではランニングコスト 0 円を目指す。

クライアント（Expo）→ API（Cloudflare Workers）→ DB / ストレージという従来型のアーキテクチャを採用し、アクセス制御は API レイヤーのミドルウェアで行う。

## 全体構成

```
Expo / React Native（モバイルアプリ）
  │
  │ HTTPS
  ▼
Cloudflare Workers + Hono（API サーバー）
  ├── D1（データベース）
  ├── R2（画像ストレージ）
  ├── Better Auth（認証）
  └── Resend（メール送信）
```

## フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| React Native / Expo | SDK 54 | モバイルアプリ基盤 |
| Expo Router | v6 | ファイルベースルーティング |
| TypeScript | ~5.9 | 型安全な開発 |
| NativeWind | - | Tailwind CSS ライクなスタイリング |
| @better-auth/expo | - | 認証クライアント |
| expo-secure-store | - | セッショントークンの安全な保管 |
| expo-image-picker | - | レシート撮影 / ギャラリー選択 |

## バックエンド

| 技術 | 用途 | 選定理由 |
|------|------|----------|
| Cloudflare Workers | 実行環境 | エッジ実行、従量課金、無料枠が大きい |
| Hono | API フレームワーク | Workers 最速、TypeScript ファースト、ミドルウェア機構、Cloudflare 公式推奨 |
| Drizzle ORM | DB 操作 / マイグレーション | D1 公式サポート、型安全、軽量 |
| Valibot + @hono/valibot-validator | リクエストバリデーション | モジュラー設計でTree-shaking が効きバンドルが極小、Hono 公式統合あり |

### Cloudflare サービス

| サービス | 用途 | バインディング名 |
|---------|------|-----------------|
| D1 | メインデータベース（SQLite 互換） | `DB` |
| R2 | レシート画像ストレージ | `RECEIPTS` |

Workers と D1 / R2 はバインディング（Cloudflare インフラ内の内部接続）で繋がるため、接続文字列やパスワードの管理は不要。

## 認証

| 技術 | 用途 |
|------|------|
| Better Auth | 認証エンジン（サーバーサイド） |
| @better-auth/expo | Expo 用クライアント（SecureStore ベースのセッション管理） |
| Resend | 認証コード（OTP）メールの送信 |

### セッション管理方式（採用）

- **方式**: ステートフルセッション（server-side session）
- **正本**: Better Auth のセッションは D1 に保存する
- **クライアント保存**: Expo 側は `expo-secure-store` にセッション情報を保存
- **長期ログイン**: 短命 access（目安: 15〜30分）+ 長命 refresh（目安: 90〜180日）で自動更新
- **認可の最終判定**: 承認・拒否・モード変更などの重要操作は、トークン情報だけでなく D1 の最新権限を API で再確認する

### 認証方式

| 方式 | 実現方法 |
|------|----------|
| メールOTP | Better Auth `emailOTP` プラグイン + Resend でコード送信 |
| Google ログイン | Better Auth `socialProviders.google` |
| Apple ログイン | Better Auth `socialProviders.apple` |

## 画像ストレージ

レシート画像（1 レコードあたり最大 2 枚）の保存に Cloudflare R2 を使用する。

- **アップロード**: API が presigned PUT URL を発行 → クライアントが R2 に直接アップロード
- **ダウンロード**: API が presigned GET URL を発行 → クライアントが R2 から直接取得
- **アクセス制御**: presigned URL 発行時に API 側で認証・認可チェック（R2 自体にアクセス制御機能はない）
- **パス規約**: `receipts/{user_id}/{entry_id|settlement_id}/{filename}`

## 無料枠

| サービス | 無料枠 | 想定使用量（2 人の家計アプリ） |
|---------|--------|----------------------------|
| Workers | 10 万リクエスト / 日 | 数百リクエスト / 日 |
| D1 | 5GB、読取 500 万 / 日、書込 10 万 / 日 | レコード数百件、KB 単位 |
| R2 | 10GB、読取 1,000 万 / 月 | レシート画像数百枚、数百 MB |
| Resend | 3,000 通 / 月 | 認証コード、月数回 |
