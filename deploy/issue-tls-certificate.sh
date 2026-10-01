#!/usr/bin/env bash
set -Eeuo pipefail
# 仅在获准共享 Nginx 短暂停机的维护窗口执行，禁止放入普通 CI/CD。
DOMAIN=next.ganzhibin.icu
[[ "$EUID" == 0 && "${1:-}" == "--maintenance-approved" ]] || exit 2
[[ "$(cat /opt/next/domain)" == "$DOMAIN" ]] || exit 2
test -x /root/.acme.sh/acme.sh
nginx -t
UNIT="next-nginx-recovery-$(date +%s)"
# 除退出 trap 外，再保留独立的服务恢复保险；SSH 断线不影响此任务。
systemd-run --unit="$UNIT" --on-active=120s /bin/systemctl start nginx
restore_nginx() {
  systemctl start nginx
}
trap restore_nginx EXIT
systemctl stop nginx
timeout --kill-after=5s 105s /root/.acme.sh/acme.sh --issue \
  -d "$DOMAIN" --alpn --server letsencrypt
install -d -m 700 "/etc/letsencrypt/live/$DOMAIN"
/root/.acme.sh/acme.sh --install-cert -d "$DOMAIN" --ecc \
  --key-file "/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
  --fullchain-file "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
  --reloadcmd 'nginx -t && systemctl reload-or-restart nginx'
systemctl start nginx
echo '证书已签发安装，共享 Nginx 已恢复。'
