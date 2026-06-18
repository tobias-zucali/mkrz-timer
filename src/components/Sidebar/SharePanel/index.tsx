"use client"

import classNames from "classnames"
import { useTranslations } from "next-intl"

import UrlCopyField from "@/components/UrlCopyField"
import type { SessionPresentationModel } from "@/utils/sessionPresentation"
import ActionButton from "@/utils/ActionButton"

const liveSessionToneClassNames = {
  neutral: "border-ink/10 bg-white/[0.04]",
  success: "border-emerald-400/25 bg-emerald-500/10",
  warning: "border-amber-400/25 bg-amber-500/10",
}

export type SharePanelProps = {
  accessTokens: { control: string; readonly: string } | null | undefined
  controlClientUrl: string
  includeSettingsInLinks: boolean
  onEndRemoteSession: () => Promise<void>
  onIncludeSettingsInLinksChange: (nextValue: boolean) => void
  onRetry: () => void
  onStartRemoteSession: () => Promise<void>
  readonlyClientUrl: string
  sessionPresentation: SessionPresentationModel
  timerUrl: string
}

export default function SharePanel({
  accessTokens,
  controlClientUrl,
  includeSettingsInLinks,
  onEndRemoteSession,
  onIncludeSettingsInLinksChange,
  onRetry,
  onStartRemoteSession,
  readonlyClientUrl,
  sessionPresentation,
  timerUrl,
}: SharePanelProps) {
  const t = useTranslations("Sidebar.share")
  const tSessionPresentation = useTranslations("TimerPage.sessionPresentation")
  const { sharePanel } = sessionPresentation

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-ink">{t("heading")}</h3>
        </div>

        <div
          className={classNames(
            "space-y-4 rounded-2xl border p-4",
            liveSessionToneClassNames[sharePanel.tone],
          )}
        >
          <div className="space-y-3">
            <div>
              <p className="font-medium text-ink">{t("liveSession")}</p>
              {sharePanel.statusLabel && (
                <p className="mt-2 text-sm font-semibold text-ink">
                  {sharePanel.statusLabel}
                </p>
              )}
              <p className="mt-1 text-sm/6 text-ink/68">
                {sharePanel.description}
              </p>
            </div>
            {sharePanel.bullets.length > 0 && (
              <ul className="space-y-1 text-sm/6 text-ink/68">
                {sharePanel.bullets.map((bullet) => (
                  <li key={bullet}>• {bullet}</li>
                ))}
              </ul>
            )}
          </div>

          {sharePanel.primaryActionLabel && (
            <ActionButton
              disabled={sessionPresentation.state === "liveConnecting"}
              fullWidth={true}
              onClick={() => {
                void onStartRemoteSession()
              }}
            >
              {sharePanel.primaryActionLabel}
            </ActionButton>
          )}

          {sharePanel.showLinks && (
            <div className="space-y-4 border-t border-ink/10 pt-4">
              {accessTokens ? (
                <>
                  <UrlCopyField
                    description={t("viewerLinkDescription")}
                    label={t("viewerLink")}
                    showOpenButton={true}
                    value={readonlyClientUrl}
                  />
                  <UrlCopyField
                    description={t("controlLinkDescription")}
                    label={t("controlLink")}
                    showOpenButton={true}
                    value={controlClientUrl}
                  />
                </>
              ) : (
                <p className="text-sm/6 text-ink/68">{t("waitingForLinks")}</p>
              )}

              <div className="space-y-3 border-t border-ink/10 pt-4">
                {sharePanel.showRetry && (
                  <ActionButton fullWidth={true} onClick={onRetry}>
                    {t("retryNow")}
                  </ActionButton>
                )}
                <ActionButton
                  className="
                    border border-ink/12 bg-ink/4 text-ink
                    hover:border-ink/18 hover:bg-ink/8
                    hover:text-ink
                  "
                  fullWidth={true}
                  onClick={() => {
                    void onEndRemoteSession()
                  }}
                >
                  {sharePanel.endActionLabel}
                </ActionButton>
              </div>
            </div>
          )}
        </div>

        <div
          className="
          space-y-4 rounded-2xl border border-ink/10 bg-ink/2 p-4
        "
        >
          <div>
            <p className="font-medium text-ink">{t("localShare")}</p>
            <p className="mt-1 text-sm/6 text-ink/68">
              {tSessionPresentation("localShareDescription")}
            </p>
          </div>
          <UrlCopyField
            description={t("localLinkDescription")}
            label={t("localLink")}
            value={timerUrl}
          />
        </div>
        <label
          className="
            flex cursor-pointer items-start gap-3 rounded-2xl border
            border-ink/10 bg-ink/2 p-4
          "
        >
          <input
            checked={includeSettingsInLinks}
            className="mt-1 size-4 accent-primary"
            onChange={(event) =>
              onIncludeSettingsInLinksChange(event.target.checked)
            }
            type="checkbox"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium text-ink">
              {t("includeSettings")}
            </span>
            <span className="block text-sm/6 text-ink/68">
              {t("includeSettingsDescription")}
            </span>
          </span>
        </label>
      </section>
    </div>
  )
}
