# TODOS

## Features

- Make sound on timer end configurable (public/sounds/\*.mp3 + off)

## UI/UX

- Change name of app and repository to mkrz timer
- improve alert & debug boxes <https://tailwindcss.com/plus/ui-blocks/application-ui/feedback/alerts> <https://tailwindcss.com/plus/ui-blocks/application-ui/overlays/notifications>
- add arrow up/down to change the values: Minutes when focus in minutes input or outside, seconds when focus in seconds input. Not at all in readonly mode, but allow it while it is running/paused as well.
- Calculate foreground color (black or white, depending on contrast to background color). Introduce a calculated primary-foreground color as well.
- Hide title input in case there is no tile & focus is not in input -> more space for timer
- Manifest für app

## CODE QUALITY

- improve structure. I prefer to have a own directory for each component, util, hook etc containing styles, tests etc next to implementation. What are good patterns for this approach?
  - document in README.md/AGENTS.md
- Prepare for internationalization https://nextjs.org/docs/app/guides/internationalization & move all strings to dictionaries/en.json

## Connections

- investigate server-relayed WebSocket transport, switching to Hetzner CX11 or a similar small VPS
- replace the current GitHub Pages/static-export deployment path with a Node-capable deployment that can host Next route handlers used by remote sessions
- document and implement the production hosting setup for `src/app/api/remote-sessions`, including where the session directory state should live outside in-memory process state
- decide whether production should keep using PeerJS cloud, run a dedicated self-hosted PeerJS server, or move to server-relayed WebSockets
- In control clients ask explicitly (tailwind dialog) to switch main to current instance. Recover in case sb else became main
