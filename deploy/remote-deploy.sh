#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_PATH="${1:-/tmp/dev-duman-api.tgz}"
APP_DIR="/home/salihdmn/app"
BACKUP_DIR="/home/salihdmn/backups"
STAMP="$(date +%Y%m%d%H%M%S)"
NEXT_DIR="/home/salihdmn/app.next.${STAMP}"
BACKUP_APP_DIR="${BACKUP_DIR}/app.${STAMP}"

if [ ! -f "${ARCHIVE_PATH}" ]; then
  echo "Archive not found: ${ARCHIVE_PATH}" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}" "${NEXT_DIR}"
tar -xzf "${ARCHIVE_PATH}" -C "${NEXT_DIR}"
find "${NEXT_DIR}" -name '._*' -type f -delete

if [ -f "${APP_DIR}/.env" ]; then
  cp "${APP_DIR}/.env" "${NEXT_DIR}/.env"
else
  JWT_SECRET="$(node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))")"
  cat > "${NEXT_DIR}/.env" <<ENV
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
APP_BASE_URL=https://dev.duman.dev

DATABASE_URL=postgres://app_user:change_me@localhost:5432/app_db
DATABASE_SSL=false

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=1h
BCRYPT_ROUNDS=12

REGISTRATION_ENABLED=true
REQUIRE_HTTPS=false
TRUST_PROXY=1
ENV
fi

cd "${NEXT_DIR}"
npm ci --omit=dev

if [ -d "${APP_DIR}" ]; then
  mv "${APP_DIR}" "${BACKUP_APP_DIR}"
fi

mv "${NEXT_DIR}" "${APP_DIR}"

cd "${APP_DIR}"
pm2 delete app >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 list
