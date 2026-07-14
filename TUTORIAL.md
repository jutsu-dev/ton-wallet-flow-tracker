[English](TUTORIAL.md) | [Русский](TUTORIAL.ru.md)

# Tutorial

A first run, end to end. Every command here matches the scripts actually present in this repository — `package.json`, `docker-compose.yml`, `docker/entrypoint.sh` and `scripts/`.

- [A. Docker quick start](#a-docker-quick-start)
- [B. Local development without Docker](#b-local-development-without-docker)
- [C. Windows notes](#c-windows-notes)
- [D. Linux VPS](#d-linux-vps)

---

## A. Docker quick start

### 1. Requirements

- Git
- Docker Engine (or Docker Desktop)
- Docker Compose v2 (`docker compose`, not `docker-compose`)
- A **TonAPI** key
- A **TON Center** key

You can skip both keys if you only want to see the interface: set `DEMO_MODE=true` and the app serves a built-in synthetic scenario without calling any external API.

### 2. Clone

```bash
git clone https://github.com/jutsu-dev/ton-wallet-flow-tracker.git
cd ton-wallet-flow-tracker
```

### 3. Create the environment file

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 4. Get the API keys

- **TonAPI** — sign in at <https://tonconsole.com> and create an API key.
- **TON Center** — request a key from the `@tonapibot` bot in Telegram.

Paste them into `.env` as `TONAPI_API_KEY` and `TONCENTER_API_KEY`. Both are read only by server-side code and are never sent to the browser.

### 5. Required variables

The app refuses to start unless these are set. Everything else in `.env.example` has a working default.

| Variable | Purpose |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Database created by the `postgres` container |
| `DATABASE_URL` | How the app reaches that database — must match the three values above |
| `SESSION_SECRET` | Signs/derives session material. Minimum 32 characters |
| `AUTH_SECRET` | Auth-related secret. Minimum 32 characters |
| `TONAPI_API_KEY`, `TONCENTER_API_KEY` | Provider access. Optional only when `DEMO_MODE=true` |

Inside Compose the database host is the service name, so:

```
DATABASE_URL=postgresql://tontracker:YOUR_POSTGRES_PASSWORD@postgres:5432/tontracker
```

For host-side tooling (Prisma CLI on your machine) use `localhost` and a published port instead — see section B.

### 6. Generate the secrets safely

Linux/macOS:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"   # POSTGRES_PASSWORD
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # AUTH_SECRET
```

Windows PowerShell — same thing if Node is installed. Without Node:

```powershell
[Convert]::ToBase64String((1..24 | ForEach-Object { Get-Random -Maximum 256 })) # POSTGRES_PASSWORD
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 })) # SESSION_SECRET
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 })) # AUTH_SECRET
```

> `Get-Random` is not a cryptographic RNG. Prefer the Node commands when Node is available; the PowerShell fallback is for a first local trial, not for production.

Never commit `.env`. It is git-ignored, and it should stay that way.

### 7. Start

```bash
docker compose up -d --build
```

The `app` container waits for `postgres` to report healthy, then `docker/entrypoint.sh` applies migrations, runs the idempotent seed, and starts the server.

### 8. Check the containers

```bash
docker compose ps
```

Expect `ton-wallet-tracker-postgres` and `ton-wallet-tracker-app` both `Up`, with the app reporting `(healthy)` after its 45-second start period. The app publishes `127.0.0.1:8137->3000/tcp`. **PostgreSQL shows no host port at all — that is deliberate.**

### 9. Logs

```bash
docker compose logs -f app
```

Logs are structured JSON with secret-looking fields redacted and addresses shortened.

### 10. The first OWNER

You do not create it by hand. The seed in `prisma/seed.ts` creates the first owner automatically on startup, and it is idempotent — restarting does not create a second one or reset the password.

### 11. The temporary password

The seed writes a random temporary password to `secrets/initial-owner-password`, mounted into the container from `./secrets`. It is never printed to the logs or the console.

```bash
cat ./secrets/initial-owner-password
```

```powershell
Get-Content .\secrets\initial-owner-password
```

The `secrets/` directory is git-ignored. Restrict it to your user — `chmod 600` on Linux/macOS, or see the Windows notes below.

### 12. First sign-in

Open <http://127.0.0.1:8137>, enter the owner username and the temporary password.

### 13. Mandatory password change

The app immediately requires a new password and will not let you reach anything else until you set one. Changing it also revokes every existing session. After that, delete the temporary-password file:

```bash
rm ./secrets/initial-owner-password
```

### 14. Stop

```bash
docker compose down          # keeps the database volume
docker compose down -v       # ALSO DELETES the database volume and all data
```

### 15. Update

```bash
git pull
docker compose up -d --build
```

The entrypoint applies any new migrations on start. Take a backup first (step 17).

### 16. Migrations

Applied automatically at container start. To run them by hand:

```bash
docker compose exec app npm run prisma:migrate
```

To author a new migration during development, see section B.

### 17. Backup

```bash
./scripts/backup-db.sh
```

Writes a timestamped, gzipped `pg_dump` to `backups/` through the running `postgres` container and keeps the 14 most recent files. Verify one:

```bash
./scripts/verify-backup.sh backups/tontracker-YYYYMMDD-HHMMSS.sql.gz
```

`backups/` is git-ignored. A backup contains your data — treat it as sensitive and store it off the host.

### 18. Restore

```bash
./scripts/restore-db.sh backups/tontracker-YYYYMMDD-HHMMSS.sql.gz
```

**Destructive.** It overwrites existing data and asks for explicit confirmation first. It never runs automatically.

### 19. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| App exits with an env error listing keys | A required variable is missing or too short. The message names the keys and never prints their values. Check `SESSION_SECRET`/`AUTH_SECRET` are ≥ 32 chars. |
| `app` never turns healthy | `docker compose logs app`. Usually `DATABASE_URL` points at `localhost` instead of `postgres`, so the app cannot reach the database inside the Compose network. |
| Login always fails right after a lot of testing | Per-IP login budget (`LOGIN_MAX_ATTEMPTS * 3` per lockout window) is exhausted. It lives in memory: `docker compose restart app` clears it. |
| `Слишком много запросов` when analyzing | Provider rate limit or the per-user analysis limit. Wait, or raise `MEMBER_ANALYSES_PER_WINDOW`. |
| Jetton/NFT rows marked incomplete | The TON Center fallback classifies only TON transfers. This is a known limitation, not a bug — see [LIMITATIONS.md](LIMITATIONS.md). |
| Port 8137 already in use | Change the host side of the mapping in `docker-compose.yml` (`'127.0.0.1:8137:3000'`). Keep the `127.0.0.1:` prefix. |

---

## B. Local development without Docker

### Install

```bash
npm ci            # reproducible install from package-lock.json
```

Use `npm install` only when you intend to change dependencies.

### PostgreSQL

Run a local PostgreSQL 16 and point `DATABASE_URL` at it, for example:

```
DATABASE_URL=postgresql://tontracker:devpassword@localhost:5432/tontracker
```

A throwaway container works well:

```bash
docker run -d --name twft-devdb -p 127.0.0.1:5433:5432 \
  -e POSTGRES_USER=tontracker -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=tontracker \
  postgres:16-bookworm
