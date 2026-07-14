# Roadmap

This is a set of intentions, not promises or dates. Items may change or be dropped as the project learns more. If you want to help with any of them, open an issue first so we can agree on the shape of the work.

## Near term

- **Asset-trace mode.** Finish the "trace this asset" flow: follow an NFT through its transfer history to the current owner, separate confirmed transfers from speculative links, and surface timestamps and transaction hashes. The provider methods (`getNftHistory`, `getTrace`, `getTransaction`) already exist; this is mostly UI and a dedicated view on top of them.
- **Richer TON Center fallback.** Today the fallback classifies only TON transfers and marks jetton/NFT movements incomplete. Reconstruct more from TON Center v3 (jetton transfer messages, NFT transfers, decoded op codes) so a TonAPI outage degrades less.
- **English locale.** The UI strings are Russian-first. Extract them behind the existing i18n helper and add an English locale, with a language toggle.

## Medium term

- **Per-node depth control.** Let an analyst set how far to expand from a specific node instead of a single global depth, while keeping the visited-set cycle guard and the node/edge caps.
- **Saved investigations.** Persist a named graph (center address, expanded nodes, labels in view) so a session can be reopened later and shared within the team, building on the existing `WalletCheck` history.
- **Shared rate-limit store.** The current limiter is per-process. Move it behind an interface with a shared backend (for example Redis) so limits and lockouts hold across multiple app instances.

## Under consideration

- Cursor-based server paging for very long histories, so the operations table is not bounded by the source-event cap.
- Per-transaction explorer links once transaction hashes are consistently available on the events path.
- An owner-facing admin screen for user management on top of the existing owner-only service functions.
