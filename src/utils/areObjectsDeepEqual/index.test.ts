import assert from "node:assert/strict"
import test from "node:test"

import { areObjectsDeepEqual } from "./index.ts"

test("returns true for matching nested objects", () => {
  assert.equal(
    areObjectsDeepEqual(
      {
        params: {
          bg: "#000000",
          title: "Timer",
        },
        state: {
          elapsedTime: 10,
          isPaused: false,
        },
      },
      {
        params: {
          bg: "#000000",
          title: "Timer",
        },
        state: {
          elapsedTime: 10,
          isPaused: false,
        },
      },
    ),
    true,
  )
})

test("returns false when nested values differ", () => {
  assert.equal(
    areObjectsDeepEqual(
      {
        params: {
          bg: "#000000",
        },
      },
      {
        params: {
          bg: "#ffffff",
        },
      },
    ),
    false,
  )
})

test("returns false when object keys differ", () => {
  assert.equal(
    areObjectsDeepEqual(
      {
        params: {
          bg: "#000000",
        },
      },
      {
        params: {
          bg: "#000000",
          fg: "#ffffff",
        },
      },
    ),
    false,
  )
})

test("returns true for matching arrays", () => {
  assert.equal(
    areObjectsDeepEqual(
      ["control", { clientCount: 2 }, true],
      ["control", { clientCount: 2 }, true],
    ),
    true,
  )
})
