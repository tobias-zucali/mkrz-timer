# AGENTS

This file captures durable repo conventions for agents. For product/setup context, start with [README.md](./README.md).

`README.md` is the human-facing command surface. Agents should treat `AGENTS.md` as the execution policy.

## Agent Workflow

### Start Checklist

- Read `README.md` for product and setup context.
- Review the task scope and inspect the affected files before making changes.
- Run `pnpm scope -- <paths...>` (or `pnpm scope` for the current diff) to determine the smallest recommended validation lane.
- Prefer extending existing helpers, abstractions, and feature boundaries before introducing new patterns or parallel implementations.

### Tooling

- Use `pnpm` for all package manager commands. Never use `npm` or `yarn`.
- The dev server port is chosen dynamically at startup. Read the port from the server's stdout output before constructing any URLs.
- The dev server launch configuration lives in `.claude/launch.json`. When running the app for preview or smoke testing, use that config rather than invoking `pnpm dev` directly in a shell.

### Validation Lanes

`pnpm scope` outputs one of these lanes — smallest first:

| Lane  | Command                     | When to use                                                                        |
| ----- | --------------------------- | ---------------------------------------------------------------------------------- |
| unit  | `pnpm test`                 | Logic-only changes with no route, session, or shared-state risk                    |
| smoke | `pnpm test:e2e:local:smoke` | UI or route changes with limited cross-feature impact                              |
| full  | `pnpm test:full`            | Anything touching live sessions, sync, URL state, persistence, or shared contracts |

### Validation Defaults

- After edits, run `pnpm lint`, `pnpm test:e2e:local:smoke`, and `pnpm format:fix` before considering the task done.
- After changes that can cause side effects across routes, sessions, synchronization, persistence, or shared state, also run `pnpm test:full` before considering the task done.
- Treat `pnpm scope` recommendations as advisory. Agents remain responsible for choosing validation that is sufficient for the actual risk of the change.
- Prompt the user to create GitHub issues for follow-up work introduced during implementation instead of editing a local TODO file.

### Prototype Mode

- Prototype mode is only active when the user explicitly asks for it.
- Before starting prototype mode, check `git status --short`. If the worktree is dirty, require an explicit baseline decision: commit the pending changes, stage them, stash them, or accept that the prototype may modify them without a reliable trace.
- While prototype mode is active, follow the repo-local prototype workflow at `.agents/skills/prototype`.
- Use `$prototype` for a description-only prototype workflow that defers normal closeout requirements while exploration is in progress.
- Prototype mode overrides the validation defaults in this file until prototype mode ends.
- When prototype mode ends, perform a diff-based closeout review of the prototype changes, then return to the validation defaults and complete the required documentation, tests, validation, and any needed security review before considering the work done.

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
- If the repo is already dirty and it is unclear whether a change belongs to the current task, stop and ask before modifying or reverting it.

## Architectural Hot Spots

- Live sessions: treat `docs/live-sessions.md` as the contract; preserve relay/client ownership and readonly vs control separation.
- Synchronization: keep schema validation, normalization, merge rules, and shared-field ownership centralized.
- URL state: treat query params and route shapes as a compatibility surface; reuse existing parse and normalize helpers.
- Persistence: preserve the current boundaries between local state, URL state, and relay snapshots.
- Timer progression semantics: keep one canonical elapsed-time and pause/resume model.

## Live Sessions

- `docs/live-sessions.md` is the source of truth for live-session contracts, trust boundaries, and synchronized-field rules.
- When live-session behavior changes, update both docs and Playwright coverage in the same change.

## Testing

- `docs/development.md` is the source of truth for test lanes, `pnpm scope` commands, and browser-test authoring rules.
- Feature and subsystem folders may define a local `scope.yaml` YAML file for validation hints. Keep these files metadata-only and at stable feature boundaries, not leaf components.
- When a feature boundary moves, split, or disappears, move, split, or delete the corresponding `scope.yaml` in the same change and verify the new recommendation with `pnpm scope -- <changed paths...>`.
- Treat growing `scope.yaml` `rules` lists as a structural smell. Prefer extracting a new folder boundary over adding many exceptions.
- Use `pnpm scope -- <paths...>` to get a smallest-first validation recommendation from the changed files. Running `pnpm scope` without explicit paths uses the current git diff.
- Escalate beyond the smallest suggested lane when the change affects live sessions, synchronization, URL state, persistence, timer progression semantics, or any shared contract/invariant.
- Keep browser tests focused on user-visible guarantees rather than internal relay/debug timing.

## Maintenance

- Keep this file agent-focused.
- Documentation should describe goals, contracts, invariants, and operating procedures before implementation choices.
- Follow [docs/documentation.md](./docs/documentation.md) when adding or revising repo documentation.
- Code, tests, and workflow files should describe implementation.
- Update it when repo-level workflow, testing, or deployment conventions change.
