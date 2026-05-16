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
        rid: "old-main",
      },
      {
        inherit: false,
        params: {
          rid: "new-main",
        },
      },
    ),
    "/?rid=new-main",
  )
})

test("buildPathWithParams serializes control client URLs", () => {
  assert.equal(
    buildPathWithParams(
      {
        rid: "old-main",
      },
      {
        inherit: false,
        params: {
          rid: "new-main",
          control: "42",
        },
      },
    ),
    "/?rid=new-main&control=42",
  )
})

test("buildPathWithParams drops invalid remote-session params", () => {
  assert.equal(
    buildPathWithParams(
      {
        rid: "valid-session",
      },
      {
        inherit: false,
        params: {
          control: "nope",
          rid: "<script>",
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

test("getRemoteSessionOnlyOmitKeys keeps readonly client URLs free of timer params", () => {
  assert.deepEqual(
    getRemoteSessionOnlyOmitKeys(
      {
        bg: "#000000",
        control: null,
        fg: "#ffffff",
        m: "01",
        pc: "#d61f69",
        rid: "remote-main",
        s: "00",
        title: "Shared timer",
      },
      ["rid"],
    ),
    ["bg", "fg", "m", "pc", "pid", "s", "title"],
  )
})

test("getRemoteSessionOnlyOmitKeys keeps control session URLs free of timer params", () => {
  assert.deepEqual(
    getRemoteSessionOnlyOmitKeys(
      {
        bg: "#000000",
        control: "42",
        fg: "#ffffff",
        m: "01",
        pc: "#d61f69",
        rid: "remote-main",
        s: "00",
        title: "Shared timer",
      },
      ["rid", "control"],
    ),
    ["bg", "fg", "m", "pc", "pid", "s", "title"],
  )
})
