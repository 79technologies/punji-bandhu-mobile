#!/usr/bin/env bash
# Non-blocking warning when console.* is added to non-test source files.
# console.log left in production RN builds runs on the JS thread and causes
# measurable frame drops on lower-end Android devices.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
NEW_CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

# Allow test files
case "$FILE_PATH" in
  *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx) exit 0 ;;
esac

if echo "$NEW_CONTENT" | grep -qE "console\.(log|info|warn|error|debug)\("; then
  echo "NOTE: console.* detected in $FILE_PATH. Fine during development, but remove before merging to master — console calls block the JS thread in production RN builds."
fi

exit 0
