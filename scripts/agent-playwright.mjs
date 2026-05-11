import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"
import process from "node:process"

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const laneScriptPath = new URL("./agent-lane.mjs", import.meta.url)

const child = spawn(
  process.execPath,
  [laneScriptPath.pathname, "test", ...process.argv.slice(2)],
  {
    cwd: repoRoot,
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
