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

test("buildPathWithParams serializes inherited params without color hashes", () => {
  assert.equal(
    buildPathWithParams({
      bg: "#000000",
      fg: "#ffffff",
      m: "01",
      pc: "#d61f69",
      s: "00",
    }),
    "/?bg=000000&fg=ffffff&m=01&pc=d61f69&s=00",
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
        },
      },
    ),
    "/?m=02",
  )
})

test("buildPathWithParams drops invalid remote-session params", () => {
  assert.equal(
    buildPathWithParams(
      {
        title: "Shared timer",
      },
      {
        inherit: false,
        params: {
          title: "",
        },
      },
    ),
    "/?",
  )
})

test("buildPathWithParams can use a custom pathname", () => {
  assert.equal(
    buildPathWithParams(
      {
        m: "01",
      },
      {
        pathname: "/timer",
      },
    ),
    "/timer?m=01",
  )
})

test("getRemoteSessionOnlyOmitKeys no longer strips params for tokenized routes", () => {
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

test("getRemoteSessionOnlyOmitKeys strips timer params on remote routes", () => {
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
    ["bg", "fg", "m", "pc", "pid", "s", "title"],
  )
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
    ["bg", "fg", "m", "pc", "pid", "s", "title"],
  )
})

test("getRemoteSessionOnlyOmitKeys ignores non-remote route prefixes", () => {
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
      "/docs/control-model",
    ),
    [],
  )
})
