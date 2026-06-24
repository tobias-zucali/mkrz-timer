import assert from "node:assert/strict"
import test from "node:test"

import { DEFAULT_SYNC_PARAMS } from "../security/input.ts"
import {
  buildTimerUrlSearchParams,
  buildUrlTimerRow,
  buildUrlTimerRowFromSyncParams,
  encodeBase64Url,
  parseTimerUrlState,
  projectTimerUrlStateToSyncParams,
  serializeUrlTimerRow,
  syncParamsMatchParsedTimerUrlState,
  TIMER_URL_VERSION,
} from "./index.ts"

test("parseTimerUrlState reads valid multi-row timer params", () => {
  const parsed = parseTimerUrlState({
    searchParams: buildTimerUrlSearchParams({
      activeIndex: 1,
      theme: "bright",
      rows: [
        buildUrlTimerRow({
          totalSeconds: 300,
          repeatCount: 2,
          endBehavior: "advance",
          title: "Opening",
        }),
        buildUrlTimerRow({
          totalSeconds: 900,
          primaryColor: "#dc2626",
          repeatCount: 1,
          endBehavior: "stop",
          title: "Q&A Session",
        }),
      ],
    }),
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

test("parseTimerUrlState ignores malformed rows", () => {
  const validRows = Array.from({ length: 15 }, (_, i) =>
    buildUrlTimerRow({
      totalSeconds: i + 1,
      primaryColor: "#2563eb",
      title: `Row${i}`,
      endBehavior: "stop",
    }),
  )
  // Prepend a row with a bad color and append a garbage row to verify both are filtered out.
  // encodeBase64Url is used directly because buildTimerUrlSearchParams would strip invalid rows.
  const rawRows = [
    "300!badcolor!Oops!1!0",
    ...validRows.map(serializeUrlTimerRow),
    "oops",
  ].join("|")
  const searchParams = new URLSearchParams()
  searchParams.set("v", "1")
  searchParams.set("t", encodeBase64Url(rawRows))
  const parsed = parseTimerUrlState({ searchParams })

  assert.equal(parsed.rows.length, 15)
  assert.equal(parsed.rows[0]?.title, "Row0")
  assert.equal(parsed.rows.at(-1)?.title, "Row14")
})

test("parseTimerUrlState fails closed when timer state is disabled", () => {
  assert.deepEqual(
    parseTimerUrlState({
      allowTimerState: false,
      searchParams: buildTimerUrlSearchParams({
        theme: "bright",
        rows: [
          buildUrlTimerRow({
            totalSeconds: 300,
            endBehavior: "stop",
            title: "Opening",
          }),
        ],
      }),
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

test("serializeUrlTimerRow encodes title separators so field and row boundaries stay unambiguous", () => {
  for (const [char, encoded] of [
    ["!", "%21"],
    ["|", "%7C"],
  ] as const) {
    const title = `Before${char}After`
    const row = buildUrlTimerRow({
      endBehavior: "stop",
      title,
      totalSeconds: 60,
    })
    const serialized = serializeUrlTimerRow(row)

    assert.ok(
      serialized.includes(encoded),
      `${char} in title must be encoded as ${encoded}`,
    )

    const searchParams = new URLSearchParams()
    searchParams.set("v", "1")
    searchParams.set("t", encodeBase64Url(serialized))
    searchParams.set("a", "0")
    const parsed = parseTimerUrlState({ searchParams })
    assert.equal(
      parsed.rows[0]?.title,
      title,
      `title with ${char} must round-trip correctly`,
    )
  }
})

test("serializeUrlTimerRow encodes ! in titles so the field separator stays unambiguous", () => {
  const row = buildUrlTimerRow({
    endBehavior: "stop",
    primaryColor: "#ef9e3b",
    repeatCount: 1,
    title: "Make something representing it!",
    totalSeconds: 120,
  })

  const serialized = serializeUrlTimerRow(row)
  assert.ok(
    !serialized
      .split("!")
      .slice(2, -2)
      .some((part) => part === ""),
    "title must not introduce an empty field when split on !",
  )
  assert.ok(serialized.includes("%21"), "! in title must be encoded as %21")

  // Round-trip: the serialized form must parse back to the original title
  const searchParams = new URLSearchParams()
  searchParams.set("v", "1")
  searchParams.set("t", encodeBase64Url(serialized))
  searchParams.set("a", "0")
  const parsed = parseTimerUrlState({ searchParams })
  assert.equal(parsed.rows[0]?.title, "Make something representing it!")
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
    "v=1&t=NzUhIUxpbmUlMjAxJTIwTGluZSUyMDIhMiEx&a=0&theme=bright&settings=1",
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

  assert.equal(defaultsQuery, "v=1&t=MzAwISEhMSEw&a=0")

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

  assert.equal(selectedQuery, "v=1&t=MzAwISEhMSEw&a=0&s=b&ts=1")
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
