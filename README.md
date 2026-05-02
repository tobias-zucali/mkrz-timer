# Time Timer

## AI

This repository includes agent-specific working notes in [AGENTS.md](./AGENTS.md).

## About

This project is inspired by the wonderful [Time Timer](https://www.timetimer.com/) device. I built it mainly to be used in my own workshops – get in touch @ [mkrz.at](https://mkrz.at/).

## Where to find it

The timer is deployed at [time.mkrz.at](https://time.mkrz.at).

## Getting Started

Use Node.js 20.9 or newer. This repository uses `pnpm` and is locked with `pnpm-lock.yaml`.

If `pnpm` is not available yet, enable Corepack once:

```bash
corepack enable
corepack prepare pnpm@8.11.0 --activate
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Useful commands:

```bash
pnpm dev
pnpm dev:peer
pnpm build
pnpm lint
pnpm format
```

## PeerJS Server

Remote mode uses PeerJS for peer-to-peer timer synchronization. In production, the app uses the default PeerJS cloud server unless a different PeerJS endpoint is configured.

For local end-to-end tests, the repository runs its own PeerJS server so tests do not depend on the public PeerJS service:

```bash
pnpm dev:peer
```

This starts PeerJS on [http://127.0.0.1:9000](http://127.0.0.1:9000). Playwright starts it automatically for the `test:e2e` scripts and points the Next.js app at it with `NEXT_PUBLIC_PEERJS_HOST`, `NEXT_PUBLIC_PEERJS_PORT`, and `NEXT_PUBLIC_PEERJS_SECURE`.

## Testing

Playwright is used for end-to-end coverage.
The Playwright config starts both the Next.js app and a local PeerJS server for remote-mode tests.

For the best visual overview, use Playwright UI mode:

```bash
pnpm test:e2e:ui
```

Other useful modes:

```bash
pnpm test
pnpm test:e2e:visual
pnpm test:e2e:debug
pnpm test:e2e
pnpm test:e2e:report
```

`pnpm test` runs lint plus the full Playwright e2e suite. `pnpm build` runs that test gate first, then runs the production Next.js build.

Use `pnpm test:e2e:debug` to step through the tests with Playwright Inspector.
