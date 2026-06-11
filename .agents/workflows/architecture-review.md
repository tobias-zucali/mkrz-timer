# Architecture Review

Use for duplication, abstraction-fit, and ownership-boundary checks on a narrow diff.

- Source of truth: `AGENTS.md`
- Model fit: suitable for a smaller or cheaper review model when the changed files are localized
- Input scope: changed files plus directly related helpers, hooks, and feature boundaries
- Inspect:
  - touched files
  - nearest shared helpers or abstractions they build on
  - relevant `scope.yaml` boundary if present
  - one source-of-truth doc if the change crosses a documented contract
- Checklist:
  - does the change extend an existing abstraction before introducing a parallel one
  - does ownership stay with the current feature, route, or shared layer
  - does it duplicate newer functionality or bypass an existing helper
  - does it widen a boundary that should be split instead
  - does it change a contract without updating the owning doc or test plan
- Expected output:
  - blocker: parallel implementation, broken ownership boundary, or contract drift
  - should-fix: avoidable abstraction leak or misplaced responsibility
  - optional: extraction or naming cleanup that would reduce future drift
  - no issue: only if the diff fits existing ownership and abstractions cleanly
- Escalate to broader validation when:
  - the change crosses routes, shared state, live-session contracts, or multiple subsystems
  - the review finds contract drift that likely affects behavior outside the local diff
