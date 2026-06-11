import { existsSync, readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import picomatch from "picomatch"

export const SCOPE_FILE_NAME = "scope.yaml"

const scriptPath = fileURLToPath(import.meta.url)
export const repoRoot = path.dirname(path.dirname(path.dirname(scriptPath)))
const scopeCache = new Map()
const require = createRequire(import.meta.url)
const jsYamlPath = require.resolve("js-yaml", {
  paths: [path.join(repoRoot, "node_modules/.pnpm/node_modules")],
})
const { load: parseYaml } = require(jsYamlPath)

const ROOT_SCOPE_KEYS = new Set(["commands", "contract", "rules"])
const RULE_SCOPE_KEYS = new Set(["commands", "contract", "match"])

export const normalizePath = (value) => value.replaceAll(path.sep, "/")

export const dedupe = (values) => Array.from(new Set(values))

export const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  })

  if (result.error) {
    throw result.error
  }

  return result
}

export const emptyScope = () => ({
  contract: false,
  commands: [],
})

const hasWildcard = (value) => value.includes("*") || value.includes("?")

export const hasDefaultScopeConfig = (scope) =>
  scope.contract || scope.commands.length > 0

const normalizeCommandList = (input, sourceLabel) => {
  if (input == null) {
    return []
  }

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

export const mergeScopes = (current, next) => ({
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

export const parseScopeFile = (scopePath) => {
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

export const findNearestScopePath = (filePath) => {
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

export const resolveScopeForFile = (filePath) => {
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

export const resolveBaseReviewMetadataForFile = (filePath) => {
  const scopePath = findNearestScopePath(filePath)

  if (!scopePath) {
    return []
  }

  return parseScopeFile(scopePath).baseConfig.reviews
}

export const listChangedFiles = ({ base, head } = {}) => {
  if (base || head) {
    if (!base || !head) {
      throw new Error("Both --base and --head are required together.")
    }

    const diffResult = run("git", [
      "diff",
      "--name-only",
      "--relative",
      "--diff-filter=ACMRTUXB",
      `${base}...${head}`,
    ])

    if (diffResult.status !== 0) {
      return []
    }

    return dedupe(
      diffResult.stdout
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean)
        .map(normalizePath),
    ).sort()
  }

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

export const listScopeFiles = (roots = ["src", "tests"]) => {
  const findResult = run("find", [...roots, "-name", SCOPE_FILE_NAME])

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

export const scopeFileUsesWildcardsOnly = (parsed) =>
  parsed.rules.every((rule) =>
    rule.matchPatterns.every((pattern) => !hasWildcard(pattern)),
  )
