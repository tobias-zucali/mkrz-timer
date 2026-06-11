# Prototype Closeout Reference

## Repository Rules

- `AGENTS.md` is the source of truth for standard validation, documentation, testing, and security requirements.
- Prototype mode temporarily defers those requirements while behavior is still exploratory.
- When prototype mode ends, return to `AGENTS.md` defaults and resolve deferred work before considering the task complete.

## Closeout Checklist

Use this checklist when `scripts/prototype_session.mjs finish-plan --repo "$PWD"` reports deferred work:

1. Review the ledger notes and current git diff.
2. Review the prototype-introduced changes with the current diff and decide what stays.
3. Update docs affected by the prototype.
4. Add or adapt tests affected by the prototype.
5. Run the validation lane required by `AGENTS.md` for the affected scope.
6. Perform a security review when synchronized or relay-persisted fields changed.

## Live Session Reminder

If live-session behavior changed:

- Update `docs/live-sessions.md`.
- Update Playwright coverage in the same change.
- Preserve strict separation between readonly and control capabilities.

## Revert Reminder

If the prototype is not worth keeping:

1. Use `revert-plan` to identify files changed after prototype mode started.
2. Review the candidate changes against the current diff before reverting.
3. Preserve any files that were already dirty before prototype mode began.
4. Revert only the prototype-introduced changes with explicit approval for destructive commands.
