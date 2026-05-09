# TODOS

## Features

- Make sound on timer end configurable (public/sounds/\*.mp3 + off)

## UI/UX

- improve alert & debug boxes <https://tailwindcss.com/plus/ui-blocks/application-ui/feedback/alerts> <https://tailwindcss.com/plus/ui-blocks/application-ui/overlays/notifications>
- add arrow up/down to change the values: Minutes when focus in minutes input or outside, seconds when focus in seconds input. Not at all in readonly mode, but allow it while it is running/paused as well.
- Calculate foreground color (black or white, depending on contrast to background color). Introduce a calculated primary-foreground color as well.
- Hide title input in case there is no tile & focus is not in input -> more space for timer

## CODE QUALITY

- improve structure. I prefer to have a own directory for each component, util, hook etc containing styles, tests etc next to implementation. What are good patterns for this approach?
  - document in README.md/AGENTS.md
- Allow dev server next to e2e server, so I don't block the ports when using it

## Connections

- Integrate Remote Status in email error report.
- Add a visible readonly-state placeholder while a viewer is still connecting, instead of showing a normal timer that has not synced yet.
- Improve auto-reconnect so remote sessions recover reliably without user action, with clear UI for reconnecting, recovered, and failed states.
- Add a manual retry action only as a fallback when auto-reconnect cannot recover within a reasonable time.
- Clarify or harden ownership rules when two control clients try to claim the same session during failover at the same time.
- Keep role selection with the sharer: if the UX changes, recipients must not be able to self-upgrade from readonly to controlling without an explicit host decision.
- In case of main connection lost:
  - Try to recover/reconnect automatically
  - Always reflect current state in info area src/app/page.tsx@205
  - In control clients ask explicitly (tailwind dialog) to switch main to current instance. Recover in case sb else became main
  - Readonly clients can not become main, if not connected show "connecting…" instead of timer
