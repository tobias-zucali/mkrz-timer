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

## Maintenance Decision

The relay/session boilerplate is intentionally being reduced with **internal abstractions on top of `ws`**, not by migrating to a new realtime framework.

Options evaluated:

- keep the current implementation unchanged
- migrate to a library such as Socket.IO or PartyKit
- extract internal protocol and lifecycle helpers around the existing relay

Decision:

- keep the current wire protocol, session URL format, deployment model, and controller/viewer permissions
- keep `ws` as the transport
- introduce internal abstractions for client protocol/lifecycle handling and relay connection/protocol handling

Why not a new library right now:

- the current protocol is small and app-specific, so a framework would still need custom snapshot, recovery, and permission rules
- controller/viewer enforcement is clearer when session mutation remains explicit in the in-memory store
- the current deployment target is a small Node/Docker service, so a runtime shift would add migration cost without clear product benefit
