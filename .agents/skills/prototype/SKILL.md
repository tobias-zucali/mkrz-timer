---
name: prototype
description: Run fast prototype loops in this repository while intentionally deferring validation, documentation, and test updates until the user asks to finish or end prototype mode. Use when the user explicitly asks for prototype mode, wants to move quickly without running the normal validation lane yet, or wants a controlled way to either backfill all deferred work at the end or revert the prototype-only changes if the result is not good enough.
---

# Prototype

## Overview

Use this skill when the user explicitly wants prototype mode. Follow the prototype-mode rules defined in `AGENTS.md` and keep a persistent closeout ledger so prototype mode always ends with one of two outcomes:

1. Finish the work by backfilling docs, tests, and validation.
2. Revert the prototype-only changes if the result is not worth keeping.

Read [references/prototype-closeout.md](references/prototype-closeout.md) before starting if the task touches sessions, synchronization, persistence, shared state, or any live-session behavior.

## Start Prototype Mode

When the user enters prototype mode:

1. Confirm that prototype mode is active.
2. Start or refresh the session ledger:

```bash
scripts/prototype_session.mjs start --repo "$PWD" --goal "<short goal>"
```

3. Follow the prototype-mode override rules defined in `AGENTS.md`.

## During Prototype Mode

### Example Ledger Updates

After each meaningful change set, update the ledger:

```bash
scripts/prototype_session.mjs update --repo "$PWD" --note "<what changed>"
```

Add flags when they become relevant:

```bash
scripts/prototype_session.mjs update --repo "$PWD" --note "Touched shared session sync" --needs-full-validation --needs-security-review
scripts/prototype_session.mjs update --repo "$PWD" --note "Changed live-session contract" --doc docs/live-sessions.md --test tests/e2e/remote-sync.spec.ts --needs-full-validation
scripts/prototype_session.mjs update --repo "$PWD" --note "Changed developer workflow docs" --doc docs/development.md
```

These examples are illustrative. Record the docs, tests, validation requirements, and review obligations that are relevant to the specific prototype.

## Prototype Guardrails

- Treat `AGENTS.md` as the execution policy even in prototype mode.
- Keep files short and focused; prototype mode does not permit sloppy structure.
- Treat external and user-controlled values as untrusted.
- Record deferred work and review obligations in the ledger so closeout can follow `AGENTS.md` correctly.

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

4. Resolve all deferred work recorded in the ledger and return to the standard requirements defined in [AGENTS.md](../../../AGENTS.md).

5. After successful closeout, archive the session:

```bash
scripts/prototype_session.mjs finish --repo "$PWD"
```

Do not skip the backfill just because the prototype already "works."

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

## Decision Rule

Prototype mode must end in exactly one of these states:

1. `finish`: deferred docs, tests, validation, and required reviews are all completed.
2. `abandon`: the prototype-only changes are reverted.

Do not leave prototype mode with an unresolved partial closeout.
