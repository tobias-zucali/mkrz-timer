import assert from "node:assert/strict"
import test from "node:test"

import { DEFAULT_SYNC_PARAMS } from "../security/input.ts"
import {
  buildTimerUrlSearchParams,
  buildUrlTimerRow,
  buildUrlTimerRowFromSyncParams,
  MAX_TIMER_URL_LENGTH,
  MAX_TIMER_URL_ROWS,
  parseTimerUrlState,
  projectTimerUrlStateToSyncParams,
  serializeUrlTimerRow,
  syncParamsMatchParsedTimerUrlState,
  TIMER_URL_VERSION,
} from "./index.ts"

test("parseTimerUrlState reads valid multi-row timer params", () => {
  const parsed = parseTimerUrlState({
    searchParams: new URLSearchParams(
      "v=1&t=300!!Opening!2!1|900!dc2626!Q%26A%20Session!1!0&a=1&theme=bright",
    ),
  })

  assert.deepEqual(parsed, {
    activeIndex: 1,
    theme: "bright",
    hasTimerState: true,
    rows: [
      {
        endBehavior: "advance",
        primaryColor: "",
        repeatCount: 2,
        title: "Opening",
        totalSeconds: 300,
      },
      {
        endBehavior: "stop",
        primaryColor: "#dc2626",
        repeatCount: 1,
        title: "Q&A Session",
        totalSeconds: 900,
      },
    ],
    snd: DEFAULT_SYNC_PARAMS.snd,
    tts: DEFAULT_SYNC_PARAMS.tts,
    version: "1",
  })
})

test("parseTimerUrlState accepts legacy 4-part rows", () => {
  const parsed = parseTimerUrlState({
    searchParams: new URLSearchParams("v=1&t=300!2563eb!Opening!1"),
  })

  assert.equal(parsed.activeIndex, 0)
  assert.deepEqual(parsed.rows, [
    {
      endBehavior: "stop",
      primaryColor: "#2563eb",
      repeatCount: 1,
      title: "Opening",
      totalSeconds: 300,
    },
  ])
})

test("parseTimerUrlState reads compact settings params", () => {
  const parsed = parseTimerUrlState({
    searchParams: new URLSearchParams("ts=1&s=b&theme=bright"),
  })

  assert.deepEqual(parsed, {
    activeIndex: 0,
    theme: "bright",
    hasTimerState: false,
    rows: [],
    snd: "b",
    tts: true,
    version: null,
  })
})

test("parseTimerUrlState ignores malformed rows and rows beyond the max", () => {
  const overflowRows = Array.from(
    { length: MAX_TIMER_URL_ROWS + 2 },
    (_, index) => `${index + 1}!2563eb!Row${index}!1!0`,
  ).join("|")
  const parsed = parseTimerUrlState({
    searchParams: new URLSearchParams(
      `v=1&t=300!badcolor!Oops!1!0|${overflowRows}|oops`,
    ),
  })

  assert.equal(parsed.rows.length, MAX_TIMER_URL_ROWS - 1)
  assert.equal(parsed.rows[0]?.title, "Row0")
  assert.equal(parsed.rows.at(-1)?.title, `Row${MAX_TIMER_URL_ROWS - 2}`)
})

test("parseTimerUrlState fails closed when timer state is disabled", () => {
  assert.deepEqual(
    parseTimerUrlState({
      allowTimerState: false,
      searchParams: new URLSearchParams("v=1&t=300!!Opening!1!0&theme=bright"),
    }),
    {
      activeIndex: 0,
      theme: "bright",
      hasTimerState: false,
      rows: [],
      snd: DEFAULT_SYNC_PARAMS.snd,
      tts: DEFAULT_SYNC_PARAMS.tts,
      version: null,
    },
  )
})

