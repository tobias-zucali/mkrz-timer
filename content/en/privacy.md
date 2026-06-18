---
title: Privacy
description: Privacy information and data handling for mkrz timer.
---

# Privacy

mkrz timer is designed to be usable without creating an account.

The project aims to keep data handling understandable, transparent, and privacy-conscious.

## Local timers

You can use mkrz timer entirely within your browser.

When using a local timer:

- no account is required
- no live session is created
- timer data remains on your device
- no timer state is sent to the synchronization relay

The application may store a small amount of information in browser storage to support functionality and convenience features.

This currently includes:

- restored local timer entries in `timer.localLibrary`
- preferences for including non-default settings in shared links in `timer.share.includeVoiceSoundSettings`

The current implementation does not persist live-session access tokens in `localStorage`.

## Live sessions

mkrz timer also supports live sessions that allow multiple devices to stay in sync.

When using live sessions:

- timer state is synchronized through the relay service
- a join link can be shared with participants
- a manage link is used to control the session
- anyone with the corresponding link can access the session

These links act as access credentials and should be treated accordingly.

## Server-side handling

The synchronization relay currently stores active session data in memory while sessions are running.

This may include:

- synchronized timer state
- participant information required for synchronization
- join and manage tokens
- operational metadata required for session recovery

The project does not currently rely on a dedicated database for normal live-session operation.

## Infrastructure

The hosted infrastructure currently operates within the European Union.

The relay infrastructure is currently hosted in Frankfurt, Germany.

## No advertising or tracking focus

mkrz timer is not intended as an advertising or behavioral tracking platform.

We do not currently aim to build advertising profiles, behavioral analytics systems, or personalization systems around the application.

## Open source transparency

The source code is publicly available on [GitHub](https://github.com/tobias-zucali/mkrz-timer).

The open-source nature of the project is intended to make technical behavior easier to understand and review.

## Your choices

You can:

- use local timers only
- avoid live sessions
- clear browser storage through your browser settings
- stop using the hosted service at any time

## Contact

Questions, feedback, or privacy-related concerns are welcome.

See the [Contact](/contact) page for contact information.
