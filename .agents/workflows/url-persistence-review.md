# URL Persistence Review

Use for URL params, share links, local persistence, and recent-timer state review.

- Source of truth: `AGENTS.md`, `docs/live-sessions.md`
- Model fit: suitable for a smaller or cheaper review model when the diff is limited to route, URL-state, or persistence helpers
- Input scope: changed URL or persistence files plus the parser, serializer, storage helper, or share-link code they depend on
- Inspect:
  - touched route, URL-state, storage, and share-link files
  - `docs/live-sessions.md` if shared links or control/view links are affected
  - relevant tests near `src/shared/urlState`, `src/utils/liveSession`, or timer-library storage paths
- Checklist:
  - do query params still parse, normalize, and serialize through the existing abstractions
  - are share-link semantics unchanged unless the contract is intentionally updated
  - do local persistence and restore paths keep the current boundaries between local, URL, and relay state
  - can malformed, missing, or stale values fail closed without corrupting timer state
  - does the change affect copied links, hydration, redirects, or recent timers without a validation escalation plan
- Expected output:
  - blocker: broken link contract, unsafe param handling, or persistence-boundary regression
  - should-fix: missing malformed-input handling, restore-path gap, or abstraction bypass
  - optional: consolidation of duplicate parse or storage logic
  - no issue: only if URL and persistence contracts remain coherent
- Escalate to broader validation when:
  - route shapes, share links, hydration, recovery, or restore semantics change
  - `pnpm scope` points to contract-sensitive e2e coverage or `AGENTS.md` implies `pnpm test:full`
