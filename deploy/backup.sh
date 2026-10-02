#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$EUID" == 0 ]] || exit 1
umask 077
DEST=/opt/next-backend/backups
install -d -m 700 "$DEST"
FILE="$DEST/next-$(date -u +%Y%m%dT%H%M%S)-$$.dump"
docker compose --env-file /opt/next-backend/.env -f /opt/next-backend/compose.yml exec -T db pg_dump -U next -d next -Fc > "$FILE.partial"
test -s "$FILE.partial"
mv "$FILE.partial" "$FILE"
echo "数据库已备份：$FILE"
# 不自动删除旧备份；请定期复制到异机并按自己的保留策略清理。
