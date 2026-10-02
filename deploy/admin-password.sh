#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$EUID" == 0 ]] || exit 1
COMMAND="${1:-reset-password}"
[[ "$COMMAND" == reset-password || "$COMMAND" == bootstrap ]] || exit 2
read -r -p '管理员账号：' ADMIN_USERNAME
read -r -s -p '密码（至少 14 位，不回显）：' ADMIN_PASSWORD
echo
[[ "${#ADMIN_PASSWORD}" -ge 14 ]] || exit 2
export ADMIN_USERNAME ADMIN_PASSWORD
docker compose --env-file /opt/next-backend/.env -f /opt/next-backend/compose.yml run --rm --no-deps -e ADMIN_USERNAME -e ADMIN_PASSWORD api node cli.cjs "$COMMAND"
unset ADMIN_PASSWORD