```

Then use port `5433` in `DATABASE_URL`.

### Migrate and seed

```bash
npx prisma migrate deploy     # apply existing migrations
npm run db:seed               # create the first owner (idempotent)
```

Authoring a new migration:

```bash
npm run prisma:migrate:dev    # prisma migrate dev
```

### Dev server

```bash
npm run dev                   # http://localhost:3000
```

### Tests

```bash
npm run lint
npm run typecheck
npm test                      # unit + integration (integration needs DATABASE_URL)
npm run build                 # prisma generate && next build
```

### Playwright

Playwright runs against an already-running instance — it does not start one for you. `E2E_BASE_URL` defaults to `http://127.0.0.1:3100`.

```bash
npx tsx e2e/seed-users.ts     # fixture accounts, same DATABASE_URL
npm run build
npx next start -p 3100        # DEMO_MODE=true is enough
npm run test:e2e
```

Two things matter here:

1. **Start a fresh instance.** Logins are budgeted per client IP (`LOGIN_MAX_ATTEMPTS * 3` per lockout window) and held in memory. Every test signs in from `127.0.0.1`, so a second suite run inside the window exhausts the budget and everything that logs in fails. Restarting the instance clears it; re-seeding does not.
2. **Re-seed between runs.** The forced-password-change test consumes a one-time password; the seed restores it.

