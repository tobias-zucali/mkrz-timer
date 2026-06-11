import path from "node:path"
import process from "node:process"
import {
  SCOPE_FILE_NAME,
  dedupe,
  findNearestScopePath,
  hasDefaultScopeConfig,
  listChangedFiles,
  listScopeFiles,
  normalizePath,
  parseScopeFile,
  repoRoot,
  resolveScopeForFile,
  scopeFileUsesWildcardsOnly,
} from "./lib/scope-metadata.mjs"

const print = (value = "") => {
  process.stdout.write(`${value}\n`)
}

const buildStructuralWarnings = (parsed) => {
  const warnings = []
  const { baseConfig, relativeScopePath, rules } = parsed

  if (rules.length > 4) {
    warnings.push({
      level: "refactor",
      message: `${relativeScopePath} has ${rules.length} rules; the boundary is likely carrying too many exceptions.`,
    })
  } else if (rules.length > 3) {
    warnings.push({
      level: "review",
      message: `${relativeScopePath} has ${rules.length} rules; review whether the folder should be split.`,
    })
  }

  if (rules.length > 0 && !hasDefaultScopeConfig(baseConfig)) {
    warnings.push({
      level: "refactor",
      message: `${relativeScopePath} has no default commands and relies entirely on exceptions.`,
    })
  }

  if (rules.length > 4 && scopeFileUsesWildcardsOnly(parsed)) {
    warnings.push({
      level: "review",
      message: `${relativeScopePath} is enumerating many literal exceptions; the folder may want clearer subfolders.`,
    })
  }

  return warnings
}

const runScopeRecommendation = (files) => {
  if (files.length === 0) {
    print(
      "No changed files found. Pass paths explicitly or run after making edits.",
    )
    process.exit(0)
  }

  const resolvedScopes = files.map((filePath) => resolveScopeForFile(filePath))

  const unitRelevant = files.some(
    (filePath) =>
      filePath.startsWith("src/shared/") ||
      filePath.startsWith("src/server/") ||
      filePath.startsWith("src/utils/") ||
      /\.test\.ts$/.test(filePath),
  )

  const componentRelevant = files.some(
    (filePath) =>
      filePath.startsWith("src/components/") ||
      filePath.startsWith("src/features/") ||
      filePath.startsWith("src/app/") ||
      /\.test\.tsx$/.test(filePath),
  )

  const snapshotRelevant = files.some(
    (filePath) =>
      filePath.includes("-snapshots/") ||
      /\/(?:actions|settings|client|sync|pip)\.spec\.ts$/.test(filePath),
  )

  const commands = []

  if (unitRelevant) {
    commands.push("pnpm test:unit")
  }

  if (componentRelevant) {
    commands.push("pnpm test:components")
  }

  for (const { scope } of resolvedScopes) {
    commands.push(...scope.commands)
  }

  const hasContractChange = resolvedScopes.some(({ scope }) => scope.contract)
  const needsFullLane = resolvedScopes.some(({ scope }) =>
    scope.commands.some((command) =>
      command.startsWith("pnpm test:e2e:remote -- "),
    ),
  )

  print("Changed files")
  for (const filePath of files) {
    print(`- ${filePath}`)
  }

  if (hasContractChange) {
    print()
    print("Contract-first checklist")
    print(
      "- Separate the share URL contract from hydration behavior before editing.",
    )
    print(
      "- Decide which routes write `v/t/a`, which routes read them on first load, and which recovery flows may reuse them later.",
    )
    print(
      "- Update shared helpers or invariants first when they define URL or live-session expectations.",
    )
  }

  print()
  print("Suggested first-pass validation")
  const uniqueCommands = dedupe(commands)
  if (uniqueCommands.length === 0) {
    print(
      "- No narrow lane matched. Start with the closest unit or component test, then widen.",
    )
  } else {
    for (const command of uniqueCommands) {
      print(`- ${command}`)
    }
  }

  print()
  print("Required finish lane")
  print("- `pnpm lint`")
  print("- `pnpm test:e2e:local:smoke`")
  print("- `pnpm format:fix`")

  if (needsFullLane) {
    print("- `pnpm test:full`")
  }

  print()
  print("Notes")
  if (snapshotRelevant) {
    print(
      "- If the UI change is intentional, update the affected aria or visual snapshots before broad reruns.",
    )
  }
  print(
    "- Do not run overlapping Playwright lanes in parallel when they share the same ports.",
  )
  print(
    "- Delay `pnpm test:full` until the last failing local or remote subsystem is already stable.",
  )
}

const runScopeAudit = (targets) => {
  const scopeFiles =
    targets.length === 0
      ? listScopeFiles()
      : dedupe(
          targets
            .map((target) => findNearestScopePath(target))
            .filter(Boolean)
            .map((value) => normalizePath(path.relative(repoRoot, value))),
        ).sort()

  if (scopeFiles.length === 0) {
    print(`No ${SCOPE_FILE_NAME} files found for the given targets.`)
    process.exit(0)
  }

  const schemaErrors = []
  const structuralWarnings = []

  for (const scopeFile of scopeFiles) {
    try {
      const parsed = parseScopeFile(path.join(repoRoot, scopeFile))
      structuralWarnings.push(...buildStructuralWarnings(parsed))
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`
      schemaErrors.push(`- ${message}`)
    }
  }

  print("Scope files")
  for (const scopeFile of scopeFiles) {
    print(`- ${scopeFile}`)
  }

  if (schemaErrors.length > 0) {
    print()
    print("Scope errors")
    for (const error of schemaErrors) {
      print(error)
    }
  }

  if (structuralWarnings.length > 0) {
    print()
    print("Structural warnings")
    for (const warning of structuralWarnings) {
      print(`- [${warning.level}] ${warning.message}`)
    }
  } else {
    print()
    print("Structural warnings")
    print("- None.")
  }

  print()
  print("Guidance")
  print("- Fix scope errors before relying on `pnpm scope` output.")
  print(
    "- Treat `[review]` warnings as prompts to revisit boundaries during the next structural change.",
  )
  print(
    "- Treat `[refactor]` warnings as signals that the folder probably wants a clearer sub-boundary now.",
  )

  if (schemaErrors.length > 0) {
    process.exit(1)
  }
}

const rawArgs = process.argv.slice(2).filter((value) => value !== "--")
const isAuditMode = rawArgs.includes("--audit")
const inputFiles = rawArgs
  .filter((value) => value !== "--audit")
  .map(normalizePath)

if (isAuditMode) {
  runScopeAudit(inputFiles)
} else {
  const files = inputFiles.length > 0 ? inputFiles : listChangedFiles()
  runScopeRecommendation(files)
}
