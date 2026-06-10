# Prototype Closeout Reference

## Repository Rules

These rules come from the repository's `AGENTS.md`:

- Skip validation commands while prototype mode is active.
- Defer documentation updates, test updates, and the full validation lane until the user asks to end prototype mode or finish the work.
- As soon as prototype mode ends, add or adapt the relevant documentation and tests, then run the full required validation lane before considering the work complete.
- Use `AGENTS.md` as the source of truth for the standard post-edit validation commands and for when `pnpm agent:test:full` is required.

## Closeout Checklist

Use this checklist when `scripts/prototype_session.mjs finish-plan --repo "$PWD"` reports deferred work:

1. Review the ledger notes and current git diff.
2. Review the prototype-introduced changes with the current diff and decide what stays.
3. Update docs affected by the prototype.
4. Add or adapt tests affected by the prototype.
5. Run the standard validation commands required by `AGENTS.md`.
6. Run `pnpm agent:test:full` when `AGENTS.md` says full validation is required for the affected scope.
7. Perform a security review when synchronized or relay-persisted fields changed.

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
