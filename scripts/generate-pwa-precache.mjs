import { createHash } from "node:crypto"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"

const exportDir = path.resolve("out")
const outputPath = path.join(exportDir, "sw-precache-manifest.js")

const ROOT_ASSET_PATTERNS = [
  /^android-chrome-\d+x\d+\.png$/,
  /^apple-touch-icon\.png$/,
  /^browserconfig\.xml$/,
  /^favicon(?:-\d+x\d+)?\.(?:ico|png|svg)$/,
  /^first-paint-theme\.js$/,
  /^manifest\.webmanifest$/,
  /^mstile-.*\.png$/,
  /^safari-pinned-tab\.svg$/,
]

async function walk(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const nestedPaths = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        return walk(entryPath)
      }

      return [entryPath]
    }),
  )

  return nestedPaths.flat()
}

function isHtmlRoute(relativePath) {
  return (
    relativePath.endsWith(".html") &&
    !relativePath.startsWith("_not-found") &&
    !relativePath.startsWith("404")
  )
}

function toRouteUrl(relativePath) {
  if (relativePath === "index.html") {
    return "/"
  }

  return `/${relativePath.replace(/\.html$/u, "")}`
}

function isRootShellAsset(relativePath) {
  if (relativePath.includes("/")) {
    return false
  }

  return ROOT_ASSET_PATTERNS.some((pattern) => pattern.test(relativePath))
}

function buildVersion(entries) {
  const hash = createHash("sha256")

  for (const entry of entries) {
    hash.update(entry.url)
    hash.update("\0")
    hash.update(entry.contents)
    hash.update("\0")
  }

  return hash.digest("hex").slice(0, 12)
}

async function main() {
  const allFiles = await walk(exportDir)
  const entries = await Promise.all(
    allFiles.map(async (filePath) => {
      const relativePath = path.relative(exportDir, filePath)
      const normalizedPath = relativePath.split(path.sep).join("/")

      if (!isHtmlRoute(normalizedPath) && !isRootShellAsset(normalizedPath)) {
        return null
      }

      const url = isHtmlRoute(normalizedPath)
        ? toRouteUrl(normalizedPath)
        : `/${normalizedPath}`
      const contents = await readFile(filePath)

      return {
        contents,
        url,
      }
    }),
  )

  const precacheEntries = entries
    .filter((entry) => entry !== null)
    .sort((left, right) => left.url.localeCompare(right.url))

  const version = buildVersion(precacheEntries)
  const manifestSource = `self.__PWA_PRECACHE_MANIFEST = ${JSON.stringify(
    {
      urls: precacheEntries.map((entry) => entry.url),
      version,
    },
    null,
    2,
  )}\n`

  await mkdir(exportDir, { recursive: true })
  await writeFile(outputPath, manifestSource)
  process.stdout.write(
    `Generated ${path.relative(process.cwd(), outputPath)} with ${precacheEntries.length} entries.\n`,
  )
}

void main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`,
  )
  process.exitCode = 1
})
