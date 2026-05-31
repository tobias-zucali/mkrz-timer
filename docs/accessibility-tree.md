# Accessibility Tree Conventions

This app treats the accessibility tree as a first-class UI surface.

## Core Rules

- Prefer native HTML semantics before adding ARIA.
- Every actionable control must have a stable accessible name.
- Use role/name/label queries in tests whenever the element is user-perceivable.
- Reserve `data-testid` for non-semantic helpers, geometry checks, or cases with no stable accessible query.

## Timer Surface

- The timer workspace must remain inside a single named `main` region.
- Idle local editing uses labeled form controls for minutes and seconds.
- Running, paused, finished, floating, and viewer/read-only timer states use a semantic read-only timer readout instead of readonly number inputs.
- The main timer area must expose remote/view-only state inline, not only inside the status panel.

## Dynamic Announcements

- Announce meaningful state changes through a dedicated live region.
- Announce timer start, pause, reset, timeout, step changes, and important countdown milestones only.
- Announce remote/session state transitions when the user would otherwise miss them.
- Do not rely on a visible status badge alone to communicate state changes.

## Decorative UI

- Decorative SVGs, pulse dots, and icon-only glyphs must be hidden from assistive tech.
- If a button already has an accessible name, its icon must stay `aria-hidden`.
- Do not expose duplicate visual chips or ornaments as extra status text.

## Dialogs And Overlays

- Use `dialog` for non-urgent modal overlays.
- Use `alertdialog` for destructive or interruptive confirmation flows.
- Modal surfaces must have a label, a description when helpful, trapped focus, and a clear dismissal path.

## Regression Coverage

- Keep aria snapshots for structurally distinct screens and overlays.
- Add focused regression tests for critical accessible names, roles, and announcement text when semantics change.
- When a new UI pattern is introduced, decide its accessibility-tree contract before expanding visual coverage.
