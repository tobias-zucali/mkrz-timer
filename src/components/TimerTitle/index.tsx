"use client"

import { MAX_TITLE_LENGTH, normalizeTitle } from "@/shared/security/input"
import {
  getTimerTitleBoxStyle,
  getTimerTitleFontStyle,
  getTimerTitleReservedHeight,
  TIMER_TITLE_TEXT_CLASS_NAME,
} from "@/utils/timerTitleLayout"
import classNames from "classnames"
import { useTranslations } from "next-intl"
import {
  type ClipboardEvent,
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

function stopPropagation(event: KeyboardEvent<HTMLTextAreaElement>) {
  event.stopPropagation()
}

function getTextareaHeightBounds(textarea: HTMLTextAreaElement) {
  const computedStyle = window.getComputedStyle(textarea)

  return {
    maxHeightPx: Number.parseFloat(computedStyle.maxHeight) || Infinity,
    minHeightPx: Number.parseFloat(computedStyle.minHeight) || 0,
  }
}

function updateTextareaHeight(textarea: HTMLTextAreaElement) {
  const { maxHeightPx, minHeightPx } = getTextareaHeightBounds(textarea)

  textarea.style.height = `${minHeightPx}px`
  textarea.style.height = `${Math.min(
    Math.max(textarea.scrollHeight, minHeightPx),
    maxHeightPx,
  )}px`
}

function scheduleTextareaHeightSync(textarea: HTMLTextAreaElement) {
  updateTextareaHeight(textarea)

  const animationFrameIds = [
    window.requestAnimationFrame(() => {
      updateTextareaHeight(textarea)
    }),
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        updateTextareaHeight(textarea)
      })
    }),
  ]

  return () => {
    for (const animationFrameId of animationFrameIds) {
      window.cancelAnimationFrame(animationFrameId)
    }
  }
}

function buildPastedTitleValue({
  currentValue,
  pastedText,
  selectionEnd,
  selectionStart,
}: {
  currentValue: string
  pastedText: string
  selectionEnd: number
  selectionStart: number
}) {
  return normalizeTitle(
    `${currentValue.slice(0, selectionStart)}${pastedText}${currentValue.slice(
      selectionEnd,
    )}`,
  )
}

