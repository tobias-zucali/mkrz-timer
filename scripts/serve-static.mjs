import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import path from "node:path"

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
}

function getArgValue(flag, fallback) {
  const index = process.argv.indexOf(flag)

  if (index === -1) {
    return fallback
  }

  return process.argv[index + 1] || fallback
}

const rootDir = path.resolve(getArgValue("--dir", "out"))
const host = getArgValue("--host", "127.0.0.1")
const port = Number.parseInt(getArgValue("--port", "3200"), 10)

function getContentType(filePath) {
  return mimeTypes[path.extname(filePath)] || "application/octet-stream"
}

function buildCandidates(urlPathname) {
  const pathname = decodeURIComponent(urlPathname)
  const normalizedPath = pathname === "/" ? "/index.html" : pathname

  if (path.extname(normalizedPath)) {
    return [normalizedPath]
  }

  return [
    `${normalizedPath}.html`,
    path.posix.join(normalizedPath, "index.html"),
    normalizedPath,
  ]
}

function getRemoteFallbackPath(urlPathname) {
  if (urlPathname.startsWith("/view/") || urlPathname === "/view") {
    return "/view"
  }

  if (urlPathname.startsWith("/control/") || urlPathname === "/control") {
    return "/control"
  }

  return null
}

async function resolveFilePath(urlPathname) {
  for (const candidate of buildCandidates(urlPathname)) {
    const absoluteCandidate = path.resolve(rootDir, `.${candidate}`)

    if (!absoluteCandidate.startsWith(rootDir)) {
      continue
    }

    try {
      const fileStat = await stat(absoluteCandidate)

      if (fileStat.isFile()) {
        return absoluteCandidate
      }
    } catch {}
  }

  const remoteFallbackPath = getRemoteFallbackPath(urlPathname)

  if (remoteFallbackPath) {
    for (const candidate of buildCandidates(remoteFallbackPath)) {
      const absoluteCandidate = path.resolve(rootDir, `.${candidate}`)

      if (!absoluteCandidate.startsWith(rootDir)) {
        continue
      }

      try {
        const fileStat = await stat(absoluteCandidate)

        if (fileStat.isFile()) {
          return absoluteCandidate
        }
      } catch {}
    }
  }

  return null
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    response.writeHead(400)
    response.end("Missing request URL")
    return
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host}`)
  const filePath = await resolveFilePath(requestUrl.pathname)

  if (!filePath) {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
    })
    response.end("Not found")
    return
  }

  const file = await readFile(filePath)
  response.writeHead(200, {
    "Content-Type": getContentType(filePath),
    "Cache-Control": "no-cache",
  })
  response.end(file)
})

server.listen(port, host, () => {
  process.stdout.write(`Serving ${rootDir} at http://${host}:${port}\n`)
})
