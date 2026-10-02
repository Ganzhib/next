#!/usr/bin/env bash
# 上传本目录到 /opt/next-setup 后，由 root 手动执行一次。不会修改其他站点。
set -Eeuo pipefail
[[ "$EUID" == 0 ]] || exit 1
DOMAIN="${1:?请传入现有 NEXT 完整域名}"
[[ "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+$ ]] || exit 2
SOURCE="$(cd "$(dirname "$0")" && pwd)"
BASE=/opt/next-backend
install -d -m 700 "$BASE"
if [[ ! -f "$BASE/.env" ]]; then
  umask 077
  printf 'DB_PASSWORD=%s\nAPP_ORIGIN=https://%s\n' "$(openssl rand -hex 32)" "$DOMAIN" > "$BASE/.env"
fi
install -m 600 "$SOURCE/compose.backend.yml" "$BASE/compose.yml"
install -m 755 "$SOURCE/backend-activate.sh" /usr/local/bin/next-backend-activate
install -m 700 "$SOURCE/backup.sh" /usr/local/bin/next-backup
install -m 700 "$SOURCE/restore.sh" /usr/local/bin/next-restore
install -m 700 "$SOURCE/admin-password.sh" /usr/local/bin/next-admin-password
printf 'next-deploy ALL=(root) NOPASSWD: /usr/local/bin/next-backend-activate *\n' > /etc/sudoers.d/next-backend
chmod 440 /etc/sudoers.d/next-backend
visudo -cf /etc/sudoers.d/next-backend
docker compose --env-file "$BASE/.env" -f "$BASE/compose.yml" pull
docker compose --env-file "$BASE/.env" -f "$BASE/compose.yml" up -d --wait db
echo '独立数据库已就绪。发布后端后，配置 NEXT Nginx /api/ 代理并初始化管理员。'
