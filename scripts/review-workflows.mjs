import { spawnSync } from "node:child_process"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = path.dirname(path.dirname(scriptPath))

const WORKFLOWS = {
  architecture: {
    key: "architecture",
    file: ".agents/workflows/architecture-review.md",
    model: "strong",
    stage: "parallel",
    sources: ["AGENTS.md"],
  },
  sync: {
    key: "sync",
    file: ".agents/workflows/sync-risk-review.md",
    model: "strong",
    stage: "parallel",
    sources: ["AGENTS.md", "docs/live-sessions.md"],
  },
  url: {
    key: "url",
    file: ".agents/workflows/url-persistence-review.md",
    model: "small",
    stage: "parallel",
    sources: ["AGENTS.md", "docs/live-sessions.md"],
  },
  accessibility: {
    key: "accessibility",
    file: ".agents/workflows/accessibility-review.md",
    model: "small",
    stage: "parallel",
    sources: ["AGENTS.md", "docs/accessibility-tree.md", "docs/i18n.md"],
  },
  validation: {
    key: "validation",
    file: ".agents/workflows/validation-plan.md",
    model: "small",
    stage: "follow-up",
    sources: ["AGENTS.md", "docs/development.md"],
  },
}

const FORCEABLE_WORKFLOWS = new Map([
  ["architecture", WORKFLOWS.architecture],
  ["sync", WORKFLOWS.sync],
  ["url", WORKFLOWS.url],
  ["accessibility", WORKFLOWS.accessibility],
  ["validation", WORKFLOWS.validation],
])

const SYNC_PATTERNS = [
  "docs/live-sessions.md",
  "src/server/liveSession/",
  "src/server/relay/",
  "src/shared/liveSession/",
  "src/shared/timerState.ts",
  "src/utils/liveSession/",
  "tests/e2e/live-session/",
]

const URL_PATTERNS = [
  "src/app/",
  "src/shared/urlState/",
  "src/utils/liveSession/route.ts",
  "src/utils/timerLibrary/",
  "src/utils/useParams/",
  "tests/e2e/timer/",
]

const ACCESSIBILITY_PATTERNS = [
  "docs/accessibility-tree.md",
  "docs/i18n.md",
  "src/components/",
  "src/features/",
  "src/i18n/",
  "messages/",
]

const print = (value = "") => {
  process.stdout.write(`${value}\n`)
}

const normalizePath = (value) => value.replaceAll(path.sep, "/")

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  })

  if (result.error) {
    throw result.error
  }

  return result
}

const changedFilesFromGit = () => {
  const tracked = run("git", ["diff", "--name-only"]).stdout
  const cached = run("git", ["diff", "--cached", "--name-only"]).stdout
  const untracked = run("git", [
    "ls-files",
    "--others",
    "--exclude-standard",
  ]).stdout

  return [
    ...tracked.split("\n"),
    ...cached.split("\n"),
    ...untracked.split("\n"),
  ]
    .map((file) => file.trim())
    .filter(Boolean)
}

const parseArgs = (argv) => {
  const files = []
  const forcedWorkflows = []
  let json = false

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (token === "--help" || token === "-h") {
      return { help: true, files: [], forcedWorkflows: [], json: false }
    }

    if (token === "--json") {
      json = true
      continue
    }

    if (token === "--") {
      continue
    }

    if (token === "--workflow") {
      const value = argv[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --workflow")
      }
      const workflow = FORCEABLE_WORKFLOWS.get(value)
      if (!workflow) {
        throw new Error(`Unknown workflow: ${value}`)
      }
      forcedWorkflows.push(workflow)
      index += 1
      continue
    }

    files.push(token)
  }

  return { help: false, files, forcedWorkflows, json }
}

const matchesAnyPattern = (file, patterns) =>
  patterns.some((pattern) => file === pattern || file.includes(pattern))

const unique = (values) => [...new Set(values)]

const selectWorkflows = (files, forcedWorkflows) => {
  if (forcedWorkflows.length > 0) {
    return unique([
      WORKFLOWS.architecture,
      ...forcedWorkflows,
      WORKFLOWS.validation,
    ])
  }

  const selected = [WORKFLOWS.architecture, WORKFLOWS.validation]

  if (files.some((file) => matchesAnyPattern(file, SYNC_PATTERNS))) {
    selected.push(WORKFLOWS.sync)
  }

  if (files.some((file) => matchesAnyPattern(file, URL_PATTERNS))) {
    selected.push(WORKFLOWS.url)
  }

  if (files.some((file) => matchesAnyPattern(file, ACCESSIBILITY_PATTERNS))) {
    selected.push(WORKFLOWS.accessibility)
  }

  return unique(selected)
}

const workflowBrief = (workflow, files) => {
  const joinedFiles = files.map((file) => `- ${file}`).join("\n")
  const joinedSources = workflow.sources.map((file) => `- ${file}`).join("\n")

  return [
    `Workflow: ${workflow.key}`,
    `Stage: ${workflow.stage}`,
    `Suggested model tier: ${workflow.model}`,
    `Workflow doc: ${workflow.file}`,
    "Prompt:",
    "```text",
    `Use ${workflow.file}.`,
    "Review only these files:",
    joinedFiles,
    "",
    "Use these sources only:",
    joinedSources,
    "",
    "Do not edit code.",
    "Do not run validation.",
    "Return only:",
    "",
    "Scope: <files or diff slice reviewed>",
    "Findings:",
    "- blocker: <actionable issue> | no issue",
    "- should-fix: <actionable issue> | no issue",
    "- optional: <actionable improvement> | no issue",
    "",
    "Escalation:",
    "- <broader validation or follow-up needed> | none",
    "```",
  ].join("\n")
}

const printHelp = () => {
  print("usage: node scripts/review-workflows.mjs [options] [files...]")
  print("")
  print("If no files are provided, the current git diff is used.")
  print("")
  print("options:")
  print(
    "  --workflow <name>  force one workflow: architecture, sync, url, accessibility, validation",
  )
  print("  --json             print machine-readable output")
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    process.exit(0)
  }

  const files = unique(
    (options.files.length > 0 ? options.files : changedFilesFromGit()).map(
      normalizePath,
    ),
  ).sort()

  if (files.length === 0) {
    print("No changed files found.")
    process.exit(0)
  }

  const workflows = selectWorkflows(files, options.forcedWorkflows)
  const parallel = workflows.filter((workflow) => workflow.stage === "parallel")
  const followUp = workflows.filter(
    (workflow) => workflow.stage === "follow-up",
  )

  if (options.json) {
    print(
      JSON.stringify(
        {
          files,
          parallel: parallel.map((workflow) => ({
            key: workflow.key,
            file: workflow.file,
            model: workflow.model,
            sources: workflow.sources,
          })),
          followUp: followUp.map((workflow) => ({
            key: workflow.key,
            file: workflow.file,
            model: workflow.model,
            sources: workflow.sources,
          })),
        },
        null,
        2,
      ),
    )
    return
  }

  print("Changed files")
  files.forEach((file) => print(`- ${file}`))
  print("")
  print("Run in parallel first")
  parallel.forEach((workflow) => {
    print(`- ${workflow.key} (${workflow.model})`)
  })
  print("")
  print("Run after findings")
  followUp.forEach((workflow) => {
    print(`- ${workflow.key} (${workflow.model})`)
  })

  for (const workflow of [...parallel, ...followUp]) {
    print("")
    print(workflowBrief(workflow, files))
  }
}

main()
