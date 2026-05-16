# AGENTS

This file captures durable repo conventions for agents. For product/setup context, start with [README.md](./README.md).

## Baseline

- Use `pnpm`. Do not mix in `npm` or `yarn`.
- Use Node.js `22.6.0` or newer.
- After edits, run `pnpm lint`, `pnpm test` and `pnpm format:fix` before considering the task done.
- Prompt the user to create GitHub issues for follow-up work introduced during implementation instead of editing a local TODO file.
- Prefer `@/` imports over relative `../..` imports.
- Spread `...otherProps` last on rendered elements.
- Prefer Tailwind utilities for standard layout and control styling.
- Prefer inline Heroicons-style SVGs driven by `currentColor`.
- Treat every external or user-controlled value as untrusted by default.
- New user-controlled fields require validation plus escaping review before merge.
- Changes to synchronized or relay-persisted fields require an explicit security review.

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
- Use `pnpm agent:serve:relay` for the tracked agent relay.
- `pnpm agent:test` is the canonical agent Playwright entrypoint.
- `pnpm agent:test:attach` is the attach-mode Playwright entrypoint.
- `pnpm agent:test:full` runs the full tracked agent lane.
- Use `pnpm agent:status` to inspect tracked processes and port ownership.
- Use `pnpm agent:stop` to stop only tracked lane services.

## Playwright Tags

- Tag smoke coverage with `@smoke` so it is exercised by `pnpm test` and `pnpm agent:test`.
- Tag visual-regression coverage with `@visual` so it is exercised by `pnpm test:e2e:visual` and excluded from `pnpm test:ci`.
- Leave broader end-to-end coverage untagged unless it belongs in a filtered lane.
- When adding or changing remote-mode behavior, make sure the affected Playwright coverage carries the right tags for the intended lane.

## Commands

- `pnpm lint`: ESLint plus typecheck validation
- `pnpm lint:fix`: ESLint autofixes plus a follow-up typecheck
- `pnpm format:fix`: Prettier rewrites only
- `pnpm test`: lint, unit tests, and Playwright tests tagged `@smoke`
- `pnpm test:ci`: lint, unit tests, and Playwright tests except those tagged `@visual`
- `pnpm test:full`: lint, unit tests, full e2e
- `pnpm build`: production app build only
- `pnpm build:full`: `pnpm test:full` plus production app build
- `pnpm build:docker`: `pnpm build:full` plus `docker compose build`

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
