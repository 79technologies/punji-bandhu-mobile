#!/usr/bin/env bash
# Non-blocking warning when a prompt asks to skip tests or disable type/lint checks.

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // .user_prompt // empty')

if echo "$PROMPT" | grep -qiE \
  "skip.{0,15}tests?|disable.{0,15}(strict|type[- ]?check|lint|eslint|tsc)|just push|no tests?|ignore.{0,15}(eslint|tsc|warnings)|--no-verify"; then
  echo "NOTE: This prompt may be asking to skip lint, type checks, or tests. CLAUDE.md requires zero lint warnings and TypeScript errors before merging. Push back unless the user has given an explicit, scoped reason."
fi

exit 0
