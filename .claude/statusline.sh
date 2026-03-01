#!/bin/bash
# Claude Code Context Usage Statusline

input=$(cat)

# 基本情報を取得
MODEL=$(echo "$input" | jq -r '.model.display_name // "Unknown"')
CONTEXT_SIZE=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')
PERCENT=$(echo "$input" | jq -r '.context_window.used_percentage // 0')
CWD=$(echo "$input" | jq -r '.cwd // ""')
CWD_SHORT=$(echo "$CWD" | sed "s|^$HOME|~|")
BRANCH=$(git branch --show-current 2>/dev/null)

# トークン数を計算
USAGE=$(echo "$input" | jq '.context_window.current_usage // null')
if [ "$USAGE" != "null" ]; then
    INPUT=$(echo "$USAGE" | jq -r '.input_tokens // 0')
    CACHE_CREATE=$(echo "$USAGE" | jq -r '.cache_creation_input_tokens // 0')
    CACHE_READ=$(echo "$USAGE" | jq -r '.cache_read_input_tokens // 0')
    CURRENT_TOKENS=$((INPUT + CACHE_CREATE + CACHE_READ))
else
    CURRENT_TOKENS=0
fi

# ディレクトリ情報
if [ -n "$BRANCH" ]; then
    DIR_INFO="\033[36m${CWD_SHORT} (${BRANCH})\033[0m "
else
    DIR_INFO="\033[36m${CWD_SHORT}\033[0m "
fi

# 使用率に応じた色設定
if [ "$PERCENT" -lt 50 ]; then
    COLOR="\033[32m"
elif [ "$PERCENT" -lt 75 ]; then
    COLOR="\033[33m"
elif [ "$PERCENT" -lt 90 ]; then
    COLOR="\033[38;5;208m"
else
    COLOR="\033[31m"
fi

# プログレスバー生成
BAR_WIDTH=10
FILLED=$((PERCENT * BAR_WIDTH / 100))
[ "$FILLED" -gt "$BAR_WIDTH" ] && FILLED=$BAR_WIDTH
EMPTY=$((BAR_WIDTH - FILLED))
BAR=$(printf "%${FILLED}s" | tr ' ' '█')$(printf "%${EMPTY}s" | tr ' ' '░')

# トークン数をK単位で表示
TOKENS_K=$(echo "scale=1; $CURRENT_TOKENS / 1000" | bc)
CONTEXT_K=$((CONTEXT_SIZE / 1000))

echo -e "[$MODEL] ${DIR_INFO}${COLOR}${BAR}\033[0m ${PERCENT}% (${TOKENS_K}K/${CONTEXT_K}K)"
