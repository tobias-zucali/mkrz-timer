# Live Session Transport Architecture Decision Record

## Context

The live-session relay needs explicit control over:

- controller vs viewer permissions
- canonical snapshot ownership
- reconnect and recovery behavior
- deployment on the existing small Node/Docker target

## Decision

Keep the current relay model and `ws` transport, and reduce boilerplate with internal abstractions rather than migrating to a new realtime framework.

## Why

- The protocol is small and app-specific.
- Permission boundaries are clearer when session mutation remains explicit in the in-memory store.
- A framework migration would add runtime and operational change without clear product benefit right now.

## Alternatives Considered

- keep the current implementation unchanged
- migrate to a framework such as Socket.IO or PartyKit
- extract internal protocol and lifecycle helpers around the existing relay

## Consequences

- The repo keeps the current deployment model and permission structure.
- Contributors should continue improving internal relay/client abstractions inside the existing transport model.
