#!/usr/bin/env bash
set -Eeuo pipefail
DOMAIN="${1:?请传入已解析到本服务器的完整域名}"
[[ "$EUID" == 0 ]] || exit 1
[[ "$DOMAIN" =~ ^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$ ]] || exit 2
[[ "$(cat /opt/next/domain)" == "$DOMAIN" ]] || exit 2
SITE="/etc/nginx/sites-available/$DOMAIN"
test -f "$SITE"
# 用 webroot 验证，整个过程不停止共享 Nginx，不影响简历等站点。
# 已有账户可直接沿用；首次申请时请先按证书服务商要求注册账户。
if [[ "${2:-}" != "--existing-cert" ]]; then
  command -v certbot >/dev/null
  certbot certonly --webroot -w /var/www/next-acme -d "$DOMAIN" --non-interactive --agree-tos
fi
openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -checkhost "$DOMAIN"
openssl x509 -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" -noout -checkend 86400
BACKUP="$SITE.before-https-$(date +%s)"
cp -a "$SITE" "$BACKUP"
python3 - "$SITE" "$DOMAIN" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
domain = sys.argv[2]
content = path.read_text()
if 'listen 443 ssl;' in content:
    print('HTTPS 已配置，无需重复修改')
    raise SystemExit(0)
https = content.replace('listen 80;', 'listen 443 ssl;', 1).replace(
    '    server_tokens off;',
    f'    server_tokens off;\n    ssl_certificate /etc/letsencrypt/live/{domain}/fullchain.pem;\n'
    f'    ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;\n'
    '    ssl_protocols TLSv1.2 TLSv1.3;', 1)
http = f'''server {{
    listen 80;
    server_name {domain};
    location ^~ /.well-known/acme-challenge/ {{
        root /var/www/next-acme;
        try_files $uri =404;
    }}
    location = /__next_version {{
        allow 127.0.0.1;
        allow ::1;
        deny all;
        alias /opt/next/current/version.json;
        add_header Cache-Control "no-store";
    }}
    location / {{ return 301 https://{domain}$request_uri; }}
}}
'''
path.write_text(http + '\n' + https)
PY
if ! nginx -t; then
  cp -a "$BACKUP" "$SITE"
  echo 'HTTPS 配置失败，已恢复原配置，未重载 Nginx。' >&2
  exit 1
fi
systemctl reload nginx
# certbot 的部署钩子只做配置校验与平滑重载。
if [[ "${2:-}" != "--existing-cert" ]]; then
  install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
  printf '#!/bin/sh\nnginx -t && systemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/next-reload-nginx
  chmod 755 /etc/letsencrypt/renewal-hooks/deploy/next-reload-nginx
fi
curl --fail --silent --show-error --max-time 20 "https://$DOMAIN/version.json"
