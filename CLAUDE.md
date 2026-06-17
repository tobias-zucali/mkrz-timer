# Claude Code — mkrz timer

Read `AGENTS.md` before starting any task. It is the execution policy for this repo.

## Non-negotiables

- **Package manager:** always `pnpm`. Never `npm` or `yarn`.
- **Validation gate:** do not consider any task done until the gate in `AGENTS.md` passes:
  1. `pnpm scope` — determines the required lane; run before anything else
  2. `pnpm lint:fix` then `pnpm lint` — must exit with 0 errors
  3. `pnpm format:fix`
  4. `pnpm test:e2e:local:smoke`
  If scope output includes "Also required", run `pnpm test:full` after step 4.
