ドキュメント類はdocs配下にある。
specs/　アプリ仕様書。タスク実行中の議論で加筆修正が必要になった場合は適宜行うこと。
v0_design/ Vercelのv0で作ったデザインモック

## パッケージマネージャ
- このプロジェクトは **pnpm ワークスペース** で管理されている。パッケージの追加・削除は必ず `pnpm add` / `pnpm remove` を使うこと
- `npm install` / `yarn add` は使用禁止。npm は独立した `node_modules` と `package-lock.json` を生成し、pnpm のホイスティング・dedup を破壊してバージョン不整合やバンドルエラーを引き起こす

## ツール実行時の注意事項

Bash toolはサンドボックス上で実行されるため、ファイルアクセスやネットワーク接続がエラーになることがある。

## 開発サーバー起動
- ワークツリーごとに `.env.worktree` でポートをずらしているため、開発サーバーは必ず pnpm スクリプト経由で起動すること
  - API: `pnpm --filter api dev`
  - Expo: `pnpm --filter expo-app start`（`start` スクリプトが `.env.worktree` の `EXPO_PORT` を参照する）
- `npx expo start` や `npx wrangler dev` を直接実行するとポート競合が起きる

## 開発フロー
- Issue番号に対応してissue-XXXXのブランチを作成して開発を行う
- イシューを始める時はGithubProjectsでのステータスも同時に更新しておく
- マージ前のPRに依存しているイシューを実装する場合は、依存先のブランチから新しくブランチを作り、依存先に向けてPRを作る
- 基本的にはremoteから最新のmainブランチをcheckoutし、そこから作業ブランチを切る
- コミットする際にはCLAUDE.local.mdや.claude/settings.local.jsonも含めること。
- 実装のキリがいいタイミング（コミット前やPR作成前など）で以下を実行して問題がないことを確認する:
  - 型チェック: `pnpm --filter expo-app typecheck`（typed routesの再生成 + tsc）
  - テスト: `cd expo && pnpm test`
  - Lint/Format: `pnpm lint`（ルートで実行、Biome）

### イシュー遂行の定型フロー
GitHubイシューの実装を依頼されたら、以下の手順で進める。

1. **ワークツリー作成**: `EnterWorktree` ツールを使用してワークツリー環境を作成し、イシュー番号に対応したブランチ `issue-XXXX` を作成して作業を開始する
2. **実装**: イシューの内容に従い実装を行う。上記チェック（型チェック・テスト・Lint）をPR作成前に実行すること
3. **PR作成**: 実装完了後、PRを作成する
   - PR説明文のガイドライン:
     - イシューと重複する内容は書かない
     - ベストプラクティスから乖離した実装がある場合はその内容と理由を記載する
     - 妥協した実装・設計がある場合はその内容と理由を記載する
     - イシューと矛盾する実装内容や、イシューに書いていないが実装で考慮した仕様は積極的に記入する
     - テストプランは書かない
   - PR説明文はステップ4のレビュー対応後に最終版を書けばよい
4. **セルフレビュー**: PR作成後、以下を **直列で** 実行する
   1. `/simplify` スキルでコード品質レビュー・修正
   2. `codex exec` コマンドでCodexからのコードレビューを受けて対応
5. **push**: レビュー対応が完了したらpushする。PR説明文の最終版もここで記載する

## テスト
- テストファイルはコンポーネントと同階層に `foo.test.tsx` として配置する（`__tests__/` ディレクトリは使わない）
- RNTLでは `fireEvent` ではなく `userEvent` を使う（`userEvent` がカバーしない `onKeyPress` 等のみ `fireEvent` で補完）
- ユーザーの体験になるべく近い層でテストする。画面単位が基本だが、複雑なページではコンポーネント単位に細分化してよい。コールバック引数ではなく、画面に表示される結果やAPIに渡る値を検証する
- アサーションはユーザーが見るもの（表示テキスト、エラーメッセージ）か外部への出力（API呼び出し）に限定する
- モックは外部境界（API、ルーター）にだけ置く。内部コンポーネントやフックはモックしない
- テスト基盤はデファクトスタンダード（Jest + jest-expo + RNTL）に従う
- `it.each` / `test.each` は使わず愚直に個別のテストケースとして書く（可読性優先）
- 画面全体から `screen.getByText` / `screen.getAllByText` で文字列を検索して検証するのは避ける。`within()` で対象のカードやセクションにスコープを絞るか、`getByRole` の `name` オプションで特定してから内容を検証すること（他コンポーネントの追加で壊れる偽陰性・偽陽性を防ぐ）

## ローカルDB
- dev server が使用するD1データベースは `api/.wrangler/` ではなく **`.wrangler-shared/v3/d1/`**（リポジトリルート）にある。DB操作は共有DBに対して行うこと

## データベース
- `api/src/db/schema.ts` を変更したら `cd api && npx drizzle-kit generate` でマイグレーションを生成し、`api/drizzle/` 配下のSQLファイルとメタデータも一緒にコミットすること

## 型安全性
- 型アサーション（`as`）は原則使用禁止。ランタイムチェック（条件分岐・型ガード）で型を絞り込むこと
  - `as const` は安全な用法なので許可
  - `as const` 以外の `as` がどうしても必要な場合はコメントで理由を記載
- non-null assertion（`!`）は使用禁止。null チェックまたはミドルウェアの型推論で解決すること
- `any` 型は使用禁止。`unknown` を使い、型ガードで絞り込むこと

## パフォーマンス最適化
- `useCallback` / `useMemo` / `React.memo` は、計測して必要と判明してから適用する。予防的なメモ化はしない

## NativeWind 既知の問題
- `shadow-*` や `bg-xxx/opacity` を条件付きclassNameで動的にトグルすると、CSSインターオプがReact Navigationのコンテキスト伝播を破壊してクラッシュする（[nativewind#1466](https://github.com/nativewind/nativewind/issues/1466), [#1711](https://github.com/nativewind/nativewind/issues/1711)）。これらのユーティリティは条件付きclassNameで使わないこと