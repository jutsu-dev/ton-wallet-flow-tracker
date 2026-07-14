# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-14

Initial release.

### Added

- **Authentication and accounts.** Server-side sessions stored in PostgreSQL and referenced by an opaque `httpOnly` cookie token (persisted only as a SHA-256 hash), Argon2id password hashing, `OWNER` and `MEMBER` roles, forced password change on first login, per-account lockout and per-IP login rate limiting, and an audit log. The first owner is created by an idempotent database seed with a random temporary password written to `secrets/initial-owner-password`.
- **Blockchain providers.** A single `BlockchainProvider` interface with two implementations — TonAPI (primary) and TON Center v3 (fallback) — behind an orchestrator that falls back only on transient failures. Shared resilient runtime: per-request timeout, bounded retries with exponential backoff and jitter, `Retry-After` handling, a per-provider circuit breaker, a short-TTL cache, a concurrency limiter, and an SSRF host allowlist that refuses redirects and non-HTTP(S) schemes.
- **Normalized event model.** Provider responses are mapped into a single `WalletAction` shape with provenance (`tonapi` / `toncenter` / `demo`) and an incompleteness flag; missing fields become `null` rather than being invented. On-chain metadata strings are sanitized before display.
- **Interactive graph.** A React Flow diagram with the analyzed wallet at the center, aggregated directed edges, amount/asset/grouped-count labels, dashed edges for failed transfers, node styling by kind, cycle-safe node expansion up to a configurable depth, and hard caps of 150 nodes / 300 edges.
- **Operations table.** Per-operation view with client-side filtering (asset, direction, status), search, date range, sorting, and paging.
- **Assets.** Jetton balances and owned NFTs for an address.
- **Labels.** User-supplied address labels with type, title, and note, deletable by their author or an owner, with a standing disclaimer that labels are not system-confirmed facts.
- **Exports.** PNG, SVG, and a square 2048×2048 PNG of the graph.
- **Demo mode.** Fully synthetic fixtures served when `DEMO_MODE=true`, with a persistent banner and no external API calls.
- **Security controls.** Zod validation on every server input, CSRF protection (double-submit token plus same-origin check on mutations), a strict per-request Content-Security-Policy from middleware, additional security headers, and structured JSON logs that redact secrets and shorten addresses.
- **Deployment.** Multi-stage Docker build and a Docker Compose stack with an internal-only PostgreSQL, a persistent volume, a health endpoint, and migrations plus seed on startup. A health route (`/api/health`) reports database connectivity.

[Unreleased]: https://github.com/jutsu-dev/ton-wallet-flow-tracker/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jutsu-dev/ton-wallet-flow-tracker/releases/tag/v0.1.0
