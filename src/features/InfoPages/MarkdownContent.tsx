import type { ReactNode } from "react"
import Link from "next/link"

import type { AppLocale } from "@/i18n/config"
import { localizePathname } from "@/i18n/locale"

type MarkdownBlock =
  | { level: 1 | 2 | 3; text: string; type: "heading" }
  | { items: string[]; type: "list" }
  | { lines: string[]; type: "paragraph" }

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const currentList: string[] = []
  const currentParagraph: string[] = []

  const flushList = () => {
    if (currentList.length === 0) {
      return
    }

    blocks.push({
      items: [...currentList],
      type: "list",
    })
    currentList.length = 0
  }

  const flushParagraph = () => {
    if (currentParagraph.length === 0) {
      return
    }

    blocks.push({
      lines: [...currentParagraph],
      type: "paragraph",
    })
    currentParagraph.length = 0
  }

  for (const rawLine of markdown.split(/\r?\n/)) {
    const trimmedLine = rawLine.trim()

    if (trimmedLine === "") {
      flushList()
      flushParagraph()
      continue
    }

    if (trimmedLine.startsWith("### ")) {
      flushList()
      flushParagraph()
      blocks.push({
        level: 3,
        text: trimmedLine.slice(4).trim(),
        type: "heading",
      })
      continue
    }

    if (trimmedLine.startsWith("## ")) {
      flushList()
      flushParagraph()
      blocks.push({
        level: 2,
        text: trimmedLine.slice(3).trim(),
        type: "heading",
      })
      continue
    }

    if (trimmedLine.startsWith("# ")) {
      flushList()
      flushParagraph()
      blocks.push({
        level: 1,
        text: trimmedLine.slice(2).trim(),
        type: "heading",
      })
      continue
    }

    if (trimmedLine.startsWith("- ")) {
      flushParagraph()
      currentList.push(trimmedLine.slice(2).trim())
      continue
    }

    flushList()
    currentParagraph.push(rawLine)
  }

  flushList()
  flushParagraph()

  return blocks
}

function localizeHref(href: string, locale: AppLocale) {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#")
  ) {
    return href
  }

  if (href.startsWith("/")) {
    return localizePathname(href, locale)
  }

  return href
}

function renderInline(text: string, locale: AppLocale): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern =
    /\[([^\]]+)\]\(([^)]+)\)|<([^>\s]+@[^>\s]+)>|<(https?:\/\/[^>\s]+)>/g

  let lastIndex = 0
  let match = pattern.exec(text)
  while (match) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const [fullMatch, label, href, email, rawUrl] = match

    if (label && href) {
      const localizedHref = localizeHref(href, locale)
      const isExternal = localizedHref.startsWith("http")

      nodes.push(
        <Link
          className="underline decoration-primary/60 underline-offset-4"
          href={localizedHref}
          key={`${fullMatch}-${match.index}`}
          rel={isExternal ? "noopener noreferrer" : undefined}
          target={isExternal ? "_blank" : undefined}
        >
          {label}
        </Link>,
      )
    } else if (email) {
      nodes.push(
        <a
          className="underline decoration-primary/60 underline-offset-4"
          href={`mailto:${email}`}
          key={`${fullMatch}-${match.index}`}
        >
          {email}
        </a>,
      )
    } else if (rawUrl) {
      nodes.push(
        <a
          className="underline decoration-primary/60 underline-offset-4"
          href={rawUrl}
          key={`${fullMatch}-${match.index}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {rawUrl}
        </a>,
      )
    }

    lastIndex = match.index + fullMatch.length
    match = pattern.exec(text)
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function renderParagraph(lines: string[], locale: AppLocale) {
  return lines.map((line, index) => {
    const text = line.trim()
    const breakAfter = /  $/.test(line)
    const isLastLine = index === lines.length - 1

    return (
      <span key={`${text}-${index}`}>
        {renderInline(text, locale)}
        {breakAfter ? <br /> : !isLastLine ? " " : null}
      </span>
    )
  })
}

export default function MarkdownContent({
  compact = false,
  locale,
  markdown,
}: {
  compact?: boolean
  locale: AppLocale
  markdown: string
}) {
  const blocks = parseMarkdown(markdown)

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          if (block.level === 1) {
            return (
              <h1
                className="text-4xl font-semibold tracking-tight sm:text-5xl"
                key={`${block.type}-${index}`}
              >
                {block.text}
              </h1>
            )
          }

          if (block.level === 2) {
            return (
              <h2
                className={
                  compact
                    ? "pt-3 text-xl font-semibold tracking-tight"
                    : "pt-4 text-2xl font-semibold tracking-tight"
                }
                key={`${block.type}-${index}`}
              >
                {block.text}
              </h2>
            )
          }

          return (
            <h3
              className={
                compact
                  ? "text-lg font-semibold tracking-tight"
                  : "text-xl font-semibold tracking-tight"
              }
              key={`${block.type}-${index}`}
            >
              {block.text}
            </h3>
          )
        }

        if (block.type === "list") {
          return (
            <ul
              className={
                compact
                  ? "list-disc space-y-1.5 pl-4 text-base/6 marker:text-primary"
                  : "list-disc space-y-2 pl-5 text-base/7 marker:text-primary"
              }
              key={`${block.type}-${index}`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>
                  {renderInline(item, locale)}
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p
            className={
              compact
                ? "text-base/6 text-foreground/88"
                : "text-base/7 text-foreground/88"
            }
            key={index}
          >
            {renderParagraph(block.lines, locale)}
          </p>
        )
      })}
    </div>
  )
}
