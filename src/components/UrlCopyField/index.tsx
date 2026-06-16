import { ComponentProps, useId, useState } from "react"

import { useTranslations } from "next-intl"

import IconButton, { getIconButtonClassName } from "@/components/IconButton"
import QrCodeOverlay from "@/components/QrCodeOverlay"
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  QrCodeIcon,
} from "@/utils/icons"
import { getTimerSpaceShortcutButtonProps } from "@/utils/timerShortcutButtons"
import useClipboardCopy from "@/utils/useClipboardCopy"

import InputField from "../InputField"

export function openUrlInNewContext(value: string) {
  const openedWindow = window.open("", "_blank")

  if (!openedWindow) {
    return false
  }

  openedWindow.opener = null
  openedWindow.location.replace(value)

  return true
}

export default function UrlCopyField({
  description,
  label,
  showOpenButton = false,
  value,
  ...otherProps
}: Omit<ComponentProps<typeof InputField>, "id"> & {
  label: string
  showOpenButton?: boolean
  value: string
}) {
  const t = useTranslations("UrlCopyField")
  const fieldId = useId()
  const [isQrCodeOpen, setIsQrCodeOpen] = useState(false)
  const { canCopy, copyText, isCopied, isClient } = useClipboardCopy()

  return (
    <>
      <InputField
        className="text-sm text-foreground/75"
        description={description}
        id={fieldId}
        label={label}
        value={isClient ? value : ""}
        readOnly={true}
        {...otherProps}
      >
        {canCopy && (
          <IconButton
            appearance="surface"
            className="ml-2"
            onClick={() => void copyText(value)}
            {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
            shape="square"
            size="field"
            title={isCopied ? t("copied") : t("copyUrl")}
            aria-label={isCopied ? t("copied") : t("copyUrl")}
          >
            {isCopied ? (
              <CheckIcon className="size-5" />
            ) : (
              <ClipboardDocumentIcon className="size-5" />
            )}
          </IconButton>
        )}
        {showOpenButton && (
          <a
            className={getIconButtonClassName({
              appearance: "surface",
              className: "ml-2",
              shape: "square",
              size: "field",
            })}
            href={isClient ? value : ""}
            onClick={(event) => {
              event.preventDefault()

              if (isClient && value) {
                openUrlInNewContext(value)
              }
            }}
            rel="noopener noreferrer"
            target="_blank"
            title={t("openUrl")}
            aria-label={t("openUrl")}
          >
            <ArrowTopRightOnSquareIcon className="size-5" />
          </a>
        )}
        {isClient && value && (
          <IconButton
            appearance="surface"
            className="ml-2"
            onClick={() => setIsQrCodeOpen(true)}
            {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
            shape="square"
            size="field"
            title={t("showLabel", { label })}
            aria-label={t("showLabel", { label })}
          >
            <QrCodeIcon className="size-5" />
          </IconButton>
        )}
      </InputField>
      {isQrCodeOpen && (
        <QrCodeOverlay
          label={label}
          onClose={() => setIsQrCodeOpen(false)}
          value={value}
        />
      )}
    </>
  )
}
