# AGENTS

This file is for agent-facing repo conventions. For normal setup and day-to-day commands, start with [README.md](./README.md).

## Baseline

- Use `pnpm`. Do not mix in `npm` or `yarn`.
- Use Node.js `20.9.0` or newer.
- Keep this file focused on durable repo guidance for agents, not one-off debugging notes.
- Spread `...otherProps` last on the rendered element so callers can override defaults intentionally.
- Before making architectural changes, creating new components, adding dependencies, or introducing cross-cutting state/ownership patterns, pause and ask for confirmation. If the tradeoffs are not obvious, switch to planning mode or propose a short plan first.

## End-to-end tests

- Playwright tests live in `./tests/e2e`.
- The Playwright config starts the Next.js dev server on `http://127.0.0.1:3100` and a local PeerJS server on `http://127.0.0.1:9100`; it reuses existing servers when they are already running.
- Use `pnpm dev:peer` when you need the local PeerJS server outside Playwright.
- `pnpm test` is the regular verification gate and runs lint plus the full Playwright e2e suite.
- `pnpm build` runs `pnpm test` first, then runs `next build`.
- Test scripts clean old `test-results` and `playwright-report` output before each run.
- The preferred visual entry point is `pnpm test:e2e:ui`.

## PeerJS server

- Remote mode uses PeerJS for peer discovery/signalling before browser-to-browser data connections are established.
- Remote client URLs are readonly by default. Add `control=42` to the URL only for clients that should expose timer controls and settings.
- The app uses the default PeerJS cloud server unless `NEXT_PUBLIC_PEERJS_HOST` is set.
- `pnpm dev:peer` starts the local PeerJS server on `127.0.0.1:9100` with root path `/`, so the PeerJS health endpoint is `http://127.0.0.1:9100/peerjs/id`.
- Playwright starts `pnpm dev:peer` and `pnpm dev:e2e` through `playwright.config.ts`.
- The e2e Next.js server is configured with `NEXT_PUBLIC_PEERJS_HOST=127.0.0.1`, `NEXT_PUBLIC_PEERJS_PORT=9100`, `NEXT_PUBLIC_PEERJS_PATH=/`, and `NEXT_PUBLIC_PEERJS_SECURE=false`.
- If e2e tests fail with a port bind error, check for stale listeners on ports `3100` or `9100` before changing test logic.

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
