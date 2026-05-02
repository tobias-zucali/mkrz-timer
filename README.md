# Time Timer

## AI

This repository includes agent-specific working notes in [AGENTS.md](./AGENTS.md).

## About

This project is inspired by the wonderful [Time Timer](https://www.timetimer.com/) device. I built it mainly to be used in my own workshops – get in touch @ [mkrz.at](https://mkrz.at/).

## Where to find it

The timer is deployed at [time.mkrz.at](https://time.mkrz.at).

## Getting Started

Use Node.js 20.9 or newer. This repository uses `pnpm` and is locked with `pnpm-lock.yaml`.

If `pnpm` is not available yet, enable Corepack once:

```bash
corepack enable
corepack prepare pnpm@8.11.0 --activate
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Useful commands:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
```

## Testing

Playwright is used for end-to-end coverage.

For the best visual overview, use Playwright UI mode:

```bash
pnpm test:e2e:ui
```

Other useful modes:

```bash
pnpm test:e2e:visual
pnpm test:e2e:debug
pnpm test:e2e
pnpm test:e2e:report
```

Use `pnpm test:e2e:debug` to step through the tests with Playwright Inspector.
