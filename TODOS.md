# TODOS

## BUGS

- floating timer: the pie-animation is not visible anymore.
- QR Code overlays are not fullscreen anymore.
  - also chose better titles for the overlays – the context to the timer needs to be clear
- Page.tsx: the isSettingsRendered is pretty complex… simplify it. I would prefer to leave the drawer and the timer always in the dom, just disable the inputs and move the drawer out of view when not needed. I would prefer if the timer is visible in the background while the drawer is open. Make sure no elements of the drawer block the UI when it's closed.
  - fix test "keeps timer shortcuts local to the settings drawer"

## UX

- improve alert & debug boxes <https://tailwindcss.com/plus/ui-blocks/application-ui/feedback/alerts> <https://tailwindcss.com/plus/ui-blocks/application-ui/overlays/notifications>
- add arrow up/down to change the values: Minutes when focus in minutes input or outside, seconds when focus in seconds input. Not at all in readonly mode, but allow it while it is running/paused as well.
- Calculate foreground color (black or white, depending on contrast to background color). Introduce a calculated primary-foreground color as well.
- Make sound on timer end configurable (there are different mp3 and off)

## CODE QUALITY

- improve structure. I prefer to have a own directory for each component, util, hook etc containing styles, tests etc next to implementation. What are good patterns for this approach?
  - document in README.md/AGENTS.md
- Allow dev server next to e2e server, so I don't block the ports when using it

## Connections

- In case of network problems: make it explicit when connection is lost and try to reconect
