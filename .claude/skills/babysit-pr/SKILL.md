---
name: babysit-pr
description: >
  PRのレビューコメントを監視し、未返信コメントに対応・返信する。
  使い方: /loop 1m /babysit-pr
---

# PR レビューコメント監視・対応スキル

現在のブランチのPRから未返信レビューコメントを取得し、コード修正（必要時）と返信を行う。

## 1. PR特定・ステータス確認

現在のブランチのPR番号とステータス（open/closed/merged）を取得する。

- PRが見つからなければ終了
- **ステータスが `MERGED` または `CLOSED` の場合**: CronListで自身のループジョブを探し、CronDeleteで停止して終了する（「PRがクローズ/マージされたためループを停止しました」と報告）

## 2. コメント取得（すべて `--paginate` 付き、`per_page=100`）

| API | 取得対象 |
|-----|---------|
| `pulls/{pr}/comments` | ファイル差分コメント＋リプライ |
| `issues/{pr}/comments` | Conversationタブのコメント |
| `pulls/{pr}/reviews` | レビューサマリ（Approve/Request Changes時） |

## 3. 未対応コメントのフィルタリング

GraphQL `reviewThreads` で `isResolved: false` のスレッドのみ対象とする（`pageInfo.hasNextPage` でページネーション確認）。

```graphql
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100) {
        pageInfo { hasNextPage endCursor }
        nodes {
          isResolved
          comments(first: 100) {
            nodes { databaseId body author { login } path line }
          }
        }
      }
    }
  }
}
```

未対応の条件:
- 自分のコメントではない（`author.login` ≠ 自分）
- 自分の返信（`in_reply_to_id` 一致）が存在しない
- `isResolved: false`（レビューコメントの場合）

## 4. 各コメントの処理

1. **分析**: `path`, `line`, `diff_hunk` からコメント対象を特定し、ファイルを読む
2. **判断**: 修正要求 → 修正 / 質問 → 回答 / 称賛 → お礼
3. **修正時**: ファイル修正 → `tsc --noEmit` & `pnpm test` & `pnpm lint` → コミット → `git push`
4. **返信**（必ず実施）: `pulls/{pr}/comments/{id}/replies` にリプライ。日本語で、修正時はコミットハッシュを含める

## 5. 完了報告

処理件数と修正サマリを出力。0件なら「新しいレビューコメントはありません」。
