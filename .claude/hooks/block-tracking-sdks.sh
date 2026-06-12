#!/usr/bin/env bash
# Block imports of analytics / crash / identifier SDKs.
# Punji Bandhu's product promise is "no login, no tracking". An accidental
# analytics import would silently break that promise — fail loudly instead.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
NEW_CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*/package.json) ;;
  *) exit 0 ;;
esac

# Patterns of known tracking / identifier / crash SDKs. Extend over time.
PATTERN='@segment/analytics|mixpanel|@amplitude/|posthog|firebase/analytics|@react-native-firebase/analytics|@sentry/react-native|bugsnag|@datadog/|expo-application|react-native-device-info|@react-native-community/google-signin|expo-tracking-transparency'

if echo "$NEW_CONTENT" | grep -qiE "$PATTERN"; then
  MATCH=$(echo "$NEW_CONTENT" | grep -oiE "$PATTERN" | head -1)
  cat >&2 <<EOF
BLOCKED: Tracking / identifier SDK detected in $FILE_PATH.

Matched: $MATCH

Punji Bandhu is no-login and no-tracking by design — that is the product.
Any analytics, crash reporter that sends user identifiers, or device-ID
library breaks that promise.

If there is a real reason to add this dependency, write an ADR first
(/adr) and have the user accept it before re-attempting.
EOF
  exit 2
fi

exit 0
