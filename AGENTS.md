# AGENTS

This file captures durable repo conventions for agents. For product/setup context, start with [README.md](./README.md).

## Baseline

- Use `pnpm`. Do not mix in `npm` or `yarn`.
- Use Node.js `22.6.0` or newer.
- After edits, run `pnpm check`, `pnpm test` and `pnpm format:fix` before considering the task done.
- Add follow-up work introduced during implementation to [TODOS.md](./TODOS.md).
- Spread `...otherProps` last on rendered elements.
- Prefer Tailwind utilities for standard layout and control styling.
- Prefer inline Heroicons-style SVGs driven by `currentColor`.

## Remote Mode

- Remote mode is relay-backed. There is no dedicated browser host anymore.
- The relay owns the canonical timer snapshot and participant roster.
- Session links currently stay query-based:
  - viewer: `?rid=<sessionId>`
  - control: `?rid=<sessionId>&control=42`
- Remote session URLs should not include timer-state params like `m`, `s`, `title`, `bg`, `fg`, or `pc`.
- When remote-mode behavior changes, update both docs and Playwright coverage in the same change.

## Local Dev / Test Lanes

- Default Playwright lane:
  - app: `http://127.0.0.1:3100`
  - relay health: `http://127.0.0.1:9100/health`
  - relay websocket: `ws://127.0.0.1:9100/ws`
- Agent lane:
  - app: `http://127.0.0.1:3300`
  - relay health: `http://127.0.0.1:9200/health`
  - relay websocket: `ws://127.0.0.1:9200/ws`
- Use `pnpm dev:relay` when you need the relay outside Playwright.
- Use `pnpm dev:relay:agent` for the tracked agent relay.
- `pnpm lane:agent` is the canonical agent Playwright entrypoint.
- `pnpm lane:agent:attach` is the attach-mode Playwright entrypoint.
- `pnpm lane:agent:full` runs the full tracked agent lane.
- Use `pnpm lane:agent:status` to inspect tracked processes and port ownership.
- Use `pnpm lane:agent:stop` to stop only tracked lane services.

## Commands

- `pnpm test`: lint, unit tests, smoke e2e
- `pnpm test:ci`: lint, unit tests, CI-safe e2e
- `pnpm test:full`: lint, unit tests, full e2e
- `pnpm build`: `pnpm test:full` plus production build
- `pnpm build:docker`: `pnpm build` plus `docker compose build`
- `pnpm check`: lint plus unit tests

## Deployment

- Production target is a Hetzner CAX11 with Docker Compose and Caddy.
- Deployment/runbook details live in [docs/deploy-hetzner.md](./docs/deploy-hetzner.md).
- The repo includes baseline deployment assets:
  - `docker-compose.yml`
  - `Caddyfile`
  - `Dockerfile.web`
  - `Dockerfile.relay`

## Maintenance

- Keep this file agent-focused.
- Update it when repo-level workflow, testing, or deployment conventions change.
