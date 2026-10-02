#!/usr/bin/env bash
# 首次初始化：密码写入仅 root 可读文件，不输出到控制台或 CI 日志。
set -Eeuo pipefail
[[ "$EUID" == 0 ]] || exit 1
umask 077
FILE=/opt/next-backend/admin-bootstrap.env
COMPOSE=(docker compose --env-file /opt/next-backend/.env -f /opt/next-backend/compose.yml)
COUNT="$("${COMPOSE[@]}" exec -T db psql -U next -d next -Atc 'SELECT count(*) FROM admins')"
[[ "$COUNT" == 0 ]] || { echo '已有管理员，不重复初始化'; exit 0; }
if [[ ! -f "$FILE" ]]; then printf 'ADMIN_USERNAME=admin\nADMIN_PASSWORD=%s\n' "$(openssl rand -hex 20)" > "$FILE"; fi
set -a
source "$FILE"
set +a
"${COMPOSE[@]}" run --rm --no-deps -e ADMIN_USERNAME -e ADMIN_PASSWORD api node cli.cjs bootstrap
unset ADMIN_PASSWORD
echo '管理员已初始化。凭据位于 /opt/next-backend/admin-bootstrap.env；请首次登录后改密并妥善处理此文件。'
