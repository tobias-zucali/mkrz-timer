import { existsSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import picomatch from "picomatch"

const SCOPE_FILE_NAME = "scope.yaml"

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = path.dirname(path.dirname(scriptPath))
const scopeCache = new Map()
const require = createRequire(import.meta.url)
const jsYamlPath = require.resolve("js-yaml", {
  paths: [path.join(repoRoot, "node_modules/.pnpm/node_modules")],
})
const { load: parseYaml } = require(jsYamlPath)

const ROOT_SCOPE_KEYS = new Set(["commands", "contract", "rules"])
const RULE_SCOPE_KEYS = new Set(["commands", "contract", "match"])

const print = (value = "") => {
  process.stdout.write(`${value}\n`)
}

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

const normalizePath = (value) => value.replaceAll(path.sep, "/")

const dedupe = (values) => Array.from(new Set(values))

const emptyScope = () => ({
  contract: false,
  commands: [],
})

const hasWildcard = (value) => value.includes("*") || value.includes("?")

const hasDefaultScopeConfig = (scope) =>
  scope.contract || scope.commands.length > 0

const normalizeCommandList = (input, sourceLabel) => {
  if (
    !Array.isArray(input) ||
    !input.every((item) => typeof item === "string")
  ) {
    throw new Error(`${sourceLabel} must be an array of strings`)
  }

  return input.map((item) => item.trim()).filter(Boolean)
}

const normalizeScopeConfig = (value, sourceLabel) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${sourceLabel} must be an object`)
  }

  return {
    contract: value.contract === true,
    commands: normalizeCommandList(value.commands, `${sourceLabel}.commands`),
  }
}

const mergeScopes = (current, next) => ({
  contract: current.contract || next.contract,
  commands: dedupe([...current.commands, ...next.commands]),
})

const normalizeMatcherList = (input, sourceLabel) => {
  if (typeof input === "string") {
    return [normalizePath(input)]
  }

  if (Array.isArray(input) && input.every((item) => typeof item === "string")) {
    return input.map(normalizePath)
  }

  throw new Error(`${sourceLabel} must be a string or array of strings`)
}

const escapeLiteralForGlob = (value) =>
  value.replaceAll("\\", "\\\\").replace(/[()[\]{}]/g, "\\$&")

const compileMatcher = (pattern) => {
  const normalizedPattern = normalizePath(pattern)
  const globPattern = hasWildcard(normalizedPattern)
    ? normalizedPattern
    : `{${escapeLiteralForGlob(normalizedPattern)},${escapeLiteralForGlob(normalizedPattern)}/**}`

  return picomatch(globPattern, {
    dot: true,
  })
}

const parseScopeYaml = (content, sourceLabel) => {
  try {
    return parseYaml(content) ?? {}
  } catch (error) {
    const message = error instanceof Error ? error.message : `${error}`
    throw new Error(`${sourceLabel} has invalid YAML: ${message}`)
  }
}

const assertAllowedKeys = (value, sourceLabel, allowedKeys) => {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${sourceLabel} uses unsupported key "${key}"`)
    }
  }
}

const validateScopeDocument = (metadata, sourceLabel) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error(`${sourceLabel} must contain a YAML object`)
  }

  assertAllowedKeys(metadata, `${sourceLabel}:root`, ROOT_SCOPE_KEYS)
  normalizeScopeConfig(metadata, `${sourceLabel}:root`)

  if (metadata.rules == null) {
    return
  }

  if (!Array.isArray(metadata.rules)) {
    throw new Error(`${sourceLabel}:rules must be an array`)
  }

  metadata.rules.forEach((rule, index) => {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      throw new Error(`${sourceLabel}:rules[${index}] must be an object`)
    }

    assertAllowedKeys(rule, `${sourceLabel}:rules[${index}]`, RULE_SCOPE_KEYS)
    normalizeMatcherList(rule.match, `${sourceLabel}:rules[${index}].match`)
    normalizeScopeConfig(rule, `${sourceLabel}:rules[${index}]`)
  })
}

const parseScopeFile = (scopePath) => {
  if (scopeCache.has(scopePath)) {
    return scopeCache.get(scopePath)
  }

  const content = readFileSync(scopePath, "utf8")
  const relativeScopePath = normalizePath(path.relative(repoRoot, scopePath))
  const metadata = parseScopeYaml(content, relativeScopePath)
  validateScopeDocument(metadata, relativeScopePath)

  const baseConfig = normalizeScopeConfig(metadata, `${relativeScopePath}:root`)
  const rawRules = metadata.rules ?? []

  const rules = rawRules.map((rule, index) => {
    const matchers = normalizeMatcherList(
      rule.match,
      `${relativeScopePath}:rules[${index}].match`,
    )

    return {
      config: normalizeScopeConfig(
        rule,
        `${relativeScopePath}:rules[${index}]`,
      ),
      matchPatterns: matchers,
      matches: matchers.map(compileMatcher),
    }
  })

  const parsed = {
    baseConfig,
    relativeScopePath,
    rules,
  }
  scopeCache.set(scopePath, parsed)
  return parsed
}

const findNearestScopePath = (filePath) => {
  const absoluteFilePath = path.join(repoRoot, filePath)
  const isScopeFile = path.basename(absoluteFilePath) === SCOPE_FILE_NAME
  let currentDir = isScopeFile
    ? path.dirname(absoluteFilePath)
    : path.dirname(absoluteFilePath)

  while (normalizePath(currentDir).startsWith(normalizePath(repoRoot))) {
    const scopePath = path.join(currentDir, SCOPE_FILE_NAME)

    if (existsSync(scopePath)) {
      return scopePath
    }

    if (currentDir === repoRoot) {
      break
    }

    currentDir = path.dirname(currentDir)
  }

  return null
}

const resolveScopeForFile = (filePath) => {
  const absoluteFilePath = path.join(repoRoot, filePath)
  const scopePath = findNearestScopePath(filePath)

  if (!scopePath) {
    return {
      scope: emptyScope(),
    }
  }

  const parsed = parseScopeFile(scopePath)
  const scopeDir = path.dirname(scopePath)
  const relativePath =
    path.basename(absoluteFilePath) === SCOPE_FILE_NAME &&
    scopeDir === path.dirname(absoluteFilePath)
      ? ""
      : normalizePath(path.relative(scopeDir, absoluteFilePath))

  const matchingRules = parsed.rules.filter((rule) =>
    rule.matches.some((matcher) => matcher(relativePath)),
  )

  if (matchingRules.length === 0) {
    return {
      scope: parsed.baseConfig,
    }
  }

  return {
    scope: matchingRules.reduce(
      (scope, rule) => mergeScopes(scope, rule.config),
      emptyScope(),
    ),
  }
}

const listChangedFiles = () => {
  const diffResult = run("git", [
    "diff",
    "--name-only",
    "--relative",
    "HEAD",
    "--diff-filter=ACMRTUXB",
  ])
  const cachedResult = run("git", [
    "diff",
    "--cached",
    "--name-only",
    "--relative",
    "--diff-filter=ACMRTUXB",
  ])
  const untrackedResult = run("git", [
    "ls-files",
    "--others",
    "--exclude-standard",
  ])

  if (
    diffResult.status !== 0 ||
    cachedResult.status !== 0 ||
    untrackedResult.status !== 0
  ) {
    return []
  }

  return dedupe(
    [diffResult.stdout, cachedResult.stdout, untrackedResult.stdout]
      .join("\n")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean)
      .map(normalizePath),
  ).sort()
}

const listScopeFiles = () => {
  const findResult = run("find", ["src", "tests", "-name", SCOPE_FILE_NAME])

  if (findResult.status !== 0) {
    return []
  }

  return findResult.stdout
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizePath)
    .sort()
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

  if (
    rules.length > 4 &&
    rules.every((rule) =>
      rule.matchPatterns.every((pattern) => !hasWildcard(pattern)),
    )
  ) {
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
