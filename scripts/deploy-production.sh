#!/usr/bin/env bash

set -euo pipefail

required_vars=(
  DEPLOY_COMMIT
  NEXT_PUBLIC_REMOTE_WS_URL
  RELAY_SESSION_TTL_MS
  RELAY_PORT
  TIME_DOMAIN
  TIME_RELAY_DOMAIN
)

for required_var in "${required_vars[@]}"; do
  if [[ -z "${!required_var:-}" ]]; then
    printf 'Missing required environment variable: %s\n' "$required_var" >&2
    exit 1
  fi
done

export NEXT_PUBLIC_BUILD_ID="${NEXT_PUBLIC_BUILD_ID:-$DEPLOY_COMMIT}"
export APP_BUILD_ID="${APP_BUILD_ID:-$DEPLOY_COMMIT}"

cat > .env <<EOF
NEXT_PUBLIC_REMOTE_WS_URL=$NEXT_PUBLIC_REMOTE_WS_URL
NEXT_PUBLIC_BUILD_ID=$NEXT_PUBLIC_BUILD_ID
APP_BUILD_ID=$APP_BUILD_ID
DEPLOY_COMMIT=$DEPLOY_COMMIT
RELAY_SESSION_TTL_MS=$RELAY_SESSION_TTL_MS
RELAY_PORT=$RELAY_PORT
TIME_DOMAIN=$TIME_DOMAIN
TIME_RELAY_DOMAIN=$TIME_RELAY_DOMAIN
EOF

get_container_image_id() {
  local service="$1"
  local container_id=""

  container_id="$(docker compose ps -q "$service")"

  if [[ -z "$container_id" ]]; then
    printf 'missing\n'
    return
  fi

  docker inspect --format '{{.Image}}' "$container_id"
}

get_built_image_id() {
  local service="$1"
  local image_id=""

  image_id="$(docker compose images -q "$service")"

  if [[ -z "$image_id" ]]; then
    printf 'missing\n'
    return
  fi

  printf '%s\n' "$image_id"
}

print_container_created_at() {
  local service="$1"
  local container_id=""

  container_id="$(docker compose ps -q "$service")"

  if [[ -z "$container_id" ]]; then
    printf '%s container created at: missing\n' "$service"
    return
  fi

  docker inspect --format "${service} container created at: {{.Created}}" "$container_id"
}

printf 'Deploying checked-out commit: %s\n' "$DEPLOY_COMMIT"

timer_web_image_before="$(get_container_image_id timer-web)"
timer_relay_image_before="$(get_container_image_id timer-relay)"

printf 'timer-web image before rebuild: %s\n' "$timer_web_image_before"
printf 'timer-relay image before rebuild: %s\n' "$timer_relay_image_before"

docker compose build --pull timer-web timer-relay

timer_web_image_after="$(get_built_image_id timer-web)"
timer_relay_image_after="$(get_built_image_id timer-relay)"

printf 'timer-web image after rebuild: %s\n' "$timer_web_image_after"
printf 'timer-relay image after rebuild: %s\n' "$timer_relay_image_after"

docker compose up -d --force-recreate --remove-orphans timer-web timer-relay
docker compose up -d caddy

print_container_created_at timer-web
print_container_created_at timer-relay

docker ps \
  --filter "name=timer-web" \
  --filter "name=timer-relay" \
  --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.CreatedAt}}'
