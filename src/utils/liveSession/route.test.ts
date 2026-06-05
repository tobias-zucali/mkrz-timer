import assert from "node:assert/strict"
import test from "node:test"

import {
  buildRemotePath,
  getRemotePathPrefix,
  parseRemoteRoute,
} from "./route.ts"

test("buildRemotePath uses role-specific prefixes", () => {
  assert.equal(
    buildRemotePath({ role: "readonly", token: "viewer-1" }),
    "/view/viewer-1",
  )
  assert.equal(
    buildRemotePath({ role: "control", token: "controller-1" }),
    "/control/controller-1",
  )
  assert.equal(
    buildRemotePath({ locale: "de", role: "control", token: "controller-1" }),
    "/de/control/controller-1",
  )
})

test("getRemotePathPrefix returns stable remote route prefixes", () => {
  assert.equal(getRemotePathPrefix("readonly"), "/view")
  assert.equal(getRemotePathPrefix("control"), "/control")
})

test("parseRemoteRoute detects local paths", () => {
  assert.deepEqual(parseRemoteRoute("/"), {
    isRemote: false,
    role: null,
    token: null,
  })
})

test("parseRemoteRoute parses valid viewer and controller paths", () => {
  assert.deepEqual(parseRemoteRoute("/view/viewer_1"), {
    isRemote: true,
    role: "readonly",
    token: "viewer_1",
  })
  assert.deepEqual(parseRemoteRoute("/control/controller-1"), {
    isRemote: true,
    role: "control",
    token: "controller-1",
  })
  assert.deepEqual(parseRemoteRoute("/de/view/viewer_1"), {
    isRemote: true,
    role: "readonly",
    token: "viewer_1",
  })
})

test("parseRemoteRoute marks missing or malformed tokens as invalid", () => {
  assert.deepEqual(parseRemoteRoute("/view"), {
    isRemote: true,
    role: "readonly",
    token: null,
  })
  assert.deepEqual(parseRemoteRoute("/control/nope/extra"), {
    isRemote: true,
    role: "control",
    token: null,
  })
  assert.deepEqual(parseRemoteRoute("/view/%3Cscript%3E"), {
    isRemote: true,
    role: "readonly",
    token: null,
  })
})
