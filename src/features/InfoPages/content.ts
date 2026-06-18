import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { defaultAppLocale, type AppLocale } from "@/i18n/config"

export const infoPageSlugs = [
  "about",
  "privacy",
  "impressum",
  "terms",
  "accessibility",
  "contact",
] as const

export type InfoPageSlug = (typeof infoPageSlugs)[number]
export const contentSlugs = ["home", ...infoPageSlugs] as const
export type ContentSlug = (typeof contentSlugs)[number]
export type InfoPageContentBySlug = Record<InfoPageSlug, InfoPageContent>

export type InfoPageContent = {
  body: string
  description: string
  requestedLocale: AppLocale
  resolvedLocale: AppLocale
  slug: ContentSlug
  title: string
}

const CONTENT_ROOT = path.join(process.cwd(), "content")

function parseFrontmatter(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    throw new Error("Expected markdown frontmatter block.")
  }

  const [, rawFrontmatter, body] = match
  const entries = rawFrontmatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":")
      if (separatorIndex === -1) {
        return null
      }

      const key = line.slice(0, separatorIndex).trim()
      const value = line.slice(separatorIndex + 1).trim()
      return [key, value] as const
    })
    .filter((entry): entry is readonly [string, string] => entry !== null)

  const frontmatter = Object.fromEntries(entries)
  if (!frontmatter.title || !frontmatter.description) {
    throw new Error("Expected markdown title and description frontmatter.")
  }

  return {
    body: body.trim(),
    description: frontmatter.description,
    title: frontmatter.title,
  }
}

function resolveContentFile(locale: AppLocale, slug: ContentSlug) {
  const requestedPath = path.join(CONTENT_ROOT, locale, `${slug}.md`)
  if (existsSync(requestedPath)) {
    return {
      filePath: requestedPath,
      resolvedLocale: locale,
    }
  }

  const fallbackPath = path.join(CONTENT_ROOT, defaultAppLocale, `${slug}.md`)
  if (!existsSync(fallbackPath)) {
    throw new Error(`Missing content file for ${slug}.`)
  }

  return {
    filePath: fallbackPath,
    resolvedLocale: defaultAppLocale,
  }
}

export function getInfoPageContent(
  locale: AppLocale,
  slug: ContentSlug,
): InfoPageContent {
  const { filePath, resolvedLocale } = resolveContentFile(locale, slug)
  const source = readFileSync(filePath, "utf8")
  const { body, description, title } = parseFrontmatter(source)

  return {
    body,
    description,
    requestedLocale: locale,
    resolvedLocale,
    slug,
    title,
  }
}

export function getHomeContent(locale: AppLocale) {
  return getInfoPageContent(locale, "home")
}

export function getInfoPageContents(locale: AppLocale): InfoPageContentBySlug {
  return Object.fromEntries(
    infoPageSlugs.map((slug) => [slug, getInfoPageContent(locale, slug)]),
  ) as InfoPageContentBySlug
}
