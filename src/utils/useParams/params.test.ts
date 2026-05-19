import assert from "node:assert/strict"
import { test } from "node:test"

import {
  buildPathWithParams,
  getRemoteSessionOnlyOmitKeys,
  serializeParamValue,
  withColorHash,
} from "./params.ts"

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
    buildPathWithParams({
      bg: "#000000",
      fg: "#ffffff",
      m: "01",
      pc: "#d61f69",
      s: "00",
      title: "Shared timer",
    }),
    "/?v=1&t=60%21d61f69%21Shared%2520timer%210",
  )
})

test("buildPathWithParams preserves non-timer params alongside the new timer format", () => {
  assert.equal(
    buildPathWithParams(
      {
        bg: "#123456",
        fg: "#abcdef",
        m: "02",
        pc: "#00aa88",
        s: "15",
        settings: "1",
        title: "Workshop",
      },
      {
        pathname: "/control/token-1",
      },
    ),
    "/control/token-1?v=1&t=135%2100aa88%21Workshop%210&bg=123456&fg=abcdef&settings=1",
  )
})

test("buildPathWithParams can skip inheritance for client URLs", () => {
  assert.equal(
    buildPathWithParams(
      {
        m: "01",
      },
      {
        inherit: false,
        params: {
          m: "02",
          pc: "#d61f69",
          s: "00",
          title: "",
        },
      },
    ),
    "/?v=1&t=120%21d61f69%21%210",
  )
})

test("buildPathWithParams can omit timer-state params on readonly remote routes", () => {
  assert.equal(
    buildPathWithParams(
      {
        bg: "#000000",
        fg: "#ffffff",
        m: "01",
        pc: "#d61f69",
        s: "00",
        title: "Shared timer",
      },
      {
        omit: ["bg", "fg", "t", "v"],
      },
    ),
    "/",
  )
})

test("getRemoteSessionOnlyOmitKeys does not strip timer params on local routes", () => {
  assert.deepEqual(
    getRemoteSessionOnlyOmitKeys(
      {
        bg: "#000000",
        fg: "#ffffff",
        m: "01",
        pc: "#d61f69",
        s: "00",
        title: "Shared timer",
      },
      [],
      "/",
    ),
    [],
  )
})

test("getRemoteSessionOnlyOmitKeys strips timer params on control routes", () => {
  assert.deepEqual(
    getRemoteSessionOnlyOmitKeys(
      {
        bg: "#000000",
        fg: "#ffffff",
        m: "01",
        pc: "#d61f69",
        s: "00",
        title: "Shared timer",
      },
      [],
      "/control/control-token",
    ),
    ["bg", "pid", "fg", "t", "v"],
  )
})

test("getRemoteSessionOnlyOmitKeys strips timer params on readonly routes", () => {
  assert.deepEqual(
    getRemoteSessionOnlyOmitKeys(
      {
        bg: "#000000",
        fg: "#ffffff",
        m: "01",
        pc: "#d61f69",
        s: "00",
        title: "Shared timer",
      },
      [],
      "/view/viewer-token",
    ),
    ["bg", "pid", "fg", "t", "v"],
  )
})