To regenerate the README images:

```bash
CAPTURE_SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts
```

### Production build

```bash
npm run build
npm run start                 # next start -p 3000
```

---

## C. Windows notes

This project was built and run on Windows 11, so these are real pitfalls, not hypotheticals.

- **Docker Desktop** must be running before any `docker compose` command. If the engine is down, Compose fails with a daemon connection error rather than anything descriptive.
- **PowerShell, not bash.** Use `Copy-Item .env.example .env` instead of `cp`. The `scripts/*.sh` backup helpers are bash — run them from Git Bash or WSL.
- **Prisma engine DLL lock.** `npm run build` can fail with `EPERM: operation not permitted, rename ... query_engine-windows.dll.node`. A Node process still holds the DLL. Find and stop it:

  ```powershell
  Get-Process node | Where-Object { (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine -like '*next start*' }
  Stop-Process -Id <PID> -Force
  ```

- **Leftover Node processes.** Stopping a terminal does not always stop the server it launched, and the old process keeps holding the port. Check what actually owns it:

  ```powershell
  Get-NetTCPConnection -LocalPort 3100 -State Listen | Select-Object OwningProcess
  ```

  A stale listener answers health checks, which makes it look like your new instance started when it did not.
- **localhost vs 127.0.0.1.** On Windows `localhost` may resolve to IPv6 `::1` first. The app binds `127.0.0.1`, so prefer `127.0.0.1` explicitly in `DATABASE_URL`, `E2E_BASE_URL` and browser URLs.
- **NTFS ACLs instead of `chmod`.** There is no `chmod 600`. Restrict `.env` and `secrets/` to your user with inheritance removed:

  ```powershell
  icacls .env /inheritance:r /grant:r "$($env:USERNAME):(F)"
  icacls secrets /inheritance:r /grant:r "$($env:USERNAME):(F)" /t
  ```

- **OneDrive-synced folders.** If the project lives under OneDrive, keep build output and database data out of the synced tree. Everything heavy here (`node_modules`, `.next`, `backups/`) is already git-ignored, and the database lives in a Docker named volume rather than the project folder.

---

## D. Linux VPS

### Bind to loopback only

`docker-compose.yml` already publishes the app as `127.0.0.1:8137:3000`. **Keep the `127.0.0.1:` prefix.** Without it, Docker publishes on `0.0.0.0` and, because Docker writes its own iptables rules, the port is reachable from the internet even when `ufw` says otherwise.

### Never publish PostgreSQL

The `postgres` service has no `ports:` section at all — it is reachable only over the internal Compose network. Do not add one. If you need psql access, go through the container:

```bash
docker compose exec postgres psql -U tontracker -d tontracker
```

### Reverse proxy and HTTPS

Terminate TLS in a reverse proxy in front of `127.0.0.1:8137`. The app sets its own security headers and a per-request CSP nonce, so the proxy should pass responses through rather than rewrite them. Forward the client address (`X-Forwarded-For`) so per-IP login limiting sees real clients instead of the proxy.

Set `APP_URL` to the public HTTPS origin. The login route enforces a same-origin check against it, so a wrong value breaks sign-in with a CSRF error.

### Firewall

Allow only SSH and 443 inbound. The app port must not be open — it is loopback-bound, and the proxy reaches it locally.

### `.env` permissions

```bash
chmod 600 .env
chmod 700 secrets
```

`.env` holds the database password and both API keys. Anything that can read it can use them.

### Restart policy

Both services already declare `restart: unless-stopped`, so they come back after a reboot or a daemon restart. Verify after the first reboot rather than assuming:

```bash
docker compose ps
```

### Backups

Schedule `scripts/backup-db.sh` (it keeps 14 rotating copies) and **copy them off the host** — a backup that only exists on the machine it protects is not a backup. Verify restores periodically with `scripts/verify-backup.sh`; an untested backup is a guess.

More detail: [DEPLOYMENT.md](DEPLOYMENT.md) and [OPERATIONS.md](OPERATIONS.md).
