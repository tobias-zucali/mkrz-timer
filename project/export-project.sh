#!/usr/bin/env bash
set -euo pipefail

OWNER="tobias-zucali"
PROJECT_NUMBER="2"
OUTPUT_FILE="project.json"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: GitHub CLI 'gh' is not installed."
  echo "Install it from: https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: GitHub CLI is not authenticated."
  echo "Run: gh auth login"
  exit 1
fi

echo "Exporting GitHub Project #${PROJECT_NUMBER} for ${OWNER}..."

gh project item-list "$PROJECT_NUMBER" \
  --owner "$OWNER" \
  --format json \
  --limit 1000 \
  > "$OUTPUT_FILE"

echo "Done: $OUTPUT_FILE"
