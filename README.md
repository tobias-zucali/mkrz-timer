# Time Timer

## AI

This repository includes agent-specific working notes in [AGENTS.md](./AGENTS.md).

## About

This project is inspired by the wonderful [Time Timer](https://www.timetimer.com/) device. I built it mainly to be used in my own workshops – get in touch @ [mkrz.at](https://mkrz.at/).

## Where to find it

The timer is deployed at [time.mkrz.at](https://time.mkrz.at).

The GitHub Pages workflow builds a static export and uploads the generated `out/` directory.

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

UI layout and controls are styled with Tailwind CSS v4 utilities, using the shared theme tokens defined in [`src/app/globals.css`](./src/app/globals.css).

Useful commands:

```bash
pnpm dev
pnpm dev:peer
pnpm dev:agent
pnpm dev:peer:agent
pnpm test
pnpm test:full
pnpm build
pnpm lint
pnpm format
```

## Remote Mode

Remote mode uses PeerJS for peer discovery and signalling, then keeps the timer state, timer actions, and timer settings synchronized across browsers. In production, the app uses the default PeerJS cloud server unless a different PeerJS endpoint is configured.

### How it works

Turn on `Remote mode` in settings on the page that should host the session first.

- That page starts a PeerJS session and rewrites its own URL to include `rid=<peerId>&control=42`.
- `rid` identifies the shared remote session.
- `control=42` marks a page as a control client. Without it, a remote page becomes a readonly viewer.

When remote mode is active, the settings drawer exposes two dedicated links:

- `Viewer Link`: `?rid=<peerId>` joins as a readonly client. Viewers see the live timer but do not get timer buttons, settings, or editable inputs.
- `Control Link`: `?rid=<peerId>&control=42` joins as a control client. Control clients can start, pause, reset, and change timer settings.

Readonly and control clients can be mixed in the same session. Remote client links are intentionally generated without inheriting the current timer query params, because the host pushes the canonical state to new peers after they connect.

### Sync and failover behavior

- Starting, pausing, resetting, and settings changes sync across connected control clients.
- New clients receive the current timer state when they join.
- Readonly viewers stay in a visible waiting state until the first remote sync arrives, instead of rendering an unsynced timer.
- If the current main page goes away, another control-capable client can take over the session by claiming the existing `rid`.
- Control-capable clients use the last shared control roster as a deterministic failover queue. They try to reclaim the session in that shared order, which prevents two control clients from promoting themselves at the same time.
- The original main can later rejoin as a client.
- Readonly clients stay readonly after failover and continue receiving updates.

The UI shows a small remote status label while a page is connected to a remote session:

- The label reflects whether the page is connected, reconnecting, degraded, or needs a retry.
- Manual retry is only shown after automatic recovery times out.

If remote startup or connectivity fails, the app shows a dismissible error banner and includes a prefilled error-report mail link with peer status and query-param context.

## PeerJS Server

For local end-to-end tests, the repository runs its own PeerJS server so tests do not depend on the public PeerJS service:

```bash
pnpm dev:peer
```

This starts PeerJS on [http://127.0.0.1:9100](http://127.0.0.1:9100). Playwright starts it automatically for the `test:e2e` scripts, runs the Next.js app on `http://127.0.0.1:3100`, and points that app at the local PeerJS server with `NEXT_PUBLIC_PEERJS_HOST`, `NEXT_PUBLIC_PEERJS_PORT`, `NEXT_PUBLIC_PEERJS_PATH=/`, and `NEXT_PUBLIC_PEERJS_SECURE=false`.

For separate local lanes, these commands use different ports and build artifacts:

- `pnpm dev`: `http://127.0.0.1:3000` with `.next`
- `pnpm test:e2e:*`: `http://127.0.0.1:3100` with `.next-e2e` and PeerJS on `9100`
- `pnpm dev:agent`: `http://127.0.0.1:3200` with `.next-agent`
- `pnpm test:e2e:*:agent`: `http://127.0.0.1:3300` with `.next-agent-e2e` and PeerJS on `9200`

Agent-facing Playwright workflows and troubleshooting notes live in [AGENTS.md](./AGENTS.md).

## Testing

Playwright is used for end-to-end coverage.
The Playwright config starts both the Next.js app and a local PeerJS server for remote-mode tests.

The e2e coverage is split into two lanes:

- `pnpm test:e2e`: a quick smoke suite for everyday changes
- `pnpm test:e2e:ci`: the CI regression lane, excluding `@visual` screenshot tests
- `pnpm test:e2e:full`: the full Playwright suite for bigger changes and build verification

The top-level scripts follow the same idea:

- `pnpm test`: lint + unit tests + smoke e2e
- `pnpm test:ci`: lint + unit tests + CI-safe e2e (without `@visual`)
- `pnpm test:full`: lint + unit tests + full e2e
- `pnpm build`: runs `pnpm test:full` first, then builds production output

For the best visual overview, use Playwright UI mode:

```bash
pnpm test:e2e:ui
```

Other useful modes:

```bash
pnpm test
pnpm test:ci
pnpm test:e2e:visual
pnpm test:e2e:debug
pnpm test:e2e
pnpm test:e2e:ci
pnpm test:e2e:full
pnpm test:e2e:report
```

`pnpm test` is the fast default verification gate. `pnpm test:ci` is the stable CI lane. `pnpm test:full` and `pnpm build` run the deeper local regression lane including `@visual` screenshot coverage.

Use `pnpm test:e2e:debug` to step through the tests with Playwright Inspector.

Remote-mode coverage is split by concern:

- `tests/e2e/remote-client.spec.ts`: settings flow, viewer vs control links, startup failures
- `tests/e2e/remote-sync.spec.ts`: timer action sync, settings sync, rejoin behavior
- `tests/e2e/remote-failover.spec.ts`: main re-election and mixed-client failover
