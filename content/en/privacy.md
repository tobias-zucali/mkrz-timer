---
title: Privacy
description: Privacy information and data handling for mkrz timer.
---

# Privacy

mkrz timer is a personal side project by Tobias Zucali, Co-Founder of [mkrz lab](https://www.mkrz.at/).

This page explains how local-only usage and live sessions work in the current implementation, which information may be stored in your browser, and how the relay currently handles synchronized sessions.

We aim to keep the project privacy-conscious, transparent, and understandable.

## Local-only usage

mkrz timer can be used directly in the browser without creating an account.

In local-only mode:

- timer state remains in your browser unless you share a link
- no timer information is synchronized with the live-session relay
- no account is required
- no remote session is created

Depending on the features you use, the application may store a small amount of information in `localStorage`.

In the current implementation, this includes:

- recent and current local timer snapshots in `timer.localLibrary`
- the share-panel preference in `timer.share.includeVoiceSoundSettings`
- the welcome-banner dismissal flag in `timer.welcomeBanner.v1.dismissed`

We do not currently use browser cookies for the timer itself, and we do not currently use `sessionStorage` for the timer state described on this page.

In local-only mode, this information remains on your device unless you intentionally share a URL.

## Live synchronized sessions

mkrz timer also supports synchronized live sessions that allow multiple devices or participants to stay in sync.

When live synchronization is used:

- timer state is synchronized through the relay service
- separate control and readonly access links are created
- the access tokens are part of the shared URLs
- participants opening the same session can see synchronized timer changes

The current implementation does **not** use a verified email address as the session key.

Instead, the live-session system uses:

- a generated session id
- a generated control token
- a generated readonly token

These values are treated as access credentials. They may appear in browser history, copied links, chat messages, emails, or other places where you intentionally share the URL.

The client currently keeps live-session state in memory while the page is open. The application does not currently store live-session access tokens in browser `localStorage`.

## Server-side live-session handling

The current relay implementation keeps live-session data in server memory.

This currently includes:

- the canonical synchronized timer snapshot
- the participant list for connected clients
- the generated access tokens
- in-memory recovery metadata used to rebuild control sessions after disconnects or relay restarts

Active sessions are removed from the active-session map after an inactivity timeout.

The current implementation does not write the live-session snapshot to a dedicated database in normal operation.

The relay health endpoint and server process may still expose or create ordinary operational data such as logs, error output, and connection diagnostics needed to run and debug the service.

Because the current recovery metadata also lives in server memory, some live-session metadata may remain in memory until the relay process restarts, even after an active session has ended.

## Infrastructure and hosting

The project infrastructure is currently hosted within the European Union.

The server infrastructure is currently operated in Frankfurt, Germany.

Applicable Austrian and European Union privacy regulations, including GDPR/DSGVO requirements, are intended to apply where relevant.

## Third-party services

The hosted application may depend on infrastructure providers or technical services required to operate the relay and hosting setup.

At the time of writing, this includes hosting infrastructure provided through Hetzner.

## No advertising or tracking focus

The project is not intended as an advertising or behavioral tracking platform.

We currently do not aim to build user profiles, behavioral analytics systems, or advertising personalization systems around the application.

## Open source transparency

The source code of the project is publicly available:

- [GitHub repository](https://github.com/tobias-zucali/mkrz-timer)

The open-source nature of the project is intended to make technical behavior more transparent and reviewable.

## Your choices

You can:

- use the application locally without starting a live session
- avoid creating or joining synchronized sessions
- clear browser storage locally through your browser settings
- stop using the hosted service at any time

## Changes

This privacy page may evolve together with the project and its infrastructure.

Changes to synchronization behavior, storage handling, or infrastructure may result in updates to this page.

## Contact

For privacy-related questions, accessibility concerns, collaboration inquiries, or general feedback:

mkrz lab OG – Tobias Zucali
Peter-Behrens-Platz 3
4020 Linz
Austria
<timer@mkrz.at>
