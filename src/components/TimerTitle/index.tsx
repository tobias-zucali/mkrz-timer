"use client"

import { MAX_TITLE_LENGTH, normalizeTitle } from "@/shared/security/input"
import {
  getTimerTitleBoxStyle,
  getTimerTitleFontClassName,
  getTimerTitleReservedMinHeight,
  isLongTimerTitle,
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
import styles from "./index.module.css"

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
  onChange,
  reserveSpace = false,
  value,
}: {
  disabled?: boolean
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
  const isLongTitle = isLongTimerTitle(normalizedValue)
  const titleFontClassName = getTimerTitleFontClassName({
    text: normalizedValue,
    variant: "main",
  })
  const titleBoxStyle = getTimerTitleBoxStyle()
  const showTextarea = hasText || isFocused
  const showEmptyAction = !hasText && !isFocused
  const shouldReserveTitleSpace =
    reserveSpace || showTextarea || showEmptyAction
  const rootStyle = shouldReserveTitleSpace
    ? {
        height: getTimerTitleReservedMinHeight({
          hasText: showTextarea,
        }),
      }
    : undefined

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
    if (!showTextarea || !textareaRef.current) {
      return
    }

    updateTextareaHeight(textareaRef.current)
  }, [showTextarea, normalizedValue, titleFontClassName])

  useLayoutEffect(() => {
    if (
      !showTextarea ||
      !textareaRef.current ||
      !rootRef.current ||
      typeof ResizeObserver === "undefined"
    ) {
      return
    }

    const textarea = textareaRef.current
    let animationFrameId = 0
    const updateHeightAfterLayout = () => {
      updateTextareaHeight(textarea)

      animationFrameId = window.requestAnimationFrame(() => {
        updateTextareaHeight(textarea)
      })
    }

    const observer = new ResizeObserver(() => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }

      updateHeightAfterLayout()
    })

    observer.observe(rootRef.current)
    observer.observe(textarea)
    updateHeightAfterLayout()

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId)
      }
      observer.disconnect()
    }
  }, [showTextarea, titleFontClassName])

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
              "whitespace-normal rounded-3xl border border-transparent bg-transparent",
              titleFontClassName,
              isLongTitle ? styles.mainLongTitle : styles.mainShortTitle,
            )}
            data-testid="timer-title-text"
            style={titleBoxStyle}
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
      {showTextarea ? (
        <p
          className={classNames(
            TIMER_TITLE_TEXT_CLASS_NAME,
            "pointer-events-none absolute inset-x-0 top-0 whitespace-normal rounded-3xl border border-transparent bg-transparent opacity-0",
            titleFontClassName,
            isLongTitle ? styles.mainLongTitle : styles.mainShortTitle,
          )}
          data-testid="timer-title-text"
          style={titleBoxStyle}
        >
          {normalizedValue}
        </p>
      ) : null}
      <textarea
        aria-label={t("title")}
        autoComplete="off"
        className={classNames(
          "box-border w-full resize-none overflow-hidden whitespace-pre-wrap rounded-3xl border border-transparent bg-transparent text-center font-bold tracking-tight outline-none transition focus:bg-foreground/4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground/70",
          showTextarea ? "relative z-10" : "absolute inset-x-0 top-0 opacity-0",
          titleFontClassName,
          isLongTitle ? styles.mainLongTitle : styles.mainShortTitle,
          !showTextarea && "pointer-events-none",
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
        style={titleBoxStyle}
        value={normalizedValue}
      />
      {showEmptyAction ? (
        <button
          aria-label={t("addTitle")}
          className="
            absolute top-1/2 left-1/2 inline-flex min-h-10 -translate-1/2
            items-center justify-center rounded-full border
            border-dashed border-foreground/18 bg-foreground/3 px-4 py-1.5 text-sm
            font-semibold text-foreground/72 transition hover:border-foreground/28
            hover:bg-foreground/6 hover:text-foreground
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-primary
          "
          data-testid="timer-title-empty-action"
          onClick={() => setIsFocused(true)}
          type="button"
        >
          {t("addTitle")}
        </button>
      ) : null}
    </div>
  )
}
