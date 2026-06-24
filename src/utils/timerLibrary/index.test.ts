import assert from "node:assert/strict"
import test from "node:test"

import { DEFAULT_SYNC_PARAMS } from "../../shared/security/input.ts"

import {
  buildEmptyStoredTimerLibrary,
  buildStoredTimerFingerprint,
  createCurrentStoredTimerEntry,
  deleteStoredTimerEntry,
  initializeStoredTimerLibrary,
  readStoredTimerLibrary,
  selectStoredTimerEntry,
  upsertCurrentStoredTimerEntry,
  writeStoredTimerLibrary,
} from "./index.ts"

function createMemoryStorage(initialValue?: string) {
  const store = new Map<string, string>()
  if (initialValue) {
    store.set("timer.localLibrary", initialValue)
  }

  return {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
  }
}

const openingSnapshot = {
  pageTitle: "Workshop timer",
  params: {
    ...DEFAULT_SYNC_PARAMS,
    title: "Opening",
  },
}

test("initialize reuses an existing matching entry", () => {
  const initialLibrary = createCurrentStoredTimerEntry({
    library: buildEmptyStoredTimerLibrary(),
    snapshot: openingSnapshot,
    timestamp: 100,
  })

  const nextLibrary = initializeStoredTimerLibrary({
    library: initialLibrary,
    snapshot: openingSnapshot,
    timestamp: 200,
  })

  assert.equal(nextLibrary.entries.length, 1)
  assert.equal(nextLibrary.currentEntryId, initialLibrary.currentEntryId)
  assert.equal(nextLibrary.entries[0]?.updatedAt, 200)
})

test("current entry edits overwrite the current stored entry", () => {
  const initialLibrary = createCurrentStoredTimerEntry({
    library: buildEmptyStoredTimerLibrary(),
    snapshot: openingSnapshot,
    timestamp: 100,
  })

  const updatedLibrary = upsertCurrentStoredTimerEntry({
    library: initialLibrary,
    snapshot: {
      ...openingSnapshot,
      params: {
        ...openingSnapshot.params,
        title: "Q&A",
      },
    },
    timestamp: 250,
  })

  assert.equal(updatedLibrary.entries.length, 1)
  assert.equal(updatedLibrary.currentEntryId, initialLibrary.currentEntryId)
  assert.equal(updatedLibrary.entries[0]?.params.title, "Q&A")
  assert.equal(updatedLibrary.entries[0]?.updatedAt, 250)
})

test("dedupe keeps the current entry when its content matches another entry", () => {
  const firstLibrary = createCurrentStoredTimerEntry({
    library: buildEmptyStoredTimerLibrary(),
    snapshot: openingSnapshot,
    timestamp: 100,
  })
  const secondLibrary = createCurrentStoredTimerEntry({
    library: firstLibrary,
    snapshot: {
      pageTitle: "Copied timer",
      params: {
        ...DEFAULT_SYNC_PARAMS,
        title: "Copied step",
      },
    },
    timestamp: 200,
  })

  const dedupedLibrary = upsertCurrentStoredTimerEntry({
    library: secondLibrary,
    snapshot: openingSnapshot,
    timestamp: 300,
  })

  assert.equal(dedupedLibrary.entries.length, 1)
  assert.equal(
    buildStoredTimerFingerprint(dedupedLibrary.entries[0]),
    buildStoredTimerFingerprint(openingSnapshot),
  )
  assert.equal(dedupedLibrary.currentEntryId, secondLibrary.currentEntryId)
})

test("selecting an entry promotes it to the current entry", () => {
  const firstLibrary = createCurrentStoredTimerEntry({
    library: buildEmptyStoredTimerLibrary(),
    snapshot: openingSnapshot,
    timestamp: 100,
  })
  const secondLibrary = createCurrentStoredTimerEntry({
    library: firstLibrary,
    snapshot: {
      pageTitle: "Workshop copy",
      params: {
        ...DEFAULT_SYNC_PARAMS,
        title: "Wrap-up",
      },
    },
    timestamp: 200,
  })
  const selectedEntryId = firstLibrary.entries[0]?.id
  assert.ok(selectedEntryId)

  const selectedLibrary = selectStoredTimerEntry({
    entryId: selectedEntryId,
    library: secondLibrary,
    timestamp: 300,
  })

  assert.equal(selectedLibrary.currentEntryId, selectedEntryId)
  assert.equal(selectedLibrary.entries[0]?.id, selectedEntryId)
  assert.equal(selectedLibrary.entries[0]?.updatedAt, 300)
})

test("deleting the current entry falls back to the next-most-recent entry", () => {
  const firstLibrary = createCurrentStoredTimerEntry({
    library: buildEmptyStoredTimerLibrary(),
    snapshot: openingSnapshot,
    timestamp: 100,
  })
  const secondLibrary = createCurrentStoredTimerEntry({
    library: firstLibrary,
    snapshot: {
      pageTitle: "Workshop copy",
      params: {
        ...DEFAULT_SYNC_PARAMS,
        title: "Wrap-up",
      },
    },
    timestamp: 200,
  })
  const currentEntryId = secondLibrary.currentEntryId
  assert.ok(currentEntryId)

  const deletedResult = deleteStoredTimerEntry({
    entryId: currentEntryId,
    library: secondLibrary,
    timestamp: 300,
  })

  assert.equal(deletedResult.library.entries.length, 1)
  assert.equal(
    deletedResult.library.currentEntryId,
    firstLibrary.currentEntryId,
  )
  assert.equal(deletedResult.nextEntry?.id, firstLibrary.currentEntryId)
})

test("readStoredTimerLibrary ignores malformed JSON", () => {
  const storage = createMemoryStorage("{bad json")

  const library = readStoredTimerLibrary(storage)

  assert.deepEqual(library, buildEmptyStoredTimerLibrary())
})

test("writeStoredTimerLibrary stores a versioned payload", () => {
  const storage = createMemoryStorage()
  const library = createCurrentStoredTimerEntry({
    library: buildEmptyStoredTimerLibrary(),
    snapshot: openingSnapshot,
    timestamp: 100,
  })

  writeStoredTimerLibrary(library, storage)
  const storedValue = storage.getItem("timer.localLibrary")

  assert.ok(storedValue)
  const parsedValue = JSON.parse(storedValue)
  assert.equal(parsedValue.version, 1)
  assert.equal(parsedValue.entries.length, 1)
})
