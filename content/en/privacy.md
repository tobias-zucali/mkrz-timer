---
title: Privacy
description: Privacy information and data handling for mkrz timer.
---

# Privacy

mkrz timer is a personal side project by Tobias Zucali, Co-Founder of [mkrz lab](https://www.mkrz.at/).

This page explains how local-only and synchronized remote usage work, which information may be stored locally in the browser, and how remote sessions are handled.

We aim to keep the project privacy-conscious, transparent, and understandable.

## Local-only usage

mkrz timer can be used directly in the browser without creating an account.

In local-only mode:

- timer state remains on your device
- no timer information is synchronized with the shared session service
- no account is required
- no remote session is created

Depending on the features used, the application may store information locally in the browser to restore sessions, preferences, or interface state.

This may include:

- local browser storage
- session storage
- local preferences or timer configuration
- dismissed onboarding or welcome states

In local-only mode, this information remains on your device unless you intentionally share it.

## Remote synchronized sessions

mkrz timer also supports synchronized remote sessions that allow multiple devices or participants to stay in sync.

When remote synchronization is used:

- timer state is synchronized through the shared session service
- synchronized session information may temporarily exist within the synchronization infrastructure
- remote session identifiers may be shared through URLs or session links
- participants opening the same session can see synchronized timer changes

Remote sessions use the verified email address as the session key.

The synchronized state is intended only to provide the collaborative timer functionality.

## Infrastructure and hosting

The project infrastructure is currently hosted within the European Union.

The server infrastructure is currently operated in Frankfurt, Germany.

Applicable Austrian and European Union privacy regulations, including GDPR/DSGVO requirements, are intended to apply where relevant.

## Server-side handling

Depending on the features used, technical server-side information may temporarily exist for operational purposes.

This can include:

- active synchronized timer state
- temporary session identifiers
- connection-related technical information
- synchronization infrastructure state
- infrastructure logs required for stability, security, or debugging

We aim to minimize stored information wherever practical.

## Third-party services

The hosted application may depend on infrastructure providers or technical services required to operate the synchronization infrastructure.

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

- use the application locally without remote synchronization
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
