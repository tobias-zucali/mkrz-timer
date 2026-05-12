# Time Timer

## AI

This repository includes agent-specific working notes in [AGENTS.md](./AGENTS.md).

## About

This project is inspired by the wonderful [Time Timer](https://www.timetimer.com/) device. I built it mainly to be used in my own workshops – get in touch @ [mkrz.at](https://mkrz.at/).

## Where to find it

The timer is deployed at [time.mkrz.at](https://time.mkrz.at).

The app now uses Next.js server features for remote-session coordination and is no longer a pure static export.

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
pnpm dev:agent:manual
pnpm lane:agent
pnpm lane:agent:attach
pnpm lane:agent:status
pnpm test
pnpm test:full
pnpm build
pnpm lint
pnpm format
```

## Remote Mode

Remote mode uses two layers:

- a Next.js server-side session directory for session identity, ownership election, and lease heartbeats
- PeerJS/WebRTC for peer discovery, signalling, and direct browser-to-browser timer sync

In production, the app still uses the default PeerJS cloud server unless a different PeerJS endpoint is configured.

### How it works

Turn on `Remote mode` in settings on the page that should host the session first.

- That page creates a stable remote session id and starts a PeerJS host peer.
- The page rewrites its own URL to include `rid=<sessionId>&control=42`.
- `rid` identifies the shared remote session, not the current host peer id.
- `control=42` marks a page as a control client. Without it, a remote page becomes a readonly viewer.

When remote mode is active, the settings drawer exposes two dedicated links:

- `Viewer Link`: `?rid=<sessionId>` joins as a readonly client. Viewers see the live timer but do not get timer buttons, settings, or editable inputs.
- `Control Link`: `?rid=<sessionId>&control=42` joins as a control client. Control clients can start, pause, reset, and change timer settings.

Readonly and control clients can be mixed in the same session. Remote client links are intentionally generated without inheriting the current timer query params, because the host pushes the canonical state to new peers after they connect.

### Sync and failover behavior

- Starting, pausing, resetting, and settings changes sync across connected control clients.
- New clients receive the current timer state when they join.
- Readonly viewers stay in a visible waiting state until the first remote sync arrives, instead of rendering an unsynced timer.
- If the current main page goes away, another control-capable client can take over the session by claiming the session in the server-side directory and publishing its current host peer id.
- The original main can later rejoin as a client.
- Readonly clients stay readonly after failover and continue receiving updates.

The UI keeps a small status label visible in the lower-left corner:

- When remote mode is active, it reflects whether the page is connected, reconnecting, degraded, or needs a retry.
- Manual retry is only shown after automatic recovery times out.
- When no extra diagnostics are needed, the popup stays minimal and simply shows local/network status.

If remote startup or connectivity fails, the same popup expands with the latest caught error, a recent peer activity log, and a prefilled "Send to developer" mail link with peer status and query-param context.

## Hosting Notes

The current remote-session implementation depends on Next.js route handlers under `src/app/api/remote-sessions`. That means the app now requires a Node-capable deployment target for remote mode and can no longer rely on a static GitHub Pages export alone.

If the Pages workflow is kept, it must be changed to deploy a server-capable build target instead of uploading `out/`.

## PeerJS Server

For local end-to-end tests, the repository runs its own PeerJS server so tests do not depend on the public PeerJS service:

```bash
pnpm dev:peer
```

This starts PeerJS on [http://127.0.0.1:9100](http://127.0.0.1:9100). Playwright starts it automatically for the `test:e2e` scripts, runs the Next.js app on `http://127.0.0.1:3100`, and points that app at the local PeerJS server with `NEXT_PUBLIC_PEERJS_HOST`, `NEXT_PUBLIC_PEERJS_PORT`, `NEXT_PUBLIC_PEERJS_PATH=/`, and `NEXT_PUBLIC_PEERJS_SECURE=false`. The Next app itself also serves the remote-session directory API.

For separate local lanes, these commands use these ports and build artifacts:

- `pnpm dev`: `http://127.0.0.1:3000` with `.next`
- `pnpm test:e2e:*`: `http://127.0.0.1:3100` with `.next-e2e` and PeerJS on `9100`
- `pnpm dev:agent:manual`: `http://127.0.0.1:3300` with `.next-agent`
- `pnpm dev:agent:test`: `http://127.0.0.1:3300` with `.next-agent-e2e`
- `pnpm lane:agent*`: `http://127.0.0.1:3300` with PeerJS on `9200`

The agent lane now has one canonical launcher:

- `pnpm lane:agent`: default agent smoke lane. It checks whether ports `3300` and `9200` are free, already owned by the tracked agent lane, or blocked by something else. It then chooses managed or attach mode automatically.
- `pnpm lane:agent:managed`: force a fresh managed run.
- `pnpm lane:agent:attach`: attach only to already-running tracked agent lane servers.
- `pnpm lane:agent:full`: run the full agent Playwright lane.
- `pnpm lane:agent:debug`: attach with Playwright Inspector for debugging.
- `pnpm lane:agent:status`: show which processes own the agent-lane ports, whether health checks pass, and which tracked role is active.
- `pnpm lane:agent:stop`: stop only tracked agent-lane processes.

For manual debugging against already-running agent servers, start:

```bash
pnpm dev:peer:agent
pnpm dev:agent:test
pnpm lane:agent:attach
```

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
