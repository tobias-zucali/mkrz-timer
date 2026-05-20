"use client"

import classNames from "classnames"

import UrlCopyField from "@/components/UrlCopyField"
import type { SessionPresentationModel } from "@/utils/sessionPresentation"
import { getLocalShareDescription } from "@/utils/sessionPresentation"
import ActionButton from "@/utils/ActionButton"

const liveSessionToneClassNames = {
  neutral: "border-foreground/10 bg-white/[0.04]",
  success: "border-emerald-400/25 bg-emerald-500/10",
  warning: "border-amber-400/25 bg-amber-500/10",
}

export default function SharePanel({
  accessTokens,
  controlClientUrl,
  onEndRemoteSession,
  onRetry,
  onStartRemoteSession,
  readonlyClientUrl,
  sessionPresentation,
  timerUrl,
}: {
  accessTokens: { control: string; readonly: string } | null | undefined
  controlClientUrl: string
  onEndRemoteSession: () => Promise<void>
  onRetry: () => void
  onStartRemoteSession: () => Promise<void>
  readonlyClientUrl: string
  sessionPresentation: SessionPresentationModel
  timerUrl: string
}) {
  const { sharePanel } = sessionPresentation

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Sharing</h3>
        </div>

        <div
          className={classNames(
            "space-y-4 rounded-2xl border p-4",
            liveSessionToneClassNames[sharePanel.tone],
          )}
        >
          <div className="space-y-3">
            <div>
              <p className="font-medium text-foreground">Live session</p>
              {sharePanel.statusLabel && (
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {sharePanel.statusLabel}
                </p>
              )}
              <p className="mt-1 text-sm/6 text-foreground/68">
                {sharePanel.description}
              </p>
            </div>
            {sharePanel.bullets.length > 0 && (
              <ul className="space-y-1 text-sm/6 text-foreground/68">
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
            <div className="space-y-4 border-t border-foreground/10 pt-4">
              {accessTokens ? (
                <>
                  <UrlCopyField
                    description="Read-only display for audience screens."
                    label="Viewer link"
                    showOpenButton={true}
                    value={readonlyClientUrl}
                  />
                  <UrlCopyField
                    description="Full timer and settings control with elevated permissions."
                    label="Control link"
                    showOpenButton={true}
                    value={controlClientUrl}
                  />
                </>
              ) : (
                <p className="text-sm/6 text-foreground/68">
                  Waiting for viewer and control links to become available.
                </p>
              )}

              <div className="space-y-3 border-t border-foreground/10 pt-4">
                {sharePanel.showRetry && (
                  <ActionButton fullWidth={true} onClick={onRetry}>
                    Retry now
                  </ActionButton>
                )}
                <ActionButton
                  className="
                    border border-foreground/12 bg-foreground/4 text-foreground
                    hover:border-foreground/18 hover:bg-foreground/8
                    hover:text-foreground
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
          space-y-4 rounded-2xl border border-foreground/10 bg-foreground/2 p-4
        "
        >
          <div>
            <p className="font-medium text-foreground">Local share</p>
            <p className="mt-1 text-sm/6 text-foreground/68">
              {getLocalShareDescription()}
            </p>
          </div>
          <UrlCopyField
            description="Snapshot of the current timer configuration with no live synchronization."
            label="Local link"
            value={timerUrl}
          />
        </div>
      </section>
    </div>
  )
}
