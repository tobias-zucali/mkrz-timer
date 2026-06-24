import {
  DEFAULT_SYNC_PARAMS,
  normalizeQueryParams,
  normalizeTitle,
} from "../../shared/security/input.ts"
import type { SyncParams } from "../../shared/liveSession/types.ts"

const TIMER_LIBRARY_STORAGE_KEY = "timer.localLibrary"
const TIMER_LIBRARY_STORAGE_VERSION = 1

type StorageLike = Pick<Storage, "getItem" | "setItem">

export type StoredTimerSnapshot = {
  pageTitle: string
  params: SyncParams
}

export type StoredTimerEntry = StoredTimerSnapshot & {
  createdAt: number
  id: string
  updatedAt: number
}

export type StoredTimerLibrary = {
  currentEntryId: string | null
  entries: StoredTimerEntry[]
  version: number
}

type ParsedTimerLibrary = {
  currentEntryId?: unknown
  entries?: unknown
  version?: unknown
}

function createEntryId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }

  return `timer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeTimestamp(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}

export function normalizeStoredTimerSnapshot(
  snapshot: StoredTimerSnapshot,
): StoredTimerSnapshot {
  return {
    pageTitle: normalizeTitle(snapshot.pageTitle),
    params: normalizeQueryParams(snapshot.params),
  }
}

export function buildStoredTimerFingerprint(snapshot: StoredTimerSnapshot) {
  const normalizedSnapshot = normalizeStoredTimerSnapshot(snapshot)

  return JSON.stringify(normalizedSnapshot)
}

function normalizeStoredTimerEntry(value: unknown): StoredTimerEntry | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }

  const entry = value as Record<string, unknown>
  if (typeof entry.id !== "string" || entry.id.trim() === "") {
    return null
  }

  const normalizedSnapshot = normalizeStoredTimerSnapshot({
    pageTitle: typeof entry.pageTitle === "string" ? entry.pageTitle : "",
    params: entry.params as SyncParams,
  })

  const fallbackTimestamp = Date.now()

  return {
    createdAt: normalizeTimestamp(entry.createdAt, fallbackTimestamp),
    id: entry.id,
    pageTitle: normalizedSnapshot.pageTitle,
    params: normalizedSnapshot.params,
    updatedAt: normalizeTimestamp(entry.updatedAt, fallbackTimestamp),
  }
}

function sortEntries(entries: StoredTimerEntry[]) {
  return [...entries].sort((left, right) => right.updatedAt - left.updatedAt)
}

function dedupeEntriesByFingerprint(
  entries: StoredTimerEntry[],
  preferredEntryId: string | null,
) {
  const entriesByFingerprint = new Map<string, StoredTimerEntry>()

  for (const entry of entries) {
    const fingerprint = buildStoredTimerFingerprint(entry)
    const existingEntry = entriesByFingerprint.get(fingerprint)

    if (!existingEntry) {
      entriesByFingerprint.set(fingerprint, entry)
      continue
    }

    if (entry.id === preferredEntryId) {
      entriesByFingerprint.set(fingerprint, entry)
      continue
    }

    if (existingEntry.id === preferredEntryId) {
      continue
    }

    if (entry.updatedAt >= existingEntry.updatedAt) {
      entriesByFingerprint.set(fingerprint, entry)
    }
  }

  return sortEntries([...entriesByFingerprint.values()])
}

function createStoredTimerEntry(
  snapshot: StoredTimerSnapshot,
  options: {
    createdAt?: number
    id?: string
    updatedAt?: number
  } = {},
): StoredTimerEntry {
  const normalizedSnapshot = normalizeStoredTimerSnapshot(snapshot)
  const now = options.updatedAt ?? Date.now()

  return {
    createdAt: options.createdAt ?? now,
    id: options.id ?? createEntryId(),
    pageTitle: normalizedSnapshot.pageTitle,
    params: normalizedSnapshot.params,
    updatedAt: now,
  }
}

export function buildEmptyStoredTimerLibrary(): StoredTimerLibrary {
  return {
    currentEntryId: null,
    entries: [],
    version: TIMER_LIBRARY_STORAGE_VERSION,
  }
}

export function readStoredTimerLibrary(
  storage: StorageLike | null | undefined,
): StoredTimerLibrary {
  if (!storage) {
    return buildEmptyStoredTimerLibrary()
  }

  try {
    const rawValue = storage.getItem(TIMER_LIBRARY_STORAGE_KEY)
    if (!rawValue) {
      return buildEmptyStoredTimerLibrary()
    }

    const parsedValue = JSON.parse(rawValue) as ParsedTimerLibrary
    const normalizedEntries = Array.isArray(parsedValue.entries)
      ? parsedValue.entries
          .map((entry) => normalizeStoredTimerEntry(entry))
          .filter((entry): entry is StoredTimerEntry => entry !== null)
      : []
    const currentEntryId =
      typeof parsedValue.currentEntryId === "string"
        ? parsedValue.currentEntryId
        : null

    const entries = dedupeEntriesByFingerprint(
      normalizedEntries,
      currentEntryId,
    )

    return {
      currentEntryId:
        currentEntryId && entries.some((entry) => entry.id === currentEntryId)
          ? currentEntryId
          : null,
      entries,
      version:
        parsedValue.version === TIMER_LIBRARY_STORAGE_VERSION
          ? TIMER_LIBRARY_STORAGE_VERSION
          : TIMER_LIBRARY_STORAGE_VERSION,
    }
  } catch {
    return buildEmptyStoredTimerLibrary()
  }
}

export function writeStoredTimerLibrary(
  library: StoredTimerLibrary,
  storage: StorageLike | null | undefined,
) {
  if (!storage) {
    return
  }

  try {
    storage.setItem(TIMER_LIBRARY_STORAGE_KEY, JSON.stringify(library))
  } catch {
    return
  }
}

export function initializeStoredTimerLibrary({
  library,
  snapshot,
  timestamp = Date.now(),
}: {
  library: StoredTimerLibrary
  snapshot: StoredTimerSnapshot
  timestamp?: number
}) {
  const normalizedSnapshot = normalizeStoredTimerSnapshot(snapshot)
  const snapshotFingerprint = buildStoredTimerFingerprint(normalizedSnapshot)
  const currentEntry = library.currentEntryId
    ? (library.entries.find((entry) => entry.id === library.currentEntryId) ??
      null)
    : null
  const matchingCurrentEntry =
    currentEntry &&
    buildStoredTimerFingerprint(currentEntry) === snapshotFingerprint
      ? currentEntry
      : null
  const matchingLibraryEntry =
    matchingCurrentEntry ??
    library.entries.find(
      (entry) => buildStoredTimerFingerprint(entry) === snapshotFingerprint,
    ) ??
    null

  if (matchingLibraryEntry) {
    const entries = dedupeEntriesByFingerprint(
      library.entries.map((entry) =>
        entry.id === matchingLibraryEntry.id
          ? { ...entry, updatedAt: timestamp }
          : entry,
      ),
      matchingLibraryEntry.id,
    )

    return {
      currentEntryId: matchingLibraryEntry.id,
      entries,
      version: TIMER_LIBRARY_STORAGE_VERSION,
    } satisfies StoredTimerLibrary
  }

  const newEntry = createStoredTimerEntry(normalizedSnapshot, {
    updatedAt: timestamp,
  })

  return {
    currentEntryId: newEntry.id,
    entries: dedupeEntriesByFingerprint(
      [...library.entries, newEntry],
      newEntry.id,
    ),
    version: TIMER_LIBRARY_STORAGE_VERSION,
  } satisfies StoredTimerLibrary
}

export function upsertCurrentStoredTimerEntry({
  library,
  snapshot,
  timestamp = Date.now(),
}: {
  library: StoredTimerLibrary
  snapshot: StoredTimerSnapshot
  timestamp?: number
}) {
  const normalizedSnapshot = normalizeStoredTimerSnapshot(snapshot)
  const existingCurrentEntry = library.currentEntryId
    ? (library.entries.find((entry) => entry.id === library.currentEntryId) ??
      null)
    : null
  const currentEntry =
    existingCurrentEntry ??
    createStoredTimerEntry(normalizedSnapshot, {
      updatedAt: timestamp,
    })

  if (
    existingCurrentEntry &&
    buildStoredTimerFingerprint(existingCurrentEntry) ===
      buildStoredTimerFingerprint(normalizedSnapshot)
  ) {
    return library
  }

  const nextCurrentEntry = createStoredTimerEntry(normalizedSnapshot, {
    createdAt: currentEntry.createdAt,
    id: currentEntry.id,
    updatedAt: timestamp,
  })

  const remainingEntries = library.entries.filter(
    (entry) => entry.id !== nextCurrentEntry.id,
  )

  return {
    currentEntryId: nextCurrentEntry.id,
    entries: dedupeEntriesByFingerprint(
      [...remainingEntries, nextCurrentEntry],
      nextCurrentEntry.id,
    ),
    version: TIMER_LIBRARY_STORAGE_VERSION,
  } satisfies StoredTimerLibrary
}

export function selectStoredTimerEntry({
  entryId,
  library,
  timestamp = Date.now(),
}: {
  entryId: string
  library: StoredTimerLibrary
  timestamp?: number
}) {
  const selectedEntry = library.entries.find((entry) => entry.id === entryId)
  if (!selectedEntry) {
    return library
  }

  return {
    currentEntryId: selectedEntry.id,
    entries: sortEntries(
      library.entries.map((entry) =>
        entry.id === selectedEntry.id
          ? { ...entry, updatedAt: timestamp }
          : entry,
      ),
    ),
    version: TIMER_LIBRARY_STORAGE_VERSION,
  } satisfies StoredTimerLibrary
}

export function createCurrentStoredTimerEntry({
  library,
  snapshot,
  timestamp = Date.now(),
}: {
  library: StoredTimerLibrary
  snapshot: StoredTimerSnapshot
  timestamp?: number
}) {
  const normalizedSnapshot = normalizeStoredTimerSnapshot(snapshot)
  const matchingEntry = library.entries.find(
    (entry) =>
      buildStoredTimerFingerprint(entry) ===
      buildStoredTimerFingerprint(normalizedSnapshot),
  )

  if (matchingEntry) {
    return {
      currentEntryId: matchingEntry.id,
      entries: sortEntries(
        library.entries.map((entry) =>
          entry.id === matchingEntry.id
            ? { ...entry, updatedAt: timestamp }
            : entry,
        ),
      ),
      version: TIMER_LIBRARY_STORAGE_VERSION,
    } satisfies StoredTimerLibrary
  }

  const newEntry = createStoredTimerEntry(normalizedSnapshot, {
    updatedAt: timestamp,
  })

  return {
    currentEntryId: newEntry.id,
    entries: dedupeEntriesByFingerprint(
      [...library.entries, newEntry],
      newEntry.id,
    ),
    version: TIMER_LIBRARY_STORAGE_VERSION,
  } satisfies StoredTimerLibrary
}

export function deleteStoredTimerEntry({
  entryId,
  fallbackSnapshot = {
    pageTitle: "",
    params: DEFAULT_SYNC_PARAMS,
  },
  library,
  timestamp = Date.now(),
}: {
  entryId: string
  fallbackSnapshot?: StoredTimerSnapshot
  library: StoredTimerLibrary
  timestamp?: number
}) {
  const remainingEntries = library.entries.filter(
    (entry) => entry.id !== entryId,
  )

  if (entryId !== library.currentEntryId) {
    return {
      library: {
        currentEntryId: library.currentEntryId,
        entries: remainingEntries,
        version: TIMER_LIBRARY_STORAGE_VERSION,
      } satisfies StoredTimerLibrary,
      nextEntry: null,
    }
  }

  const nextEntry = sortEntries(remainingEntries)[0] ?? null

  if (nextEntry) {
    return {
      library: {
        currentEntryId: nextEntry.id,
        entries: remainingEntries,
        version: TIMER_LIBRARY_STORAGE_VERSION,
      } satisfies StoredTimerLibrary,
      nextEntry,
    }
  }

  const nextLibrary = createCurrentStoredTimerEntry({
    library: {
      currentEntryId: null,
      entries: [],
      version: TIMER_LIBRARY_STORAGE_VERSION,
    },
    snapshot: fallbackSnapshot,
    timestamp,
  })

  return {
    library: nextLibrary,
    nextEntry: nextLibrary.entries[0] ?? null,
  }
}
