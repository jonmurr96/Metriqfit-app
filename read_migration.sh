#!/bin/bash
# Helper script to read migration files for browser automation

MIGRATION_FILE="$1"

if [[ ! -f "$MIGRATION_FILE" ]]; then
  echo "Error: File $MIGRATION_FILE not found"
  exit 1
fi

# Output the SQL content escaped for JSON
# Replace backslashes, quotes, newlines for safe embedding
cat "$MIGRATION_FILE" | jq -Rs .
