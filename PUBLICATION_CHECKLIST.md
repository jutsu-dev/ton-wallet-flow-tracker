# Publication checklist

State of the repository against the pre-publication requirements. `[x]` is verified done;
`[ ]` is a required action that only the repository owner can complete.

## Attribution and license

- [x] Repository owner is `jutsu-dev` (git author set repo-locally)
- [x] Commit author is `jutsu-dev <jutsu-dev@users.noreply.github.com>` on every commit
- [x] No `Co-authored-by` trailers in history
- [x] No Claude / Anthropic / AI attribution anywhere
- [x] Apache-2.0 `LICENSE` added; `NOTICE` present
- [x] Copyright belongs to `jutsu-dev` (`Copyright (c) 2026 jutsu-dev`)

## Secrets and sensitive data

- [x] Real API keys absent from Git (`.env` never committed; only `.env.example` tracked)
- [x] Git history scanned with gitleaks (whole history, no leaks)
- [x] gitleaks passed on the working tree and staged content
- [x] `.env` is git-ignored and permission-restricted to the owner
- [x] Database dumps, logs, `secrets/` excluded via `.gitignore`
- [x] Private investigation addresses excluded (grep of tracked files: clean)
- [x] Private labels live only in the database, not in Git
- [x] No VPS IP or machine hostname in tracked files
- [x] Screenshots are demo-mode synthetic data; PNGs carry no EXIF
- [x] Demo mode uses only synthetic fixtures

## Build, tests, quality

- [x] Lint, typecheck, unit + integration tests pass (75 tests)
- [x] Playwright end-to-end flow passes (15 tests)
- [x] Production build passes
- [x] Docker image builds and the stack runs healthy
- [x] Dependency licenses reviewed (`THIRD_PARTY_NOTICES.md`)
- [x] README (EN + RU) and security docs complete
- Note: two moderate advisories come from the postcss bundled inside Next.js; it runs only
  at build time over the project's own CSS. See `LIMITATIONS.md`.

## Blocking actions before any public push (owner only)

- [x] Owner gave explicit confirmation to create and push the public repository
- [ ] Authenticate GitHub CLI as `jutsu-dev` (`gh auth login`) — currently not logged in

## Residual risk accepted by the owner

The two TonAPI / TON Center keys in use were shared over a private channel, so they should be
treated as known to a third party. The owner decided not to gate publication on rotating them:
they exist only in the local git-ignored `.env`, never in Git, the build, or any published
artifact, and the secret scan above confirms that. Rotating them remains the recommended
follow-up; nothing in the repository has to change when it happens.
