#!/usr/bin/env bash
# Restore a backup into the database. Destructive: overwrites existing data.
# Requires explicit confirmation and never runs automatically.
set -euo pipefail

cd "$(dirname "$0")/.."

file="${1:-}"
if [ -z "$file" ]; then
  echo "usage: scripts/restore-db.sh <backup.sql.gz>" >&2
  exit 1
fi
if [ ! -f "$file" ]; then
  echo "file not found: $file" >&2
  exit 1
fi

echo "WARNING: this OVERWRITES the current database with the contents of:"
echo "  $file"
printf "Type 'RESTORE' to continue: "
read -r confirm
if [ "$confirm" != "RESTORE" ]; then
  echo "aborted"
  exit 1
fi

gunzip -c "$file" | docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
echo "restore complete"
