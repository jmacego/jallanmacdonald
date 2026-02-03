#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repo: $ROOT_DIR"
  exit 1
fi

git -C "$ROOT_DIR" config core.hooksPath .githooks
chmod +x "$ROOT_DIR/.githooks/pre-commit" "$ROOT_DIR/.githooks/pre-push"

echo "Git hooks configured."
