import test from "node:test"
import assert from "node:assert/strict"

import { InMemorySessionStore } from "./sessionStore.ts"

test("createOrJoin reuses a session and updates participant permissions", () => {
  const store = new InMemorySessionStore()
  const created = store.createOrJoin({
    canControl: true,
    clientId: "host",
    snapshot: {
      params: {
        bg: "#111111",
        fg: "#ffffff",
        m: "01",
        pc: "#ff0000",
        s: "00",
        title: "Host",
      },
      state: {
        elapsedTime: 0,
        isPaused: true,
        isStarted: false,
        revision: 1,
        totalDuration: 60,
      },
    },
  })
  assert.ok(created)

  const joined = store.createOrJoin({
    canControl: false,
    clientId: "viewer",
    sessionId: created.id,
  })
  assert.ok(joined)

  const upgraded = store.createOrJoin({
    canControl: true,
    clientId: "viewer",
    sessionId: created.id,
  })
  assert.ok(upgraded)

  assert.equal(joined.id, created.id)
  assert.equal(upgraded.participants.length, 2)
  assert.deepEqual(
    upgraded.participants.find(
      (participant) => participant.clientId === "viewer",
    ),
    {
      canControl: true,
      clientId: "viewer",
    },
  )
})

test("restoreSession requires controller access and a snapshot to recreate an expired session", () => {
  const store = new InMemorySessionStore()

  assert.equal(
    store.restoreSession({
      canControl: false,
      clientId: "viewer",
      sessionId: "missing",
    }),
    null,
  )

  const restored = store.restoreSession({
    canControl: true,
    clientId: "host",
    sessionId: "missing",
    snapshot: {
      params: {
        bg: "#000000",
        fg: "#ffffff",
        m: "02",
        pc: "#00ff00",
        s: "15",
        title: "Recovered",
      },
      state: {
        elapsedTime: 5,
        isPaused: false,
        isStarted: true,
        revision: 3,
        totalDuration: 135,
      },
    },
  })

  assert.ok(restored)
  assert.equal(restored.id, "missing")
  assert.equal(restored.participants[0]?.clientId, "host")
})

test("updateSnapshot only allows control participants to publish state", () => {
  const store = new InMemorySessionStore()
  const session = store.createOrJoin({
    canControl: true,
    clientId: "host",
  })
  assert.ok(session)

  store.createOrJoin({
    canControl: false,
    clientId: "viewer",
    sessionId: session.id,
  })

  assert.equal(
    store.updateSnapshot({
      clientId: "viewer",
      params: { title: "Blocked" },
      sessionId: session.id,
    }),
    null,
  )

  const updated = store.updateSnapshot({
    clientId: "host",
    params: { title: "Allowed" },
    sessionId: session.id,
    state: {
      elapsedTime: 12,
      isPaused: false,
      isStarted: true,
      revision: 4,
      totalDuration: 60,
    },
  })

  assert.ok(updated)
  assert.equal(updated.snapshot.params.title, "Allowed")
  assert.equal(updated.snapshot.state.elapsedTime, 12)
})

test("createOrJoin and updateSnapshot normalize hostile values safely", () => {
  const store = new InMemorySessionStore()
  const session = store.createOrJoin({
    canControl: true,
    clientId: "host",
    snapshot: {
      params: {
        bg: "bad" as never,
        fg: "#ffffff",
        m: "05",
        pc: "#00ff00",
        s: "07",
        title: "  <script>alert(1)</script>  ",
      },
      state: {
        elapsedTime: Number.POSITIVE_INFINITY,
        isPaused: true,
        isStarted: false,
        revision: -1,
        totalDuration: -1,
      },
    },
  })

  assert.ok(session)
  assert.equal(session.snapshot.params.bg, "#000000")
  assert.equal(session.snapshot.params.title, "  <script>alert(1)</script>  ")
  assert.equal(session.snapshot.state.elapsedTime, 0)
  assert.equal(session.snapshot.state.totalDuration, 60)

  const updated = store.updateSnapshot({
    clientId: "host",
    params: {
      title: "\u0000Hello  world ",
    },
    sessionId: session.id,
    state: {
      elapsedTime: 20,
      isPaused: false,
      isStarted: true,
      revision: 2,
      totalDuration: 67,
    },
  })

  assert.ok(updated)
  assert.equal(updated.snapshot.params.title, "Hello  world ")
  assert.equal(updated.snapshot.state.totalDuration, 67)
})

test("leave removes participants and sweepExpired drops idle sessions", () => {
  const store = new InMemorySessionStore(100)
  const session = store.createOrJoin({
    canControl: true,
    clientId: "host",
  })
  assert.ok(session)

  store.createOrJoin({
    canControl: false,
    clientId: "viewer",
    sessionId: session.id,
  })

  const remaining = store.leave(session.id, "viewer")
  assert.ok(remaining)
  assert.equal(remaining.participants.length, 1)

  store.sweepExpired(remaining.lastSeenAt + 100)
  assert.equal(store.touch(session.id), null)
})
