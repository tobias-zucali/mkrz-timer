---
name: prototype
description: Run fast prototype loops in this repository while intentionally deferring validation, documentation, and test updates until the user asks to finish or end prototype mode. Use when the user explicitly asks for prototype mode, wants to move quickly without running the normal validation lane yet, or wants a strict diff-based closeout review before keeping the prototype.
---

# Prototype

## Overview

Use this skill when the user explicitly wants prototype mode. Follow the prototype-mode rules defined in `AGENTS.md`. Prototype mode is description-only while exploration is in progress: move quickly, defer the normal docs/tests/validation work, and keep the user aware of meaningful scope or risk changes as they happen.

Prototype mode must always end with one of two outcomes:

1. Finish the work by backfilling docs, tests, and validation.
2. Revert the prototype-only changes if the result is not worth keeping.

## Start Prototype Mode

When the user enters prototype mode:

1. Check `git status --short` before making prototype edits.
2. If the worktree is clean, proceed.
3. If the worktree is dirty, require the user to choose one baseline decision before proceeding:
   - commit the pending changes
   - stage the pending changes
   - stash the pending changes
   - explicitly accept that prototype edits may modify the current dirty state without a reliable trace
4. Treat the last option as a warning path, not the default. State clearly that revert and closeout boundaries may become unreliable.
5. Confirm that prototype mode is active.
6. Restate the current prototype goal in one short sentence.
7. Follow the prototype-mode override rules defined in `AGENTS.md`.

## During Prototype Mode

- Move fast and defer the normal closeout work while the prototype is still exploratory.
- Keep the user informed when the retained scope changes in a way that will matter later, especially for docs, tests, validation breadth, security review, or live-session contracts.
- Prefer short reply-level notes over durable bookkeeping. Do not create or maintain a session ledger.

## Prototype Guardrails

- Treat `AGENTS.md` as the execution policy even in prototype mode.
- Treat external input, synchronized fields, URL state, persistence boundaries, and timer progression semantics with the same caution as normal mode.
- Do not confuse deferred validation with relaxed correctness for risky product contracts.

## Finish Prototype Mode

When the user asks to finish the work, end prototype mode, or make the prototype production-ready:

1. Review the current diff and identify the prototype-introduced changes.
2. Perform a diff-based closeout review before more implementation work. The review must identify:
   - the user-visible behavior that changed
   - touched contracts or invariants
   - risky areas such as live sessions, synchronization, URL state, persistence, timer semantics, and security boundaries
   - the docs and tests that now need to be added or updated
   - the final validation lane required by the real scope, including whether `pnpm test:full` is required
3. State the closeout plan clearly before executing it.
4. Resolve the deferred work and return to the standard requirements defined in [AGENTS.md](../../../AGENTS.md):
   - update affected docs
   - add or adapt affected tests
   - run the validation lane required by the affected scope
   - perform a security review when synchronized or relay-persisted fields changed
   - if live-session behavior changed, update `docs/live-sessions.md` and matching Playwright coverage
5. After implementation and validation, provide a short final review summary covering:
   - what changed
   - the main risks found during closeout review
   - what was done to reduce those risks
   - any follow-up that should become a GitHub issue

## Revert Unsatisfying Prototypes

If the user decides the prototype is not good enough:

1. Review the current diff and isolate the prototype-introduced changes.
2. Compare carefully with any pre-existing dirty work if there is ambiguity.
3. Revert only the prototype-introduced changes, not unrelated baseline changes.

Do not run destructive revert commands without the required approval.
