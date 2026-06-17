# AGENTS

This file captures durable repo conventions for agents. For product/setup context, start with [README.md](./README.md).

`README.md` is the human-facing command surface. Agents should treat `AGENTS.md` as the execution policy.

## Agent Workflow

### Start Checklist

- Read `README.md` for product and setup context.
- Inspect the affected files before making changes.
- Prefer extending existing helpers, abstractions, and feature boundaries before introducing new patterns or parallel implementations.

### Tooling

- Use `pnpm` for all package manager commands. Never use `npm` or `yarn`.
- The dev server port is chosen dynamically at startup. Read the port from the server's stdout output before constructing any URLs.
- The dev server launch configuration lives in `.claude/launch.json`. When running the app for preview or smoke testing, use that config rather than invoking `pnpm dev` directly in a shell.

### Validation Lanes

`pnpm scope` determines the required targeted lane and whether the full lane is also required. Do not choose a lane manually.

| Lane  | Command                     | What it covers                                                                    |
| ----- | --------------------------- | --------------------------------------------------------------------------------- |
| smoke | `pnpm test:e2e:local:smoke` | Fast local E2E pass — always the first gate                                       |
| full  | `pnpm test:full`            | Lint, unit, component, local E2E, and remote E2E — required when scope demands it |

### Validation Gate

This is a hard stop. Do not summarize work, offer to commit, or consider the task done until all steps below pass. If resuming from a prior session or context summary, re-run the gate — do not assume a previous session completed it.

1. If the change introduces new behavior, modifies a user-visible guarantee, or changes a live-session or URL-state contract:
   - Add or update Playwright coverage for the affected behavior.
   - Add or update relevant documentation (`docs/`, `README.md`, or inline `scope.yaml` hints).
2. Run `pnpm scope` (or `pnpm scope -- <changed paths>` for targeted scope) and complete every command listed under "Required targeted validation".
3. Always run in order after the targeted validation is clean — do not skip ahead:
   - `pnpm lint:fix` then `pnpm lint` to confirm 0 errors. Warnings are acceptable.
   - `pnpm format:fix`
   - `pnpm test:e2e:local:smoke`
4. If the "Validation gate" output includes "Also required", run it only after step 3 is fully clean:
   - `pnpm test:full`

If any step fails, fix the failure before proceeding to the next step. Do not report partial results as done.

Prompt the user to create GitHub issues for follow-up work introduced during implementation instead of editing a local TODO file.

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
- When live-session behavior changes, apply the documentation and test coverage requirements in the Validation Gate.

## Testing

- `docs/development.md` is the source of truth for test lanes, `pnpm scope` commands, and browser-test authoring rules.
- Feature and subsystem folders may define a local `scope.yaml` YAML file for validation hints. Keep these files metadata-only and at stable feature boundaries, not leaf components.
- When introducing a new feature folder that will contain user-visible behavior, add a `scope.yaml` pointing to the relevant e2e spec in the same change.
- When a feature boundary moves, split, or disappears, move, split, or delete the corresponding `scope.yaml` in the same change and verify the new recommendation with `pnpm scope -- <changed paths...>`.
- Treat growing `scope.yaml` `rules` lists as a structural smell. Prefer extracting a new folder boundary over adding many exceptions.
- Use `pnpm scope -- <paths...>` to get the required targeted validation from the changed files. Running `pnpm scope` without explicit paths uses the current git diff.
- Keep browser tests focused on user-visible guarantees rather than internal relay/debug timing.

## Maintenance

- Keep this file agent-focused.
- Documentation should describe goals, contracts, invariants, and operating procedures before implementation choices.
- Follow [docs/documentation.md](./docs/documentation.md) when adding or revising repo documentation.
- Code, tests, and workflow files should describe implementation.
- Update it when repo-level workflow, testing, or deployment conventions change.
