import { ComponentProps, useId, useState } from "react"

import Link from "next/link"
import { useTranslations } from "next-intl"

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

const iconButtonClassName =
  "ml-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.06] text-foreground/80 transition hover:bg-foreground/[0.12] hover:text-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

export default function UrlCopyField({
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
        id={fieldId}
        value={isClient ? value : ""}
        readOnly={true}
        label={label}
        {...otherProps}
      >
        {canCopy && (
          <button
            className={iconButtonClassName}
            onClick={() => void copyText(value)}
            {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
            type="button"
            title={isCopied ? t("copied") : t("copyUrl")}
            aria-label={isCopied ? t("copied") : t("copyUrl")}
          >
            {isCopied ? (
              <CheckIcon className="size-5" />
            ) : (
              <ClipboardDocumentIcon className="size-5" />
            )}
          </button>
        )}
        {showOpenButton && (
          <Link
            className={iconButtonClassName}
            href={isClient ? value : ""}
            target="_blank"
            title={t("openUrl")}
            aria-label={t("openUrl")}
          >
            <ArrowTopRightOnSquareIcon className="size-5" />
          </Link>
        )}
        {isClient && value && (
          <button
            className={iconButtonClassName}
            onClick={() => setIsQrCodeOpen(true)}
            {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
            title={t("showLabel", { label })}
            aria-label={t("showLabel", { label })}
            type="button"
          >
            <QrCodeIcon className="size-5" />
          </button>
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
