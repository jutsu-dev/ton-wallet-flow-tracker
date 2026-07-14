# Architecture

The codebase is organized so that pure logic never depends on frameworks, provider details never leak past the provider layer, and the Next.js app talks to the domain only through server services. This document maps the layers and walks through what happens when an address is analyzed.

## Layers

```
src/
  domain/        pure types + graph math + sanitization (no React, no I/O)
  lib/           env, validation, logging, TON address/format/DNS, small helpers
  server/
    providers/   BlockchainProvider interface, TonAPI + TON Center, resilient runtime
    analysis/    analyzeWallet / expandNode, graph DTO builder, assets, dashboard
    auth/        password, session, CSRF, web glue, core auth service
    labels/      user label CRUD
    db.ts, audit.ts, rate-limit.ts, http.ts
  app/           Next.js App Router: pages, layouts, route handlers
  components/    client components (React Flow graph, tables, tabs, UI kit)
  middleware.ts  per-request CSP nonce + response headers
prisma/          schema, migration, seed
```

### Domain (`src/domain`)

Framework-free and deterministic. `types.ts` defines the normalized model (`WalletAction`, `AccountSummary`, `JettonBalance`, `NftItemSummary`) shared by everything above it. `graph.ts` is the graph engine: `directionRelativeTo` classifies an action relative to a center address, `buildEdges` aggregates actions into directed edges keyed by `(sender, recipient, asset)` and sums fungible amounts with `BigInt`, `enforceGraphLimits` trims a graph to the node/edge caps by ranking nodes on incident edge weight while always keeping the center, and `selectExpansionTargets` picks cycle-safe expansion targets against a visited set. `sanitize.ts` cleans untrusted metadata strings (strip control characters, collapse whitespace, cap length, remove tag-like sequences) and validates URLs to `http(s)` only. This layer is unit-tested directly and has no I/O.

### Providers (`src/server/providers`)

One interface, two implementations, an orchestrator, and a resilience stack.

- `types.ts` declares the `BlockchainProvider` interface (`validateAddress`, `normalizeAddress`, `resolveDns`, `getAccount`, `getAccountEvents`, `getTransactions`, `getJettonBalances`, `getNftItems`, `getNftHistory`, `getTrace`, `getTransaction`), the `ProviderResult<T>` envelope (`data`, `source`, `incomplete`, `warnings`), and `ProviderError`, which classifies failures and marks which are transient. Errors never carry upstream stack traces or auth headers.
- `tonapi.ts` maps TonAPI's event/action shapes into `WalletAction`s (TON transfers, jetton transfers, NFT transfers and purchases, contract calls). `toncenter.ts` maps raw v3 transaction messages into TON-transfer actions and marks them incomplete, because the fallback cannot reconstruct jetton/NFT semantics. `parse.ts` holds defensive accessors that never throw on malformed JSON.
- `http.ts` is the resilient fetch: an SSRF host allowlist, a per-request timeout via `AbortController`, bounded retries with exponential backoff and jitter, `Retry-After` handling, `redirect: 'error'`, and status-to-error classification. `circuit-breaker.ts`, `cache.ts` (a TTL cache plus a concurrency limiter), and `runtime.ts` tie those together: a cache hit skips the network, an open breaker fails fast, and the limiter bounds in-flight requests.
- `index.ts` provides `ProviderOrchestrator`, which tries the primary (TonAPI) and falls back to the secondary (TON Center) only when the primary throws a transient error. `getProvider()` builds the env-configured instance once per process.

### Server services (`src/server`)

