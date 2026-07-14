#!/usr/bin/env bash
# Create a timestamped, compressed pg_dump of the database via the running
# postgres container. Keeps the most recent 14 backups.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups

timestamp="$(date +%Y%m%d-%H%M%S)"
out="backups/tontracker-${timestamp}.sql.gz"

docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip >"$out"

echo "backup written: $out ($(wc -c <"$out") bytes)"

# Retention: keep the 14 newest backups.
ls -1t backups/tontracker-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
