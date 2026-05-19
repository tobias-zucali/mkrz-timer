"use client"

import UrlCopyField from "@/components/UrlCopyField"
import ActionButton from "@/utils/ActionButton"

export default function SharePanel({
  accessTokens,
  controlClientUrl,
  isConnecting,
  isRemoteReady,
  onEndRemoteSession,
  onStartRemoteSession,
  remoteErrorText,
  onOpenStatusPanel,
  readonlyClientUrl,
  remoteRole,
  sessionId,
  timerUrl,
}: {
  accessTokens: { control: string; readonly: string } | null | undefined
  controlClientUrl: string
  isConnecting: boolean
  isRemoteReady: boolean
  onEndRemoteSession: () => Promise<void>
  onOpenStatusPanel: () => void
  onStartRemoteSession: () => Promise<void>
  readonlyClientUrl: string
  remoteErrorText: string | null
  remoteRole: "control" | "readonly" | null
  sessionId?: string
  timerUrl: string
}) {
  const shouldLinkToStatusPanel =
    remoteErrorText === "Automatic recovery timed out. Retry the connection."
  const hasRemoteSession = Boolean(remoteRole || sessionId || accessTokens)
  const endRemoteSessionLabel =
    remoteRole === "readonly" ? "Leave remote session" : "End remote session"

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Sharing</h3>
          <p className="mt-1 text-sm leading-6 text-foreground/68">
            Share this timer locally, or start a remote session for another
            screen to view or control it.
          </p>
        </div>

        {!hasRemoteSession && !isConnecting && (
          <div className="space-y-3 rounded-2xl border border-foreground/10 bg-white/[0.04] p-4">
            <div>
              <p className="font-medium text-foreground">Remote session</p>
              <p className="mt-1 text-sm leading-6 text-foreground/68">
                Start a remote session to generate separate viewer and control
                links.
              </p>
            </div>
            <ActionButton
              fullWidth={true}
              onClick={() => {
                void onStartRemoteSession()
              }}
            >
              Start remote session
            </ActionButton>
          </div>
        )}

        {isConnecting && (
          <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/10 p-4">
            <div>
              <p className="font-medium text-foreground">Remote session</p>
              <p className="mt-1 text-sm leading-6 text-foreground/68">
                Creating the remote session and preparing share links.
              </p>
            </div>
            <ActionButton
              disabled={true}
              fullWidth={true}
              onClick={undefined}
            >
              Starting remote session...
            </ActionButton>
          </div>
        )}

        {remoteErrorText ? (
          <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground/80">
            <p>{remoteErrorText}</p>
            {shouldLinkToStatusPanel && (
              <button
                className="mt-2 cursor-pointer text-sm font-semibold text-primary underline underline-offset-2"
                onClick={onOpenStatusPanel}
                type="button"
              >
                Open Status
              </button>
            )}
          </div>
        ) : null}

        {!hasRemoteSession && !isConnecting && (
          <UrlCopyField
            description="Use this link to reopen the current timer setup."
            label="Share Link"
            value={timerUrl}
          />
        )}

        {hasRemoteSession && (
          <div className="space-y-4 rounded-2xl border border-foreground/10 bg-white/[0.04] p-4">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-foreground">
                  Remote session active
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground/68">
                  Share a viewer link for read-only access or a control link for
                  full timer control.
                </p>
              </div>
              <ActionButton
                fullWidth={true}
                onClick={() => {
                  void onEndRemoteSession()
                }}
              >
                {endRemoteSessionLabel}
              </ActionButton>
            </div>
            {isRemoteReady && accessTokens ? (
              <div className="space-y-4 border-t border-foreground/10 pt-4">
                <UrlCopyField
                  description="Share this to watch the timer without any controls."
                  label="Viewer Link"
                  showOpenButton={true}
                  value={readonlyClientUrl}
                />
                <UrlCopyField
                  description="Share this to give full timer and settings control."
                  label="Control Link"
                  showOpenButton={true}
                  value={controlClientUrl}
                />
              </div>
            ) : (
              <p className="text-sm leading-6 text-foreground/68">
                Waiting for session links to become available.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
