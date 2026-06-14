# Development

For product/setup context, start with the [README](../README.md).

Accessibility tree conventions live in [docs/accessibility-tree.md](./accessibility-tree.md).

## Local App And Relay

The local development setup exists to keep the common loop simple: run the app, run live sessions locally, and only add extra infrastructure when it helps validate a real risk.

`pnpm dev` starts both the Next.js app and the local relay through one runtime launcher. It prefers these ports and walks upward when they are busy:

- app: starts at `http://localhost:3000`
- relay bind: starts at `0.0.0.0:9100`
- relay websocket from the same computer: starts at `ws://127.0.0.1:9100/ws`
- relay websocket from another device on the LAN: the same relay port on `ws://<your-dev-machine-ip>:<chosen-port>/ws`
- each launcher run writes its Next.js build output to a port-derived `.next-runs/<lane>-<appPort>-<relayPort>` directory so concurrent dev and test runs do not share the same Next.js lock

You can also run the relay by itself:

```bash
pnpm dev:relay
```

Environment variables:

- `NEXT_PUBLIC_REMOTE_WS_URL`: browser websocket endpoint for live sessions
- `RELAY_HOST`: relay bind host
- `RELAY_PORT`: relay bind port
- `RELAY_SESSION_TTL_MS`: in-memory idle session expiry

## Test Lanes

The testing workflow is organized to answer the smallest useful product question first, then widen only when a change crosses boundaries.

Use the generic `pnpm test*` and `pnpm test:e2e:*` commands documented in [README.md](../README.md). `pnpm scope` remains the repo-specific helper for choosing the smallest useful first-pass lane from changed files. The launcher chooses the first free ports near the preferred defaults instead of assuming fixed ports are always available.

Local validation lanes:

- `pnpm lint`: ESLint and TypeScript validation
- `pnpm test:unit`: plain-Node `.test.ts` coverage for pure logic and server-safe code
- `pnpm test:components`: Vitest/jsdom `.test.tsx` coverage for React component behavior
- `pnpm test`: lint + unit + component + local Playwright `@smoke`
- `pnpm test:ci`: lint + unit + component + local non-visual Playwright + remote non-visual Playwright
- `pnpm test:full`: lint + unit + component + local full Playwright + remote full Playwright

Authoring rules:

- use `.test.ts` for pure logic tests that should run under `node:test`, even when the file sits near a component
- use `.test.tsx` for React/jsdom tests that should run under Vitest
- keep browser tests focused on visible product guarantees such as route behavior, control permissions, readonly behavior, synchronized timer state, recovery UX, and first-load rendering
- add `toMatchAriaSnapshot()` coverage for new standalone screens, dialogs, or panels when they introduce meaningful accessibility-tree surface that should remain stable
- prefer accessibility queries such as `getByRole`, `getByLabel`, and `getByText` when the element is user-perceivable
- move protocol/state-machine edge cases, merge branches, malformed payload handling, and other non-visual logic into unit or server-safe tests where possible
- avoid making remote debug attributes or exact participant-count convergence the main acceptance criteria for multi-client coverage
- prefer one control client plus one viewer/client for remote behavior by default; reserve 3+ clients for dedicated concurrency coverage only
- do not add broad multi-client relay tests to the default parallel local lane
- use Playwright tags to control browser-lane scope:
  - `@smoke` for the minimum must-pass browser checks
  - `@visual` for screenshot and layout-regression coverage
  - leave broader behavioral coverage untagged so it runs in the full lane only
- keep Playwright specs grouped by feature under `tests/e2e/timer`, `tests/e2e/live-session`, and `tests/e2e/support` so lane selection and validation hints can stay path-based instead of relying on fragile filename conventions
- keep agent validation hints in metadata-only `scope.yaml` files at coarse feature or subsystem boundaries; the nearest ancestor file owns the default recommendation for descendants, and any matching `rules` entry overrides that default for narrower files

Why `scope.yaml` exists:

- keep validation ownership next to the subsystem that owns it instead of in one brittle central mapping table
- let `pnpm scope` recommend the smallest useful first-pass lane before broader reruns
- make route, live-session, and contract-sensitive boundaries visible during edits
- avoid leaf-by-leaf metadata and treat exception-heavy scope files as a signal that the boundary is too fine-grained

`scope.yaml` keys:

- `commands`: array of explicit first-pass validation commands
- `contract`: boolean; set this when the boundary affects route, share-link, hydration, or recovery contracts so `pnpm scope` prints the contract-first checklist
- `rules`: optional array of narrower overrides for descendants
- `match`: descendant-relative file or folder selector for a rule; literal paths are the default, and `*` or `?` opt into glob matching

Example:

```yaml
commands:
  - pnpm test:e2e:local -- tests/e2e/timer/actions.spec.ts
rules:
  - match: settings
    commands:
      - pnpm test:e2e:local -- tests/e2e/timer/settings.spec.ts
```

Keep the model coarse:

- add a `scope.yaml` when a folder becomes a stable subsystem boundary with a default recommended lane
- prefer one parent `scope.yaml` with a few rules over many leaf scopes
- keep `scope.yaml` metadata-only; do not use markdown body text as part of the contract
- after structural changes, run `pnpm scope -- <changed paths...>` and confirm the suggested commands match the intended boundary
- if a scope recommends any `pnpm test:e2e:remote -- ...` command, finish with `pnpm test:full`

