import { fireEvent, screen, waitFor } from "@testing-library/react"

import { renderWithIntl } from "@/test/renderWithIntl"

import ActionDialog from "./index"

describe("ActionDialog", () => {
  it("renders an accessible dialog with its actions", () => {
    renderWithIntl(
      <ActionDialog
        actions={[
          { label: "Cancel", onClick: () => undefined },
          { label: "Continue", onClick: () => undefined, tone: "primary" },
        ]}
        description="Choose whether the timer should stay connected."
        eyebrow="Live session"
        title="End the live session?"
      />,
    )

    expect(
      screen.getByRole("dialog", { name: "End the live session?" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Choose whether the timer should stay connected."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument()
  })

  it("focuses the default action and traps keyboard focus", async () => {
    const outsideButton = document.createElement("button")
    outsideButton.textContent = "Outside"
    document.body.appendChild(outsideButton)

    renderWithIntl(
      <ActionDialog
        actions={[
          { label: "Cancel", onClick: () => undefined },
          { label: "Continue", onClick: () => undefined, tone: "primary" },
        ]}
        defaultFocusActionIndex={1}
        description="Choose whether the timer should stay connected."
        title="End the live session?"
      />,
    )

    const cancelButton = screen.getByRole("button", { name: "Cancel" })
    const continueButton = screen.getByRole("button", { name: "Continue" })

    await waitFor(() => expect(continueButton).toHaveFocus())

    continueButton.focus()
    fireEvent.keyDown(document, { key: "Tab" })
    expect(cancelButton).toHaveFocus()

    cancelButton.focus()
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true })
    expect(continueButton).toHaveFocus()

    outsideButton.focus()
    await waitFor(() => expect(continueButton).toHaveFocus())

    outsideButton.remove()
  })

  it("renders optional dialog body content above the actions", () => {
    renderWithIntl(
      <ActionDialog
        actions={[{ label: "Continue", onClick: () => undefined }]}
        description="Choose whether the timer should stay connected."
        title="End the live session?"
      >
        <button type="button">Send Debug Info</button>
      </ActionDialog>,
    )

    expect(
      screen.getByRole("button", { name: "Send Debug Info" }),
    ).toBeInTheDocument()
  })
})
