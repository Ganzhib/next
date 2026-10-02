#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$EUID" == 0 ]] || exit 1
FILE="${1:?请传入 /opt/next-backend/backups 中的备份文件}"
[[ "$(realpath "$FILE")" == /opt/next-backend/backups/*.dump ]] && test -f "$FILE" || exit 2
[[ "${2:-}" == '--confirm-replace-next-database' ]] || { echo '恢复会覆盖 NEXT 数据库，请追加 --confirm-replace-next-database'; exit 2; }
COMPOSE=(docker compose --env-file /opt/next-backend/.env -f /opt/next-backend/compose.yml)
exec 8>/opt/next-backend/.deploy.lock
flock -w 120 8
/usr/local/bin/next-backup
"${COMPOSE[@]}" stop api
trap '"${COMPOSE[@]}" up -d api' EXIT
"${COMPOSE[@]}" exec -T db pg_restore -U next -d next --clean --if-exists --no-owner --single-transaction < "$FILE"
"${COMPOSE[@]}" exec -T db psql -U next -d next -c 'DELETE FROM sessions;'
echo 'NEXT 数据库恢复完成，已撤销旧会话'
