[English](DECISIONS.md) | [Русский](DECISIONS.ru.md)

# DECISIONS

A running log of decisions made while building this project, with the reasoning and the
trade-offs. Newest entries are appended at the bottom of each section.

## Environment

**Host is Windows 11, not a Linux VPS.** The build brief assumed a Linux VPS (`/opt`,
`chmod 600`, `sudo cat`). The actual host is Windows 11 Pro with PowerShell. Adaptations:

- Project root is the existing working directory
  `…\Проекты\tonwallet` rather than `/opt/ton-wallet-flow-tracker`. The directory was empty
  and is the path the session was opened in; moving it would be surprising and gains nothing.
- File-permission hardening uses NTFS ACLs via `icacls` instead of `chmod 600`. `.env` and
  `secrets/` are restricted to the current user with inheritance removed. This is the closest
  Windows equivalent to owner-only `600`.
- The "show me the owner password" command in docs is the Windows form
  `Get-Content .\secrets\initial-owner-password` (no `sudo`).
- The project folder is inside a OneDrive-synced path. To avoid sync churn and file locks,
  everything heavy (`node_modules`, `.next`, build output, DB data) is git-ignored, and the
  database lives in a Docker named volume in Docker's own storage, not in the synced folder.

**App port: `127.0.0.1:8137`.** Ports 3000/5432/8137 were all free. The app publishes only to
`127.0.0.1:8137`; the container listens on 3000 internally. PostgreSQL is not published at all.

**GitHub CLI authentication gated publication.** For most of the build `gh auth status` reported
no host, so everything up to the publication gate was built locally and publication waited. The
owner has since authenticated as `jutsu-dev` and the repository is published.

**Docker daemon was down at start.** Docker Desktop is installed but its engine was not running
during initial inventory. Non-Docker work (lint, typecheck, unit tests, production build) does
not need it; the daemon is started before the containerized deploy and DB-integration phases.

## Attribution and git

- Repo-local git author is `jutsu-dev <jutsu-dev@users.noreply.github.com>`, set with
  `git config --local` only. Global git config was left untouched. The noreply address avoids
  leaking any personal email and routes to the account. Once `gh auth` is available it can be
  upgraded to the numeric `ID+jutsu-dev@users.noreply.github.com` form.
- No co-author trailers, no automated-tool attribution anywhere in history or docs.

## Secrets

- `.env` is generated locally by a one-shot script kept in a scratchpad outside the repo and
  deleted immediately after use, so the two temporary API keys never enter git, shell history,
  or this report. `POSTGRES_PASSWORD`, `SESSION_SECRET`, `AUTH_SECRET` come from
  `crypto.randomBytes` (24 / 48 / 48 bytes, base64url).
- The two supplied TonAPI / TON Center keys are treated as compromised (shared privately), and
  rotating them was originally set as a precondition for publication. The owner overrode that:
  the keys exist only in the local git-ignored `.env`, never in git, the build, or any published
  artifact, and the secret scan confirms it, so publication went ahead without rotation.
  Rotation remains the recommended follow-up; new keys go only into the local `.env`, and
  nothing in the repository changes when it happens. See `PUBLICATION_CHECKLIST.md`.

## Stack choices

- **Argon2id** for password hashing (the spec's first choice; memory-hard, current OWASP
  recommendation). Uses the `argon2` native binding.
- **Prisma + PostgreSQL** for storage; enums modeled as Prisma enums.
- **Sessions in the database**, referenced by an opaque random cookie value, rather than JWTs.
  Server-side sessions are simpler to revoke (account disable must take effect immediately) and
  keep no secret in the token itself.
- **TanStack Query** for client data fetching and cache; **Zod** for validation shared between
  client forms and server route handlers.
- **React Flow** for the graph; it handles pan/zoom, custom nodes/edges, and export-friendly
  DOM/SVG.

## Provider strategy

- One `BlockchainProvider` interface, two implementations, an orchestrator that tries TonAPI
  then TON Center. Timeout 10 s, ≤ 3 attempts, exponential backoff + jitter, `Retry-After`
  respected, a circuit breaker per provider, a small TTL cache, and a concurrency limiter.
- Missing fields are `null` and flagged `isIncomplete`; nothing is fabricated. Each response is
  tagged with its source so the UI can show provenance.

## Deployment and build

- **Prisma `binaryTargets = ["native", "debian-openssl-3.0.x"]`.** `node:22-bookworm-slim`
  ships without the openssl package, so `prisma generate` misdetected the engine as
  `debian-openssl-1.1.x` while the runtime (where openssl is installed) is 3.0. Pinning the
  Debian target and installing openssl in the build stage fixed the engine mismatch.
- **Dropped `output: 'standalone'`.** The Docker runtime copies the full `node_modules` plus
  `.next` and runs `next start`, which is simpler with Prisma than tracing the standalone
  server. Standalone only added an unused directory and a startup warning.
- **A throwaway dev PostgreSQL** (`twft-devdb`, `127.0.0.1:5433`, dev-only password) was used to
  author migrations and run DB integration and Playwright tests, so the production `.env`
  password was never needed outside the container.
- **Custom structured logger** instead of pino, to avoid pino's worker-thread transports in
  the Next bundle and to keep full control over secret/host redaction.

## Scope adjustments

- **Owner admin page** (`/admin`) lists users, creates accounts, toggles active/role, and shows
  the audit log — enough to satisfy owner user-management and the "MEMBER cannot access OWNER
  pages" test. It is intentionally minimal.
- **Screenshots** are captured by an opt-in Playwright spec in demo mode, so every pixel is
  synthetic and regenerating them is one command.
- **Asset-trace mode** ships as provider capability (NFT history endpoints) without a dedicated
  UI screen yet; it is listed in ROADMAP rather than claimed as a finished feature.
