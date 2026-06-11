import assert from "node:assert/strict"
import { test } from "node:test"

import { DEFAULT_SYNC_PARAMS } from "../../shared/security/input.ts"
import { buildDefaultTimerSequenceRow } from "../../shared/timerSequence.ts"

import {
  buildPathWithParams,
  getRemoteSessionOnlyOmitKeys,
  serializeParamValue,
  withColorHash,
} from "./params.ts"

const buildParams = () => ({
  ...DEFAULT_SYNC_PARAMS,
  pageTitle: "Workshop timer",
  rows: [
    {
      ...buildDefaultTimerSequenceRow(),
      title: "Shared timer",
    },
  ],
  title: "Shared timer",
})

test("withColorHash keeps existing hashes and adds missing hashes", () => {
  assert.equal(withColorHash("#d61f69"), "#d61f69")
  assert.equal(withColorHash("d61f69"), "#d61f69")
})

test("serializeParamValue strips hashes only from color params", () => {
  assert.equal(serializeParamValue("bg", "#000000"), "000000")
  assert.equal(serializeParamValue("fg", "#ffffff"), "ffffff")
  assert.equal(serializeParamValue("pc", "#d61f69"), "d61f69")
  assert.equal(serializeParamValue("title", "#retro"), "#retro")
})

test("buildPathWithParams serializes timer state with v=1&t rows", () => {
  assert.equal(
    buildPathWithParams(buildParams()),
    "/?v=1&t=60%21d61f69%21Shared%2520timer%211%210&a=0&title=Workshop+timer",
  )
})

test("buildPathWithParams preserves non-timer params alongside the new timer format", () => {
  assert.equal(
    buildPathWithParams(
      {
        ...buildParams(),
        bg: "#123456",
        fg: "#abcdef",
        rows: [
          {
            ...buildDefaultTimerSequenceRow(),
            endBehavior: "advance",
            primaryColor: "#00aa88",
            title: "Workshop",
            totalSeconds: 135,
          },
        ],
        settings: "1",
      },
      {
        pathname: "/control/token-1",
      },
    ),
    "/control/token-1?v=1&t=135%2100aa88%21Workshop%211%211&a=0&bg=123456&fg=abcdef&title=Workshop+timer&settings=1",
  )
})

test("buildPathWithParams preserves localized route prefixes", () => {
  assert.equal(
    buildPathWithParams(buildParams(), {
      pathname: "/de/control/token-1",
    }),
    "/de/control/token-1?v=1&t=60%21d61f69%21Shared%2520timer%211%210&a=0&title=Workshop+timer",
  )
})

test("buildPathWithParams can skip inheritance for client URLs", () => {
  assert.equal(
    buildPathWithParams(buildParams(), {
      inherit: false,
      params: {
        activeIndex: 0,
        rows: [
          {
            ...buildDefaultTimerSequenceRow(),
            title: "",
            totalSeconds: 120,
          },
        ],
      },
    }),
    "/?v=1&t=120%21d61f69%21%211%210&a=0",
  )
})

test("buildPathWithParams can omit timer-state params on readonly remote routes", () => {
  assert.equal(
    buildPathWithParams(buildParams(), {
      omit: ["a", "t", "title", "v"],
    }),
    "/",
  )
})

test("getRemoteSessionOnlyOmitKeys does not strip timer params on local routes", () => {
  assert.deepEqual(getRemoteSessionOnlyOmitKeys(buildParams(), [], "/"), [])
})

test("getRemoteSessionOnlyOmitKeys keeps timer params on control routes", () => {
  assert.deepEqual(
    getRemoteSessionOnlyOmitKeys(buildParams(), [], "/control/control-token"),
    ["a", "pid"],
  )
  assert.deepEqual(
    getRemoteSessionOnlyOmitKeys(
      buildParams(),
      [],
      "/de/control/control-token",
    ),
    ["a", "pid"],
  )
})

test("getRemoteSessionOnlyOmitKeys keeps timer params on readonly routes", () => {
  assert.deepEqual(
    getRemoteSessionOnlyOmitKeys(buildParams(), [], "/view/viewer-token"),
    ["a", "pid", "title"],
  )
  assert.deepEqual(
    getRemoteSessionOnlyOmitKeys(buildParams(), [], "/de/view/viewer-token"),
    ["a", "pid", "title"],
  )
})
