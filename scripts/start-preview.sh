#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .runtime
if curl -fsS http://127.0.0.1:8080/ >/dev/null 2>&1; then exit 0; fi
nohup php -S 0.0.0.0:8080 -t hostinger-single scripts/router.php >.runtime/php.log 2>&1 &
echo "Shadow Workspace is starting on port 8080. Open the Ports tab to preview."
