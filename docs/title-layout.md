# Timer Title Layout

This note captures the current constraints for the timer title UI so future layout work does not accidentally reintroduce oversized hit areas or unstable text scaling.

## Current Rules

- Titles are plain text and limited to 64 characters after shared normalization.
- Line breaks are preserved. `\r\n` is normalized to `\n`, tabs become spaces, and unsafe control characters are removed.
- Main timer titles render up to four visible lines before clipping.
- Floating timer titles render up to three visible lines before clipping.
- Long titles shrink before they overflow. Scaling is deterministic and based on visible line count plus character density rather than runtime DOM measurement.
- Empty readonly titles collapse to a minimal spacer instead of reserving a large blank title block.

## Editing Behavior

- Empty editable titles do not render a full-width invisible input.
- Empty editable titles show an explicit `Add title` action.
- The inline timer editor opens only after the user activates the title affordance.
- The inline editor uses a multiline textarea with the same scaling rules as the display state and enforces the 64-character limit.
- The settings drawer title field is multiline and enforces the same limit so local, URL, and remote edits stay aligned.

## Layout Constraints

- Title text uses `whitespace-pre-wrap` and `break-words`.
- Overflow protection relies on line-height plus max-height clipping, not browser-specific line-clamp behavior.
- Empty-title space should stay visually small enough that the timer display remains the dominant element.
- Any future title-layout change should be checked in local mode, readonly remote mode, mobile portrait, mobile landscape, and the floating timer window.

## Test Expectations

- Component tests cover empty-state affordances and adaptive sizing.
- Unit tests cover title normalization and scaling decisions.
- Playwright covers long-title rendering in local mode, readonly remote mode, fullscreen, and visual regression snapshots across form factors.