Local Playwright lane:

- runtime: `scripts/runtime-lane.mjs` allocates the first free pair and exports them to Playwright
- app server command when you want to inspect that lane manually: `pnpm dev:test`
- config: `playwright.config.ts`
- file selection: everything in `tests/e2e` except `tests/e2e/live-session/**/*.spec.ts` and `tests/e2e/timer/pwa.spec.ts`
- test scope: local-only specs that are safe to run in parallel

Remote Playwright lane:

- runtime: `scripts/runtime-lane.mjs` allocates the first free pair and exports them to Playwright
- config: `playwright.remote.config.ts`
- file selection: `tests/e2e/live-session/**/*.spec.ts`
- execution model: serial (`workers: 1`, `fullyParallel: false`)
- test scope: relay-backed multi-client, reconnect, offline, and PiP scenarios

Shared Playwright notes:

- preferred app port: `3300`
- preferred relay port: `9200`
- each Playwright run writes its test artifacts and HTML report to a matching `.playwright-runs/<lane>-<appPort>-<relayPort>/...` directory so concurrent runs do not share report or trace output
- managed `pnpm test:e2e:local*` and `pnpm test:e2e:remote*` commands take a repo-local exclusive lock before starting the Playwright app/relay runtime, so a second managed E2E run fails fast instead of racing another stack; `pnpm test:e2e:ui` is exempt and may run in parallel

Relevant commands:

- `pnpm test:e2e:local`
- `pnpm test:e2e:local:smoke`
- `pnpm test:e2e:local:ci`
- `pnpm test:e2e:remote`
- `pnpm test:e2e:remote:ci`
- `pnpm test:e2e:visual`
- `pnpm test:e2e:report`
- `pnpm scope -- <paths...>`

Smallest-first workflow:

- Start with the narrowest lane that exercises the changed contract, then widen only after that subsystem is stable.
- `pnpm test:e2e:local -- tests/e2e/timer/settings.spec.ts` runs one local Playwright spec.
- `pnpm test:e2e:remote -- tests/e2e/live-session/sync.spec.ts` runs one remote live-session spec.
- `pnpm scope -- src/shared/urlState/index.ts src/utils/liveSession/route.ts` prints a recommended first-pass validation sequence for the given files.
- `pnpm scope:audit` validates every `scope.yaml` and prints structural warnings for rule-heavy or exception-only boundaries.
- `pnpm scope` discovers the nearest ancestor `scope.yaml` for each changed file, so moving a feature usually means moving its `scope.yaml` with it instead of editing a central mapping table.
- Do not run overlapping Playwright lanes in parallel when they share ports.
- Managed local and remote E2E commands intentionally block parallel startup even when free ports exist; wait for the running command to finish before retrying, or use `pnpm test:e2e:ui` when you need a parallel interactive session.
- If a UI change is intentional and snapshots fail, update the affected aria or visual snapshots before broad reruns.
- Public informational pages and the first-use welcome flow are covered by dedicated Playwright specs. When their structure changes, update the corresponding ARIA snapshots before running the final broad lane.

Practical rule:

- If you are running the app locally, default to the generic lanes.
- If you are an agent or automation workflow choosing a validation lane, use `pnpm scope` first and then run the recommended standard test commands.

## Manual PWA Verification

Run manual PWA checks only for release-sensitive changes to the install or offline shell, not for ordinary timer UI work.

- Start from a production-style export with `pnpm test:e2e:pwa` or `pnpm build`, not `pnpm dev`.
- Verify installability in a supported browser and confirm the installed app opens in standalone mode without normal browser chrome.
- While the app is offline, reload the installed app and confirm the timer shell still renders from the cached export.
- After a service worker or offline-shell change, rebuild and verify the installed app picks up the updated version without getting stuck on stale assets.

## Prototype Workflow Skill

This repo includes a repo-local Codex skill at [`.agents/skills/prototype`](../.agents/skills/prototype/SKILL.md).

Use `$prototype` when the user explicitly asks for prototype mode and you want to defer normal closeout work while exploring.

When prototype mode ends, the agent must perform a diff-based closeout review that identifies:

- the user-visible behavior that changed
- which docs and tests must be backfilled
- the final validation lane required by the real scope
- whether security review or live-session contract updates are required

## Writing Stable Browser Tests

- Assert one eventual user-visible truth at a time: open a route, wait for one stable affordance, perform one action, then verify one synchronized outcome.
- Prefer behavior-driven readiness checks such as visible controls, readonly UI, synchronized timer values, or recovery dialogs over internal cluster readiness heuristics.
- Use tolerant numeric assertions for timer drift and small layout tolerances for pixel rounding.
- Keep helpers diagnostic rather than authoritative; if a helper needs relay debug state, treat it as a fallback signal instead of the core pass condition.
- Keep `data-testid` for non-semantic geometry checks, diagnostics, or cases where no stable accessible query exists.
- Restore broad mutable state inside each test with `finally` blocks when the test changes offline mode, opens extra contexts/pages, or creates PiP windows.

## Docker Locally

Local Docker builds make sense when the goal is deployment parity, not when the goal is fast day-to-day product iteration.

Use Docker locally when you want to:

- verify the production images still build
- check the compose stack before deployment
- debug container-only issues

Prefer plain `pnpm dev` for normal development because it is faster and keeps frontend/relay logs simpler.
