# Development

For product/setup context, start with the [README](../README.md).

## Local App And Relay

`pnpm dev` starts both the Next.js app and the local relay with a compatible default:

- app: `http://localhost:3000`
- relay health: `http://127.0.0.1:9100/health`
- relay websocket: `ws://127.0.0.1:9100/ws`

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