test("projectTimerUrlStateToSyncParams applies rows and active index", () => {
  const projected = projectTimerUrlStateToSyncParams({
    state: {
      activeIndex: 1,
      theme: "bright",
      hasTimerState: true,
      rows: [
        buildUrlTimerRow({
          endBehavior: "advance",
          primaryColor: "",
          repeatCount: 2,
          title: "Opening",
          totalSeconds: 90,
        }),
        buildUrlTimerRow({
          endBehavior: "stop",
          primaryColor: "#dc2626",
          repeatCount: 3,
          title: "Selected",
          totalSeconds: 45,
        }),
      ],
      snd: DEFAULT_SYNC_PARAMS.snd,
      tts: DEFAULT_SYNC_PARAMS.tts,
      version: TIMER_URL_VERSION,
    },
  })

  assert.deepEqual(projected, {
    activeIndex: 1,
    theme: "bright",
    m: "00",
    pc: "#dc2626",
    rows: [
      {
        endBehavior: "advance",
        primaryColor: "",
        repeatCount: 2,
        title: "Opening",
        totalSeconds: 90,
      },
      {
        endBehavior: "stop",
        primaryColor: "#dc2626",
        repeatCount: 3,
        title: "Selected",
        totalSeconds: 45,
      },
    ],
    s: "45",
    snd: DEFAULT_SYNC_PARAMS.snd,
    tts: DEFAULT_SYNC_PARAMS.tts,
    title: "Selected",
  })
})

test("serializeUrlTimerRow and buildTimerUrlSearchParams use the multi-row v=1&t format", () => {
  const row = buildUrlTimerRow({
    endBehavior: "advance",
    primaryColor: "",
    repeatCount: 2,
    title: "Line 1 Line 2",
    totalSeconds: 75,
  })

  assert.equal(serializeUrlTimerRow(row), "75!!Line%201%20Line%202!2!1")

  const query = buildTimerUrlSearchParams({
    activeIndex: 0,
    theme: "bright",
    extraParams: {
      settings: "1",
    },
    rows: [row],
  }).toString()

  assert.equal(
    query,
    "v=1&t=75%21%21Line%25201%2520Line%25202%212%211&a=0&theme=bright&settings=1",
  )
})

test("buildTimerUrlSearchParams omits default settings and serializes selected ones compactly", () => {
  const defaultsQuery = buildTimerUrlSearchParams({
    activeIndex: 0,
    theme: DEFAULT_SYNC_PARAMS.theme,
    rows: [
      buildUrlTimerRow({
        title: "",
        totalSeconds: 300,
      }),
    ],
    snd: DEFAULT_SYNC_PARAMS.snd,
    tts: DEFAULT_SYNC_PARAMS.tts,
  }).toString()

  assert.equal(defaultsQuery, "v=1&t=300%21%21%211%210&a=0")

  const selectedQuery = buildTimerUrlSearchParams({
    activeIndex: 0,
    rows: [
      buildUrlTimerRow({
        title: "",
        totalSeconds: 300,
      }),
    ],
    snd: "b",
    tts: true,
  }).toString()

  assert.equal(selectedQuery, "v=1&t=300%21%21%211%210&a=0&s=b&ts=1")
})

test("buildTimerUrlSearchParams keeps generated URLs below the maximum length", () => {
  const longRows = Array.from({ length: MAX_TIMER_URL_ROWS }, (_, index) =>
    buildUrlTimerRow({
      endBehavior: "advance",
      primaryColor: "",
      repeatCount: 99,
      title: `${index}`.repeat(64),
      totalSeconds: 999,
    }),
  )

  const query = buildTimerUrlSearchParams({
    activeIndex: 0,
    theme: "dark",
    rows: longRows,
  }).toString()

  assert.ok(query.length < MAX_TIMER_URL_LENGTH)
})

test("buildUrlTimerRowFromSyncParams and syncParamsMatchParsedTimerUrlState bridge runtime params", () => {
  const row = buildUrlTimerRowFromSyncParams({
    ...DEFAULT_SYNC_PARAMS,
    rows: [
      {
        endBehavior: "advance",
        primaryColor: "#00aa88",
        repeatCount: 2,
        title: "Workshop",
        totalSeconds: 135,
      },
    ],
    m: "02",
    pc: "#00aa88",
    s: "15",
    title: "Workshop",
  })

  assert.deepEqual(row, {
    endBehavior: "advance",
    primaryColor: "#00aa88",
    repeatCount: 2,
    title: "Workshop",
    totalSeconds: 135,
  })

  assert.equal(
    syncParamsMatchParsedTimerUrlState({
      params: {
        activeIndex: 0,
        theme: "bright",
        rows: [row],
        snd: DEFAULT_SYNC_PARAMS.snd,
        tts: DEFAULT_SYNC_PARAMS.tts,
      },
      state: {
        activeIndex: 0,
        theme: "bright",
        hasTimerState: true,
        rows: [row],
        snd: DEFAULT_SYNC_PARAMS.snd,
        tts: DEFAULT_SYNC_PARAMS.tts,
        version: TIMER_URL_VERSION,
      },
    }),
    true,
  )
})
