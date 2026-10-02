#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$EUID" == 0 ]] || exit 1
DOMAIN="${1:?完整 NEXT 域名}"
[[ "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+$ ]] || exit 2
CONFIG="/etc/nginx/sites-available/$DOMAIN"
test -f "$CONFIG"
curl --fail --silent http://127.0.0.1:3001/api/health >/dev/null
SOURCE="$(cd "$(dirname "$0")" && pwd)"
install -m 644 "$SOURCE/nginx-api.conf" /etc/nginx/snippets/next-api.conf
BACKUP="$CONFIG.before-api-$(date +%s)"
cp -a "$CONFIG" "$BACKUP"
python3 - "$CONFIG" <<'PY'
import pathlib,sys
p=pathlib.Path(sys.argv[1]);s=p.read_text()
marker='    listen 443 ssl;'
include='    include /etc/nginx/snippets/next-api.conf;'
if include not in s:
    if s.count(marker)!=1: raise SystemExit('HTTPS server 不唯一，请人工确认')
    p.write_text(s.replace(marker,marker+'\n'+include))
PY
if nginx -t; then systemctl reload nginx; else cp -a "$BACKUP" "$CONFIG"; exit 1; fi
echo '仅 NEXT API 代理已启用，共享 Nginx 未停站'
