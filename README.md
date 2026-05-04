# Time Timer

## AI

This repository includes agent-specific working notes in [AGENTS.md](./AGENTS.md).

## About

This project is inspired by the wonderful [Time Timer](https://www.timetimer.com/) device. I built it mainly to be used in my own workshops – get in touch @ [mkrz.at](https://mkrz.at/).

## Where to find it

The timer is deployed at [time.mkrz.at](https://time.mkrz.at).

## Getting Started

Use Node.js 22.6 or newer. This repository uses `pnpm` and is locked with `pnpm-lock.yaml`.

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
pnpm test
pnpm test:full
pnpm build
pnpm lint
pnpm format
```

## PeerJS Server

Remote mode uses PeerJS for peer-to-peer timer synchronization. In production, the app uses the default PeerJS cloud server unless a different PeerJS endpoint is configured.

Remote mode offers two client URLs. The readonly client URL only includes the remote peer id, for example `rid=<peerId>`, and joins as a viewer without timer controls or settings. The control client URL adds `control=42`, for example `?rid=<peerId>&control=42`, and can start, pause, reset, and update timer settings. Readonly and control clients can be mixed in the same remote session.

For local end-to-end tests, the repository runs its own PeerJS server so tests do not depend on the public PeerJS service:

```bash
pnpm dev:peer
```

This starts PeerJS on [http://127.0.0.1:9100](http://127.0.0.1:9100). Playwright starts it automatically for the `test:e2e` scripts, runs the Next.js app on `http://127.0.0.1:3100`, and points that app at the local PeerJS server with `NEXT_PUBLIC_PEERJS_HOST`, `NEXT_PUBLIC_PEERJS_PORT`, `NEXT_PUBLIC_PEERJS_PATH=/`, and `NEXT_PUBLIC_PEERJS_SECURE`.

## Testing

Playwright is used for end-to-end coverage.
The Playwright config starts both the Next.js app and a local PeerJS server for remote-mode tests.

The e2e coverage is split into two lanes:

- `pnpm test:e2e`: a quick smoke suite for everyday changes
- `pnpm test:e2e:full`: the full Playwright suite for bigger changes and build verification

The top-level scripts follow the same idea:

- `pnpm test`: lint + unit tests + smoke e2e
- `pnpm test:full`: lint + unit tests + full e2e
- `pnpm build`: runs `pnpm test:full` first, then builds production output

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
pnpm test:e2e:full
pnpm test:e2e:report
```

`pnpm test` is the fast default verification gate. `pnpm test:full` and `pnpm build` run the deeper regression lane.

Use `pnpm test:e2e:debug` to step through the tests with Playwright Inspector.
