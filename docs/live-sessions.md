# Live Sessions

For the quick project overview, start with the [README](../README.md).

## Terminology

- Use `Live session` in user-facing copy for synchronized sharing.
- Use `local share` for independent snapshot sharing.

## Product Contract

Live sessions are relay-backed. There is no dedicated browser host.

- `/view/<readonlyToken>` is a readonly viewer link.
- `/control/<controlToken>` is a control-capable link.
- Viewer and control capabilities must remain strictly separated.
- The relay owns the canonical timer snapshot and participant roster.
- Live session URLs may include the canonical timer-state params `v`, `t`, and `a`.
- Control URLs may also include the `title` query param.
- Live session URLs may include selected non-default settings params when those settings are intentionally shared.

## Behavioral Invariants

- Viewers stay readonly across normal use, disconnects, and reconnects.
- Control clients can publish timer and settings changes.
- New clients receive the current shared snapshot when they join.
- The relay remains the source of truth for shared state and recovery decisions.
- An already-connected control client should rebuild a relay session automatically after a relay restart so existing control and viewer links keep working.
- Timer action chrome stays mounted on every viewport for local, viewer, and control clients; it dims after five seconds of inactivity and returns to full visibility on interaction or focused controls.
- Invalid, malformed, or expired live-session links must fail closed with a recoverable error state.
- Clients must always be able to leave a failed or conflicting live session and return to local mode.
- Ending a live session from a control-capable client should warn when other clients are still connected.

## Trust Boundaries

- URL/query params are untrusted input until normalized by the client.
- Timer titles, session ids, tokens, and relay message fields are untrusted input until validated.
- Relay snapshots are the only persisted shared state in the current implementation, and they remain in memory only.
- Viewers must treat all shared fields from the relay as untrusted, even if another controller originated them.
- Viewers must never be able to overwrite relay-owned timer progression.

## Validation Rules

- Timer titles are plain text only and limited to 64 characters after normalization.
- Colors must match strict `#RRGGBB` values or fall back safely.
- Timer minute and second params accept digits only and fall back safely when malformed or out of range.
- Session ids, client ids, and access tokens must match the shared identifier validators and length limits.
- Relay messages and snapshots must pass shared schema validation before they can update canonical session state.
- Invalid or oversized payloads must fail closed without crashing the app.

## Change Rules

- Add new user-controlled or synchronized fields to the shared validation layer first.
- Define safe defaults, type and range validation, and normalization before using a field in UI or relay code.
- Normalize the field at every ingress point: query params, local edits, relay payloads, and snapshot restore paths.
- Add unit coverage for malformed input and Playwright coverage when a field crosses clients.
- When live-session behavior or trust boundaries change, update this document, [AGENTS.md](../AGENTS.md), and the relevant coverage in the same change.

## Code Map

- shared protocol types: [src/shared/liveSession/types.ts](../src/shared/liveSession/types.ts)
- client hook/config: [src/utils/liveSession](../src/utils/liveSession)
- relay implementation: [src/server/relay/index.ts](../src/server/relay/index.ts)
- relay session store: [src/server/liveSession/sessionStore.ts](../src/server/liveSession/sessionStore.ts)

## Design Notes

- Test-lane guidance lives in [docs/development.md](./development.md).
- The transport/framework rationale lives in [docs/live-session-transport-adr.md](./live-session-transport-adr.md).
