"use client"

import { MAX_TITLE_LENGTH } from "@/shared/security/input"
import { getTimerTitleLayout } from "@/utils/timerTitleLayout"
import classNames from "classnames"
import {
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

const titleTextClassName =
  "mx-auto m-0 block w-full max-w-[22ch] overflow-hidden whitespace-pre-wrap break-words text-center font-bold tracking-tight"

function stopPropagation(event: KeyboardEvent<HTMLTextAreaElement>) {
  event.stopPropagation()
}

export default function TimerTitle({
  disabled = false,
  onChange,
  value,
}: {
  disabled?: boolean
  onChange: (value: string) => void
  value: string
}) {
  const [isFocused, setIsFocused] = useState(false)
  const [viewportWidthPx, setViewportWidthPx] = useState<number | undefined>(
    undefined,
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const layout = getTimerTitleLayout(value, "main", { viewportWidthPx })
  const textareaRows = Math.min(
    layout.maxVisibleLines,
    Math.max(layout.lineCount, 1),
  )
  const titleBlockStyle = {
    fontSize: `${layout.fontSizeRem}rem`,
    lineHeight: layout.lineHeight,
    maxHeight: `${layout.maxVisibleLines * layout.lineHeight}em`,
  }
  const showEmptyAction = !layout.hasText && !isFocused

  useEffect(() => {
    if (disabled) {
      setIsFocused(false)
    }
  }, [disabled])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const updateViewportWidth = () => {
      setViewportWidthPx(window.innerWidth)
    }

    updateViewportWidth()
    window.addEventListener("resize", updateViewportWidth)

    return () => {
      window.removeEventListener("resize", updateViewportWidth)
    }
  }, [])

  useLayoutEffect(() => {
    if (!textareaRef.current) {
      return
    }

    textareaRef.current.style.height = "0px"
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  }, [isFocused, value])

  const focusEditor = () => {
    textareaRef.current?.focus()
  }

  if (disabled) {
    return (
      <div
        className="mt-4 w-full px-4 pt-2 pb-1"
        data-testid="timer-title"
        data-title-empty={layout.hasText ? "false" : "true"}
        data-title-mode="readonly"
      >
        {layout.hasText ? (
          <p
            className={titleTextClassName}
            data-testid="timer-title-text"
            style={titleBlockStyle}
          >
            {value}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={classNames(
        "relative mt-4 flex w-full justify-center px-4 pt-2 pb-1",
        showEmptyAction && "min-h-12",
      )}
      data-testid="timer-title"
      data-title-empty={layout.hasText ? "false" : "true"}
      data-title-mode={
        showEmptyAction ? "empty" : isFocused ? "editing" : "display"
      }
    >
      <textarea
        aria-label="Title"
        autoComplete="off"
        className={classNames(
          "w-full max-w-[22ch] resize-none overflow-hidden rounded-3xl border border-transparent bg-transparent px-3 py-1 text-center font-bold tracking-tight outline-none transition focus:border-foreground/28 focus:bg-foreground/3 focus-visible:outline-secondary focus-visible:outline-2 focus-visible:outline-offset-4",
          showEmptyAction &&
            "pointer-events-none absolute inset-0 opacity-0 hover:opacity-0 focus:opacity-100 focus:pointer-events-auto",
        )}
        data-testid="timer-title-input"
        maxLength={MAX_TITLE_LENGTH}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={(event) => {
          stopPropagation(event)
          if (event.key === "Escape") {
            event.currentTarget.blur()
          }
        }}
        onKeyUp={stopPropagation}
        ref={textareaRef}
        rows={textareaRows}
        spellCheck={false}
        style={titleBlockStyle}
        value={value}
      />
      {showEmptyAction && (
        <button
          aria-label="Add title"
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-dashed border-foreground/18 bg-foreground/[0.03] px-4 py-1.5 text-sm font-semibold text-foreground/72 transition hover:border-foreground/28 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
          data-testid="timer-title-empty-action"
          onClick={focusEditor}
          type="button"
        >
          Add title
        </button>
      )}
    </div>
  )
}
