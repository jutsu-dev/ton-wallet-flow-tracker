[English](DEPLOYMENT.md) | [Русский](DEPLOYMENT.ru.md)

# Deployment

This describes a single-host deployment with Docker Compose: the app and PostgreSQL in one internal network, the database never exposed, and the app reachable only on loopback behind a reverse proxy that terminates TLS.

## Prerequisites

- Docker with the Compose plugin.
- A reverse proxy (nginx, Caddy, Traefik, or similar) for HTTPS in front of the app.
- Provider API keys: a TonAPI key and a TON Center key. The app also runs without them in `DEMO_MODE=true` for evaluation.

## 1. Configure the environment

```bash
cp .env.example .env
```

Edit `.env`:

- `TONAPI_API_KEY`, `TONCENTER_API_KEY` — provider keys.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` — database credentials. In Docker the database host is `postgres`, so `DATABASE_URL` looks like `postgresql://USER:PASSWORD@postgres:5432/DB`.
- `SESSION_SECRET`, `AUTH_SECRET` — at least 32 characters each; generate them as below.
- `APP_ENV=production` — this makes session and CSRF cookies `Secure`. `APP_URL` must be the public HTTPS origin you serve from; the same-origin CSRF check compares against it.
- `DEMO_MODE=false` for a real deployment.

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"   # POSTGRES_PASSWORD
```

Keep `.env` out of version control (it already is) and restrict its file permissions to the deploying user.

> **Rotate the provider keys before any public deployment.** If keys were ever shared over a chat, email, or a ticket, treat them as compromised: issue fresh TonAPI and TON Center keys, put the new values only into the local `.env`, and revoke the old ones. Never commit a real key or paste one into an issue or PR.

## 2. Build and start

```bash
docker compose up -d --build
```

The app is published on `http://127.0.0.1:8137`. The container listens on port 3000 internally; PostgreSQL is on the Compose network only and is not published to the host. Database migrations and the seed run on startup, so the schema is created and the first owner is provisioned automatically. A persistent named volume holds the database data.

Check that it came up:

```bash
docker compose ps
curl -s http://127.0.0.1:8137/api/health
```

A healthy response is `{"status":"ok","database":"up",...}` with HTTP 200; a database problem returns 503.

## 3. Retrieve the first owner password

The seed creates the owner `jutsu-dev` with a random temporary password, written only to `secrets/initial-owner-password` (never printed). Read it:

```powershell
Get-Content .\secrets\initial-owner-password    # Windows / PowerShell
```
```bash
cat ./secrets/initial-owner-password             # Linux / macOS
```

Log in with it. You are required to change the password immediately; the change revokes the seeded session and starts a fresh one. After you have logged in and rotated it, you can remove the file.

## 4. Put a reverse proxy in front

The app binds to loopback and speaks plain HTTP; it does not terminate TLS itself. Front it with a reverse proxy that:

- serves HTTPS and forwards to `127.0.0.1:8137`;
- passes `X-Forwarded-For` (used for hashed IPs in the audit log) and the `Origin` header (used by the CSRF same-origin check);
- optionally uses `/api/health` as its upstream health check.

The app already sets `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, and a strict Content-Security-Policy; your proxy should add HSTS.

## Upgrades

```bash
git pull
docker compose up -d --build
```

Migrations run on startup and are idempotent, as is the seed (it skips an existing owner). Back up the database before upgrading (see [OPERATIONS.md](OPERATIONS.md)).

## Operations

Health checks, logs, backups and restore, secret rotation, and adding users are covered in [OPERATIONS.md](OPERATIONS.md).
