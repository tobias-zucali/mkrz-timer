#!/usr/bin/env node
/* eslint-disable no-console */

import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const TMP_ROOT = path.resolve(SCRIPT_DIR, "..", "tmp")
const DEFAULT_COMMANDS = ["pnpm lint", "pnpm test", "pnpm format:fix"]

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
}

function runGit(repo, args) {
  const stdout = execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })

  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function currentDirty(repo) {
  const tracked = [
    ...new Set([
      ...runGit(repo, ["diff", "--name-only"]),
      ...runGit(repo, ["diff", "--cached", "--name-only"]),
    ]),
  ].sort()
  const untracked = runGit(repo, [
    "ls-files",
    "--others",
    "--exclude-standard",
  ]).sort()
  return { tracked, untracked }
}

function repoBranch(repo) {
  const lines = runGit(repo, ["rev-parse", "--abbrev-ref", "HEAD"])
  return lines[0] || "HEAD"
}

function repoKey(repo) {
  return createHash("sha256")
    .update(path.resolve(repo))
    .digest("hex")
    .slice(0, 16)
}

function sessionPath(repo) {
  return path.join(TMP_ROOT, `${path.basename(repo)}-${repoKey(repo)}.json`)
}

function loadSession(repo) {
  const target = sessionPath(repo)
  if (!fs.existsSync(target)) {
    console.error(`No prototype session found for ${repo}`)
    process.exit(1)
  }

  return JSON.parse(fs.readFileSync(target, "utf8"))
}

function saveSession(repo, session) {
  const target = sessionPath(repo)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, `${JSON.stringify(session, null, 2)}\n`)
  return target
}

function formatList(items) {
  return items.length > 0
    ? items.map((item) => `- ${item}`).join("\n")
    : "- none"
}

function prototypeOnlyFiles(repo, session) {
  const dirty = currentDirty(repo)
  const baseline = new Set([
    ...session.baseline.tracked,
    ...session.baseline.untracked,
  ])
  const current = new Set([...dirty.tracked, ...dirty.untracked])
  return [...current].filter((item) => !baseline.has(item)).sort()
}

function printStatus(repo, session) {
  console.log(`Session file: ${sessionPath(repo)}`)
  console.log(`Goal: ${session.goal || "(none)"}`)
  console.log(`Started: ${session.started_at}`)
  console.log(`Branch: ${session.branch}`)
  console.log("Deferred commands:")
  console.log(formatList(session.required_commands))
  console.log("Deferred docs:")
  console.log(formatList(session.docs))
  console.log("Deferred tests:")
  console.log(formatList(session.tests))
  console.log(`Needs full validation: ${session.needs_full_validation}`)
  console.log(`Needs security review: ${session.needs_security_review}`)
  console.log("Prototype-only changed files since start:")
  console.log(formatList(prototypeOnlyFiles(repo, session)))
  console.log("Notes:")
  const notes = session.notes.map((note) => `${note.time} ${note.text}`)
  console.log(formatList(notes))
}

function startSession(repo, goal) {
  const session = {
    repo,
    goal,
    started_at: nowIso(),
    branch: repoBranch(repo),
    baseline: currentDirty(repo),
    required_commands: DEFAULT_COMMANDS,
    docs: [],
    tests: [],
    needs_full_validation: false,
    needs_security_review: false,
    notes: [],
  }
  const target = saveSession(repo, session)
  console.log(`Started prototype session at ${target}`)
}

function pushUnique(target, items) {
  for (const item of items) {
    if (!target.includes(item)) {
      target.push(item)
    }
  }
}

function updateSession(repo, options) {
  const session = loadSession(repo)
  if (options.note) {
    session.notes.push({ time: nowIso(), text: options.note })
  }
  pushUnique(session.docs, options.docs)
  pushUnique(session.tests, options.tests)
  session.needs_full_validation =
    session.needs_full_validation || options.needsFullValidation
  session.needs_security_review =
    session.needs_security_review || options.needsSecurityReview
  saveSession(repo, session)
  printStatus(repo, session)
}

function finishPlan(repo) {
  const session = loadSession(repo)
  printStatus(repo, session)
  console.log("Closeout plan:")
  console.log(
    "- Review the current diff and identify the prototype-introduced changes.",
  )
  console.log("- Update the deferred docs before validation.")
  console.log("- Add or adapt the deferred tests before validation.")
  for (const command of session.required_commands) {
    console.log(`- Run \`${command}\``)
  }
  if (session.needs_full_validation) {
    console.log("- Run `pnpm test:full`")
  }
  if (session.needs_security_review) {
    console.log(
      "- Perform explicit security review for synchronized or relay-persisted fields.",
    )
  }
}

