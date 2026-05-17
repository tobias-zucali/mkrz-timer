import assert from "node:assert/strict"
import test from "node:test"

import {
  buildTimerUrlSearchParams,
  buildUrlTimerRow,
  buildUrlTimerRowFromSyncParams,
  MAX_TIMER_URL_LENGTH,
  MAX_TIMER_URL_ROWS,
  parseTimerUrlState,
  projectFirstUrlTimerRowToSyncParams,
  serializeUrlTimerRow,
  syncParamsMatchParsedTimerUrlState,
  TIMER_URL_VERSION,
} from "./index.ts"

test("parseTimerUrlState reads valid multi-row timer params", () => {
  const parsed = parseTimerUrlState({
    searchParams: new URLSearchParams(
      "v=1&t=300!2563eb!Opening!1|900!dc2626!Q%26A%20Session!0&bg=111111&fg=eeeeee",
    ),
  })

  assert.deepEqual(parsed, {
    bg: "#111111",
    fg: "#eeeeee",
    hasTimerState: true,
    rows: [
      {
        flag: "1",
        primaryColor: "#2563eb",
        title: "Opening",
        totalSeconds: 300,
      },
      {
        flag: "0",
        primaryColor: "#dc2626",
        title: "Q&A Session",
        totalSeconds: 900,
      },
    ],
    version: "1",
  })
})

test("parseTimerUrlState ignores malformed rows and rows beyond the max", () => {
  const overflowRows = Array.from(
    { length: MAX_TIMER_URL_ROWS + 2 },
    (_, index) => `${index + 1}!2563eb!Row${index}!0`,
  ).join("|")
  const parsed = parseTimerUrlState({
    searchParams: new URLSearchParams(
      `v=1&t=300!badcolor!Oops!0|${overflowRows}|oops`,
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
      searchParams: new URLSearchParams("v=1&t=300!2563eb!Opening!0&bg=111111"),
    }),
    {
      bg: "#000000",
      fg: "#ffffff",
      hasTimerState: false,
      rows: [],
      version: null,
    },
  )
})

test("projectFirstUrlTimerRowToSyncParams applies only the first parsed row", () => {
  const projected = projectFirstUrlTimerRowToSyncParams({
    state: {
      bg: "#123456",
      fg: "#abcdef",
      hasTimerState: true,
      rows: [
        buildUrlTimerRow({
          flag: "0",
          primaryColor: "#2563eb",
          title: "Opening",
          totalSeconds: 90,
        }),
        buildUrlTimerRow({
          flag: "1",
          primaryColor: "#dc2626",
          title: "Ignored",
          totalSeconds: 45,
        }),
      ],
      version: TIMER_URL_VERSION,
    },
  })

  assert.deepEqual(projected, {
    bg: "#123456",
    fg: "#abcdef",
    m: "01",
    pc: "#2563eb",
    s: "30",
    title: "Opening",
  })
})

test("serializeUrlTimerRow and buildTimerUrlSearchParams use the v=1&t row format", () => {
  const row = buildUrlTimerRow({
    flag: "0",
    primaryColor: "#2563eb",
    title: "Line 1\nLine 2",
    totalSeconds: 75,
  })

  assert.equal(serializeUrlTimerRow(row), "75!2563eb!Line%201%0ALine%202!0")

  const query = buildTimerUrlSearchParams({
    bg: "#123456",
    extraParams: {
      settings: "1",
    },
    fg: "#abcdef",
    rows: [row],
  }).toString()

  assert.equal(
    query,
    "v=1&t=75%212563eb%21Line%25201%250ALine%25202%210&bg=123456&fg=abcdef&settings=1",
  )
})

test("buildTimerUrlSearchParams keeps generated URLs below the maximum length", () => {
  const longRows = Array.from({ length: MAX_TIMER_URL_ROWS }, (_, index) =>
    buildUrlTimerRow({
      flag: "0",
      primaryColor: "#2563eb",
      title: `${index}`.repeat(64),
      totalSeconds: 999,
    }),
  )

  const query = buildTimerUrlSearchParams({
    bg: "#000000",
    fg: "#ffffff",
    rows: longRows,
  }).toString()

  assert.ok(query.length < MAX_TIMER_URL_LENGTH)
})

test("buildUrlTimerRowFromSyncParams and syncParamsMatchParsedTimerUrlState bridge runtime params", () => {
  const row = buildUrlTimerRowFromSyncParams({
    m: "02",
    pc: "#00aa88",
    s: "15",
    title: "Workshop",
  })

  assert.deepEqual(row, {
    flag: "0",
    primaryColor: "#00aa88",
    title: "Workshop",
    totalSeconds: 135,
  })

  assert.equal(
    syncParamsMatchParsedTimerUrlState({
      params: {
        bg: "#123456",
        fg: "#eeeeee",
        m: "02",
        pc: "#00aa88",
        s: "15",
        title: "Workshop",
      },
      state: {
        bg: "#123456",
        fg: "#eeeeee",
        hasTimerState: true,
        rows: [row],
        version: TIMER_URL_VERSION,
      },
    }),
    true,
  )
})
