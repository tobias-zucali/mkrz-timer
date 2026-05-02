import { expect, Page } from "@playwright/test"

const timerUrl = "/?m=01&s=00&bg=%23000000&fg=%23ffffff&pc=%23d61f69"

type PeerDebugState = {
  connectionCount: string
  peerId: string
  role: string
  status: string
}

export async function enableRemoteMode(page: Page) {
  await page.goto(timerUrl)

  await page.getByRole("button", { name: "Settings" }).click()
  await expect(
    page.getByRole("button", { name: "Switch to remote mode" }),
  ).toBeVisible()

  await page.getByRole("button", { name: "Switch to remote mode" }).click()
  const clientUrlInput = page.getByLabel("Client URL")
  await expect(clientUrlInput).toBeVisible({ timeout: 30_000 })
  await expect
    .poll(() => clientUrlInput.inputValue(), {
      message: "client URL should include a remote peer id",
    })
    .toContain("?rid=")

  return clientUrlInput.inputValue()
}

export async function openClientFromSettings(page: Page, clientUrl: string) {
  const clientPagePromise = page.waitForEvent("popup")
  await page.getByRole("link", { name: "Open" }).click()
  const clientPage = await clientPagePromise

  await expect(clientPage).toHaveURL(clientUrl)
  await expect(clientPage.getByRole("button", { name: "START" })).toBeVisible()
  await expect(clientPage).toHaveURL(/rid=/)
  return clientPage
}

export async function openClientsFromSettings(
  page: Page,
  clientUrl: string,
  count: number,
) {
  const clients: Page[] = []

  for (let index = 0; index < count; index += 1) {
    clients.push(await openClientFromSettings(page, clientUrl))
  }

  return clients
}

export async function closeSettingsOverlay(page: Page) {
  await page.getByRole("button", { exact: true, name: "Close" }).click()
  await expect(page).not.toHaveURL(/settings=true/)
}

export async function expectTimerRunning(page: Page) {
  await expect(page.getByRole("button", { name: "PAUSE" })).toBeVisible({
    timeout: 15_000,
  })

  const initialSeconds = await getDisplayedSeconds(page)
  await expect
    .poll(() => getDisplayedSeconds(page), {
      message: "timer should count down while running",
      timeout: 5_000,
    })
    .toBeLessThan(initialSeconds)
}

export async function expectTimerPaused(page: Page) {
  await expect(page.getByRole("button", { name: "START" })).toBeVisible({
    timeout: 15_000,
  })
}

export async function getTimerControlState(page: Page) {
  if (await page.getByRole("button", { name: "PAUSE" }).isVisible()) {
    return "running"
  }
  if (await page.getByRole("button", { name: "START" }).isVisible()) {
    return "paused"
  }
  return "unknown"
}

export async function expectTimerControlsToMatch(pages: Page[]) {
  let matchingState = "unknown"

  await expect
    .poll(async () => {
      const states = await Promise.all(pages.map(getTimerControlState))
      const [firstState] = states
      const allMatch = states.every((state) => state === firstState)

      matchingState = allMatch ? firstState : "unknown"
      return allMatch ? firstState : "mixed"
    }, {
      message: "all timer controls should converge to the same state",
      timeout: 15_000,
    })
    .not.toBe("mixed")

  return matchingState
}

export async function getDisplayedSeconds(page: Page) {
  const minutes = Number(await page.getByLabel("Minutes").inputValue())
  const seconds = Number(await page.getByLabel("Seconds").inputValue())

  return minutes * 60 + seconds
}

export async function expectTimersToMatch(
  pages: Page[],
  expectedSeconds?: number,
  tolerance = expectedSeconds === undefined ? 1 : 0,
) {
  const secondsByPage = await Promise.all(pages.map(getDisplayedSeconds))
  const firstValue = expectedSeconds ?? secondsByPage[0]

  for (const seconds of secondsByPage) {
    expect(Math.abs(seconds - firstValue)).toBeLessThanOrEqual(tolerance)
  }
}

export async function getPeerDebugState(page: Page): Promise<PeerDebugState> {
  const debugState = page.getByTestId("peer-debug-state")

  return {
    connectionCount: (await debugState.getAttribute("data-connection-count")) ?? "",
    peerId: (await debugState.getAttribute("data-peer-id")) ?? "",
    role: (await debugState.getAttribute("data-peer-role")) ?? "",
    status: (await debugState.getAttribute("data-peer-status")) ?? "",
  }
}

export async function waitForRemoteCluster(
  pages: Page[],
  {
    clientCount,
    mainConnectionCount,
    message = "remote cluster should stabilize",
    timeout = 45_000,
  }: {
    clientCount: number
    mainConnectionCount: number
    message?: string
    timeout?: number
  },
) {
  await expect
    .poll(async () => {
      const states = await Promise.all(pages.map(getPeerDebugState))

      return {
        connectedClients: states.filter(
          ({ connectionCount, role, status }) =>
            connectionCount === "1" && role === "client" && status === "connected",
        ).length,
        electedMain: states.filter(
          ({ connectionCount, role, status }) =>
            connectionCount === String(mainConnectionCount) &&
            role === "main" &&
            status === "connected",
        ).length,
      }
    }, {
      timeout,
      message,
    })
    .toEqual({
      connectedClients: clientCount,
      electedMain: 1,
    })
}

export async function getMainPage(pages: Page[]) {
  for (const page of pages) {
    const state = await getPeerDebugState(page)
    if (state.role === "main" && state.status === "connected") {
      return page
    }
  }

  throw new Error("No connected main page found")
}
