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
    "/join/viewer-1",
  )
  assert.equal(
    buildRemotePath({ role: "control", token: "controller-1" }),
    "/manage/controller-1",
  )
  assert.equal(
    buildRemotePath({ locale: "de", role: "control", token: "controller-1" }),
    "/de/manage/controller-1",
  )
})

test("getRemotePathPrefix returns stable remote route prefixes", () => {
  assert.equal(getRemotePathPrefix("readonly"), "/join")
  assert.equal(getRemotePathPrefix("control"), "/manage")
})

test("parseRemoteRoute detects local paths", () => {
  assert.deepEqual(parseRemoteRoute("/"), {
    isRemote: false,
    role: null,
    token: null,
  })
})

test("parseRemoteRoute parses valid join and manage paths", () => {
  assert.deepEqual(parseRemoteRoute("/join/viewer_1"), {
    isRemote: true,
    role: "readonly",
    token: "viewer_1",
  })
  assert.deepEqual(parseRemoteRoute("/manage/controller-1"), {
    isRemote: true,
    role: "control",
    token: "controller-1",
  })
  assert.deepEqual(parseRemoteRoute("/de/join/viewer_1"), {
    isRemote: true,
    role: "readonly",
    token: "viewer_1",
  })
})

test("parseRemoteRoute keeps accepting legacy viewer and controller paths", () => {
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
  assert.deepEqual(parseRemoteRoute("/de/control/controller-1"), {
    isRemote: true,
    role: "control",
    token: "controller-1",
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
