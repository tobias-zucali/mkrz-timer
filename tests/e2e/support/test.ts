import {
  expect,
  test as base,
  type BrowserContext,
  type Page,
} from "@playwright/test"

export async function installE2eBrowserMocks(context: BrowserContext) {
  await context.addInitScript(() => {
    class MockSpeechSynthesisUtterance {
      lang = ""
      text: string

      constructor(text: string) {
        this.text = text
      }
    }

    const speechSynthesisMock = {
      cancel: () => undefined,
      speak: () => undefined,
    }

    Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
      configurable: true,
      writable: true,
      value: MockSpeechSynthesisUtterance,
    })

    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: speechSynthesisMock,
    })
  })
}

const test = base.extend<{
  context: BrowserContext
  page: Page
}>({
  context: async ({ context }, runContext) => {
    await installE2eBrowserMocks(context)
    await runContext(context)
  },
})

export { expect, test }
export type { Page }
