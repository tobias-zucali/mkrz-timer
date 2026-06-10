# AGENTS

This file captures durable repo conventions for agents. For product/setup context, start with [README.md](./README.md).

## Baseline

- `README.md` is the human-facing command surface. Agents should treat `AGENTS.md` as the execution policy.
- When a repo provides dedicated `agent:*` validation lanes, use those instead of generic validation commands.
- After edits, run `pnpm lint`, `pnpm agent:test` and `pnpm format:fix` before considering the task done.
- After changes that can cause side effects across routes, sessions, synchronization, persistence, or shared state, also run `pnpm agent:test:full` before considering the task done.
- When the user explicitly asks for prototype mode, skip validation commands while the behavior is still moving quickly, including `pnpm lint`.
- While prototype mode is active, defer documentation updates, test updates, and the full validation lane until the user explicitly asks to end prototype mode or finish the work.
- As soon as prototype mode ends, add or adapt the relevant documentation and tests, then run the full required validation lane before considering the work complete.
- The repo-local prototype workflow skill lives at `.agents/skills/prototype`; use `$prototype` when you need the tracked ledger and closeout/revert flow for prototype mode.
- Prompt the user to create GitHub issues for follow-up work introduced during implementation instead of editing a local TODO file.
- Prefer `@/` imports over relative `../..` imports.
- Exception: keep relative imports in files executed directly by the plain Node test/runtime path until alias resolution is configured there too.
- Keep files short and focused. Do not wait for a large cleanup later:
  - if a file is likely to grow past roughly 200 lines, look for natural extraction points before adding more logic
  - if a component mostly passes state, callbacks, or derived values through to children, move that state/logic down or extract a helper closer to the consumer
  - if a file starts mixing route orchestration, UI rendering, dialog state, and feature-specific side effects, split those concerns immediately into components, hooks, or utilities
  - prefer small, purpose-built props and hook arguments over broad “bag of state” interfaces when the narrower shape is clear
- Do not use nested inline conditionals or nested ternaries.
- Spread `...otherProps` last on rendered elements.
- Prefer Tailwind utilities for standard layout and control styling.
- Prefer inline Heroicons-style SVGs driven by `currentColor`.
- Treat every external or user-controlled value as untrusted by default.
- New user-controlled fields require validation plus escaping review before merge.
- Changes to synchronized or relay-persisted fields require an explicit security review.

## Live Sessions

- `docs/live-sessions.md` is the source of truth for live-session contracts, trust boundaries, and synchronized-field rules.
- When live-session behavior changes, update both docs and Playwright coverage in the same change.
- Future sharing or session features must preserve strict separation between readonly and control capabilities.

## Testing

- `docs/development.md` is the source of truth for test lanes, Playwright tagging, agent-lane commands, and browser-test authoring rules.
- Keep browser tests focused on user-visible guarantees rather than internal relay/debug timing.
- Prefer unit or server-safe tests for protocol branches, merge logic, malformed payload handling, and other non-visual state transitions.
- Multi-client relay coverage belongs in the isolated remote Playwright lane, not the default local lane.
- If a browser test must be skipped for instability, keep the skip narrow, document the specific reason inline, and treat it as temporary containment.

## Maintenance

- Keep this file agent-focused.
- Documentation should describe contracts, invariants, and operating procedures. Code, tests, and workflow files should describe implementation.
- Update it when repo-level workflow, testing, or deployment conventions change.
