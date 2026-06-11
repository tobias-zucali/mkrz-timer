# Accessibility Review

Use for keyboard, focus, announcements, accessible naming, and i18n-copy ownership review.

- Source of truth: `AGENTS.md`, `docs/accessibility-tree.md`, `docs/i18n.md`
- Model fit: suitable for a smaller or cheaper review model when the diff is limited to UI, messages, or interaction states
- Input scope: changed components, dialogs, message files, and the nearest feature or accessibility test
- Inspect:
  - touched UI components and message bundles
  - `docs/accessibility-tree.md`
  - `docs/i18n.md`
  - nearby aria or component tests when present
- Checklist:
  - do controls keep stable accessible names and native semantics where possible
  - do dialogs, overlays, and focus flows still have a clear label and dismissal path
  - do important state changes still announce through the existing announcement pattern
  - does copy stay in the correct i18n ownership namespace without creating avoidable top-level bundles
  - does the change introduce ambiguity for keyboard, screen-reader, or locale-specific flows
- Expected output:
  - blocker: broken keyboard/focus path, missing accessible name, or wrong-ownership locale change that breaks lookup
  - should-fix: missing announcement, ambiguous copy, or avoidable ARIA misuse
  - optional: stronger semantic query coverage or namespace cleanup
  - no issue: only if accessibility and i18n ownership stay consistent
- Escalate to broader validation when:
  - aria snapshots, announcement behavior, route-localized flows, or multi-state UI semantics change
  - browser coverage is needed to confirm focus, announcements, or localized route behavior
