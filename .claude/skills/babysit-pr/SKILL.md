---
name: babysit-pr
description: >
  現在のブランチに対応するPRのレビューコメントを監視し、未返信のコメントに対応・返信する。
  /loop と組み合わせて定期実行する想定（例: /loop 1m /babysit-pr）。
---

# PR レビューコメント監視・対応スキル

このスキルは、現在のブランチに対応するPRのレビューコメントを取得し、
未返信のコメントに対してコード修正（必要な場合）と返信を行う。

## 実行手順

### 1. 現在のPRを特定する

```bash
gh pr view --json number,url,headRefName -q '.number'
```

PRが見つからない場合はエラーメッセージを出して終了する。

### 2. レビューコメントを取得する

以下の **すべて** のAPIからコメントを取得し、漏れなく収集する。

#### 2a. PRレビューコメント（ファイル差分に付くコメント＋そのリプライ）

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/{pr_number}/comments?per_page=100"
```

このAPIは差分に紐づくレビューコメントとそのリプライの両方を返す。
- トップレベルコメント: `in_reply_to_id` が存在しない
- リプライ: `in_reply_to_id` が存在する

#### 2b. PRのIssueコメント（Conversationタブの一般コメント）

```bash
gh api --paginate "repos/{owner}/{repo}/issues/{pr_number}/comments?per_page=100"
```

#### 2c. PRレビュー本体のコメント（Approve/Request Changes 時のサマリコメント）

```bash
gh api --paginate "repos/{owner}/{repo}/pulls/{pr_number}/reviews?per_page=100"
```

### 3. ページネーション確認

`--paginate` フラグにより GitHub API のページネーションは自動的に処理される。
ただし、結果が空配列 `[]` でないことを確認し、レスポンスが切り捨てられていないことを検証する。

### 4. 未対応コメントをフィルタリングする

以下の条件を **すべて** 満たすコメントを「未対応」として抽出する:

1. **自分（bot）のコメントではない**: コメントの `user.login` が現在の `gh api user` のログインと異なる
2. **未返信である**: そのコメントの `id` に対して、自分が `in_reply_to_id` で返信したコメントが存在しない
   - Issueコメント（2b）やレビューサマリ（2c）の場合は、そのコメントの `id` より後（`created_at` が新しい）に自分の返信が存在しないことで判定する
3. **解決済みでない（レビューコメントの場合）**: レビューコメントスレッドの解決状態を確認する。GraphQL APIを使う:

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $pr: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        reviewThreads(first: 100) {
          nodes {
            isResolved
            comments(first: 100) {
              nodes {
                databaseId
                body
                author { login }
                path
                line
              }
            }
          }
        }
      }
    }
  }
' -f owner='{owner}' -f repo='{repo}' -F pr={pr_number}
```

GraphQLの `reviewThreads` で `isResolved: false` のスレッドだけを対象にする。
これによりresolvedなスレッドを確実にスキップできる。

**注意**: GraphQLの `reviewThreads` にもページネーション（`first: 100` + `after` カーソル）がある。
100件を超える場合は `pageInfo.hasNextPage` と `endCursor` で追加取得する。

### 5. 各コメントを処理する

未対応の各コメントについて:

#### 5a. コメント内容を分析する
- コメントが指すファイルと行を特定する（`path`, `line`, `original_line`, `diff_hunk` から）
- 該当ファイルを読み、コメントの指摘内容を理解する

#### 5b. 対応が必要か判断する
- コードの修正を求めるコメント → 修正を実施
- 質問・確認のコメント → 回答のみ
- 称賛・承認のコメント → お礼の返信のみ

#### 5c. コード修正が必要な場合
1. 該当ファイルを修正する
2. 関連するテスト・型チェック・lintを実行して問題がないことを確認する:
   - `cd expo && npx tsc --noEmit`（型チェック）
   - `cd expo && pnpm test`（テスト）
   - `pnpm lint`（Lint/Format、ルートで実行）
3. 変更をコミットする（コミットメッセージにレビューコメントへの対応であることを明記）
4. `git push` でリモートに反映する

#### 5d. 返信する（対応要否に関わらず必ず実施）

レビューコメント（ファイル差分に付くもの）への返信:
```bash
gh api "repos/{owner}/{repo}/pulls/{pr_number}/comments/{comment_id}/replies" \
  -f body="返信内容"
```

Issueコメント（Conversationタブ）への返信:
```bash
gh api "repos/{owner}/{repo}/issues/{pr_number}/comments" \
  -f body="返信内容"
```

レビューサマリへの返信:
```bash
gh api "repos/{owner}/{repo}/pulls/{pr_number}/reviews/{review_id}/comments" \
  -f body="返信内容"
```

**返信内容のガイドライン:**
- 修正した場合: 何をどう修正したかを簡潔に説明し、該当コミットのハッシュを含める
- 質問への回答: 技術的根拠を含めて回答する
- 対応不要と判断した場合: 理由を説明する
- 日本語で返信する

### 6. 完了報告

処理したコメントの数と、行った修正のサマリを出力する。
未対応コメントが0件の場合は「新しいレビューコメントはありません」と出力する。
