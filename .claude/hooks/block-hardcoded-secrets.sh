#!/usr/bin/env bash
# Block hardcoded credentials/tokens being written into source files.
# Punji Bandhu is a no-login, no-tracking app — there is no legitimate place
# for an auth token or API key in the JS bundle. Test files are exempt.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
NEW_CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

# Allow test files only
case "$FILE_PATH" in
  *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*__tests__*) exit 0 ;;
esac

# Detect inline credential patterns
if echo "$NEW_CONTENT" | grep -qiE \
  "(password|passwd|secret|api_?key|auth_?token|access_?token|bearer)\s*[:=]\s*['\"][^'\"]{4,}['\"]"; then
  cat >&2 <<'EOF'
BLOCKED: Hardcoded credential or secret detected.

Punji Bandhu is no-login and no-tracking. Secrets must never be in the JS bundle:
  - Quote providers that need a key must be reached via a proxy + EAS Secret
    (and that proxy decision is an ADR).
  - No user-auth tokens, no analytics keys, no crash-reporter DSNs.

Remove the hardcoded value and discuss an alternative before re-attempting.
EOF
  exit 2
fi

exit 0
