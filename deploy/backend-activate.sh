#!/usr/bin/env bash
# root 固定入口，不执行发布包内的 shell、Compose 或 Dockerfile。
set -Eeuo pipefail
[[ "$EUID" == 0 ]] || exit 1
RELEASE="${1:?请传入发布 SHA}"
[[ "$RELEASE" =~ ^[a-f0-9]{40}$ ]] || exit 2
TARGET="/opt/next/releases/$RELEASE/backend"
[[ "$(realpath "$TARGET")" == "$TARGET" ]] || exit 2
test -s "$TARGET/index.cjs" && test -s "$TARGET/cli.cjs"
test -z "$(find "$TARGET" -type l -print -quit)"
COMPOSE=(docker compose --env-file /opt/next-backend/.env -f /opt/next-backend/compose.yml)
exec 8>/opt/next-backend/.deploy.lock
flock -w 120 8
PREVIOUS="$(readlink -f /opt/next/backend-current || true)"
"${COMPOSE[@]}" up -d --wait db
/usr/local/bin/next-backup
ln -s "$TARGET" "/opt/next/.backend-$RELEASE"
mv -Tf "/opt/next/.backend-$RELEASE" /opt/next/backend-current
restore() {
  local status=$?
  if [[ "$status" != 0 && "$PREVIOUS" == /opt/next/releases/*/backend && -d "$PREVIOUS" ]]; then
    ln -s "$PREVIOUS" "/opt/next/.backend-rollback-$RELEASE"
    mv -Tf "/opt/next/.backend-rollback-$RELEASE" /opt/next/backend-current
    "${COMPOSE[@]}" up -d --force-recreate --wait api || true
    echo 'API 已尝试回退旧版本；数据库不自动逆向迁移，请检查日志' >&2
  fi
}
trap restore EXIT
"${COMPOSE[@]}" run --rm --no-deps api node cli.cjs migrate
"${COMPOSE[@]}" up -d --force-recreate --wait --wait-timeout 90 api
curl --fail --silent --max-time 10 http://127.0.0.1:3001/api/health >/dev/null
echo 'NEXT 后端健康检查通过'
