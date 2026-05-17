import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import SyncConflictDialog from "./index"

describe("SyncConflictDialog", () => {
  it("renders the conflict copy and action buttons", () => {
    render(
      <SyncConflictDialog
        onUseLocal={() => undefined}
        onUseServer={() => undefined}
      />,
    )

    expect(
      screen.getByRole("dialog", {
        name: "URL state and server state differ.",
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Use server state" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: "Overwrite server using URL params",
      }),
    ).toBeInTheDocument()
  })

  it("calls the selected conflict resolution handler", () => {
    const onUseLocal = vi.fn()
    const onUseServer = vi.fn()

    render(
      <SyncConflictDialog onUseLocal={onUseLocal} onUseServer={onUseServer} />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Use server state" }))
    fireEvent.click(
      screen.getByRole("button", {
        name: "Overwrite server using URL params",
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
        onUseLocal={() => undefined}
        onUseServer={() => undefined}
      />,
    )

    const useServerButton = screen.getByRole("button", {
      name: "Use server state",
    })
    const overwriteButton = screen.getByRole("button", {
      name: "Overwrite server using URL params",
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
