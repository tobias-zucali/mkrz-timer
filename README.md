# mkrz timer

`mkrz timer` is a workshop timer with relay-backed live sessions for shared control and viewing across browsers.

## About

- Production target: `timer.mkrz.at`
- Frontend: static Next.js export
- Live sessions: server-relayed WebSocket sessions
- Hosting target: Hetzner CAX11 with Docker Compose and Caddy

Agent-facing repo guidance lives in [AGENTS.md](./AGENTS.md).
Technical details live in:

- [docs/development.md](./docs/development.md)
- [docs/i18n.md](./docs/i18n.md)
- [docs/remote-mode.md](./docs/remote-mode.md)
- [docs/title-layout.md](./docs/title-layout.md)
- [docs/deploy-hetzner.md](./docs/deploy-hetzner.md)

## Security Notes

- Treat all URL params, local edits, and relay-synchronized payloads as untrusted input.
- Timer titles are plain text only, normalized to a single paragraph, and shared session snapshots are validated before use.
- See [docs/remote-mode.md](./docs/remote-mode.md) for trust boundaries, sanitization rules, dangerous patterns, and how to add new synchronized fields safely.

## Getting Started

Use Node.js `22.12.0` or newer and `pnpm`.

```bash
corepack enable
corepack prepare pnpm@8.11.0 --activate
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

ESLint includes `eslint-plugin-better-tailwindcss` in the shared flat config. For editor feedback, enable your editor's ESLint integration so Tailwind class issues surface inline; no separate Tailwind-specific editor plugin is required for linting.

The config uses the plugin's recommended preset, with `better-tailwindcss/enforce-consistent-line-wrapping` disabled because Prettier rewrites multiline JSX class strings in a way that does not stay stable with that rule.

## Useful Commands

```bash
pnpm dev
pnpm dev:relay
pnpm test
pnpm test:ci
pnpm test:full
pnpm build
pnpm build:full
pnpm build:docker
pnpm lint:fix
pnpm format:fix
```

## Common Workflows

```bash
# local development
pnpm dev

# fix lint issues ESLint can rewrite automatically
pnpm lint:fix

# fix formatting only
pnpm format:fix

# local validation
pnpm test

# CI-safe validation
pnpm test:ci

# full validation
pnpm test:full

# app build only
pnpm build

# validation + app build
pnpm build:full

# validation + app build + docker images
pnpm build:docker
```

## Prototype Mode

- If you explicitly ask for prototype mode, the working agreement changes temporarily:
- during prototype mode, only `pnpm lint` is required after changes so fast UI or behavior iteration stays cheap
- documentation updates, test updates, and the full validation lane can wait until you explicitly ask to end prototype mode or finish the work
- once prototype mode ends, the expectation returns to updating the relevant docs and tests and then running the full required validation lane

## Live Sessions

See [docs/remote-mode.md](./docs/remote-mode.md) for the live-session model, client behavior, link permission model, code layout, and terminology guidance.

## Local Development

See [docs/development.md](./docs/development.md) for:

- local app and relay defaults
- Playwright and agent lane ports
- relevant environment variables
- when Docker makes sense locally

## Testing

- `pnpm lint`: runs ESLint and TypeScript typechecking without touching formatting
- `pnpm lint:fix`: applies ESLint autofixes, then reruns typechecking for validation
- `pnpm format`: checks Prettier formatting only
- `pnpm format:fix`: rewrites formatting only
- `pnpm test:unit`: runs plain-Node `.test.ts` coverage for pure logic and server-safe code
- `pnpm test:components`: runs Vitest/jsdom `.test.tsx` coverage for React component behavior
- `pnpm test`: lint + unit tests + component tests + smoke e2e
- `pnpm test:ci`: lint + unit tests + component tests + CI-safe e2e
- `pnpm test:full`: lint + unit tests + component tests + full e2e
- `pnpm build`: builds the app only
- `pnpm build:full`: runs `pnpm test:full` first, then builds the app
- `pnpm build:docker`: runs the full validated app build, then `docker compose build`

Playwright lane intent:

- `@smoke`: minimum browser coverage that should gate the default local `pnpm test` lane
- `@visual`: screenshot and layout-regression coverage run via `pnpm test:e2e:visual` and excluded from `pnpm test:ci`
- untagged e2e tests: broader behavioral coverage reserved for `pnpm test:full`

## Deployment

Production is intended to run on a Hetzner CAX11 using Docker Compose and Caddy.

The production deploy workflow uploads the checked-out revision, replaces the server worktree from that bundle so removed files do not linger, rebuilds `timer-web` and `timer-relay` with `docker compose build --pull`, force-recreates those two containers with orphan cleanup, and prints the deployed commit plus image/container diagnostics. The deployed build identifier is exposed in the UI footer and in the relay health response so the running commit can be verified after rollout.

Deployment files and the runbook live in:

- [docker-compose.yml](./docker-compose.yml)
- [Caddyfile](./Caddyfile)
- [scripts/deploy-production.sh](./scripts/deploy-production.sh)
- [docs/deploy-hetzner.md](./docs/deploy-hetzner.md)
