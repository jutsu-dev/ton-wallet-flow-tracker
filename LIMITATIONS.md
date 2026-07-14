# Limitations

This is an honest list of what the tool does not do, or does only partially. It exists so nobody mistakes a display convenience for a guarantee. Some items are roadmap work; others are inherent to the data sources.

## Data completeness

- **The TON Center fallback classifies only TON transfers.** TON Center v3 has no "events with actions" abstraction, so on the fallback path the app reconstructs TON-value messages into transfer actions and marks every one of them incomplete. Jetton and NFT movements are not reconstructed there — that is what TonAPI is for. When a result's source is `toncenter`, treat the picture as partial. DNS resolution and trace lookups are likewise unsupported on the fallback and return empty results with a warning.
- **Telegram gift detection is not implemented.** The model has an asset type and fields for Telegram gifts, but no provider path populates them. Gifts arrive as ordinary NFT transfers and are shown as NFTs.
- **Jetton metadata may be missing on the fallback.** TON Center jetton balances come back without symbol or decimals resolved, so amounts there are formatted with a default and flagged incomplete.

## Explorer links

- **Explorer links point at addresses, not transactions.** The account-events feed used for the graph and the operations table does not carry a per-transaction hash for each action, so "open in explorer" links resolve to the counterparty address (TON Viewer / Tonscan) rather than a specific transaction. Per-transaction hashes are available on the dedicated transaction and trace endpoints, which the graph path does not currently use.

## Numeric precision

- **Very large TON amounts delivered as JSON numbers can lose precision.** Amounts are normally strings and are handled with `BigInt` end to end. If an upstream returns an amount as a JSON number instead, JavaScript's number type cannot represent integers above 2^53 exactly, so a nano-amount larger than that would already be lossy before the app truncates it to an integer string. In practice this only affects implausibly large single values; string amounts are unaffected.

## Scaling and deployment

- **The rate limiter is per-process.** Login lockout counters and analysis limits live in an in-memory map, which is correct for a single instance but does not coordinate across multiple app processes. A shared store is on the roadmap; until then, run one app instance (the default deployment does).
- **The operations table pages on the client.** Filtering, search, sorting, and paging all run in the browser over the actions already loaded for the check, which are bounded by the source-event cap (up to 100). There is no server-side cursor paging of the full history yet, so histories longer than the cap are not shown in one view.
- **User management has no admin screen yet.** The owner-only service functions to create users and change roles exist and are covered by tests, but there is no web UI wired to them. Additional users are created through the seed or a small script (see [OPERATIONS.md](OPERATIONS.md)).

## Visualization

- **The graph layout is radial, not force-directed.** Counterparties are placed on a circle around the center and expanded nodes around their parent. This is stable and export-friendly, but for dense graphs a physics-based layout would separate clusters better. Positions are draggable after render.

## Dependencies

- **Two moderate advisories are reported at build time from a transitive PostCSS pulled in by Next.js tooling.** They sit in the build toolchain, not on any runtime request path, and are not exploitable by an application user. They are tracked and will clear when the upstream toolchain updates; `npm run audit:prod` (production dependencies only) is the check that matters for what actually ships.

## Scope

By design the tool works only with public on-chain data. It does not connect wallets, sign or move funds, resolve real-world identities, or prove ownership or wrongdoing. User labels are exactly that — user assertions — and are never presented as system-confirmed facts.
