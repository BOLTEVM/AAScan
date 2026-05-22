#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../../.."

if command -v bun >/dev/null 2>&1; then
  bun install
  bun run build
else
  npm install
  npm run build
fi
