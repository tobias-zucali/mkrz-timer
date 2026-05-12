# TODOS

## Features

- Make sound on timer end configurable (public/sounds/\*.mp3 + off)

## PWA

- Persist local timer configuration and timer state so refresh/relaunch can restore the timer.
- Decide and document how restored timer state should behave after long suspension or backgrounding.
- Verify installed-app behavior on iOS Safari, Android Chrome, and desktop Chromium.
- Add remaining app-style metadata polish: screenshots, shortcuts, and any other install-surface metadata that is actually useful.
- Add an install UX strategy: rely on browser prompt only or add a cross-platform help surface for "Add to Home Screen".
- Add service worker update handling so users can refresh into new versions predictably.
- Review static-export/GitHub Pages limits for PWA headers and cache behavior; decide whether future PWA work requires different hosting.
- If notifications are wanted later: plan Web Push separately, including permission UX, VAPID keys, subscription storage, and a non-static hosting path if needed.

## UI/UX

- improve alert & debug boxes <https://tailwindcss.com/plus/ui-blocks/application-ui/feedback/alerts> <https://tailwindcss.com/plus/ui-blocks/application-ui/overlays/notifications>
- add arrow up/down to change the values: Minutes when focus in minutes input or outside, seconds when focus in seconds input. Not at all in readonly mode, but allow it while it is running/paused as well.
- Calculate foreground color (black or white, depending on contrast to background color). Introduce a calculated primary-foreground color as well.
- Hide title input in case there is no tile & focus is not in input -> more space for timer

## CODE QUALITY

- Refactor file layout toward colocated component/hook/util directories with tests/styles next to implementation.
- Document the chosen colocated file-structure conventions in README.md/AGENTS.md.
- Extract UI strings into dictionaries/en.json and complete the remaining internationalization work on top of the existing locale scaffolding.

## TESTS

- Fix the failing remote-mode e2e case in `tests/e2e/remote-client.spec.ts` where the "Send to developer" link is not visible when the PeerJS server is unavailable.

## Connections

- investigate server-relayed WebSocket transport, switching to Hetzner CX11 or a similar small VPS
- In control clients ask explicitly (tailwind dialog) to switch main to current instance. Recover in case sb else became main
