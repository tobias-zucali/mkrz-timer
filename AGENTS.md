# AGENTS

This file is for agent-facing repo conventions. For normal setup and day-to-day commands, start with [README.md](./README.md).

## Baseline

- Use `pnpm`. Do not mix in `npm` or `yarn`.
- Use Node.js `20.9.0` or newer.
- Keep this file focused on durable repo guidance for agents, not one-off debugging notes.

## End-to-end tests

- Playwright tests live in `./tests/e2e`.
- The Playwright config starts the Next.js dev server on `http://127.0.0.1:3000` and reuses an existing server when one is already running.
- Test scripts clean old `test-results` and `playwright-report` output before each run.
- The preferred visual entry point is `pnpm test:e2e:ui`.

## Test conventions

- Prefer stable accessible selectors in browser tests, such as `getByLabel`, `getByRole`, and visible button text.
- Timer input tests should address the `Minutes` and `Seconds` fields by label.
- Remote-mode browser tests are split by concern:
  - `remote-client.spec.ts`
  - `remote-sync.spec.ts`
  - `timer-actions.spec.ts`
- Shared Playwright helpers live in `tests/e2e/remote-mode.helpers.ts`.

## Generated artifacts

- `playwright-report/` and `test-results/` are generated artifacts.
- They are intentionally git-ignored and should not be committed.

## Maintenance

- Update this file when repository-level workflow or testing conventions change.
- Keep `README.md` human-focused and keep this file agent-focused.
