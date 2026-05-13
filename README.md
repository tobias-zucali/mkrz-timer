# mkrz timer

`mkrz timer` is a workshop timer with a relay-backed remote mode for shared control and viewing across browsers.

## About

- Production target: `timer.mkrz.at`
- Frontend: static Next.js export
- Remote mode: server-relayed WebSocket sessions
- Hosting target: Hetzner CAX11 with Docker Compose and Caddy

Agent-facing repo guidance lives in [AGENTS.md](./AGENTS.md).
Technical details live in:

- [docs/development.md](./docs/development.md)
- [docs/remote-mode.md](./docs/remote-mode.md)
- [docs/deploy-hetzner.md](./docs/deploy-hetzner.md)

## Getting Started

Use Node.js `22.6.0` or newer and `pnpm`.

```bash
corepack enable
corepack prepare pnpm@8.11.0 --activate
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful Commands

```bash
pnpm dev
pnpm dev:relay
pnpm build:docker
pnpm test
pnpm test:full
pnpm build
pnpm lint
pnpm format
```

## Remote Mode

See [docs/remote-mode.md](./docs/remote-mode.md) for the session model, client behavior, and code layout.

## Local Development

See [docs/development.md](./docs/development.md) for:

- local app and relay defaults
- Playwright and agent lane ports
- relevant environment variables
- when Docker makes sense locally

## Testing

- `pnpm test`: lint + unit tests + smoke e2e
- `pnpm test:ci`: lint + unit tests + CI-safe e2e
- `pnpm test:full`: lint + unit tests + full e2e
- `pnpm build`: runs `pnpm test:full` first, then builds the static frontend
- `pnpm build:docker`: runs the full app build, then `docker compose build`

## Deployment

Production is intended to run on a Hetzner CAX11 using Docker Compose and Caddy.

Deployment files and the runbook live in:

- [docker-compose.yml](./docker-compose.yml)
- [Caddyfile](./Caddyfile)
- [docs/deploy-hetzner.md](./docs/deploy-hetzner.md)
