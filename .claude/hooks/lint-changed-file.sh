#!/usr/bin/env bash
# After an edit, lint the changed file with ESLint (expo lint uses this under the hood).
# Non-blocking — surfaces issues to Claude so it can fix them in the next turn.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx)
    if [ -f "$FILE_PATH" ]; then
      npx eslint --max-warnings 0 "$FILE_PATH" 2>&1 || true
    fi
    ;;
esac

exit 0
