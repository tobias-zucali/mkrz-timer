import { fireEvent, screen } from "@testing-library/react"

import { DEFAULT_SYNC_PARAMS } from "@/shared/security/input"
import { renderWithIntl } from "@/test/renderWithIntl"

import RecentTimersDialog from "./RecentTimersDialog"

function buildEntry({
  id,
  pageTitle,
  stepTitle,
}: {
  id: string
  pageTitle: string
  stepTitle: string
}) {
  return {
    createdAt: 100,
    id,
    pageTitle,
    params: {
      ...DEFAULT_SYNC_PARAMS,
      rows: [
        {
          ...DEFAULT_SYNC_PARAMS.rows[0],
          title: stepTitle,
        },
      ],
    },
    updatedAt: 200,
  }
}

describe("RecentTimersDialog", () => {
  it("renders the non-durable storage copy and recent timer entries", () => {
    renderWithIntl(
      <RecentTimersDialog
        currentEntryId="entry-1"
        entries={[
          buildEntry({
            id: "entry-1",
            pageTitle: "Workshop timer",
            stepTitle: "Opening",
          }),
        ]}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole("heading", { name: "Recent timers" })).toBeVisible()
    expect(
      screen.getByText(
        "Open a timer previously used in this browser and replace the current timer. Recent timers are stored only in this browser and may be removed when browser data is cleared.",
      ),
    ).toBeVisible()
    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent(
      "Workshop timer",
    )
  })

  it("uses a fallback label for untitled timers and forwards selection", () => {
    const onSelect = vi.fn()

    renderWithIntl(
      <RecentTimersDialog
        currentEntryId={null}
        entries={[
          buildEntry({
            id: "entry-2",
            pageTitle: "",
            stepTitle: "",
          }),
        ]}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Untitled timer/ }))

    expect(screen.getByText("Untitled timer")).toBeVisible()
    expect(onSelect).toHaveBeenCalledWith("entry-2")
  })

  it("uses the first non-empty step title before falling back to untitled", () => {
    renderWithIntl(
      <RecentTimersDialog
        currentEntryId={null}
        entries={[
          buildEntry({
            id: "entry-3",
            pageTitle: "",
            stepTitle: "Opening remarks",
          }),
        ]}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: /Opening remarks/ }),
    ).toBeVisible()
    expect(screen.getByText("1 step")).toBeVisible()
  })
})
