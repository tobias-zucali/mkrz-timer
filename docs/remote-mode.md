# Remote Mode

For the quick project overview, start with the [README](../README.md).

## Model

Remote mode is relay-backed. There is no dedicated browser host.

- `?rid=<sessionId>` joins as a readonly viewer
- `?rid=<sessionId>&control=42` joins as a control-capable client
- remote URLs carry session identity only
- live timer state is stored in the relay session snapshot

The relay owns:

- the canonical timer snapshot
- the participant roster
- session cleanup by idle TTL

## Client Behavior

- new clients receive the current timer snapshot immediately after joining
- viewers stay readonly
- control clients can publish timer and settings updates
- clients auto-retry after relay disconnects
- the UI exposes both the connection state and the last connection error

## Code Layout

- shared protocol types: [src/shared/remoteSession/types.ts](../src/shared/remoteSession/types.ts)
- client hook/config: [src/utils/remoteSession](../src/utils/remoteSession)
- relay implementation: [src/server/relay/index.ts](../src/server/relay/index.ts)
- relay session store: [src/server/remoteSession/sessionStore.ts](../src/server/remoteSession/sessionStore.ts)
