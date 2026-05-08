# AGENTS

This file is for agent-facing repo conventions. For normal setup and day-to-day commands, start with [README.md](./README.md).

## Baseline

- Use `pnpm`. Do not mix in `npm` or `yarn`.
- Use Node.js `22.6.0` or newer.
- After substantive code edits, run `pnpm format:fix` before considering the task done (or confirm `pnpm format` still passes). This keeps Prettier output aligned without relying on manual formatting.
- Keep this file focused on durable repo guidance for agents, not one-off debugging notes.
- Spread `...otherProps` last on the rendered element so callers can override defaults intentionally.
- Prefer Tailwind utilities for standard application layout, spacing, and control styling; keep custom CSS or CSS modules for specialized visuals when utility classes alone would be awkward.
- Before making architectural changes, creating new components, adding dependencies, or introducing cross-cutting state/ownership patterns, pause and ask for confirmation. If the tradeoffs are not obvious, switch to planning mode or propose a short plan first.

## End-to-end tests

- Playwright tests live in `./tests/e2e`.
- The Playwright config starts the Next.js dev server on `http://127.0.0.1:3100` and a local PeerJS server on `http://127.0.0.1:9100`; it reuses existing servers when they are already running.
- Use `pnpm dev:peer` when you need the local PeerJS server outside Playwright.
- `pnpm test` is the regular verification gate and runs lint, unit tests, and the smoke Playwright suite.
- `pnpm check` is the fast local gate for code changes and runs lint (including typecheck) plus unit tests.
- `pnpm test:ci` runs lint, unit tests, and the CI-safe Playwright suite with `@visual` tests excluded.
- `pnpm test:full` runs lint, unit tests, and the full Playwright suite.
- `pnpm build` runs `pnpm test:full` first, then runs `next build`.
- GitHub Pages deploys the static export from `out/`.
- Test scripts clean old `test-results` and `playwright-report` output before each run.
- The preferred visual entry point is `pnpm test:e2e:ui`.

## PeerJS server

- Remote mode uses PeerJS for peer discovery/signalling before browser-to-browser data connections are established.
- The page that enables remote mode becomes the initial main by setting its own URL to `rid=<peerId>&control=42`.
- Remote client URLs are readonly by default. Add `control=42` only for clients that should expose timer controls and settings.
- Remote viewer/control links are intentionally built with `inherit: false`; they should only carry remote-session params, not a copy of the current timer params.
- New peers receive the current timer params and timer state from the active main immediately after connecting.
- Control clients may become the new main after a disconnect by reclaiming the existing `rid`. Readonly clients must stay readonly through failover.
- The app uses the default PeerJS cloud server unless `NEXT_PUBLIC_PEERJS_HOST` is set.
- `pnpm dev:peer` starts the local PeerJS server on `127.0.0.1:9100` with root path `/`, so the PeerJS health endpoint is `http://127.0.0.1:9100/peerjs/id`.
- Playwright starts `pnpm dev:peer` and `pnpm dev:e2e` through `playwright.config.ts`.
- The e2e Next.js server is configured with `NEXT_PUBLIC_PEERJS_HOST=127.0.0.1`, `NEXT_PUBLIC_PEERJS_PORT=9100`, `NEXT_PUBLIC_PEERJS_PATH=/`, and `NEXT_PUBLIC_PEERJS_SECURE=false`.
- If e2e tests fail with a port bind error, check for stale listeners on ports `3100` or `9100` before changing test logic.
- If remote-mode behavior changes, update both `README.md` and the remote-mode Playwright coverage in the same change.

## Test conventions

- Prefer stable accessible selectors in browser tests, such as `getByLabel`, `getByRole`, and visible button text.
- Timer input tests should address the `Minutes` and `Seconds` fields by label.
- Tag everyday coverage with `@smoke`. Untagged Playwright tests stay in the deeper regression lane and run via `pnpm test:full` or `pnpm test:e2e:full`.
- Tag screenshot-only regression coverage with `@visual`. CI excludes `@visual` tests via `pnpm test:ci` and `pnpm test:e2e:ci`.
- Remote-mode browser tests are split by concern:
  - `remote-client.spec.ts`
  - `remote-sync.spec.ts`
  - `remote-failover.spec.ts`
  - `remote-pip.spec.ts`
  - `timer-actions.spec.ts`
- Shared Playwright helpers live in `tests/e2e/remote-mode.helpers.ts`.

## Generated artifacts

- `playwright-report/` and `test-results/` are generated artifacts.
- They are intentionally git-ignored and should not be committed.

## Maintenance

- Update this file when repository-level workflow or testing conventions change.
- Keep `README.md` human-focused and keep this file agent-focused.
