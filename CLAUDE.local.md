ドキュメント類はdocs配下にある。
specs/　アプリ仕様書。タスク実行中の議論で加筆修正が必要になった場合は適宜行うこと。
v0_design/ Vercelのv0で作ったデザインモック

## ツール実行時の注意事項

Bash toolはサンドボックス上で実行されるため、ファイルアクセスやネットワーク接続がエラーになることがある。

## 開発フロー
- Issue番号に対応してissue-XXXXのブランチを作成して開発を行う
- イシューを始める時はGithubProjectsでのステータスも同時に更新しておく
- マージ前のPRに依存しているイシューを実装する場合は、依存先のブランチから新しくブランチを作り、依存先に向けてPRを作る
- 基本的にはremoteから最新のmainブランチをcheckoutし、そこから作業ブランチを切る
- コミットする際にはCLAUDE.local.mdや.claude/settings.local.jsonも含めること。

## テスト
- テストファイルはコンポーネントと同階層に `foo.test.tsx` として配置する（`__tests__/` ディレクトリは使わない）
- RNTLでは `fireEvent` ではなく `userEvent` を使う（`userEvent` がカバーしない `onKeyPress` 等のみ `fireEvent` で補完）
- ユーザーの体験になるべく近い層でテストする。画面単位が基本だが、複雑なページではコンポーネント単位に細分化してよい。コールバック引数ではなく、画面に表示される結果やAPIに渡る値を検証する
- アサーションはユーザーが見るもの（表示テキスト、エラーメッセージ）か外部への出力（API呼び出し）に限定する
- モックは外部境界（API、ルーター）にだけ置く。内部コンポーネントやフックはモックしない
- テスト基盤はデファクトスタンダード（Jest + jest-expo + RNTL）に従う
- `it.each` / `test.each` は使わず愚直に個別のテストケースとして書く（可読性優先）

## パフォーマンス最適化
- `useCallback` / `useMemo` / `React.memo` は、計測して必要と判明してから適用する。予防的なメモ化はしない

## NativeWind 既知の問題
- `shadow-*` や `bg-xxx/opacity` を条件付きclassNameで動的にトグルすると、CSSインターオプがReact Navigationのコンテキスト伝播を破壊してクラッシュする（[nativewind#1466](https://github.com/nativewind/nativewind/issues/1466), [#1711](https://github.com/nativewind/nativewind/issues/1711)）。これらのユーティリティは条件付きclassNameで使わないこと