function revertPlan(repo) {
  const session = loadSession(repo)
  const dirty = currentDirty(repo)
  const baseline = new Set([
    ...session.baseline.tracked,
    ...session.baseline.untracked,
  ])
  const tracked = dirty.tracked.filter((item) => !baseline.has(item)).sort()
  const untracked = dirty.untracked.filter((item) => !baseline.has(item)).sort()
  console.log("Prototype-only tracked changes:")
  console.log(formatList(tracked))
  console.log("Prototype-only untracked files:")
  console.log(formatList(untracked))
  console.log("Suggested next step:")
  console.log(
    "- Review the lists, then revert only these prototype-introduced changes with explicit approval.",
  )
}

function archiveSession(repo, action) {
  const session = loadSession(repo)
  const target = sessionPath(repo)
  session.ended_at = nowIso()
  session.result = action
  const archived = target.replace(/\.json$/, `-${action}.json`)
  fs.writeFileSync(archived, `${JSON.stringify(session, null, 2)}\n`)
  fs.unlinkSync(target)
  console.log(`Archived prototype session to ${archived}`)
}

function parseArgs(argv) {
  const [command, ...rest] = argv
  if (!command || command === "--help" || command === "-h") {
    printHelp()
    process.exit(command ? 0 : 1)
  }

  const flagMap = new Map()
  const repeatedFlags = new Set(["--doc", "--test"])

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token.startsWith("--")) {
      console.error(`Unexpected argument: ${token}`)
      process.exit(1)
    }

    if (
      token === "--needs-full-validation" ||
      token === "--needs-security-review"
    ) {
      flagMap.set(token, true)
      continue
    }

    const value = rest[index + 1]
    if (value === undefined || value.startsWith("--")) {
      console.error(`Missing value for ${token}`)
      process.exit(1)
    }

    if (repeatedFlags.has(token)) {
      const existing = flagMap.get(token) || []
      existing.push(value)
      flagMap.set(token, existing)
    } else {
      flagMap.set(token, value)
    }
    index += 1
  }

  return { command, flagMap }
}

function requiredFlag(flagMap, name) {
  const value = flagMap.get(name)
  if (!value || Array.isArray(value)) {
    console.error(`Missing required ${name}`)
    process.exit(1)
  }
  return path.resolve(value)
}

function optionalString(flagMap, name) {
  const value = flagMap.get(name)
  return typeof value === "string" ? value : ""
}

function optionalList(flagMap, name) {
  const value = flagMap.get(name)
  return Array.isArray(value) ? value : []
}

function printHelp() {
  const scriptName = path.basename(fileURLToPath(import.meta.url))
  console.log(`usage: ${scriptName} <command> [options]

commands:
  start --repo <path> [--goal <text>]
  update --repo <path> [--note <text>] [--doc <path>] [--test <path>] [--needs-full-validation] [--needs-security-review]
  status --repo <path>
  finish-plan --repo <path>
  revert-plan --repo <path>
  finish --repo <path>
  abandon --repo <path>`)
}

function main() {
  const { command, flagMap } = parseArgs(process.argv.slice(2))
  const repo = requiredFlag(flagMap, "--repo")

  switch (command) {
    case "start":
      startSession(repo, optionalString(flagMap, "--goal"))
      break
    case "update":
      updateSession(repo, {
        note: optionalString(flagMap, "--note"),
        docs: optionalList(flagMap, "--doc"),
        tests: optionalList(flagMap, "--test"),
        needsFullValidation: Boolean(flagMap.get("--needs-full-validation")),
        needsSecurityReview: Boolean(flagMap.get("--needs-security-review")),
      })
      break
    case "status":
      printStatus(repo, loadSession(repo))
      break
    case "finish-plan":
      finishPlan(repo)
      break
    case "revert-plan":
      revertPlan(repo)
      break
    case "finish":
      archiveSession(repo, "finished")
      break
    case "abandon":
      archiveSession(repo, "abandoned")
      break
    default:
      console.error(`Unknown command: ${command}`)
      printHelp()
      process.exit(1)
  }
}

main()
