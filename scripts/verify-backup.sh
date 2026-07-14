#!/usr/bin/env bash
# Verify a backup file: gzip integrity plus a pg_dump content check.
set -euo pipefail

file="${1:-}"
if [ -z "$file" ]; then
  echo "usage: scripts/verify-backup.sh <backup.sql.gz>" >&2
  exit 1
fi
if [ ! -f "$file" ]; then
  echo "file not found: $file" >&2
  exit 1
fi

gzip -t "$file"
echo "gzip integrity: OK"

if gunzip -c "$file" | head -n 50 | grep -q "PostgreSQL database dump"; then
  echo "content check: looks like a pg_dump"
else
  echo "content check: FAILED (no pg_dump header found)" >&2
  exit 1
fi

echo "size: $(wc -c <"$file") bytes"
