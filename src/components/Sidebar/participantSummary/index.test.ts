import { test } from "node:test"
import assert from "node:assert/strict"

import {
  createAppTranslator,
  type AppTranslationFn,
} from "../../../i18n/translator.ts"

import { getParticipantSummary } from "./index"

const appTranslator = createAppTranslator()
const t: AppTranslationFn = (key, values) =>
  (appTranslator as AppTranslationFn)(
    `Sidebar.participantSummary.${key}`,
    values,
  )

test("shows only You when no remote participants are connected", () => {
  assert.equal(
    getParticipantSummary({
      localClientId: "self",
      participants: [{ canControl: true, clientId: "self" }],
      t,
    }),
    "You",
  )
})

test("excludes the current client from viewer counts", () => {
  assert.equal(
    getParticipantSummary({
      localClientId: "self",
      participants: [
        { canControl: false, clientId: "self" },
        { canControl: false, clientId: "viewer-1" },
        { canControl: false, clientId: "viewer-2" },
      ],
      t,
    }),
    "You + 2 view",
  )
})

test("groups remote participants by effective role", () => {
  assert.equal(
    getParticipantSummary({
      localClientId: "self",
      participants: [
        { canControl: false, clientId: "self" },
        { canControl: true, clientId: "control-1" },
        { canControl: false, clientId: "viewer-1" },
        { canControl: false, clientId: "viewer-2" },
        { canControl: false, clientId: "viewer-3" },
        { canControl: false, clientId: "viewer-4" },
        { canControl: false, clientId: "viewer-5" },
      ],
      t,
    }),
    "You + 1 control + 5 view",
  )
})

test("omits empty control groups for control-capable clients", () => {
  assert.equal(
    getParticipantSummary({
      localClientId: "self",
      participants: [
        { canControl: true, clientId: "self" },
        { canControl: false, clientId: "viewer-1" },
      ],
      t,
    }),
    "You + 1 view",
  )
})
