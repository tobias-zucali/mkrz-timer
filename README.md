# mkrz timer

`mkrz timer` is a workshop timer built for local facilitation and simple remote sharing, so one person can stay in control while other people follow the same timer from their own screens.

## Product Goals

- Keep the timer fast to start and easy to operate during workshops.
- Let one person share the current timer with other browsers without handing over control by accident.
- Keep the product privacy-first by transferring and storing as little user data as possible.
- Keep the hosted setup small enough to operate without unnecessary infrastructure.
- Favor implementation complexity only when it produces a clear user or operator benefit.

Agent-facing repo guidance lives in [AGENTS.md](./AGENTS.md).
Technical details live in:

- [docs/development.md](./docs/development.md)
- [docs/documentation.md](./docs/documentation.md)
- [docs/i18n.md](./docs/i18n.md)
- [docs/live-sessions.md](./docs/live-sessions.md)
- [docs/title-layout.md](./docs/title-layout.md)
- [docs/deploy-hetzner.md](./docs/deploy-hetzner.md)

## Security Notes

- Treat all URL params, local edits, and relay-synchronized payloads as untrusted input.
- Timer titles are plain text only, normalized to a single paragraph, and shared session snapshots are validated before use.
- See [docs/live-sessions.md](./docs/live-sessions.md) for trust boundaries, sanitization rules, dangerous patterns, and how to add new synchronized fields safely.

## Getting Started

Use Node.js `22.12.0` or newer and `pnpm`.

```bash
corepack enable
corepack prepare pnpm@8.11.0 --activate
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

ESLint includes `eslint-plugin-better-tailwindcss` in the shared flat config. For editor feedback, enable your editor's ESLint integration so Tailwind class issues surface inline; no separate Tailwind-specific editor plugin is required for linting.

The config uses the plugin's recommended preset, with `better-tailwindcss/enforce-consistent-line-wrapping` disabled because Prettier rewrites multiline JSX class strings in a way that does not stay stable with that rule.

## Common Commands

```bash
pnpm dev
pnpm test
pnpm test:full # including visual tests
pnpm build
pnpm lint:fix
pnpm format:fix
```

## Prototype Mode

If you explicitly ask an agent for prototype mode, the repo-specific workflow and diff-based closeout review policy live in [AGENTS.md](./AGENTS.md) and [`.agents/skills/prototype`](./.agents/skills/prototype/SKILL.md).

## Live Sessions

See [docs/live-sessions.md](./docs/live-sessions.md) for the live-session user contract, capability boundaries, trust boundaries, and contributor rules.

## Local Development

See [docs/development.md](./docs/development.md) for local setup goals, runtime defaults, test lanes, and when Docker makes sense locally.

## Testing

Use `pnpm test*` and `pnpm test:e2e:*` commands. Use `pnpm scope` when you want the repo-specific validation helper.

## Deployment

See [docs/deploy-hetzner.md](./docs/deploy-hetzner.md) for the deployment goals, operator checks, and the workflow/script files that act as the executable source of truth.

## Maintainer Tools

- [tools/project-export/README.md](./tools/project-export/README.md): maintainer-only GitHub Project export utility, separate from the app runtime and implementation
