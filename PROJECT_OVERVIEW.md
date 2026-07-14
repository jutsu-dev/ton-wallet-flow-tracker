# Project Overview

Open-source visual analytics tool for public TON blockchain activity.

This overview is written for a reader who has never worked with TON or blockchains. It explains what the project is, the main engineering problems it solves, and how the pieces fit together, without assuming prior knowledge of the ecosystem.

## Problem

A public blockchain records every transfer between accounts, and TON is no exception. That data is open, but it is also raw and awkward to read: activity is spread across different record types (plain coin transfers, token transfers, collectible transfers, contract calls), addresses come in several encodings for the same account, and public APIs return deeply nested JSON that differs from provider to provider. Reading a list of transactions one row at a time makes it hard to see the shape of the activity — who sent value to whom, how often, and in what direction.

## Project goal

Turn the public activity of a single TON account into something a person can actually look at: a normalized list of operations and an interactive graph of transfers, with the account in the middle and its counterparties around it. The tool is a small, private, authenticated web app for a team, and it is released as open source. It is deliberately narrow — it visualizes public data and nothing more.

## How TON data is loaded

A TON account can be written several ways: a "friendly" form starting with `EQ` or `UQ`, a "raw" form like `0:abc…`, or a human-readable `.ton` name (similar to a domain name). The app accepts all of them, verifies the checksum, and converts each to one canonical form so the same account is never treated as two. It then asks a blockchain data provider over HTTPS for two things: a summary of the account (balance, state) and a page of its recent activity. A `.ton` name is resolved to an address first. Requests are bounded — a timeout, a limited number of retries, and a cap on how much history is pulled at once — so a single analysis can never hang or fetch unboundedly.

## Event normalization

Different providers describe the same event differently, and even one provider has many event shapes. Rather than let those differences leak into the rest of the app, every raw event is mapped into one internal record called a `WalletAction`. That record always has the same fields: when it happened, whether it succeeded, its direction relative to the account, the sender and recipient, the asset and amount, any comment, and — importantly — where the data came from and whether it was complete. If a field is missing upstream, it is set to "null" and the record is flagged incomplete; the app never fills gaps with guesses. Text that comes from the chain (token names, comments) is treated as untrusted and sanitized before it is ever displayed.

## Graph construction

Once activity is a list of uniform records, building the picture is straightforward. Each transfer becomes a directed edge from sender to recipient. Repeated transfers of the same asset between the same two accounts are grouped into a single edge that carries the total amount and a count, so the graph stays readable. The analyzed account is the central node; everyone it interacted with is a surrounding node. Visual cues carry meaning without relying on color alone: arrows show direction, thicker lines mean more operations, dashed lines mean the transfers failed, and the node's border style reflects any label applied to it.

## Cycle prevention

The graph can be expanded: click a neighbor to load *its* activity and grow the picture outward. Left unchecked, this could loop forever — A pays B, B pays A — or explode in size. Two mechanisms prevent that. A "visited" set records every account already expanded, so the same node is never expanded twice and cycles cannot recur. And hard caps on the number of nodes and edges (150 and 300 by default), together with a maximum expansion depth, stop growth and show a notice instead of letting the graph run away.

## Provider fallback

Relying on a single external API is fragile, so the app uses two: a primary (TonAPI) and a fallback (TON Center). Both are hidden behind one common interface, so the rest of the code does not know or care which answered. If the primary fails in a way that a retry might fix — rate limiting, a server error, a timeout — the app retries with increasing delays and then falls back to the secondary. If the primary fails in a way a fallback cannot fix, such as a rejected request, the error is surfaced directly. A "circuit breaker" stops hammering a provider that is clearly down, a short-lived cache avoids repeating identical requests, and each result is tagged with the source that produced it.

## Security boundaries

The app draws a firm line between the browser and the server. API keys live only in server-side code and are never sent to the browser, embedded in responses, or written to logs. Outbound requests are restricted to an allowlist of the two provider hosts, and redirects are refused, so the server cannot be tricked into calling somewhere else. Every request the server accepts is validated against a strict schema. A Content-Security-Policy, set fresh on each request, constrains what the page is allowed to load, and the page cannot be embedded in a frame elsewhere. Logs redact anything that looks like a secret and shorten addresses.

## Authentication

There is no public sign-up; an owner creates accounts. Passwords are stored using Argon2id, a modern, memory-hard hashing algorithm, never in plain text. When a user logs in, the server creates a session stored in the database and hands the browser only an opaque token in a cookie that JavaScript cannot read; the server keeps just a hash of that token. Repeated failed logins lock an account temporarily, and requests from one address are rate limited. New accounts must change their temporary password on first use. Two roles exist — owner and member — and each protected action checks both that the user is signed in and that their role is allowed to perform it.

## Testing

The parts of the system that are pure logic — address handling, amount math, graph construction, input sanitization, the retry and circuit-breaker behavior — are covered by fast unit tests that need nothing external. Authentication and sessions are covered by an integration test that runs against a real PostgreSQL database when one is configured, and is skipped automatically when it is not, so the ordinary test run stays quick and dependency-free. Because the app has a demo mode that serves synthetic data, the whole interface can also be exercised end to end in a browser without ever touching a live blockchain API.

## Ethical limits

The tool works with public data only and is careful about what it claims. It does not connect to wallets, ask for secret keys, or move money. It does not identify the real person behind an address, prove ownership, or establish wrongdoing, and it says so in its wording. Labels a user adds to an address are shown as user opinions, never as confirmed facts. The neutral framing is deliberate: an address being new, or having little history, is not treated as evidence of anything.

## Current limitations

The fallback provider can classify only plain TON transfers, so results from it are partial for tokens and collectibles. Explorer links point at accounts rather than individual transactions, because the activity feed used for the graph does not carry per-transaction identifiers. The rate limiter and lockout counters live in memory, which suits a single running instance. The full list of honest caveats lives in [LIMITATIONS.md](LIMITATIONS.md).

## Future work

Planned improvements include a dedicated "trace this asset" mode, reconstructing more detail on the fallback path, an English interface alongside the Russian one, finer control over how far each node expands, saving an investigation to reopen later, and moving the rate limiter into a shared store so the app can run as more than one instance. These are tracked in [ROADMAP.md](ROADMAP.md).

## What I learned

Building this project meant working end to end across:

- TypeScript
- React
- Next.js
- Blockchain APIs
- Event normalization
- Graph structures
- PostgreSQL
- Prisma
- Docker
- Authentication
- Application security
- Testing
- Continuous integration (CI)
- Open-source maintenance
