---
name: prototype
description: Run fast prototype loops in this repository while intentionally deferring validation, documentation, and test updates until the user asks to finish or end prototype mode. Use when the user explicitly asks for prototype mode, wants to move quickly without running the normal validation lane yet, or wants a controlled way to either backfill all deferred work at the end or revert the prototype-only changes if the result is not good enough.
---

# Prototype

## Overview

Use this skill when the user explicitly wants prototype mode. Follow the prototype-mode rules defined in `AGENTS.md` and keep a persistent closeout ledger. The ledger is the source of truth for deferred prototype obligations, and prototype mode must always end with one of two outcomes:

1. Finish the work by backfilling docs, tests, and validation.
2. Revert the prototype-only changes if the result is not worth keeping.

## Start Prototype Mode

When the user enters prototype mode:

1. Confirm that prototype mode is active.
2. Start or refresh the session ledger:

```bash
scripts/prototype_session.mjs start --repo "$PWD" --goal "<short goal>"
```

3. Follow the prototype-mode override rules defined in `AGENTS.md`.

## During Prototype Mode

Update the ledger when the retained scope or closeout obligations change:

```bash
scripts/prototype_session.mjs update --repo "$PWD" --note "<what changed>"
```

Add flags when they become relevant:

```bash
scripts/prototype_session.mjs update --repo "$PWD" --note "Touched shared session sync" --needs-full-validation --needs-security-review
scripts/prototype_session.mjs update --repo "$PWD" --note "Changed live-session contract" --doc docs/live-sessions.md --test tests/e2e/remote-sync.spec.ts --needs-full-validation
```

Record only the docs, tests, validation requirements, and security-review obligations that matter for closeout.

## Prototype Guardrails

- Treat `AGENTS.md` as the execution policy even in prototype mode.
- Treat the ledger as the source of truth for deferred prototype obligations.
- Record deferred work clearly enough that closeout can return to the normal `AGENTS.md` requirements.

## Finish Prototype Mode

When the user asks to finish the work, end prototype mode, or make the prototype production-ready:

1. Inspect the current ledger:

```bash
scripts/prototype_session.mjs status --repo "$PWD"
```

2. Review the current diff and identify the prototype-introduced changes.
3. Generate the closeout plan:

```bash
scripts/prototype_session.mjs finish-plan --repo "$PWD"
```

4. Resolve all deferred work recorded in the ledger and return to the standard requirements defined in [AGENTS.md](../../../AGENTS.md):
   - update affected docs
   - add or adapt affected tests
   - run the validation lane required by the affected scope
   - perform a security review when synchronized or relay-persisted fields changed
   - if live-session behavior changed, update `docs/live-sessions.md` and matching Playwright coverage

5. After successful closeout, archive the session:

```bash
scripts/prototype_session.mjs finish --repo "$PWD"
```

## Revert Unsatisfying Prototypes

If the user decides the prototype is not good enough:

1. Show the revert candidates:

```bash
scripts/prototype_session.mjs revert-plan --repo "$PWD"
```

2. Review the candidate list and compare it with the current diff if there is any ambiguity, especially when the repo was already dirty before prototype mode started.
3. Revert only the prototype-introduced changes, not the baseline dirty work that existed before prototype mode started.
4. After reverting, archive the session:

```bash
scripts/prototype_session.mjs abandon --repo "$PWD"
```

Do not run destructive revert commands without the required approval.
