export const IS_DEBUGGING = true

const debug = {
  log: (...args: unknown[]) => {
    if (IS_DEBUGGING) {
      // eslint-disable-next-line no-console
      console.log(...args)
    }
  },
  warn: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.warn(...args)
  },
  error: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error(...args)
  },
  group: (...args: unknown[]) => {
    if (IS_DEBUGGING) {
      // eslint-disable-next-line no-console
      console.group(...args)
    }
  },
  groupEnd: () => {
    if (IS_DEBUGGING) {
      // eslint-disable-next-line no-console
      console.groupEnd()
    }
  },
  wrap:
    <T extends Array<unknown>, U>(label: string, fn: (...args: T) => U) =>
    (...args: T): U => {
      debug.group(label)
      if (args.length > 0) {
        debug.log("args", args)
      }
      const result = fn(...args)
      if (result !== undefined) {
        debug.log("result", result)
      }
      debug.groupEnd()
      return result
    },
}

export default debug
