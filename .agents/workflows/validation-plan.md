# Validation Plan

Use for mapping a narrow diff to the smallest sufficient validation lane without running it.

- Source of truth: `AGENTS.md`, `docs/development.md`
- Model fit: suitable for a smaller or cheaper review model when the task is choosing a lane, not executing it
- Input scope: changed files, nearest `scope.yaml`, and any linked contract doc for the affected subsystem
- Inspect:
  - changed files
  - nearest `scope.yaml` files
  - `docs/development.md`
  - `AGENTS.md` hotspot and escalation guidance
- Checklist:
  - what is the narrowest lane that exercises the changed contract first
  - does `pnpm scope` likely cover the changed boundary or is manual escalation needed
  - do live sessions, synchronization, URL state, persistence, or timer progression semantics require broader coverage
  - do docs, aria snapshots, or remote specs need updating before a full rerun
  - is there a clear finish-lane recommendation separate from the first-pass lane
- Expected output:
  - blocker: proposed lane misses the changed contract or ignores an `AGENTS.md` escalation trigger
  - should-fix: first-pass lane is too broad or too narrow for the actual risk
  - optional: tighter sequencing that reduces redundant reruns
  - no issue: only if the plan is smallest-first and still sufficient
- Escalate to broader validation when:
  - the diff crosses subsystem boundaries or any `AGENTS.md` hotspot
  - local-only coverage would miss remote, route, persistence, or shared-state risk
