# AGENTS

This file captures durable repo conventions for agents. For product/setup context, start with [README.md](./README.md).

`README.md` is the human-facing command surface. Agents should treat `AGENTS.md` as the execution policy.

## Agent Workflow

### Start Checklist

- Read `README.md` for product and setup context.
- Review the task scope and inspect the affected files before making changes.
- Before implementation, review the current architecture and existing functionality to verify that the planned approach is still appropriate, does not duplicate newer functionality, integrates cleanly with the current repository state, and still fulfills the purpose of the requested change.
- Run `pnpm scope -- <paths...>` (or `pnpm scope` for the current diff) to determine the smallest recommended validation lane.
- Prefer the smallest validation lane that covers the affected area before broader validation.
- Prefer extending existing helpers, abstractions, and feature boundaries before introducing new patterns or parallel implementations.

### Validation Defaults

- After edits, run `pnpm lint`, `pnpm test:e2e:local:smoke`, and `pnpm format:fix` before considering the task done.
- After changes that can cause side effects across routes, sessions, synchronization, persistence, or shared state, also run `pnpm test:full` before considering the task done.
- Treat `pnpm scope` recommendations as advisory. Agents remain responsible for choosing validation that is sufficient for the actual risk of the change.
- Prompt the user to create GitHub issues for follow-up work introduced during implementation instead of editing a local TODO file.

### Prototype Mode

- Prototype mode is only active when the user explicitly asks for it.
- While prototype mode is active, follow the repo-local prototype workflow at `.agents/skills/prototype`.
- Use `$prototype` when the tracked ledger and closeout/revert flow are needed.
- Prototype mode overrides the validation defaults in this file until prototype mode ends.
- When prototype mode ends, return to the validation defaults and complete required documentation and test updates before considering the work done.

## Code Conventions

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

## Security Defaults

- Treat every external or user-controlled value as untrusted by default.
- New user-controlled fields require validation plus escaping review before merge.
- Changes to synchronized or relay-persisted fields require an explicit security review.

## Architectural Hot Spots

- Live sessions: treat `docs/live-sessions.md` as the contract for capability boundaries, recovery behavior, and relay-owned shared state. Extend the existing relay/client model before introducing parallel session flows.
- Synchronization: keep schema validation, normalization, merge rules, and shared-field ownership centralized. Extend existing shared abstractions instead of duplicating sync logic across UI, client, and relay paths.
- URL state: treat query params and route shapes as a compatibility surface. Reuse the existing parse/normalize/share-link abstractions so hydration, redirects, and copied links stay aligned.
- Persistence: preserve the current boundaries between local state, URL state, and relay snapshots. Reuse existing storage and restore paths before adding new caches or persistence mechanisms.
- Timer progression semantics: preserve one canonical model for elapsed time, paused state, and resumed progression. Extend existing derivation utilities before introducing alternate clock calculations.

## Live Sessions

- `docs/live-sessions.md` is the source of truth for live-session contracts, trust boundaries, and synchronized-field rules.
- When live-session behavior changes, update both docs and Playwright coverage in the same change.
- Future sharing or session features must preserve strict separation between readonly and control capabilities.

## Testing

- `docs/development.md` is the source of truth for test lanes, `pnpm scope` commands, and browser-test authoring rules.
- Feature and subsystem folders may define a local `scope.yaml` YAML file for agent validation hints. Keep these files metadata-only and at stable feature boundaries, not leaf components.
- The goal of `scope.yaml` is to keep validation ownership next to the code boundary it describes, so agents can choose the smallest useful lane first and feature moves do not require brittle central remapping.
- When a feature boundary moves, split, or disappears, move, split, or delete the corresponding `scope.yaml` in the same change and verify the new recommendation with `pnpm scope -- <changed paths...>`.
- Treat growing `scope.yaml` `rules` lists as a structural smell. Prefer extracting a new folder boundary over adding many exceptions.
- On coupled changes, tighten the loop before broad validation:
  - isolate the contract first, especially when routes, URL params, hydration, recovery, or live-session link generation are all in play
  - update shared helpers and invariants before chasing downstream e2e failures
  - run the smallest targeted lane that covers the changed area before `pnpm test:full`
  - avoid overlapping Playwright lanes that share the same ports
  - if a UI change is intentional, update affected aria or visual snapshots immediately instead of discovering that need in repeated full-lane reruns
- Use `pnpm scope -- <paths...>` to get a smallest-first validation recommendation from the changed files. Running `pnpm scope` without explicit paths uses the current git diff.
- Escalate beyond the smallest suggested lane when the change affects live sessions, synchronization, URL state, persistence, timer progression semantics, or any shared contract/invariant.
- Keep browser tests focused on user-visible guarantees rather than internal relay/debug timing.
- Prefer unit or server-safe tests for protocol branches, merge logic, malformed payload handling, and other non-visual state transitions.
- Multi-client relay coverage belongs in the isolated remote Playwright lane, not the default local lane.
- If a browser test must be skipped for instability, keep the skip narrow, document the specific reason inline, and treat it as temporary containment.

## Maintenance

- Keep this file agent-focused.
- Documentation should describe goals, contracts, invariants, and operating procedures before implementation choices.
- Follow [docs/documentation.md](./docs/documentation.md) when adding or revising repo documentation.
- Code, tests, and workflow files should describe implementation.
- Update it when repo-level workflow, testing, or deployment conventions change.
