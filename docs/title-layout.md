# Timer Title Layout

This note captures the current constraints for the timer title UI so future layout work does not accidentally reintroduce oversized hit areas, unstable height shifts, or partially visible extra lines.

## Current Rules

- Titles are plain text and limited to 64 characters after shared normalization.
- Titles are single-paragraph only. Line breaks are flattened to spaces, tabs become spaces, and unsafe control characters are removed.
- Main and floating titles use two deterministic Tailwind size buckets:
  - short: `trim().length <= 32`
  - long: `trim().length > 32`
- Non-editing titles stay wrapped as a single paragraph up to the variant's height budget.
- Empty readonly titles collapse to a minimal spacer instead of reserving a large blank title block.

## Editing Behavior

- Empty editable titles do not render a full-width invisible input.
- Empty editable titles show an explicit `Add title` action.
- The inline timer editor opens only after the user activates the title affordance.
- The inline editor uses a wrapping textarea with the same size bucket as display state and enforces the 64-character limit.
- Manual line breaks are blocked in the inline editor and the settings drawer title field; pasted line breaks are normalized to spaces.
- The title band keeps a responsive minimum height, but it may grow to fit wrapped title content within the configured max-height budget.

## Layout Constraints

- Display and editing use the same wrapped title sizing so long titles remain fully visible from the initial render.
- Editing still allows automatic wrapping up to the configured height budget, but it must not change the title's top-left position on focus.
- Empty-title space should stay visually small enough that the timer display remains the dominant element.
- Any future title-layout change should be checked in local use, readonly live-session viewing, mobile portrait, mobile landscape, and the floating timer window.

## Test Expectations

- Component tests cover empty-state affordances, newline blocking/normalization, and short/long size bucket selection.
- Unit tests cover title normalization and the bucket threshold.
- Playwright covers empty, short-bucket, and long-bucket title layouts across form factors, including checks that long titles are fully visible from the initial render.
