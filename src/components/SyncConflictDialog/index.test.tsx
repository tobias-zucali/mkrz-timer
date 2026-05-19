import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import SyncConflictDialog from "./index"

describe("SyncConflictDialog", () => {
  it("renders the conflict copy and action buttons", () => {
    render(
      <SyncConflictDialog
        actions={[
          { label: "Use server state", onClick: () => undefined },
          {
            label: "Push local changes",
            onClick: () => undefined,
            tone: "primary",
          },
        ]}
        description="Choose which timer setup should continue before remote sync resumes."
        title="Live session state changed during recovery."
      />,
    )

    expect(
      screen.getByRole("dialog", {
        name: "Live session state changed during recovery.",
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Use server state" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: "Push local changes",
      }),
    ).toBeInTheDocument()
  })

  it("calls the selected conflict resolution handler", () => {
    const onUseLocal = vi.fn()
    const onUseServer = vi.fn()

    render(
      <SyncConflictDialog
        actions={[
          { label: "Use server state", onClick: onUseServer },
          { label: "Push local changes", onClick: onUseLocal, tone: "primary" },
        ]}
        description="Choose which timer setup should continue before remote sync resumes."
        title="Live session state changed during recovery."
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Use server state" }))
    fireEvent.click(
      screen.getByRole("button", {
        name: "Push local changes",
      }),
    )

    expect(onUseServer).toHaveBeenCalledTimes(1)
    expect(onUseLocal).toHaveBeenCalledTimes(1)
  })

  it("focuses the safe default action and traps keyboard focus inside the dialog", async () => {
    const outsideButton = document.createElement("button")
    outsideButton.textContent = "Outside"
    document.body.appendChild(outsideButton)

    render(
      <SyncConflictDialog
        actions={[
          { label: "Use server state", onClick: () => undefined },
          {
            label: "Push local changes",
            onClick: () => undefined,
            tone: "primary",
          },
        ]}
        description="Choose which timer setup should continue before remote sync resumes."
        title="Live session state changed during recovery."
      />,
    )

    const useServerButton = screen.getByRole("button", {
      name: "Use server state",
    })
    const overwriteButton = screen.getByRole("button", {
      name: "Push local changes",
    })

    await waitFor(() => expect(useServerButton).toHaveFocus())

    overwriteButton.focus()
    fireEvent.keyDown(document, { key: "Tab" })
    expect(useServerButton).toHaveFocus()

    useServerButton.focus()
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true })
    expect(overwriteButton).toHaveFocus()

    outsideButton.focus()
    await waitFor(() => expect(useServerButton).toHaveFocus())

    outsideButton.remove()
  })
})
