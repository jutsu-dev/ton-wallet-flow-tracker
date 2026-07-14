[English](OPERATIONS.md) | [Русский](OPERATIONS.ru.md)

# Operations

Day-two operations for a running instance: health, logs, backups, users, secret rotation, and the knobs that control limits.

## Health

`GET /api/health` reports liveness and database connectivity without authentication:

```json
{ "status": "ok", "service": "ton-wallet-flow-tracker", "database": "up", "time": "..." }
```

It returns HTTP 200 when the database answers a trivial query and HTTP 503 with `"database": "down"` when it does not, so a container or proxy health check can restart a broken instance. The response is sent with `Cache-Control: no-store`.

```bash
curl -si http://127.0.0.1:8137/api/health | head -n 1
```

## Logs

Logs are structured JSON, one object per line, on stdout/stderr — read them with `docker compose logs -f` and ship them wherever you centralize logs. Two properties matter operationally:

- **Secrets are redacted.** Any field whose key looks sensitive (authorization, cookie, api-key, token, password, secret, session, bearer) is replaced with `[redacted]`, recursively through nested objects.
- **Addresses are shortened.** Log helpers emit a shortened `EQAb…wxyz` form, so full addresses do not sit in system logs. There is no PID or hostname in the log records.

Set verbosity with `LOG_LEVEL` (`debug`, `info`, `warn`, `error`; default `info`).

A separate audit trail is written to the `audit_logs` table for security-relevant actions — logins, lockouts, password changes, user changes, label create/delete, and analyses. IP addresses there are stored only as a salted hash (using `AUTH_SECRET`), never raw.

## Backups

Back up the PostgreSQL volume regularly and before every upgrade. The helper scripts wrap `pg_dump`/`pg_restore` against the Compose database:

```bash
scripts/backup-db.sh                 # write a timestamped dump
scripts/restore-db.sh <dump-file>    # restore from a dump
scripts/verify-backup.sh <dump-file> # restore into a throwaway database and sanity-check
```

Store dumps off-host, and verify them — a backup you have never restored is a hope, not a backup. The `verify` step restores into a temporary database so you can confirm a dump is usable without touching production. If you back up the raw named volume instead, snapshot it while the database is stopped or use `pg_dump` for a consistent logical copy.

## Users

The first owner is created by the seed (`npm run db:seed` / on container startup) with a temporary password in `secrets/initial-owner-password`; the first login forces a change.

Additional accounts are created by an owner on the **`/admin` page**, which is reachable from the header when signed in as an OWNER. It lists users, creates accounts, toggles active state and role, and shows the recent audit log. It is backed by the owner-only service functions (`createUser`, `setUserRole`, `setUserActive`, `listUsers` in `src/server/auth/service.ts`) through the route handlers under `src/app/api/admin/users`, and both layers are covered by tests.

New users are created with `mustChangePassword` set, so they must set their own password on first login. Pass the temporary password to them out of band. Disabling a user (`setUserActive(false)`) immediately revokes their sessions. Deactivate departed users rather than deleting them, to keep audit references intact.

## Rotating secrets

- **`SESSION_SECRET` / `AUTH_SECRET`.** Update the values in `.env` and restart. Rotating `AUTH_SECRET` changes the IP-hash salt, so historical hashed IPs in the audit log will no longer correlate with new ones — that is expected. Existing sessions remain valid across a restart because the session token itself is random and stored hashed, independent of these secrets.
- **`POSTGRES_PASSWORD`.** Change it in PostgreSQL and in `DATABASE_URL` together, then restart the app.
- **Provider API keys.** Issue new TonAPI / TON Center keys, replace them in `.env`, and restart. Revoke the old keys at the provider. Rotate immediately if a key was ever shared outside the server.

To force every user to re-authenticate, clear the `sessions` table.

## Limits and tuning

Analysis and protection limits are environment variables (documented in `.env.example`). The common ones:

| Variable | Meaning | Default |
|---|---|---|
| `MEMBER_ANALYSES_PER_WINDOW` | Analyses per member per window (owners get 3×) | 10 |
| `MEMBER_ANALYSIS_WINDOW_MINUTES` | Length of that window | 10 |
| `MEMBER_MAX_CONCURRENT_ANALYSES` | Concurrency cap (also sizes the provider limiter) | 3 |
| `MAX_SOURCE_EVENTS` | Max source events pulled per analysis | 100 |
| `MAX_EXPANSION_DEPTH` | Max node-expansion depth | 3 |
| `MAX_GRAPH_NODES` / `MAX_GRAPH_EDGES` | Hard graph caps | 150 / 300 |
| `LOGIN_MAX_ATTEMPTS` | Failed logins before account lockout | 5 |
| `LOGIN_LOCKOUT_MINUTES` | Lockout duration | 15 |
| `PROVIDER_TIMEOUT_MS` | Per-request upstream timeout | 10000 |
| `PROVIDER_MAX_RETRIES` | Retry attempts on transient failures | 3 |
| `PROVIDER_CIRCUIT_THRESHOLD` / `PROVIDER_CIRCUIT_RESET_MS` | Circuit breaker open threshold / reset | 5 / 30000 |
| `CACHE_TTL_ACCOUNT_MS` / `CACHE_TTL_EVENTS_MS` / `CACHE_TTL_DNS_MS` / `CACHE_TTL_NFT_MS` | Provider cache TTLs | 30s / 60s / 10m / 10m |

The server validates these at startup and refuses to run with an invalid value, naming the offending keys without printing them. Remember that limits and lockout counters are per process (see [LIMITATIONS.md](LIMITATIONS.md)); run a single app instance until a shared limit store lands.
