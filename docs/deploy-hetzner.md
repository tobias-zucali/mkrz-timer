# Deploy To Hetzner CAX11

Project overview: [README.md](../README.md)

## Overview

Production is designed around:

- `Caddy` as the public reverse proxy with TLS
- `timer-web` serving the static frontend
- `timer-relay` serving `/health` and `/ws`
- a small Hetzner `CAX11` VM managed with Docker Compose

The executable deployment flow lives in:

- [.github/workflows/build-and-deploy.yml](../.github/workflows/build-and-deploy.yml)
- [scripts/deploy-production.sh](../scripts/deploy-production.sh)

Treat those files as the source of truth for exact deployment steps, bundle contents, and environment wiring.

## Server Prerequisites

- Provision a Hetzner `CAX11` instance with Ubuntu or Debian.
- Attach your SSH key during provisioning.
- Allow `22`, `80`, and `443` through the firewall.
- Install Docker and Docker Compose on the server.
- Point DNS at the VM for the app domain, and for the relay domain if you keep the relay on a separate hostname.

If you use a single-domain setup, route `/ws` through Caddy instead of a dedicated relay hostname.

## Repository Secrets And Env

The GitHub workflow expects SSH access details for the server plus the deployment env values consumed by the Compose stack and deploy script.

Current names and defaults live in:

- [.github/workflows/build-and-deploy.yml](../.github/workflows/build-and-deploy.yml)
- [scripts/deploy-production.sh](../scripts/deploy-production.sh)
- [docker-compose.yml](../docker-compose.yml)

Keep this document at the level of categories, not exact variable duplication, so changes to workflow wiring only need to be updated in one place.

## Verification

After a deployment, verify:

- the app loads at the production domain
- the relay health endpoint responds successfully
- the app footer build identifier matches the deployed revision
- the relay health response reports the same build identifier or commit
- the `timer-web` and `timer-relay` containers were recreated from the new deployment

Useful server commands:

```bash
docker compose ps
docker compose logs -f caddy
docker compose logs -f timer-web
docker compose logs -f timer-relay
curl https://ws.timer.mkrz.at/health
```

## Rollback

- Revert to a known-good revision in the repository.
- Trigger the deployment workflow again.

If rollback requirements become stricter, add image tagging or a registry-backed release flow rather than expanding this runbook with duplicated workflow logic.

## Hosting Notes

This VM can host other lightweight web apps if each app has:

- its own Compose service
- its own hostname in Caddy
- modest memory and CPU needs

Avoid colocating heavy databases, CPU-heavy workers, or build infrastructure on the same box.
