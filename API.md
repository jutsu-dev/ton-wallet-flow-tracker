# Internal API

These are the application's own HTTP route handlers, consumed by its own pages and client components. This is **not** a public or stable API: there is no versioning, no API-key access, and shapes may change between releases. It is documented so contributors and operators know exactly what each endpoint expects and returns.

All endpoints are under `/api`. Request and response bodies are JSON.

## Conventions

**Authentication.** Protected endpoints read the session from the `twft_session` cookie (opaque token, stored server-side as a hash). No session, or a session for a disabled user, yields `401 { "error": "unauthorized" }`.

**CSRF.** Mutating requests (`POST`, `DELETE`) require both halves of a double-submit check plus a same-origin check:

- the `twft_csrf` cookie value must be echoed in an `x-csrf-token` request header (compared with a timing-safe equality), and
- the `Origin` header must match `APP_URL`.

The browser client attaches the header automatically from the cookie. A failed check returns `403 { "error": "csrf" }`. `GET` endpoints do not require CSRF. Login is the exception: no CSRF token exists before authentication, so it enforces the same-origin `Origin` check only.

**Errors.** Errors are `{ "error": "<code>" }` with an appropriate HTTP status. Validation failures against the shared Zod schemas return `400 { "error": "invalid_input" }`.

---

## Auth

### POST /api/auth/login

Same-origin required; no session or CSRF token needed. Body:

```json
{ "username": "string (1–64)", "password": "string (1–200)" }
```

On success sets the session and CSRF cookies and returns:

```json
{ "ok": true, "mustChangePassword": false, "role": "OWNER" }
```

Failure statuses: `401 invalid` (bad credentials), `423 locked` (account locked after repeated failures), `403 disabled` (account deactivated), `429 rate_limited` (too many attempts from the IP), `403 csrf` (origin mismatch), `400 invalid_input`.

### POST /api/auth/logout

Auth + CSRF. No body. Destroys the current session and clears cookies. Returns `{ "ok": true }`.

### POST /api/auth/change-password

Auth + CSRF. Body:

```json
{ "currentPassword": "string (1–200)", "newPassword": "string (10–200)" }
```

Verifies the current password, sets the new hash, clears the forced-change flag, revokes all of the user's sessions, and issues a fresh session so the caller stays signed in. Returns `{ "ok": true }`. Errors: `400 invalid_current` (wrong current password), `400 invalid_input`, `401 unauthorized`, `403 csrf`.

---

## Analysis

### POST /api/analyze

Auth + CSRF. Runs a full analysis for an address. Body:

```json
{ "address": "EQ… | UQ… | 0:… | name.ton", "limit": 25, "depth": 1 }
```

`limit` must be one of `10, 25, 50, 100` (default 25); `depth` is `1–3` (default 1). In demo mode the built-in scenario is returned regardless of input.

Response (`AnalysisResult`):

```jsonc
{
  "input": "…",                 // original input string
  "address": {                  // NormalizedAddressDto | null
    "raw": "0:…", "bounceable": "EQ…", "nonBounceable": "UQ…", "workchain": 0
  },
  "account": {                  // AccountSummary | null
    "address": "0:…", "bounceable": "EQ…", "nonBounceable": "UQ…",
    "balanceTon": "3.4", "state": "active", "isActive": true,
    "source": "tonapi", "isIncomplete": false
  },
  "actions": [ /* WalletAction[] — see below */ ],
  "nodes":  [ /* GraphNodeDto[] */ ],
  "edges":  [ /* GraphEdgeDto[] */ ],
  "source": "tonapi",           // "tonapi" | "toncenter" | "mixed" | "demo"
  "incomplete": false,
  "warnings": ["…"],
  "truncated": false,           // true if node/edge caps trimmed the graph
  "checkId": "…",               // WalletCheck id, or null if persistence failed
  "demo": false
}
```

Error statuses map from the analysis error code: `400 invalid_address` / `400 dns_unresolved`, `404 not_found`, `429 rate_limited`, `502 provider_unavailable`, `500 internal`.

### POST /api/expand

Auth + CSRF. Loads one more node's transfers for the graph. Body:

```json
{ "address": "EQ… | 0:…", "limit": 25 }
```

Response (`ExpansionResult`):

```jsonc
{
  "center": "0:…",
  "nodes": [ /* GraphNodeDto[] */ ],
  "edges": [ /* GraphEdgeDto[] */ ],
  "actions": [ /* WalletAction[] */ ],
  "source": "tonapi",
  "incomplete": false,
  "warnings": ["…"],
  "truncated": false
}
```

Same error statuses as `/api/analyze`.

**GraphNodeDto**: `{ address, bounceable, short, isCenter, kind, incoming, outgoing, labels }`, where `kind` is one of `explored | own | safe | unknown | suspicious | service | exchange | marketplace` and `labels` is an array of `{ labelType, title, note }`.

**GraphEdgeDto**: `{ id, from, to, assetType, label, count, hasFailed, hasSuccess }`. `label` is the display string (amount + asset, or a grouped `×N` count); `from`/`to` are canonical raw addresses.

**WalletAction** (per operation): `id, eventId, traceId, transactionHash, timestamp, status, success, direction, actionType, senderAddress, recipientAddress, accountAddress, amountRaw, amountFormatted, decimals, assetType, assetSymbol, assetName, assetContractAddress, nftAddress, nftName, nftCollectionAddress, nftCollectionName, telegramGiftSlug, telegramGiftNumber, comment, memo, operationCode, source, isIncomplete, rawReference`. Missing values are `null`; `actionType` and `assetType` use the domain enums; amounts are strings.

---

## Labels

### GET /api/labels?address=…

Auth. Returns the labels for an address:

```json
{ "labels": [ { "id": "…", "labelType": "EXCHANGE", "title": "…", "note": "… | null", "createdBy": "username | null", "createdAt": "ISO-8601" } ] }
```

`400 invalid_input` if `address` is missing.

### POST /api/labels

Auth + CSRF. Body:

```json
{ "address": "EQ… | 0:…", "labelType": "OWN|SAFE|UNKNOWN|SUSPICIOUS|SERVICE|EXCHANGE|MARKETPLACE|OTHER", "title": "string (1–80)", "note": "string (≤500) | null" }
```

Creates (or attaches to an upserted wallet) a label and returns `201 { "label": LabelDto }`. `title` and `note` are sanitized. `400 invalid_address` for an unparseable address.

### DELETE /api/labels/[id]

Auth + CSRF. Deletes a label by id. A member may delete only their own labels; an owner may delete any. Returns `{ "ok": true }`, or `404 not_found`, or `403 forbidden`.

---

## Assets

### GET /api/assets?address=…

Auth (no CSRF; read-only). Returns jetton balances and owned NFTs (`WalletAssets`):

```jsonc
{
  "jettons": [ { "contractAddress": "0:…", "symbol": "USDT|null", "name": "…|null",
                 "decimals": 6, "balanceRaw": "…", "balanceFormatted": "…", "isIncomplete": false } ],
  "nftItems": [ { "address": "0:…", "name": "…|null", "collectionAddress": "0:…|null",
                  "collectionName": "…|null", "index": "…|null", "isIncomplete": false } ],
  "nftCount": 1,
  "source": "tonapi",
  "incomplete": false
}
```

`400 invalid_address` for a bad address, `502 provider_unavailable` if both providers fail.

---

## Health

### GET /api/health

No auth. See [OPERATIONS.md](OPERATIONS.md). Returns `{ status, service, database, time }` with HTTP 200, or HTTP 503 when the database is unreachable.
