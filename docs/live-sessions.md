# Live Sessions

For the quick project overview, start with the [README](../README.md).

## Terminology

- Use `Live session` in user-facing copy for synchronized sharing.
- Use `local share` for independent snapshot sharing.

## Model

Live sessions are relay-backed. There is no dedicated browser host.

- `/view/<readonlyToken>` joins as a readonly viewer
- `/control/<controlToken>` joins as a control-capable client
- live session URLs carry opaque capability tokens, the canonical `v=1&t=...&a=...` timer state, and selected non-default settings params
- when the host starts a live session, it moves onto its `/control/<controlToken>` route without a full document reload
- leaving a control route returns that client to the local timer URL
- live timer state is stored in the relay session snapshot

The relay owns:

- the canonical timer snapshot
- the participant roster
- session cleanup by idle TTL

## Client Behavior

- new clients receive the current timer snapshot immediately after joining
- viewers stay readonly
- control clients can publish timer and settings updates
- running timer snapshots use a relay-owned anchor model with `durationSeconds`, `elapsedSecondsAtAnchor`, `anchorServerTimestamp`, and `status`
- relay `session` and `state-updated` messages also include a trusted `serverTimestamp`
- clients derive live elapsed time from the received anchor state plus the local delta from `serverTimestamp`
- controllers send timer commands such as start, pause, reset, and row changes instead of elapsed-time ticks
- the relay does not increment elapsed time on an interval; it resolves canonical running state when handling commands, joins, reconnects, and broadcasts
- local routes can carry timer setup in `v=1&t=...` URL state, and viewer routes may also carry the same canonical timer params plus optional selected settings params
- shared controller routes may also include the `title` query param alongside the session token, canonical timer params, and optional selected settings params
- controller links can restore the latest relay snapshot without extra setup
- in local development, when the configured relay URL points at loopback, clients opened from a LAN host rewrite that relay hostname to the current page hostname before connecting or probing relay health
- clients auto-retry after relay disconnects
- disconnected control clients keep their local timer editable and track pending local changes until reconciliation succeeds
- reconnecting clients fetch a fresh relay snapshot before applying any pending local controller changes
- pending local controller changes auto-apply only when the relay snapshot did not change while the client was offline
- reconnect conflicts are resolved against the fresh current relay snapshot, not a stale cached copy
- clients can exit a failed or conflicting live session into local mode without requiring the relay to respond
- leaving a failed live session for local mode cancels reconnect attempts before the route transitions back to the local timer URL
- ending a live session from a control-capable client asks for confirmation when other clients are still connected
- closing a control-capable browser tab while other clients are connected triggers the browser's native leave-confirmation prompt
- the UI exposes both the connection state and the last connection error
- malformed, invalid, or expired viewer links fail closed with a recoverable error state
- controller routes pause synchronization and require an explicit conflict decision when valid local timer state disagrees with an existing relay snapshot
- the sidebar menu and status surfaces use fullscreen overlays on small screens and readonly clients, while wider screens keep a constrained off-canvas width
- readonly clients expose a top-right share action that opens a fullscreen QR code for the current viewer link
- viewer clients stay readonly through disconnect and reconnect cycles, and they explicitly surface when they are waiting on controller presence
- the installable offline shell depends on the production service worker; local `pnpm dev` sessions do not provide offline reload support

## Recovery Model

- the relay remains the canonical source of truth for live sessions
- each control-capable client also tracks:
  - the last confirmed relay snapshot
  - the local working snapshot
  - any pending local changes created while offline or reconnecting
  - the relay snapshot seen when the disconnect started
- when a reconnect succeeds, the client compares the fresh relay snapshot against both the disconnect baseline and any pending local snapshot before deciding whether to auto-reconcile or open a conflict dialog
- conflict actions are:
  - use server state
  - push local changes
  - use local mode
- presentation mode is intentionally not part of the current recovery flow

## Trust Boundaries

- URL/query params are untrusted input until normalized by the client.
- Timer titles, session ids, and all relay message fields are untrusted input until validated.
- Viewer and controller tokens are untrusted input until validated.
- Relay snapshots are the only persisted shared state in the current implementation, and they stay in memory only.
- Viewers must treat every shared field from the relay as untrusted, even when it originated from another control client.
- Viewers must never be able to overwrite relay timer progression, including reconnect and recovery flows.

## Validation and Escaping Rules

- Timer titles are plain text only. They are limited to 64 characters, normalize line breaks to spaces, and render as React text or textarea values rather than injected HTML.
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

## Assumptions and Follow-Ups

- Current persistence scope is limited to URL-derived state and the relay's in-memory session snapshot.
- TODO: add durable local persistence for the running timer state so offline tab eviction or browser restart can recover the live runtime state on mobile browsers.
- React escaping is relied on as the final rendering defense, but only after application-level validation and normalization.
- Transport-level controls such as CSP or additional proxy-enforced request filtering are not the main protection for live-session payloads today; input validation is.

## Code Layout

- shared protocol types: [src/shared/liveSession/types.ts](../src/shared/liveSession/types.ts)
- client hook/config: [src/utils/liveSession](../src/utils/liveSession)
- relay implementation: [src/server/relay/index.ts](../src/server/relay/index.ts)
- relay session store: [src/server/liveSession/sessionStore.ts](../src/server/liveSession/sessionStore.ts)

## Testing Strategy

- Keep browser coverage focused on role separation, route behavior, synchronized timer UX, recovery UX, and other outcomes the user can actually observe.
- Prefer unit or server-safe tests for protocol validation, merge/reconciliation branches, malformed payload handling, and other non-visual relay logic.
- For relay-backed browser coverage, default to one control client plus one viewer/client unless the scenario specifically needs more participants.
- Treat relay debug state and participant-count surfaces as diagnostics; do not make exact intermediate cluster timing the primary pass condition in e2e.
- Put multi-client, reconnect, offline, and PiP coverage in the isolated remote Playwright lane so those tests do not destabilize the default parallel local lane.

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
