import type { SyncParams } from "./types"

const hasOwn = (value: object, key: keyof SyncParams) =>
  Object.prototype.hasOwnProperty.call(value, key)

const shouldPreferSequenceRows = (patch: Partial<SyncParams>) =>
  (hasOwn(patch, "rows") || hasOwn(patch, "activeIndex")) &&
  !hasOwn(patch, "m") &&
  !hasOwn(patch, "s") &&
  !hasOwn(patch, "title") &&
  !hasOwn(patch, "pc")

export const mergeSyncParamsPatch = (
  currentParams: SyncParams,
  patch: Partial<SyncParams>,
) => ({
  ...currentParams,
  ...(shouldPreferSequenceRows(patch)
    ? {
        m: undefined,
        pc: undefined,
        s: undefined,
        title: undefined,
      }
    : {}),
  ...patch,
})
