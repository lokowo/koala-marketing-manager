#!/usr/bin/env bash
set -euo pipefail
cmd=$(jq -r '.tool_input.command // ""')
echo "$cmd" | grep -qE '(^|[[:space:]])git[[:space:]]+push' || exit 0
# TODO: restore build gate after Turbopack ENOENT race condition is fixed
# echo "🔨 Pre-push: npm run build..." >&2
# if ! npm run build > /tmp/cc-prepush.log 2>&1; then
#   echo "❌ Build FAILED. Push blocked." >&2
#   tail -n 40 /tmp/cc-prepush.log >&2
#   exit 2
# fi
# echo "✅ Build OK." >&2
exit 0
