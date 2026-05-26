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
- `pnpm test`: local validation entrypoint for lint + unit + component + Playwright `@smoke`
- `pnpm test:ci`: lint + unit + component + Playwright except `@visual`
- `pnpm test:full`: lint + unit + component + full Playwright coverage

Authoring rules:

- use `.test.ts` for pure logic tests that should run under `node:test`, even when the file sits near a component
- use `.test.tsx` for React/jsdom tests that should run under Vitest
- use Playwright tags to control browser-lane scope:
  - `@smoke` for the minimum must-pass browser checks
  - `@visual` for screenshot and layout-regression coverage
  - leave broader behavioral coverage untagged so it runs in the full lane only

Default Playwright lane:

- app: `http://127.0.0.1:3100`
- relay health: `http://127.0.0.1:9100/health`
- relay websocket: `ws://127.0.0.1:9100/ws`
- app server command: `pnpm dev:test`

Tracked agent lane:

- app: `http://127.0.0.1:3300`
- relay health: `http://127.0.0.1:9200/health`
- relay websocket: `ws://127.0.0.1:9200/ws`

Relevant commands:

- `pnpm agent:test`
- `pnpm agent:test:attach`
- `pnpm agent:test:full`
- `pnpm agent:test:debug`
- `pnpm agent:status`
- `pnpm agent:stop`

Attach mode uses these advanced commands:

- `pnpm agent:serve:test`
- `pnpm agent:serve:relay`

The lane split is still useful because it isolates Playwright ports, dist dirs, and tracked process metadata from normal local development.

## Docker Locally

Local Docker builds make sense for deployment parity checks, not for day-to-day UI iteration.

Use Docker locally when you want to:

- verify the production images still build
- check the compose stack before deployment
- debug container-only issues

Prefer plain `pnpm dev` for normal development because it is faster and keeps frontend/relay logs simpler.
