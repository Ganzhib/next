#!/usr/bin/env bash
set -Eeuo pipefail
# 一次性初始化，root 执行；日常部署由无 sudo 的 next-deploy 用户完成。
DOMAIN="${1:?用法: setup-server.sh <域名> <专用公钥文件>}"
PUBLIC_KEY="${2:?缺少公钥文件}"
[[ "$EUID" == 0 ]] || { echo '初始化需要 root'; exit 1; }
[[ "$DOMAIN" =~ ^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$ ]] || exit 2
test -f "$PUBLIC_KEY"
grep -q '^ssh-ed25519 ' "$PUBLIC_KEY"
for command in nginx python3 curl flock; do command -v "$command" >/dev/null; done
BASE=/opt/next
SITE="/etc/nginx/sites-available/$DOMAIN"
SCRIPTS="$(cd -- "$(dirname -- "$0")" && pwd)"
# 遇到同名部署直接停止，避免覆盖已有站点或账号。
if [[ -e "$BASE" || -e "$SITE" ]] || id next-deploy >/dev/null 2>&1; then
  echo '发现已有 next 部署目录、域名配置或账号，请人工检查，不覆盖。' >&2
  exit 1
fi
useradd --create-home --shell /bin/bash next-deploy
install -d -m 755 -o root -g root "$BASE"
install -d -m 755 -o next-deploy -g next-deploy "$BASE/releases" "$BASE/incoming"
# current/previous 是由部署账号创建的链接；目录权限只影响本项目。
chown next-deploy:next-deploy "$BASE"
printf '%s\n' "$DOMAIN" > "$BASE/domain"
chmod 644 "$BASE/domain"
install -d -m 700 -o next-deploy -g next-deploy /home/next-deploy/.ssh
{ printf 'restrict '; cat "$PUBLIC_KEY"; } > /home/next-deploy/.ssh/authorized_keys
chmod 600 /home/next-deploy/.ssh/authorized_keys
chown next-deploy:next-deploy /home/next-deploy/.ssh/authorized_keys
install -m 755 -o root -g root "$SCRIPTS/remote-activate.sh" /usr/local/bin/next-activate
install -d -m 755 /var/www/next-acme
sed "s/__DOMAIN__/$DOMAIN/g" "$SCRIPTS/nginx.conf.template" > "$SITE"
ln -s "$SITE" "/etc/nginx/sites-enabled/$DOMAIN"
if ! nginx -t; then
  unlink "/etc/nginx/sites-enabled/$DOMAIN"
  echo '新站配置未通过，已撤销启用；现有 Nginx 未重载。' >&2
  exit 1
fi
systemctl reload nginx
echo "初始化完成：$DOMAIN → $BASE/current；请发布后配置 HTTPS。"