export default function TimerTitle({
  disabled = false,
  isDimmed = false,
  onChange,
  reserveSpace = false,
  value,
}: {
  disabled?: boolean
  isDimmed?: boolean
  onChange: (value: string) => void
  reserveSpace?: boolean
  value: string
}) {
  const t = useTranslations("TimerTitle")
  const [isFocused, setIsFocused] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const normalizedValue = normalizeTitle(value)
  const hasText = normalizedValue.trim().length > 0
  const titleFontStyle = getTimerTitleFontStyle({
    text: normalizedValue,
  })
  const titleSurfaceClassName =
    "box-border w-full rounded-3xl border border-transparent bg-transparent text-center font-bold tracking-tight"
  const titleBoxStyle = getTimerTitleBoxStyle()
  const showEmptyAction = !hasText && !isFocused
  const showFocusedTextarea = isFocused
  const shouldUseFilledTitleHeight = hasText || showFocusedTextarea
  const shouldReserveTitleSpace =
    reserveSpace || hasText || showFocusedTextarea || showEmptyAction
  const rootStyle = shouldReserveTitleSpace
    ? {
        height: getTimerTitleReservedHeight({
          hasText: shouldUseFilledTitleHeight,
        }),
      }
    : undefined
  const displayTitleStyle = titleBoxStyle

  useEffect(() => {
    if (disabled) {
      setIsFocused(false)
    }
  }, [disabled])

  useEffect(() => {
    if (!isFocused) {
      return
    }

    textareaRef.current?.focus()
  }, [isFocused])

  useLayoutEffect(() => {
    if (!textareaRef.current) {
      return
    }

    return scheduleTextareaHeightSync(textareaRef.current)
  }, [hasText, normalizedValue, showFocusedTextarea, titleFontStyle.fontSize])

  useLayoutEffect(() => {
    if (
      !textareaRef.current ||
      !rootRef.current ||
      typeof ResizeObserver === "undefined"
    ) {
      return
    }

    const textarea = textareaRef.current
    const updateHeightAfterLayout = () => {
      return scheduleTextareaHeightSync(textarea)
    }
    let cancelScheduledHeightSync = () => {}

    const observer = new ResizeObserver(() => {
      cancelScheduledHeightSync()
      cancelScheduledHeightSync = updateHeightAfterLayout()
    })

    observer.observe(rootRef.current)
    observer.observe(textarea)
    cancelScheduledHeightSync = updateHeightAfterLayout()

    return () => {
      cancelScheduledHeightSync()
      observer.disconnect()
    }
  }, [hasText, showFocusedTextarea, titleFontStyle.fontSize])

  useEffect(() => {
    if (
      !textareaRef.current ||
      typeof document === "undefined" ||
      !("fonts" in document)
    ) {
      return
    }

    const { fonts } = document
    const syncHeight = () => {
      if (!textareaRef.current) {
        return
      }

      return scheduleTextareaHeightSync(textareaRef.current)
    }

    let cancelScheduledHeightSync = syncHeight() ?? (() => {})
    const handleFontLoadingDone = () => {
      cancelScheduledHeightSync()
      cancelScheduledHeightSync = syncHeight() ?? (() => {})
    }

    void fonts.ready.then(handleFontLoadingDone)
    fonts.addEventListener("loadingdone", handleFontLoadingDone)

    return () => {
      cancelScheduledHeightSync()
      fonts.removeEventListener("loadingdone", handleFontLoadingDone)
    }
  }, [normalizedValue, titleFontStyle.fontSize])

  if (disabled) {
    return (
      <div
        ref={rootRef}
        className="relative z-10 w-full overflow-visible px-4 pt-2 pb-1"
        data-testid="timer-title"
        data-title-empty={hasText ? "false" : "true"}
        data-title-mode="readonly"
        style={rootStyle}
      >
        {hasText ? (
          <p
            className={classNames(
              TIMER_TITLE_TEXT_CLASS_NAME,
              titleSurfaceClassName,
              "whitespace-pre-wrap",
            )}
            data-testid="timer-title-text"
            style={{
              ...displayTitleStyle,
              ...titleFontStyle,
            }}
          >
            {normalizedValue}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="relative z-10 w-full overflow-visible px-4 pt-2 pb-1"
      data-testid="timer-title"
      data-title-empty={hasText ? "false" : "true"}
      data-title-mode={
        showEmptyAction ? "empty" : isFocused ? "editing" : "display"
      }
      style={rootStyle}
    >
      <textarea
        aria-label={t("title")}
        autoComplete="off"
        className={classNames(
          titleSurfaceClassName,
          "resize-none overflow-hidden whitespace-pre-wrap outline-none transition focus:bg-foreground/4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground/70",
          hasText
            ? "relative z-10 cursor-text"
            : showFocusedTextarea
              ? "relative z-10"
              : "absolute inset-x-0 top-0 opacity-0",
          !showFocusedTextarea && !hasText && "pointer-events-none",
        )}
        data-testid="timer-title-input"
        maxLength={MAX_TITLE_LENGTH}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onChange(normalizeTitle(event.target.value))}
        onFocus={() => setIsFocused(true)}
        onKeyDown={(event) => {
          stopPropagation(event)

          if (event.key === "Enter") {
            event.preventDefault()
            return
          }

          if (event.key === "Escape") {
            event.currentTarget.blur()
          }
        }}
        onKeyUp={stopPropagation}
        onPaste={(event: ClipboardEvent<HTMLTextAreaElement>) => {
          event.preventDefault()

          const textarea = event.currentTarget
          const pastedText = normalizeTitle(event.clipboardData.getData("text"))
          const selectionStart =
            textarea.selectionStart ?? normalizedValue.length
          const selectionEnd = textarea.selectionEnd ?? selectionStart

          onChange(
            buildPastedTitleValue({
              currentValue: normalizedValue,
              pastedText,
              selectionEnd,
              selectionStart,
            }),
          )
        }}
        ref={textareaRef}
        rows={1}
        spellCheck={false}
        style={{
          ...displayTitleStyle,
          ...titleFontStyle,
        }}
        value={normalizedValue}
      />
      {showEmptyAction ? (
        <button
          aria-label={t("addTitle")}
          className={classNames(
            "absolute top-7 left-1/2 inline-flex min-h-10 -translate-1/2",
            "cursor-pointer items-center justify-center rounded-full",
            "border border-dashed border-foreground/18 bg-foreground/3 px-4 py-1.5",
            "text-sm font-semibold text-foreground/72 hover:border-foreground/28",
            "hover:bg-foreground/6 hover:text-foreground focus-visible:outline-2",
            "focus-visible:outline-offset-2 focus-visible:outline-primary",
            "transition-opacity timer-chrome-transition",
            isDimmed ? "timer-chrome-dimmed" : "opacity-100",
          )}
          data-testid="timer-title-empty-action"
          data-timer-chrome-focus-lock="true"
          onClick={() => setIsFocused(true)}
          type="button"
        >
          {t("addTitle")}
        </button>
      ) : null}
    </div>
  )
}
