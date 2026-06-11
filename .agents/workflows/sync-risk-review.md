# Sync Risk Review

Use for live-session, relay, shared-state, and timer-progression risk checks on a narrow diff.

- Source of truth: `AGENTS.md`, `docs/live-sessions.md`
- Model fit: suitable for a smaller or cheaper review model when the diff is limited to session, relay, or shared timer paths
- Input scope: changed sync-related files plus the shared schema, route helper, or relay/store file they touch
- Inspect:
  - touched live-session, relay, timer-state, or shared-state files
  - `docs/live-sessions.md`
  - relevant shared validation or protocol types
- Checklist:
  - does the change preserve readonly versus control separation
  - are new or changed synchronized fields validated and normalized at ingress
  - does relay-owned state remain canonical instead of being overwritten by viewers
  - does timer progression still use one canonical elapsed/paused/resumed model
  - does recovery or reconnect behavior change without matching doc or test follow-up
- Expected output:
  - blocker: capability boundary break, unvalidated synchronized field, or timer ownership regression
  - should-fix: missing normalization, merge-path coverage gap, or recovery edge-case risk
  - optional: tighter reuse of shared protocol or state helpers
  - no issue: only if trust boundaries and progression semantics stay intact
- Escalate to broader validation when:
  - any live-session contract, reconnect path, synchronized field, or relay merge rule changes
  - remote Playwright or `pnpm test:full` is likely required under `AGENTS.md`
