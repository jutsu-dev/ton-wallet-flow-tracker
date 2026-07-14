[English](THREAT_MODEL.md) | [Русский](THREAT_MODEL.ru.md)

# Threat model

A short, practical threat model. It is not exhaustive; it records the assets worth
protecting, the trust boundaries, the threats considered, and the residual risks.

## Scope and assumptions

- The application is deployed behind a reverse proxy that terminates TLS. The app itself
  binds to `127.0.0.1` and is never exposed directly to the internet.
- Users are a small, trusted team. Accounts are created by an owner; there is no public
  registration.
- All wallet data is public on-chain data fetched from TonAPI and TON Center. The app does
  not hold custody of anything on-chain.

## Assets

1. User credentials and sessions.
2. Provider API keys and the database password.
3. The database: users, wallets, user labels, checks, and the audit log.
4. Private analytical notes (labels and their notes are visible only to signed-in users).
5. The host the app runs on.

## Trust boundaries

- **Browser ↔ app.** Untrusted client input crosses here. Mitigated by session auth, CSRF
  (double-submit + same-origin), Zod validation, CSP, and secure cookies.
- **Unauthenticated surface.** Four routes are reachable without a session by design: `/login`,
  `POST /api/auth/login`, `GET /api/health`, and the user guide at `/docs`. The guide is static
  content compiled into the bundle — it reads no wallet, user or database data, and its only
  input is a `lang` parameter validated against a two-value allowlist before use. Everything
  else redirects to `/login`.
- **App ↔ TON providers.** Upstream responses are untrusted data. Mitigated by the SSRF host
  allowlist, timeouts, retries with a circuit breaker, defensive JSON parsing (missing fields
  become `null` and are flagged incomplete, never invented), and metadata sanitization.
- **App ↔ database.** Mitigated by Prisma parameterization and least-exposure (PostgreSQL is
  not published outside the internal Docker network).

## Threats and mitigations

| Threat | Mitigation |
|---|---|
| Credential guessing / brute force | Argon2id, per-account lockout after repeated failures, IP rate limiting, generic error messages |
| Session theft / fixation | Opaque tokens stored hashed, `httpOnly` + `Secure` + `SameSite=Lax` cookie, revoke-all on password change / disable |
| CSRF on mutating routes | Double-submit `x-csrf-token` + `Origin` check |
| Privilege escalation (MEMBER → OWNER) | Server-side role checks on every owner-only action |
| XSS via on-chain metadata | React output escaping, CSP nonce, sanitization of names/comments/memos, no raw HTML |
| SQL injection | Prisma parameterized queries only |
| SSRF via address/DNS input | Upstream host allowlist, http(s) only, `redirect: 'error'`, no arbitrary fetch/image proxy |
| Denial of service | Analysis rate limits, upstream timeouts + circuit breaker, concurrency limiter, node/edge caps, request body size limits |
| Secret leakage | Keys server-side only, `.env` git-ignored + permission-restricted, log redaction, no secrets in the client bundle |
| Repudiation | Audit log for logins, label changes, user management, and analyses (with hashed IP) |
| Upstream stack-trace / header leakage | Provider errors are classified into safe codes; upstream traces and auth headers never reach the client |

## Residual risks

- The in-memory rate limiter and circuit breaker are per-process. A multi-instance
  deployment would need a shared store; this project targets a single instance.
- Data authenticity depends on TonAPI and TON Center. The app can only report what they
  return, and marks partial responses as incomplete.
- TLS is delegated to the reverse proxy. If the proxy is misconfigured, `Secure` cookies and
  the origin model weaken.
- The two API keys supplied during initial setup were shared over a private channel and should be
  treated as known to a third party. Rotating them was originally a precondition for publishing;
  the owner accepted the residual risk instead, because the keys exist only in the local
  git-ignored `.env` and appear in no commit, no build output, and no published artifact. Rotation
  remains the recommended follow-up. See PUBLICATION_CHECKLIST.md.
- A build-time postcss advisory (bundled in Next.js) is accepted because it only processes the
  project's own CSS during the build.
