import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_SYNC_PARAMS,
  DEFAULT_TIMER_STATE,
} from "../../shared/security/input.ts"
import { InMemorySessionStore } from "./sessionStore.ts"

const buildSnapshot = ({
  params = {},
  state = {},
}: {
  params?: Record<string, unknown>
  state?: Record<string, unknown>
} = {}) => ({
  params: {
    ...DEFAULT_SYNC_PARAMS,
    rows: [
      {
        ...DEFAULT_SYNC_PARAMS.rows[0],
        ...(params.title ? { title: params.title as string } : {}),
      },
    ],
    ...params,
  },
  state: {
    ...DEFAULT_TIMER_STATE,
    ...state,
  },
})

test("create returns one session with separate readonly and control tokens", () => {
  const store = new InMemorySessionStore()
  const created = store.create({
    clientId: "host",
    snapshot: buildSnapshot({
      params: {
        bg: "#111111",
        pc: "#ff0000",
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            primaryColor: "#ff0000",
            title: "Host",
          },
        ],
        title: "Host",
      },
      state: {
        revision: 1,
      },
    }),
  })

  assert.equal(created.role, "control")
  assert.notEqual(
    created.session.accessTokens.control,
    created.session.accessTokens.readonly,
  )
  assert.equal(created.session.participants.length, 1)
  assert.equal(created.session.participants[0]?.canControl, true)
})

test("join resolves permissions from the access token instead of client input", () => {
  const store = new InMemorySessionStore()
  const created = store.create({
    clientId: "host",
  })

  const readonlyJoin = store.join({
    clientId: "viewer",
    token: created.session.accessTokens.readonly,
  })
  const controlJoin = store.join({
    clientId: "controller",
    token: created.session.accessTokens.control,
  })

  assert.equal(readonlyJoin?.role, "readonly")
  assert.equal(controlJoin?.role, "control")
  assert.deepEqual(
    controlJoin?.session.participants.find(
      (participant) => participant.clientId === "viewer",
    ),
    {
      canControl: false,
      clientId: "viewer",
    },
  )
  assert.deepEqual(
    controlJoin?.session.participants.find(
      (participant) => participant.clientId === "controller",
    ),
    {
      canControl: true,
      clientId: "controller",
    },
  )
})

test("restore only allows controller tokens to recreate expired sessions", () => {
  const store = new InMemorySessionStore()
  const created = store.create({
    clientId: "host",
  })
  const sessionId = created.session.id

  store.leave(sessionId, "host")

  assert.equal(
    store.restore({
      clientId: "viewer",
      snapshot: buildSnapshot({
        params: {
          m: "02",
          pc: "#00ff00",
          rows: [
            {
              ...DEFAULT_SYNC_PARAMS.rows[0],
              primaryColor: "#00ff00",
              title: "Recovered",
              totalSeconds: 135,
            },
          ],
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
      }),
      token: created.session.accessTokens.readonly,
    }),
    null,
  )

  const restored = store.restore({
    clientId: "host",
    snapshot: buildSnapshot({
      params: {
        m: "02",
        pc: "#00ff00",
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            primaryColor: "#00ff00",
            title: "Recovered",
            totalSeconds: 135,
          },
        ],
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
    }),
    token: created.session.accessTokens.control,
  })

  assert.ok(restored)
  assert.equal(restored.role, "control")
  assert.equal(restored.session.id, sessionId)
})

test("updateSnapshot only allows control participants to publish state", () => {
  const store = new InMemorySessionStore()
  const created = store.create({
    clientId: "host",
  })

  store.join({
    clientId: "viewer",
    token: created.session.accessTokens.readonly,
  })

  assert.equal(
    store.updateSnapshot({
      clientId: "viewer",
      params: { title: "Blocked" },
      sessionId: created.session.id,
    }),
    null,
  )

  const updated = store.updateSnapshot({
    clientId: "host",
    params: { title: "Allowed" },
    sessionId: created.session.id,
    state: {
      currentRepeat: 1,
      elapsedTime: 12,
      isPaused: false,
      isStarted: true,
      lastUpdatedAt: 0,
      revision: 4,
      totalDuration: 60,
    },
  })

  assert.ok(updated)
  assert.equal(updated.snapshot.params.title, "Allowed")
  assert.equal(updated.snapshot.state.elapsedTime, 12)
})

test("create and updateSnapshot normalize hostile values safely", () => {
  const store = new InMemorySessionStore()
  const created = store.create({
    clientId: "host",
    snapshot: buildSnapshot({
      params: {
        bg: "bad" as never,
        m: "05",
        pc: "#00ff00",
        rows: [
          {
            ...DEFAULT_SYNC_PARAMS.rows[0],
            primaryColor: "#00ff00",
            title: "  <script>alert(1)</script>  ",
            totalSeconds: 307,
          },
        ],
        s: "07",
        title: "  <script>alert(1)</script>  ",
      },
      state: {
        elapsedTime: Number.POSITIVE_INFINITY,
        revision: -1,
        totalDuration: -1,
      },
    }),
  })

  assert.equal(created.session.snapshot.params.bg, "#000000")
  assert.equal(
    created.session.snapshot.params.title,
    "  <script>alert(1)</script>  ",
  )
  assert.equal(created.session.snapshot.state.elapsedTime, 0)
  assert.equal(created.session.snapshot.state.totalDuration, 60)

  const updated = store.updateSnapshot({
    clientId: "host",
    params: {
      title: "\u0000Hello  world ",
    },
    sessionId: created.session.id,
    state: {
      currentRepeat: 1,
      elapsedTime: 20,
      isPaused: false,
      isStarted: true,
      lastUpdatedAt: 0,
      revision: 2,
      totalDuration: 67,
    },
  })

  assert.ok(updated)
  assert.equal(updated.snapshot.params.title, "Hello  world ")
  assert.equal(updated.snapshot.state.totalDuration, 67)
})

test("leave removes participants and sweepExpired drops idle sessions without deleting token recovery", () => {
  const store = new InMemorySessionStore(100)
  const created = store.create({
    clientId: "host",
  })

  store.join({
    clientId: "viewer",
    token: created.session.accessTokens.readonly,
  })

  const remaining = store.leave(created.session.id, "viewer")
  assert.ok(remaining)
  assert.equal(remaining.participants.length, 1)

  store.sweepExpired(remaining.lastSeenAt + 100)
  assert.equal(store.touch(created.session.id), null)
  assert.ok(
    store.restore({
      clientId: "host",
      snapshot: created.session.snapshot,
      token: created.session.accessTokens.control,
    }),
  )
})
