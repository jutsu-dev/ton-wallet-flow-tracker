[English](README.md) | [Русский](README.ru.md)

<h1>TON Wallet Flow Tracker</h1>

**Visual analytics for public TON wallet activity.**

TON Wallet Flow Tracker loads public TON account activity and renders transfers as an interactive graph. It supports TON, Jetton, NFT and Telegram collectible activity without requesting wallet access or private keys.

[![CI](https://github.com/jutsu-dev/ton-wallet-flow-tracker/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/jutsu-dev/ton-wallet-flow-tracker/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520-informational)](package.json)
[![Next.js](https://img.shields.io/badge/Next.js-15-informational)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-informational)](tsconfig.json)
[![Docker](https://img.shields.io/badge/Docker-Compose-informational)](docker-compose.yml)

[**Documentation**](#documentation-map) · [**Quick start**](#quick-start-docker) · [**Security**](SECURITY.md) · [**Telegram channel**](https://t.me/tonflowapp) · [**Request hosted access**](https://telegram.me/tonflowapp?direct)

> **The hosted instance is private. There is no public registration. Accounts are issued manually through Telegram.**
>
> Telegram channel: <https://t.me/tonflowapp> · Request access: <https://telegram.me/tonflowapp?direct>

---

![Dashboard](docs/assets/dashboard.png)

![Flow graph](docs/assets/graph.png)

<sub>Both images are captured in demo mode. Every address, amount and label in them is synthetic.</sub>

## What it does

- Loads an address's public history from **TonAPI**, with **TON Center** as a fallback, and normalizes TON, Jetton, NFT and Telegram collectible transfers into one event model.
- Draws an **interactive graph**: the analyzed address at the center, counterparties around it. Arrows point at the recipient, edge labels carry the amount, thickness tracks operation count, and a dashed edge means every grouped transfer failed.
- **Expands counterparties** on click, up to depth 3, with a visited set against cycles and hard caps of 150 nodes / 300 edges.
- Lists every operation in a **filterable table** — asset, direction, status, free-text search over addresses and memos, date range, sorting, paging.
- Shows **jetton balances and owned NFTs** on demand.
- Lets you attach **user labels** to an address, always presented as user-supplied rather than confirmed fact, with changes written to an audit log.
- **Exports** the diagram as PNG, SVG, or a square 2048×2048 PNG.
- Ships a **demo mode** that serves only synthetic fixtures and never calls an external API.

## What it does not do

- It never asks for a **seed phrase or private key**, and never uses TonConnect or any wallet connection.
- It never **signs or sends transactions** and never controls funds.
- It does not **identify who owns an address** or tie an address to a person or company.
- It does not **accuse addresses of fraud** or score them automatically.
- It is **not financial or legal advice**, and it does not replace an investigation.
- It has **no public registration** — accounts exist only because an owner created them.

## Quick start (Docker)

Prerequisites: Docker with Compose, and a TonAPI key plus a TON Center key. To try the interface with no keys at all, set `DEMO_MODE=true` and skip straight to `docker compose up`.

```bash
git clone https://github.com/jutsu-dev/ton-wallet-flow-tracker.git
cd ton-wallet-flow-tracker
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

Fill in `TONAPI_API_KEY` and `TONCENTER_API_KEY`, then generate the three secrets:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"   # POSTGRES_PASSWORD
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # AUTH_SECRET
```

Set `DATABASE_URL` to match the password you just generated, then:

```bash
docker compose up -d --build
```

The app listens on `http://127.0.0.1:8137`. PostgreSQL is internal to the Compose network and is never published to the host. Migrations and the seed run on startup; the seed creates the first owner with a random temporary password written to `secrets/initial-owner-password`:

```bash
cat ./secrets/initial-owner-password            # Linux/macOS
```
```powershell
Get-Content .\secrets\initial-owner-password    # Windows
```

Sign in with it — you are required to change it immediately. Put a reverse proxy in front for TLS.

The step-by-step version, including backups, updates and troubleshooting, is in **[TUTORIAL.md](TUTORIAL.md)**.

## Tutorial

[TUTORIAL.md](TUTORIAL.md) walks through a first run end to end: Docker deployment, local development without Docker, the Windows-specific pitfalls this project actually hit, and Linux VPS hardening.

## Architecture

Four layers, kept deliberately separate:

- **Domain** (`src/domain`) — pure types and graph math: edge aggregation, node/edge caps, cycle-safe expansion, sanitization. No React, no I/O.
- **Providers** (`src/server/providers`) — one `BlockchainProvider` interface, two implementations (TonAPI, TON Center) behind an orchestrator, wrapped in a resilient HTTP client: timeout, bounded retries with jitter, `Retry-After`, circuit breaker, TTL cache, concurrency limiter, SSRF host allowlist.
- **Server services** (`src/server`) — analysis, authentication, labels, audit and rate limiting on Prisma/PostgreSQL.
- **App** (`src/app`, `src/components`) — Next.js App Router. Server components fetch and render; a few client components handle interaction. `src/middleware.ts` sets a per-request CSP nonce.

Full request flow and module map: [ARCHITECTURE.md](ARCHITECTURE.md). Internal endpoints: [API.md](API.md).

**Stack** — Next.js 15 (App Router), React 19, TypeScript strict, Tailwind CSS, React Flow (`@xyflow/react`), PostgreSQL via Prisma, Argon2id (`@node-rs/argon2`), Zod, `@ton/core`.

## Security model

- **No public registration.** Two roles: OWNER (manages users and labels, reads the audit trail) and MEMBER (analyzes, labels, exports).
- **Server-side sessions** referenced by an opaque random cookie token; only the token's SHA-256 is stored. Passwords use Argon2id at OWASP baseline parameters. A temporary password forces a change on first login, which also revokes existing sessions.
- **Login protection** — per-account lockout and per-IP rate limiting; password verification runs even for unknown usernames to blunt timing-based enumeration.
- **Every server input validated with Zod**; authentication and authorization checked on every protected route; CSRF via double-submit token plus a same-origin check on mutations.
- **Strict CSP** with a per-request nonce and `frame-ancestors 'none'`.
- **API keys stay server-side** in `server-only` modules — never sent to the browser, embedded in a response, or logged. Outbound requests are restricted to an allowlist of the two provider hosts; redirects are refused and non-HTTPS schemes rejected.
- **Structured logs** redact secret-looking fields and shorten addresses.

Policy and reporting: [SECURITY.md](SECURITY.md). Assets, threats and mitigations: [THREAT_MODEL.md](THREAT_MODEL.md).

## Development

```bash
npm ci
cp .env.example .env          # point DATABASE_URL at a local PostgreSQL
npx prisma migrate deploy
npm run db:seed
npm run dev                   # http://localhost:3000
```

Details and conventions: [CONTRIBUTING.md](CONTRIBUTING.md).

## Testing

```bash
npm run lint          # next lint
npm run typecheck     # tsc --noEmit
npm test              # Vitest: unit + integration (integration needs DATABASE_URL)
npm run test:e2e      # Playwright against a running instance
npm run build         # prisma generate && next build
```

The auth/session integration test is gated on `DATABASE_URL` and skipped without it. Before Playwright, seed the fixture accounts (`npx tsx e2e/seed-users.ts` against the same `DATABASE_URL`) and start a **fresh** instance: logins are budgeted per client IP in memory (`LOGIN_MAX_ATTEMPTS * 3` per lockout window) and every test signs in from the same address, so a second run inside the window exhausts the budget and fails on login. Restarting clears it; re-seeding alone does not.

CI needs no real API keys — unit tests use mocked providers and demo fixtures.

## Deployment

The app must listen only on `127.0.0.1` with a reverse proxy terminating TLS in front, and PostgreSQL must never be published to the host. Backup, restore, update and incident procedures: [DEPLOYMENT.md](DEPLOYMENT.md) and [OPERATIONS.md](OPERATIONS.md).

## Documentation map

| Document | What it covers |
|---|---|
| [TUTORIAL.md](TUTORIAL.md) | Step-by-step first run: Docker, local dev, Windows, Linux VPS |
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) | What the project is and why it exists |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Layers, request flow, module map |
| [API.md](API.md) | Internal HTTP endpoints |
| [SECURITY.md](SECURITY.md) | Security policy and reporting |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Assets, threats, mitigations |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment |
| [OPERATIONS.md](OPERATIONS.md) | Backups, restore, routine operations |
| [LIMITATIONS.md](LIMITATIONS.md) | Known limits and honest caveats |
| [ROADMAP.md](ROADMAP.md) | Planned work |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Setup, gates, commit conventions |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community expectations |
| [SPEC.md](SPEC.md) | Original build specification |
| [DECISIONS.md](DECISIONS.md) | Engineering decisions and trade-offs |
| [REPOSITORY_AUDIT.md](REPOSITORY_AUDIT.md) | Every tracked file, and why it is public |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Dependency licenses |
| [PUBLICATION_CHECKLIST.md](PUBLICATION_CHECKLIST.md) | Pre-publication verification state |

Every document above has a Russian counterpart at `FILE.ru.md`. The in-app user guide lives at `/docs`, is available in Russian and English, and needs no account — you can read what the tool does before requesting access.

## Limitations

The TON Center fallback classifies only TON transfers — jetton and NFT movements are marked incomplete on that path. Explorer links point at addresses rather than individual transactions, because the events feed carries no per-transaction hashes. The rate limiter is in-process, so a multi-instance deployment would need a shared store. These and the rest are collected in [LIMITATIONS.md](LIMITATIONS.md).

## Roadmap

Richer TON Center fallback, a dedicated asset-trace screen, a full English locale, per-node depth control, saved investigations, and a shared rate-limit store — tracked in [ROADMAP.md](ROADMAP.md).

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the lint/typecheck/test/build gate and commit conventions, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations.

## Telegram

- Project channel — updates and release notes: <https://t.me/tonflowapp>
- Request a username and temporary password for the hosted instance: <https://telegram.me/tonflowapp?direct>

Access is granted by hand over Telegram direct messages. There is no public registration and no automatic provisioning.

## License

Licensed under the Apache License, Version 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE). An informal Russian explanation is in [LICENSE.ru.md](LICENSE.ru.md); the English [LICENSE](LICENSE) is the legally binding text.

Copyright (c) 2026 jutsu-dev
