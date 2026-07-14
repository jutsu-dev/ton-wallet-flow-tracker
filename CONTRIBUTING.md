# Contributing

Thanks for your interest in improving TON Wallet Flow Tracker. This guide covers local setup, the checks a change has to pass, and the conventions used across the project.

By contributing you agree that your work is licensed under the project's [Apache-2.0](LICENSE) license, and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting set up

You need Node.js 20+ and a PostgreSQL database. Docker is the simplest way to get one.

```bash
git clone https://github.com/jutsu-dev/ton-wallet-flow-tracker.git
cd ton-wallet-flow-tracker
npm install
cp .env.example .env
```

Fill in `.env`. For most work you do not need real provider keys — set `DEMO_MODE=true` and the app serves synthetic fixtures without calling any external API. You do need a `DATABASE_URL`, a `SESSION_SECRET`, and an `AUTH_SECRET` (both at least 32 characters); generate the secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### With Docker

The Compose stack brings up the app and PostgreSQL together, runs migrations and the seed on startup, and publishes the app on `127.0.0.1:8137`:

```bash
docker compose up -d --build
```

### Without Docker

Point `DATABASE_URL` at a running PostgreSQL, then:

```bash
npm run prisma:migrate:dev   # create the schema
npm run db:seed              # create the first owner (password in secrets/initial-owner-password)
npm run dev                  # http://localhost:3000
```

## Checks that must pass

Every pull request has to be green on all four of these. Run them locally before you push:

```bash
npm run lint         # next lint
npm run typecheck    # tsc --noEmit (strict)
npm test             # vitest
npm run build        # prisma generate && next build
```

Notes:

- **Tests.** `npm test` runs the unit suite with mocked providers and demo fixtures, so no API keys are required — this is also how CI runs. The authentication/session integration test is gated on `DATABASE_URL`: it runs when a Postgres URL is set (locally, and in CI where a Postgres service is provided) and is skipped otherwise. Please keep new logic covered; the domain and provider layers are pure and easy to test directly.
- **Types.** The project is TypeScript strict with `noUncheckedIndexedAccess`. Avoid `any`; prefer narrowing untrusted input with the existing `parse` helpers and Zod schemas.
- **Formatting.** `npm run format` applies Prettier (with the Tailwind class-sorting plugin). `npm run format:check` verifies it.
- **End-to-end.** `npm run test:e2e` runs Playwright against a running instance (demo mode is enough). Point it at your instance with `E2E_BASE_URL`.

## Branches and commits

- Work on a topic branch off `main` — for example `feat/asset-trace`, `fix/toncenter-offset`, or `docs/api-examples`.
- Keep commits small and focused, and use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, and so on. A scope is welcome, e.g. `fix(providers): honor Retry-After on 429`.
- Write commit messages in plain text. No emoji in commit subjects or PR titles.
- Rebase on the latest `main` before opening the PR so history stays linear and reviewable.

## Pull requests

Open the PR against `main` and fill in the template. A good PR:

- explains what changed and why, and links any related issue;
- passes lint, typecheck, tests, and build;
- adds or updates tests for changed behavior;
- updates documentation when behavior, configuration, or the API surface changes;
- contains no secrets, API keys, real addresses being investigated, or infrastructure hostnames.

## Scope and design

Keep the layering intact: put pure logic in `src/domain`, provider-specific mapping in `src/server/providers`, and orchestration in `src/server`. New upstream calls go through the `BlockchainProvider` interface and the resilient runtime — do not call `fetch` to third-party hosts directly, and do not add hosts outside the provider allowlist without discussion. When in doubt about a larger change, open an issue first so we can agree on the approach.
