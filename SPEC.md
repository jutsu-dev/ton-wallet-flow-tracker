[English](SPEC.md) | [Русский](SPEC.ru.md)

# SPEC — TON Wallet Flow Tracker

Technical specification for the application. This is the contract the implementation and
tests are checked against. It describes what the system does, not how good it is.

## 1. Purpose and non-goals

TON Wallet Flow Tracker loads public TON account activity for a given address, normalizes it
into a single event model, and renders transfers as an interactive graph. It is a private,
authenticated web app for a small team, and an open-source project.

It works only with public on-chain data. It does **not**:

- ask for seed phrases, private keys, or wallet connections (no TonConnect, no signing);
- send or manage funds;
- prove who owns an address or that any address belongs to a criminal;
- guarantee asset recovery.

Wording in the UI and exports stays careful: "unknown address", "user label", "possible
service address", "observed on-chain activity", "link requires further confirmation".

## 2. Users and roles

No public registration. Accounts are created by an owner.

- **OWNER** — manages users, roles, and limits; views the audit log; can delete labels.
- **MEMBER** — analyzes addresses, views operations, creates labels, exports, sees their own
  request history.

Sessions are server-side, stored in the database, referenced by an opaque httpOnly cookie.
Passwords are hashed with Argon2id. First login with a temporary password forces a change.
Login is rate-limited with temporary lockout after repeated failures.

## 3. Data sources

Primary provider: **TonAPI** (`https://tonapi.io`), REST v2, Events/Accounts/NFT endpoints.
Fallback: **TON Center API v3** (`https://toncenter.com/api/v3`).

A `BlockchainProvider` interface hides both behind one shape:

`validateAddress, normalizeAddress, resolveDns, getAccount, getAccountEvents,
getTransactions, getJettonBalances, getNftItems, getNftHistory, getTrace, getTransaction`.

Rules: TonAPI first; 10 s timeout; at most 3 attempts; exponential backoff with jitter;
honor `Retry-After`; handle 400/401/403/404/429/5xx distinctly; fall back to TON Center on
transient upstream failure; never infinite-retry; missing values become `null`, never
invented; incomplete responses are flagged; every result records its source
(`tonapi`, `toncenter`, `mixed`). Upstream stack traces and auth headers never reach the
client. A circuit breaker, a short TTL cache, and a concurrency limiter sit in front.

## 4. Address handling

Supported inputs: friendly bounceable (`EQ…`), friendly non-bounceable (`UQ…`), raw
(`0:…`), and `.ton` DNS names. For each address the system stores: original input, canonical
raw address, bounceable friendly form, non-bounceable friendly form, and workchain.

Format is never treated as a risk signal. `UQ` vs `EQ`, a new address, an empty history, or a
low operation count are not evidence of anything.

## 5. Normalized event model — `WalletAction`

Every provider action maps to one `WalletAction`:

`id, eventId, traceId, transactionHash, timestamp, status, success, direction, actionType,
senderAddress, recipientAddress, accountAddress, amountRaw, amountFormatted, decimals,
assetType, assetSymbol, assetName, assetContractAddress, nftAddress, nftName,
nftCollectionAddress, nftCollectionName, telegramGiftSlug, telegramGiftNumber, comment, memo,
operationCode, source, isIncomplete, rawReference`.

`actionType`: `ton_transfer | jetton_transfer | nft_transfer | nft_purchase | nft_sale |
contract_call | failed_transfer | unknown`.

`assetType`: `ton | jetton | nft | telegram_gift | unknown`.

Trust rules: symbols, token names, NFT names, collection names, and metadata URLs are display
hints only and are sanitized. Contract address, NFT address, decimals, and canonical wallet
addresses are the source of truth. No untrusted HTML is rendered.

## 6. Graph model

React Flow. The checked wallet is the central node. Other nodes are counterparties. Incoming
edges point to the center; outgoing edges point away. Edge labels carry TON amount, jetton
amount + contract, NFT name, Telegram gift, or a grouped-operation count. Failed transfers
are dashed; successful are solid. Meaning is never carried by color alone — thickness, border
style, dashing, labels, and icons all encode state.

Node types: explored, own, safe, unknown, user-suspicious, service, exchange, marketplace.

Expansion: depth ≤ 3, a visited set prevents cycles, requests are cancelable, and hard caps
of 150 nodes / 300 edges stop growth with a visible warning.

## 7. Asset tracing

"Trace asset" mode. For an NFT: follow `nftAddress` through its transfer history, show the
current owner, the transfer chain, recognized sales, timestamps, and transaction hashes —
never trace by name. For a jetton: contract address, decimals, symbol. For TON: bounded
depth, confirmed transfers separated from speculative links; downstream addresses are not
automatically implicated.

## 8. Operations table

Columns: time, type, direction, status, asset, amount, sender, recipient, memo, source,
actions. Sorting, search, filters (asset kind, direction, success/failure, date range),
cursor pagination, copy-address, explorer links, and "highlight on graph". Large histories
are paged, never loaded in one request.

## 9. Labels

User labels with type (`OWN, SAFE, UNKNOWN, SUSPICIOUS, SERVICE, EXCHANGE, MARKETPLACE,
OTHER`), title, and note. Every label view shows: "Label added by a user; not a system-
confirmed fact." Label changes are written to the audit log.

## 10. Exports

SVG, PNG, and a square 1:1 PNG at ≥ 2048×2048 in a black-and-white style. Two templates:
technical (full addresses, tx hashes, trace IDs, timestamps) and public (shortened addresses,
compact). Every export has a title, the checked address, a date, the diagram, a legend, the
data source, and the label disclaimer. Exports never contain API keys, session data, database
IDs, stack traces, or private notes unless explicitly chosen. Long addresses wrap.

## 11. Limits (env-configurable)

MEMBER: 10 new analyses / 10 min; 3 concurrent; ≤ 100 source events; depth ≤ 3; ≤ 150 nodes;
≤ 300 edges. OWNER: higher, but protection is never fully disabled. Cache TTL: account 30 s,
events 60 s, DNS 10 min, NFT metadata 10 min, provider error ≤ 10 s.

## 12. Security

Zod validation on every server input; authentication and authorization on every protected
route; CSRF protection; rate limiting; strict CSP with `frame-ancestors 'none'`;
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; secure cookies; request
and response size limits; SSRF protection via an upstream-domain allowlist; metadata
sanitization; structured JSON logs that never contain secrets, and that shorten or hash
addresses. No `eval`, no shell from user input, no SQL string interpolation (Prisma
parameterizes), no arbitrary URL fetch or image proxy, no unsafe redirects.

## 13. Demo mode

`DEMO_MODE=false` by default. When `true`, the app serves synthetic fixtures only, never
touches a real API, and shows a persistent banner: "Демонстрационный режим — используются
искусственные данные." The demo scenario covers a TON transfer, a jetton transfer, an NFT
transfer, a failed action, a second-level wallet, a user label, and a square B/W export. No
real victim data is used.

## 14. Stack and deployment

Next.js (App Router) + React + TypeScript strict + Tailwind + React Flow + TanStack Query +
Zod on the front and in server routes; Prisma + PostgreSQL for storage. Docker multi-stage
build, Docker Compose with an internal network, a persistent Postgres volume, healthchecks,
a restart policy, and migrations on startup. PostgreSQL is never published; the app binds to
`127.0.0.1` only. UI language is Russian first, with structure ready for English.
