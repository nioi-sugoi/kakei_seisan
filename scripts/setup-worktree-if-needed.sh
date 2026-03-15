#!/bin/bash
# SessionStart hookから呼ばれるラッパー
# worktree内かつ未セットアップの場合のみ setup-worktree.sh を実行する

WORKTREE_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
MAIN_ROOT="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | xargs dirname)" || exit 0

# メインworktreeなら何もしない
[ "$WORKTREE_ROOT" = "$MAIN_ROOT" ] && exit 0

# セットアップ済みなら何もしない
[ -f "$WORKTREE_ROOT/.env.worktree" ] && exit 0

# セットアップ実行
cd "$WORKTREE_ROOT"
bash scripts/setup-worktree.sh >&2
