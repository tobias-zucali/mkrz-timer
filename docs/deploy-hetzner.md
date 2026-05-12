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

- hostname: `time-prod`
- firewall: allow `22`, `80`, `443`
- swap: optional but reasonable on a small ARM box

## 2. Point DNS

Create DNS records:

- `A` or `AAAA`/`CNAME` for `time.mkrz.at`
- `A` or `AAAA`/`CNAME` for `ws.time.mkrz.at` if you keep the relay on a dedicated subdomain

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

## 4. Copy The Stack

Copy the repo or just the deployment assets onto the server, for example into `/srv/time-timer`.

Required files:

- `docker-compose.yml`
- `Caddyfile`
- `Dockerfile.web`
- `Dockerfile.relay`
- built repo contents for `docker compose build`

## 5. Configure Environment

Create `.env` next to `docker-compose.yml`:

```bash
TIME_DOMAIN=time.mkrz.at
TIME_RELAY_DOMAIN=ws.time.mkrz.at
RELAY_PORT=9100
RELAY_SESSION_TTL_MS=300000
NEXT_PUBLIC_REMOTE_WS_URL=wss://ws.time.mkrz.at/ws
```

If you use the same hostname for app and relay, set `NEXT_PUBLIC_REMOTE_WS_URL=wss://time.mkrz.at/ws`.

## 6. GitHub Automation Vs Manual Setup

Automated by GitHub workflows:

- install dependencies
- run `pnpm test:ci`
- run `pnpm exec next build`
- run `docker compose build`
- upload the repo to `/srv/time-timer`
- run `docker compose build` and `docker compose up -d` on the server

Still manual:

- create the Hetzner VM
- install Docker and Docker Compose on the VM
- point DNS at the VM
- place the `.env` file on the server
- keep the Caddy/Docker ports open in the firewall
- add the required GitHub repository secrets:
  - `HETZNER_HOST`
  - `HETZNER_USER`
  - `HETZNER_SSH_KEY`

If you want GitHub-side environment values later, add them as repository or environment variables and reference them from the workflows explicitly. Right now the deploy workflow depends on repository secrets plus the server-side `.env` file.

## 7. First Deploy

```bash
docker compose build
docker compose up -d
docker compose ps
curl -I https://time.mkrz.at
curl https://ws.time.mkrz.at/health
```

## 8. Updates

```bash
git pull
docker compose build
docker compose up -d
```

## 9. Logs And Health Checks

Useful commands:

```bash
docker compose ps
docker compose logs -f caddy
docker compose logs -f timer-web
docker compose logs -f timer-relay
curl https://ws.time.mkrz.at/health
```

## 10. Rollback

Basic rollback:

1. Check out the previous working revision.
2. Rebuild the stack.
3. Restart with `docker compose up -d`.

For safer rollbacks later, introduce image tags and a registry-backed deploy flow.

## 11. Hosting Other Apps On The Same VM

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
