# Remote Mode

For the quick project overview, start with the [README](../README.md).

## Model

Remote mode is relay-backed. There is no dedicated browser host.

- `/view/<readonlyToken>` joins as a readonly viewer
- `/control/<controlToken>` joins as a control-capable client
- remote URLs carry opaque capability tokens only
- live timer state is stored in the relay session snapshot

The relay owns:

- the canonical timer snapshot
- the participant roster
- session cleanup by idle TTL

## Client Behavior

- new clients receive the current timer snapshot immediately after joining
- viewers stay readonly
- control clients can publish timer and settings updates
- local and controller routes can carry timer setup in `v=1&t=...` URL state, while viewer routes ignore timer-state query params entirely
- controller links can restore the latest relay snapshot without extra setup
- clients auto-retry after relay disconnects
- the UI exposes both the connection state and the last connection error
- malformed, invalid, or expired viewer links fail closed with a recoverable error state
- controller routes pause synchronization and require an explicit conflict decision when valid URL timer state disagrees with an existing relay snapshot

## Trust Boundaries

- URL/query params are untrusted input until normalized by the client.
- Timer titles, session ids, and all relay message fields are untrusted input until validated.
- Viewer and controller tokens are untrusted input until validated.
- Relay snapshots are the only persisted shared state in the current implementation, and they stay in memory only.
- Viewers must treat every shared field from the relay as untrusted, even when it originated from another control client.

## Validation and Escaping Rules

- Timer titles are plain text only. They preserve intentional line breaks, are limited to 64 characters, and render as React text or textarea values rather than injected HTML.
- Colors must match strict `#RRGGBB` values or they fall back to safe defaults.
- Timer minute and second params accept digits only and fall back safely when malformed or out of range.
- Session ids and client ids must match the allowed identifier format and length limits.
- Viewer and controller tokens must match the allowed identifier format and length limits.
- Relay messages and snapshots are schema-validated before they can update the canonical session snapshot.
- Invalid or oversized payloads fail closed: they are rejected or normalized to safe defaults without crashing the app.

## Dangerous Patterns to Avoid

- Do not use `dangerouslySetInnerHTML` for timer titles or synchronized fields.
- Do not read raw `searchParams`, WebSocket payloads, or relay snapshots directly into state without passing through shared validators.
- Do not add new synchronized fields by appending them to the protocol or snapshot shape without validation, normalization, and test coverage.
- Do not assume controller links are trusted just because they already joined a session.
- Do not collapse viewer and controller capabilities into one share link.

## Safe Field Changes

- Add new user-controlled or synchronized fields to the shared validation module first.
- Define safe defaults, type/shape validation, and length or range limits before using the field in UI or relay code.
- Normalize the field at every ingress point that can receive it: query params, local edits, relay payloads, and relay snapshot restore paths.
- Add unit coverage for malformed input and Playwright coverage when the field crosses clients.
- Update this document and `AGENTS.md` when the trust boundary or review expectations change.

## Assumptions and Limitations

- Current persistence scope is limited to URL-derived state and the relay's in-memory session snapshot.
- React escaping is relied on as the final rendering defense, but only after application-level validation and normalization.
- Transport-level controls such as CSP or additional proxy-enforced request filtering are not the main protection for remote-mode payloads today; input validation is.

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

- keep the current deployment model and controller/viewer permissions
- keep `ws` as the transport
- introduce internal abstractions for client protocol/lifecycle handling and relay connection/protocol handling

Why not a new library right now:

- the current protocol is small and app-specific, so a framework would still need custom snapshot, recovery, and permission rules
- controller/viewer enforcement is clearer when session mutation remains explicit in the in-memory store
- the current deployment target is a small Node/Docker service, so a runtime shift would add migration cost without clear product benefit
