#!/usr/bin/env bash
set -Eeuo pipefail
[[ "$EUID" == 0 ]] || exit 2
SITE=/etc/nginx/sites-available/next.ganzhibin.icu
test -f "$SITE"
BACKUP="$SITE.before-image-optimization-$(date +%s)"
cp -a "$SITE" "$BACKUP"
python3 - "$SITE" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
text = p.read_text()
if 'location ^~ /media/' not in text:
    text = text.replace('    location ^~ /images/ {', '''    location ^~ /media/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }
    location ^~ /images/ {''')
if 'gzip_types ' not in text:
    text = text.replace('    server_tokens off;', '''    server_tokens off;
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/css application/javascript application/json image/svg+xml;''')
if 'image/avif avif;' not in text:
    text = text.replace('    location ^~ /media/ {', '    location ^~ /media/ {\n        types { image/avif avif; image/webp webp; }')
p.write_text(text)
PY
if ! nginx -t; then cp -a "$BACKUP" "$SITE"; exit 1; fi
systemctl reload nginx