- **analysis** — `service.ts` orchestrates a check: validate, resolve `.ton` DNS if needed, normalize the address, apply the per-user rate limit, fetch account and events, persist a `Wallet` upsert and a `WalletCheck` row (plus an audit entry), load any labels for the addresses in view, and build the graph DTO. `graph-builder.ts` turns aggregated edges and node addresses into the `GraphNodeDto` / `GraphEdgeDto` shapes the client renders, computing per-node incoming/outgoing counts and mapping label type to node kind. `assets.ts` and `dashboard.ts` back the assets tab and the dashboard/history views.
- **auth** — `password.ts` (Argon2id hash/verify), `session.ts` (create/find/destroy sessions, tokens stored hashed), `csrf.ts` (double-submit token compare and same-origin check), `web.ts` (Next `cookies()`/`headers()` glue, `getCurrentUser`, `requireUser`, `requireOwner`, `verifyCsrf`), and `service.ts` (credential verification with lockout and rate limiting, password change, user management functions). The core service deliberately avoids `next/headers` so it can be tested against a database without a request context.
- **labels** — create, list, and delete user labels, gated so a member can delete only their own and an owner can delete any.
- **cross-cutting** — `db.ts` (a single Prisma client per process), `audit.ts` (append-only audit records; IPs are hashed with the auth secret, never stored raw), `rate-limit.ts` (in-memory fixed-window buckets), and `http.ts` (JSON error helper, body reader, CSRF guard, error-code-to-status mapping).

### Next.js App Router (`src/app`)

Server components do the data work: `(app)/layout.tsx` gates access, redirects users who must change their password, and shows the demo banner; `(app)/page.tsx` renders the dashboard; `(app)/wallet/[address]/page.tsx` runs the analysis on the server and hands the result to the client `WalletView`. Route handlers under `app/api` expose the internal endpoints (see [API.md](API.md)). `middleware.ts` generates a per-request nonce, sets a strict Content-Security-Policy (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, a nonce-based `script-src`), and `next.config.mjs` adds the static security headers.

### Client components (`src/components`)

`wallet/flow-graph.tsx` is the React Flow graph: a radial initial layout, custom nodes whose border style encodes kind, edges whose thickness scales with operation count and whose dashing marks failure, node expansion via `POST /api/expand`, and PNG/SVG/square export via `html-to-image`. `wallet/operations-table.tsx` filters, searches, sorts, and pages the loaded actions on the client. The label and asset tabs fetch through a small typed client (`src/lib/client/api.ts`) that attaches the CSRF header. Data flows one way: server components fetch and pass props down; client components mutate through the API routes.

### Persistence (Prisma / PostgreSQL)

The schema (`prisma/schema.prisma`) models users, sessions, wallets, wallet labels, wallet checks, wallet events, and audit logs, with enums for role, label type, and check status. Amounts are stored as strings to preserve precision. The seed creates the first owner idempotently.

## Request flow: analyze an address

1. The analyst submits the address form. The browser navigates to `/wallet/<address>?limit=&depth=` (a server component route).
2. `wallet/[address]/page.tsx` reads the current user from the session cookie, re-validates `limit` and `depth` with the shared Zod schema, and calls `analyzeWallet({ address, limit, depth }, user)`.
3. `analyzeWallet` short-circuits to synthetic fixtures if `DEMO_MODE` is on. Otherwise it applies the per-user rate limit, resolves the input (a `.ton` name is resolved through the provider; anything else is normalized by `@ton/core`), and clamps `limit`/`depth` to the configured maxima.
4. It calls `getProvider().getAccount()` and `getAccountEvents()`. The orchestrator tries TonAPI; on a transient failure it retries with backoff, and if that still fails it falls back to TON Center. Each response carries its source and an incompleteness flag.
5. Provider responses are already normalized into `WalletAction`s. The service upserts the `Wallet`, records a `WalletCheck` (status `SUCCESS` or `PARTIAL`) and an audit entry — persistence failures are swallowed so they cannot break the response — and loads labels for the addresses that will appear as nodes.
6. `buildGraphDto` aggregates the actions into edges, enforces the node/edge caps (setting `truncated` if it had to trim), and produces node/edge DTOs.
7. The page renders `WalletView` with the account summary, the graph, the actions, labels, and history. The client `FlowGraph` takes over for pan/zoom, expansion, and export; expanding a node issues `POST /api/expand`, which runs the same pipeline for that address and merges the returned nodes and edges into the live graph under the same caps.

Throughout, provider keys stay in server-only modules, untrusted strings are sanitized before display, and logs redact secrets and shorten addresses.
