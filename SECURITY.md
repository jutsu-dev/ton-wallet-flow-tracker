[English](SECURITY.md) | [Русский](SECURITY.ru.md)

# Security

This document describes the security model of TON Wallet Flow Tracker and how to
report a problem. See [THREAT_MODEL.md](THREAT_MODEL.md) for the threat analysis and
[LIMITATIONS.md](LIMITATIONS.md) for known gaps.

## Reporting a vulnerability

Open a private security advisory on the GitHub repository
(`Security` → `Report a vulnerability`), or open a regular issue if the report is not
sensitive. Please do not disclose exploit details publicly until a fix is available.

## What the application does and does not do

It reads public on-chain data through TonAPI and TON Center. It never asks for seed
phrases or private keys, never connects a wallet, never signs or sends transactions, and
never moves funds. It does not prove who owns an address.

## Controls in place

**Authentication and sessions.** Passwords are hashed with Argon2id (`@node-rs/argon2`,
m=19 MiB, t=2, p=1). Sessions are opaque random tokens stored only as SHA-256 hashes in
the database and referenced by an `httpOnly`, `SameSite=Lax` cookie that is `Secure` in
production. There is no public registration. Repeated failed logins increment a counter and
lock the account for a configurable window; login attempts are also IP rate-limited.
Disabling a user or changing a password revokes all of that user's sessions.

**Authorization.** Two roles, `OWNER` and `MEMBER`, are checked server-side. Owner-only
operations (user management, deleting any label) are not exposed to members.

**CSRF.** Mutating requests require a double-submit token: a non-`httpOnly` `twft_csrf`
cookie whose value must be echoed in an `x-csrf-token` header, plus a same-origin `Origin`
check. Login (which has no token yet) uses the same-origin check.

**Content Security Policy.** `src/middleware.ts` sets a per-request nonce and a CSP with
`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, and scripts limited to
same-origin plus the request nonce. Additional headers (`X-Content-Type-Options`,
`Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`) are set in `next.config.mjs`.

**SSRF and outbound requests.** The HTTP client checks every upstream URL host against an
allowlist derived from the configured provider base URLs, rejects non-http(s) schemes, and
uses `redirect: 'error'`. There is no arbitrary URL fetch and no image proxy; `next/image`
remote patterns are empty.

**Input validation.** Every route handler validates its body or query with Zod before use.
Prisma parameterizes all queries; there is no string-built SQL, no `eval`, and no shell
execution from user input.

**Untrusted metadata.** Token names, NFT names, comments, memos, and external URLs are
treated as untrusted: control characters are stripped, length is capped, URLs are limited to
http(s), and nothing is rendered as raw HTML (React escapes on output).

**Secrets.** API keys and database credentials stay server-side. They are never sent to the
client, never placed in `NEXT_PUBLIC_*`, and `.env` is git-ignored and permission-restricted.
Structured logs redact secret-looking fields and shorten addresses.

**Rate and size limits.** Analyses are rate-limited per user, upstream requests are
timeout-bounded and guarded by a circuit breaker and a concurrency limiter, and the graph is
capped at 150 nodes / 300 edges with expansion depth ≤ 3.

## Dependency and secret scanning

CI runs `npm audit --omit=dev --audit-level=high`, `gitleaks` over the full history, a production
build, a Docker build, and the documentation checks. The audit deliberately covers production
dependencies only and fails on high or critical: that is the surface a user of the deployed app
can reach. Two moderate advisories come from the postcss version bundled inside Next.js — they sit
below that threshold and in dev tooling, so CI does not fail on them by design; that code only
processes the project's own CSS at build time and is not reachable at runtime. Run `npm audit` with
no flags to see them. See LIMITATIONS.md.
