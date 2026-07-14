#!/bin/sh
set -e

echo "[entrypoint] applying database migrations"
npm run prisma:migrate

echo "[entrypoint] seeding initial owner (idempotent)"
npm run db:seed

echo "[entrypoint] starting server on port ${PORT:-3000}"
exec npm run start
