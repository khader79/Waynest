#!/usr/bin/env bash
set -euo pipefail

# Usage on server (example):
# ./scripts/deploy_atomic.sh /tmp/waynest-artifact.tgz waynest
# Where second arg is the PM2 process name or systemd service name.

ARCHIVE_PATH=${1:-}
APP_NAME=${2:-waynest}

if [ -z "$ARCHIVE_PATH" ]; then
  echo "Usage: $0 /path/to/artifact.tgz [appName]"
  exit 2
fi

RELEASE_DIR=/srv/waynest/releases/$(date +%Y%m%d%H%M%S)
CURRENT_LINK=/srv/waynest/current
SHARED_DIR=/srv/waynest/shared
KEEP=${KEEP:-5}

mkdir -p "$RELEASE_DIR"
mkdir -p "$SHARED_DIR"

echo "Extracting $ARCHIVE_PATH -> $RELEASE_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$RELEASE_DIR"

# Link shared resources (example .env)
if [ -f "$SHARED_DIR/.env" ]; then
  ln -sfn "$SHARED_DIR/.env" "$RELEASE_DIR/.env"
fi

echo "Switching current -> $RELEASE_DIR"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

echo "Restarting application ($APP_NAME)"
# Try pm2 reload, fallback to restart
if command -v pm2 >/dev/null 2>&1; then
  pm2 reload "$APP_NAME" || pm2 restart "$APP_NAME" || pm2 start "$CURRENT_LINK/dist/src/main.js" --name "$APP_NAME"
else
  # systemd fallback
  if systemctl list-units --full -all | grep -q "${APP_NAME}.service"; then
    systemctl restart "${APP_NAME}.service"
  fi
fi

# Cleanup old releases
ls -1dt /srv/waynest/releases/* | tail -n +$((KEEP+1)) | xargs -r rm -rf || true

echo "Deploy complete: $RELEASE_DIR"
