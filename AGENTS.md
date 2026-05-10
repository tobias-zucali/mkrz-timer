# AGENTS

This file is for agent-facing repo conventions. For normal setup and day-to-day commands, start with [README.md](./README.md).

## Baseline

- Use `pnpm`. Do not mix in `npm` or `yarn`.
- Use Node.js `22.6.0` or newer.
- After substantive code edits, run `pnpm format:fix` before considering the task done (or confirm `pnpm format` still passes). This keeps Prettier output aligned without relying on manual formatting.
- Keep this file focused on durable repo guidance for agents, not one-off debugging notes.
- Spread `...otherProps` last on the rendered element so callers can override defaults intentionally.
- Prefer Tailwind utilities for standard application layout, spacing, and control styling; keep custom CSS or CSS modules for specialized visuals when utility classes alone would be awkward.
- For UI icons, prefer inline SVGs sourced from [heroicons.com](https://heroicons.com/) and style them through `currentColor` using the configured theme colors (`background`, `foreground`, `primary`) or other high-contrast colors when state severity needs stronger differentiation.
- Before making architectural changes, creating new components, adding dependencies, or introducing cross-cutting state/ownership patterns, pause and ask for confirmation. If the tradeoffs are not obvious, switch to planning mode or propose a short plan first.

## End-to-end tests

- Playwright tests live in `./tests/e2e`.
- The default Playwright config starts the Next.js dev server on `http://127.0.0.1:3100` and a local PeerJS server on `http://127.0.0.1:9100`; it reuses existing servers when they are already running.
- The isolated agent Playwright config lives in `./playwright.agent.config.ts` and uses `http://127.0.0.1:3300` plus a local PeerJS server on `http://127.0.0.1:9200`.
- The no-`webServer` agent repro config lives in `./playwright.agent.no-webserver.config.ts`; use it when you want Playwright to target already-running agent servers instead of starting its own.
- Use `pnpm dev:peer` when you need the local PeerJS server outside Playwright.
- When you need an agent-owned lane that must not interfere with a user-run `pnpm dev` or `pnpm test:e2e:ui`, use `pnpm dev:agent`, `pnpm dev:peer:agent`, and `pnpm test:e2e:agent`.
- `node scripts/agent-playwright.mjs ...` is the supported entrypoint for agent Playwright runs. It fails fast on unsupported Node versions, sets `PLAYWRIGHT_NODE` to the current runtime, and keeps Playwright `webServer` children on that same Node binary.
- In Codex, starting the isolated agent e2e lane may require escalated permissions because the sandbox can block local port binding for the agent servers on `127.0.0.1:3300` and `127.0.0.1:9200`.
- `pnpm test` is the regular verification gate and runs lint, unit tests, and the smoke Playwright suite.
- `pnpm check` is the fast local gate for code changes and runs lint (including typecheck) plus unit tests.
- `pnpm test:ci` runs lint, unit tests, and the CI-safe Playwright suite with `@visual` tests excluded.
- `pnpm test:full` runs lint, unit tests, and the full Playwright suite.
- `pnpm build` runs `pnpm test:full` first, then runs `next build`.
- GitHub Pages deploys the static export from `out/`.
- The repo isolates Next build artifacts by lane: `.next` for `pnpm dev`, `.next-e2e` for default Playwright, `.next-agent` for `pnpm dev:agent`, and `.next-agent-e2e` for agent Playwright.
- Test scripts clean old `test-results` and `playwright-report` output before each run. Agent Playwright scripts clean `test-results-agent` and `playwright-report-agent`.

## PeerJS server

- Remote mode uses PeerJS for peer discovery/signalling before browser-to-browser data connections are established.
- The page that enables remote mode becomes the initial main by setting its own URL to `rid=<peerId>&control=42`.
- Remote client URLs are readonly by default. Add `control=42` only for clients that should expose timer controls and settings.
- Remote viewer/control links are intentionally built with `inherit: false`; they should only carry remote-session params, not a copy of the current timer params.
- New peers receive the current timer params and timer state from the active main immediately after connecting.
- Control clients may become the new main after a disconnect by reclaiming the existing `rid`. Readonly clients must stay readonly through failover.
- The app uses the default PeerJS cloud server unless `NEXT_PUBLIC_PEERJS_HOST` is set.
- `pnpm dev:peer` starts the local PeerJS server on `127.0.0.1:9100` with root path `/`, so the PeerJS health endpoint is `http://127.0.0.1:9100/peerjs/id`.
- `pnpm dev:peer:agent` starts an isolated local PeerJS server on `127.0.0.1:9200` with root path `/`, so the agent health endpoint is `http://127.0.0.1:9200/peerjs/id`.
- Playwright starts `pnpm dev:peer` and `pnpm dev:e2e` through `playwright.config.ts`.
- Agent Playwright starts the local PeerJS server and Next.js dev server through explicit Node commands in `playwright.agent.config.ts`, using `PLAYWRIGHT_NODE` when it is set.
- If default e2e tests fail with a port bind error, check for stale listeners on ports `3100` or `9100` before changing test logic.
- If the agent e2e lane fails with a port bind error, check for stale listeners on ports `3300` or `9200` before changing test logic.
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
- `playwright-report-agent/` and `test-results-agent/` are generated artifacts.
- `.next-e2e/`, `.next-agent/`, and `.next-agent-e2e/` are generated artifacts.
- They are intentionally git-ignored and should not be committed.

## Maintenance

- Update this file when repository-level workflow or testing conventions change.
- Keep `README.md` human-focused and keep this file agent-focused.
