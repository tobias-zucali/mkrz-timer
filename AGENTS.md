# AGENTS

This file captures durable repo conventions for agents. For product/setup context, start with [README.md](./README.md).

## Baseline

- Use `pnpm`. Do not mix in `npm` or `yarn`.
- Use Node.js `22.12.0` or newer.
- After edits, run `pnpm lint`, `pnpm test` and `pnpm format:fix` before considering the task done.
- After changes that can cause side effects across routes, sessions, synchronization, persistence, or shared state, also run `pnpm test:full` before considering the task done.
- When the user explicitly asks for prototype mode, run `pnpm lint` only after changes while the behavior is still moving quickly.
- While prototype mode is active, defer documentation updates, test updates, and the full validation lane until the user explicitly asks to end prototype mode or finish the work.
- As soon as prototype mode ends, add or adapt the relevant documentation and tests, then run the full required validation lane before considering the work complete.
- Prompt the user to create GitHub issues for follow-up work introduced during implementation instead of editing a local TODO file.
- Prefer `@/` imports over relative `../..` imports.
- Exception: keep relative imports in files executed directly by the plain Node test/runtime path until alias resolution is configured there too.
- Keep files short and focused. Do not wait for a large cleanup later:
  - if a file is likely to grow past roughly 200 lines, look for natural extraction points before adding more logic
  - if a component mostly passes state, callbacks, or derived values through to children, move that state/logic down or extract a helper closer to the consumer
  - if a file starts mixing route orchestration, UI rendering, dialog state, and feature-specific side effects, split those concerns immediately into components, hooks, or utilities
  - prefer small, purpose-built props and hook arguments over broad “bag of state” interfaces when the narrower shape is clear
- Do not use nested inline conditionals; prefer an `if` chain or a small helper.
- Spread `...otherProps` last on rendered elements.
- Prefer Tailwind utilities for standard layout and control styling.
- Prefer inline Heroicons-style SVGs driven by `currentColor`.
- Treat every external or user-controlled value as untrusted by default.
- New user-controlled fields require validation plus escaping review before merge.
- Changes to synchronized or relay-persisted fields require an explicit security review.

## Remote Mode

- Remote mode is relay-backed. There is no dedicated browser host anymore.
- The relay owns the canonical timer snapshot and participant roster.
- Session links are role-specific opaque paths:
  - viewer: `/view/<readonlyToken>`
  - control: `/control/<controlToken>`
- Remote session URLs should not include timer-state params like `m`, `s`, `title`, `bg`, `fg`, or `pc`.
- When remote-mode behavior changes, update both docs and Playwright coverage in the same change.
- Future sharing or session features must preserve strict separation between readonly and control capabilities.

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
