# AGENTS

## Setup

- Use `pnpm` for this repository. Do not mix in `npm` or `yarn`.
- Use Node.js `20.9.0` or newer.
- If `pnpm` is not available yet, enable Corepack and activate the pinned version from `package.json`:

```bash
corepack enable
corepack prepare pnpm@8.11.0 --activate
pnpm install
```

## Common commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
```

## General Conventions

- Keep AGENTS.md and README.md in sync with architectural changes.

## End-to-end tests

- Playwright tests live in `/Users/tobias/Source/time-timer/tests/e2e`.
- The Playwright config starts the Next.js dev server on `http://127.0.0.1:3000` and reuses an existing server when one is already running.
- Test scripts clean old `test-results` and `playwright-report` output before each run.

Use these scripts:

```bash
pnpm test:e2e:ui
pnpm test:e2e:visual
pnpm test:e2e:debug
pnpm test:e2e
pnpm test:e2e:report
```

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
