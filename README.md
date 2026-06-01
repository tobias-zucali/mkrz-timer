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
- [docs/live-sessions.md](./docs/live-sessions.md)
- [docs/title-layout.md](./docs/title-layout.md)
- [docs/deploy-hetzner.md](./docs/deploy-hetzner.md)

## Security Notes

- Treat all URL params, local edits, and relay-synchronized payloads as untrusted input.
- Timer titles are plain text only, normalized to a single paragraph, and shared session snapshots are validated before use.
- See [docs/live-sessions.md](./docs/live-sessions.md) for trust boundaries, sanitization rules, dangerous patterns, and how to add new synchronized fields safely.

## Getting Started

Use Node.js `22.12.0` or newer and `pnpm`.

```bash
corepack enable
corepack prepare pnpm@8.11.0 --activate
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

This README is the human-facing command surface. Use the generic `pnpm test*` and `pnpm test:e2e:*` commands here. Agents should follow [AGENTS.md](./AGENTS.md) and use `agent:*` lanes instead so automated runs stay on the tracked ports and process model.

ESLint includes `eslint-plugin-better-tailwindcss` in the shared flat config. For editor feedback, enable your editor's ESLint integration so Tailwind class issues surface inline; no separate Tailwind-specific editor plugin is required for linting.

The config uses the plugin's recommended preset, with `better-tailwindcss/enforce-consistent-line-wrapping` disabled because Prettier rewrites multiline JSX class strings in a way that does not stay stable with that rule.

## Useful Commands

```bash
pnpm dev
pnpm dev:relay
pnpm test
pnpm test:ci
pnpm test:full
pnpm test:e2e:remote
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
- during prototype mode, validation commands can be skipped while fast UI or behavior iteration is still in progress
- documentation updates, test updates, and the full validation lane can wait until you explicitly ask to end prototype mode or finish the work
- once prototype mode ends, the expectation returns to updating the relevant docs and tests and then running the full required validation lane

## Live Sessions

See [docs/live-sessions.md](./docs/live-sessions.md) for the live-session model, client behavior, link permission model, code layout, and terminology guidance.

## Local Development

See [docs/development.md](./docs/development.md) for:

- local app and relay defaults
- Playwright and agent lane ports
- relevant environment variables
- when Docker makes sense locally

## Testing

- Human default: use the generic `pnpm test*` and `pnpm test:e2e:*` commands from this README.
- Agent default: use `pnpm agent:test*` as defined in [AGENTS.md](./AGENTS.md).
- `pnpm test`: default validation, including smoke browser coverage only
- `pnpm test:ci`: non-visual browser coverage across the local and remote Playwright lanes
- `pnpm test:full`: full browser coverage across the local and remote Playwright lanes
- `pnpm test:e2e:remote`: serial relay-backed browser coverage for multi-client, reconnect, offline, and PiP scenarios
- `pnpm test:e2e:visual`: visual browser coverage

Detailed lane definitions and test-authoring rules live in [docs/development.md](./docs/development.md).

## Deployment

Production is intended to run on a Hetzner CAX11 using Docker Compose and Caddy.

Deployment files and the runbook live in:

- [docker-compose.yml](./docker-compose.yml)
- [Caddyfile](./Caddyfile)
- [scripts/deploy-production.sh](./scripts/deploy-production.sh)
- [.github/workflows/build-and-deploy.yml](./.github/workflows/build-and-deploy.yml)
- [docs/deploy-hetzner.md](./docs/deploy-hetzner.md)
