# Development

For product/setup context, start with the [README](../README.md).

## Local App And Relay

`pnpm dev` starts both the Next.js app and the local relay with a compatible default:

- app: `http://localhost:3000`
- relay bind: `0.0.0.0:9100`
- relay websocket from the same computer: `ws://127.0.0.1:9100/ws`
- relay websocket from another device on the LAN: `ws://<your-dev-machine-ip>:9100/ws`

You can also run the relay by itself:

```bash
pnpm dev:relay
```

Environment variables:

- `NEXT_PUBLIC_REMOTE_WS_URL`: browser websocket endpoint for live sessions
- `RELAY_HOST`: relay bind host
- `RELAY_PORT`: relay bind port
- `RELAY_SESSION_TTL_MS`: in-memory idle session expiry

## Test Lanes

Local validation lanes:

- `pnpm lint`: ESLint and TypeScript validation
- `pnpm test:unit`: plain-Node `.test.ts` coverage for pure logic and server-safe code
- `pnpm test:components`: Vitest/jsdom `.test.tsx` coverage for React component behavior
- `pnpm test`: lint + unit + component + local Playwright `@smoke`
- `pnpm test:ci`: lint + unit + component + local non-visual Playwright + remote non-visual Playwright
- `pnpm test:full`: lint + unit + component + local full Playwright + remote full Playwright

Authoring rules:

- use `.test.ts` for pure logic tests that should run under `node:test`, even when the file sits near a component
- use `.test.tsx` for React/jsdom tests that should run under Vitest
- keep browser tests focused on visible product guarantees such as route behavior, control permissions, readonly behavior, synchronized timer state, recovery UX, and first-load rendering
- move protocol/state-machine edge cases, merge branches, malformed payload handling, and other non-visual logic into unit or server-safe tests where possible
- avoid making remote debug attributes or exact participant-count convergence the main acceptance criteria for multi-client coverage
- prefer one control client plus one viewer/client for remote behavior by default; reserve 3+ clients for dedicated concurrency coverage only
- do not add broad multi-client relay tests to the default parallel local lane
- use Playwright tags to control browser-lane scope:
  - `@smoke` for the minimum must-pass browser checks
  - `@visual` for screenshot and layout-regression coverage
  - leave broader behavioral coverage untagged so it runs in the full lane only
- keep relay-backed specs on the `remote-*.spec.ts` naming convention so the remote Playwright configs can select them by pattern instead of hardcoded file lists

Local Playwright lane:

- app: `http://127.0.0.1:3100`
- relay health: `http://127.0.0.1:9100/health`
- relay websocket: `ws://127.0.0.1:9100/ws`
- app server command: `pnpm dev:test`
- config: `playwright.config.ts`
- file selection: everything in `tests/e2e` except `remote-*.spec.ts` and `pwa.spec.ts`
- test scope: local-only specs that are safe to run in parallel

Remote Playwright lane:

- app: `http://127.0.0.1:3100`
- relay health: `http://127.0.0.1:9100/health`
- relay websocket: `ws://127.0.0.1:9100/ws`
- config: `playwright.remote.config.ts`
- file selection: `remote-*.spec.ts`
- execution model: serial (`workers: 1`, `fullyParallel: false`)
- test scope: relay-backed multi-client, reconnect, offline, and PiP scenarios

Relevant commands:

- `pnpm test:e2e:local`
- `pnpm test:e2e:local:smoke`
- `pnpm test:e2e:local:ci`
- `pnpm test:e2e:remote`
- `pnpm test:e2e:remote:ci`
- `pnpm test:e2e:visual`

Tracked agent lane:

- app: `http://127.0.0.1:3300`
- relay health: `http://127.0.0.1:9200/health`
- relay websocket: `ws://127.0.0.1:9200/ws`
- local config: `scripts/agent-lane.mjs`
- remote config: `playwright.agent.remote.config.ts`

Relevant commands:

- `pnpm agent:test`
- `pnpm agent:test:attach`
- `pnpm agent:test:full`
- `pnpm agent:test:full:local`
- `pnpm agent:test:remote`
- `pnpm agent:test:debug`
- `pnpm agent:status`
- `pnpm agent:stop`

Attach mode uses these advanced commands:

- `pnpm agent:serve:test`
- `pnpm agent:serve:relay`

The lane split is still useful because it isolates Playwright ports, dist dirs, and tracked process metadata from normal local development.

## Writing Stable Browser Tests

- Assert one eventual user-visible truth at a time: open a route, wait for one stable affordance, perform one action, then verify one synchronized outcome.
- Prefer behavior-driven readiness checks such as visible controls, readonly UI, synchronized timer values, or recovery dialogs over internal cluster readiness heuristics.
- Use tolerant numeric assertions for timer drift and small layout tolerances for pixel rounding.
- Keep helpers diagnostic rather than authoritative; if a helper needs relay debug state, treat it as a fallback signal instead of the core pass condition.
- Restore broad mutable state inside each test with `finally` blocks when the test changes offline mode, opens extra contexts/pages, or creates PiP windows.

## Docker Locally

Local Docker builds make sense for deployment parity checks, not for day-to-day UI iteration.

Use Docker locally when you want to:

- verify the production images still build
- check the compose stack before deployment
- debug container-only issues

Prefer plain `pnpm dev` for normal development because it is faster and keeps frontend/relay logs simpler.
