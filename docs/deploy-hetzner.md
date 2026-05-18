# Deploy To Hetzner CAX11

Project overview: [README.md](../README.md)

## Overview

Target topology:

- `Caddy` as the public reverse proxy with TLS
- `timer-web` serving the static frontend
- `timer-relay` serving `/health` and `/ws`
- optional additional apps on the same VM by hostname routing

## 1. Create The Server

Create a Hetzner `CAX11` instance with Ubuntu or Debian. Attach your SSH key during provisioning.

Recommended basics:

- hostname: `timer-prod`
- firewall: allow `22`, `80`, `443`
- swap: optional but reasonable on a small ARM box

## 2. Point DNS

Create DNS records:

- `A` or `AAAA`/`CNAME` for `timer.mkrz.at`
- `A` or `AAAA`/`CNAME` for `ws.timer.mkrz.at` if you keep the relay on a dedicated subdomain

If you use a single-domain setup, route `/ws` through Caddy instead.

## 3. Install Docker

On the server:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker
docker version
docker compose version
```

## 4. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

- `HETZNER_HOST`: The IP or hostname of your Hetzner server (e.g., `192.168.1.1`).
- `HETZNER_USER`: The SSH username for the server (default: `root`).
- `HETZNER_SSH_KEY`: The private SSH key for accessing the server.
- `NEXT_PUBLIC_REMOTE_WS_URL`: The WebSocket URL for the relay (default: `wss://ws.timer.mkrz.at/ws`).
- `RELAY_SESSION_TTL_MS`: The session TTL for the relay (default: `300000`).
- `RELAY_PORT`: The port for the relay (default: `9100`).
- `TIME_DOMAIN`: The domain for the app (e.g., `timer.mkrz.at`).
- `TIME_RELAY_DOMAIN`: The domain for the relay (e.g., `ws.timer.mkrz.at`).

## 5. Automated Deployment with GitHub Workflows

The deployment process is automated using the GitHub Actions workflow defined in `.github/workflows/build-and-deploy.yml`.

### Steps:

1. **Trigger Deployment**:
   - Push changes to the `main` branch or manually trigger the workflow via the GitHub Actions UI.

2. **Workflow Actions**:
   - Checkout the repository.
   - Install dependencies using `pnpm`.
   - Run `pnpm test:ci` and `pnpm build`.
   - Create a deployment bundle excluding unnecessary files.
   - Upload the bundle to the Hetzner server.
   - Extract the checked-out bundle, rebuild `timer-web` and `timer-relay`, and force-recreate those containers with orphan cleanup.
   - Print the deployed git commit, image IDs before and after the rebuild, and the recreated container timestamps.

3. **Verify Deployment**:
   - Check the application at `https://timer.mkrz.at`.
   - Verify the relay health at `https://ws.timer.mkrz.at/health`.
   - Open the status popover and confirm the `Build` value matches the deployed commit.
   - Confirm the health response `commit`/`buildId` matches the same deployed commit.

## 6. Logs And Health Checks

Useful commands on the server:

```bash
docker compose ps
docker compose logs -f caddy
docker compose logs -f timer-web
docker compose logs -f timer-relay
curl https://ws.timer.mkrz.at/health
```

Manual verification after a deployment:

```bash
docker compose build --pull timer-web timer-relay
docker compose up -d --force-recreate --remove-orphans timer-web timer-relay
docker compose ps
docker ps --filter name=timer-web --filter name=timer-relay --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.CreatedAt}}'
docker inspect --format 'timer-web image: {{.Image}} created: {{.Created}}' "$(docker compose ps -q timer-web)"
docker inspect --format 'timer-relay image: {{.Image}} created: {{.Created}}' "$(docker compose ps -q timer-relay)"
curl -fsSL https://ws.timer.mkrz.at/health
```

Expected verification signals:

- `docker ps` shows fresh `timer-web` and `timer-relay` containers with recent `CreatedAt` timestamps.
- `https://ws.timer.mkrz.at/health` returns JSON with `ok`, `commit`, and `buildId`.
- The app footer shows the same commit-derived build identifier as the health response.

## 7. Rollback

To rollback to a previous version:

1. Revert the repository to the previous working revision.
2. Trigger the GitHub Actions workflow to redeploy.

For safer rollbacks, consider introducing image tags and a registry-backed deploy flow.

## 8. Hosting Other Apps On The Same VM

This CAX11 can host other lightweight web apps if each app has:

- its own Compose service
- its own hostname in Caddy
- sensible memory/CPU expectations

Good fit:

- small static sites
- lightweight Node services
- simple admin tools

Avoid on the same box:

- heavy databases
- CPU-heavy workers
- build pipelines
