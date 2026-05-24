import assert from "node:assert/strict"
import test from "node:test"

import { defaultAppLocale } from "./config.ts"
import { getMessagesForLocale, messagesByLocale } from "./messages.ts"
import { createAppTranslator } from "./translator.ts"

test("loads the english app messages bundle", () => {
  const messages = getMessagesForLocale(defaultAppLocale)

  assert.ok(messages.AppShell)
  assert.ok(messages.CloseButton)
  assert.ok(messages.Sidebar)
  assert.ok(messages.TimerPage)
  assert.ok(messages.Sidebar.settings)
  assert.ok(messages.Sidebar.share)
  assert.ok(messages.Sidebar.status)
  assert.ok(messages.Sidebar.timer)
  assert.ok(messages.Sidebar.participantSummary)
})

test("all configured locales have message bundles", () => {
  assert.deepEqual(Object.keys(messagesByLocale), [defaultAppLocale])
})

test("can load a narrowed message subset for the timer route", () => {
  const messages = getMessagesForLocale(defaultAppLocale, [
    "AppShell",
    "Sidebar",
    "Timer",
  ])

  assert.deepEqual(Object.keys(messages), ["AppShell", "Sidebar", "Timer"])
})

test("critical translation keys resolve from the english bundle", () => {
  const t = createAppTranslator()

  assert.equal(t("AppShell.metadata.title"), "mkrz timer")
  assert.equal(t("Sidebar.entries.timer"), "Timer")
  assert.equal(t("Timer.reset"), "RESET")
  assert.equal(
    t("TimerPage.dialogs.connectFailedDetail"),
    "Could not connect to the remote relay. Check the relay URL and try again.",
  )
})
