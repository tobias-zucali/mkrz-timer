import { readFile } from "node:fs/promises"
import { spawn } from "node:child_process"
import path from "node:path"
import process from "node:process"

const packageJsonPath = new URL("../package.json", import.meta.url)
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"))
const repoRoot = path.dirname(packageJsonPath.pathname)
const minNodeVersion =
  packageJson.engines?.node?.match(/>=\s*([0-9]+\.[0-9]+\.[0-9]+)/)?.[1] ??
  "22.6.0"

const parseVersion = (value) =>
  value
    .replace(/^v/, "")
    .split(".")
    .map((segment) => Number.parseInt(segment, 10))

const isVersionAtLeast = (current, minimum) => {
  const currentParts = parseVersion(current)
  const minimumParts = parseVersion(minimum)
  const maxLength = Math.max(currentParts.length, minimumParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const currentPart = currentParts[index] ?? 0
    const minimumPart = minimumParts[index] ?? 0

    if (currentPart > minimumPart) {
      return true
    }
    if (currentPart < minimumPart) {
      return false
    }
  }

  return true
}

if (!isVersionAtLeast(process.version, minNodeVersion)) {
  const scriptName = path.basename(
    process.argv[1] ?? "scripts/agent-playwright.mjs",
  )
  console.error(
    [
      `Node.js ${minNodeVersion}+ is required for the agent Playwright lane.`,
      `Current runtime: ${process.version}`,
      `Re-run with a supported Node binary, for example:`,
      `  /path/to/node scripts/${scriptName} ${process.argv.slice(2).join(" ")}`.trimEnd(),
    ].join("\n"),
  )
  process.exit(1)
}

const playwrightCliPath = new URL(
  "../node_modules/@playwright/test/cli.js",
  import.meta.url,
)

const child = spawn(
  process.execPath,
  [playwrightCliPath.pathname, "test", ...process.argv.slice(2)],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      PLAYWRIGHT_NODE: process.execPath,
      PLAYWRIGHT_PEER_SERVER_URL:
        process.env.PLAYWRIGHT_PEER_SERVER_URL || "http://127.0.0.1:9200",
    },
    stdio: "inherit",
  },
)

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
