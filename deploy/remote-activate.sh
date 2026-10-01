#!/usr/bin/env bash
set -Eeuo pipefail
RELEASE="${1:?请传入 Git commit SHA}"
[[ "$RELEASE" =~ ^[a-f0-9]{40}$ ]] || exit 2
BASE=/opt/next
cd "$BASE"
exec 9>"$BASE/.deploy.lock"
flock -w 60 9
DOMAIN="$(cat "$BASE/domain")"
ARCHIVE="$BASE/incoming/$RELEASE.tar.gz"
TARGET="$BASE/releases/$RELEASE"
test -f "$ARCHIVE"
PREVIOUS=""
if [[ -L "$BASE/current" ]]; then PREVIOUS="$(readlink -f "$BASE/current")"; fi

if [[ ! -d "$TARGET" ]]; then
  STAGING="$(mktemp -d "$BASE/releases/.staging-XXXXXXXX")"
  # 只接受 dist/ 下的普通文件和目录，拒绝绝对路径、越界路径和链接。
  python3 - "$ARCHIVE" "$STAGING" <<'PY'
import pathlib, sys, tarfile
with tarfile.open(sys.argv[1], 'r:gz') as bundle:
    for item in bundle.getmembers():
        path = pathlib.PurePosixPath(item.name)
        if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] != 'dist' or not (item.isfile() or item.isdir()):
            raise SystemExit('拒绝不安全的发布包条目')
    bundle.extractall(sys.argv[2])
PY
  test -s "$STAGING/dist/index.html"
  grep -q "$RELEASE" "$STAGING/dist/version.json"
  chmod -R u=rwX,go=rX "$STAGING"
  mv "$STAGING" "$TARGET"
fi
grep -q "$RELEASE" "$TARGET/dist/version.json"
ln -s "$TARGET/dist" "$BASE/.current-$RELEASE"
mv -Tf "$BASE/.current-$RELEASE" "$BASE/current"

if ! curl --fail --silent --show-error --max-time 15 -H "Host: $DOMAIN" \
  http://127.0.0.1/__next_version | grep -q "$RELEASE"; then
  if [[ "$PREVIOUS" == "$BASE/releases/"*"/dist" && -d "$PREVIOUS" ]]; then
    ln -s "$PREVIOUS" "$BASE/.rollback-$RELEASE"
    mv -Tf "$BASE/.rollback-$RELEASE" "$BASE/current"
    echo "健康检查失败，已回退上一版本" >&2
  else
    echo "首发健康检查失败，无上一版本可回退" >&2
  fi
  exit 1
fi
if [[ -n "$PREVIOUS" && "$PREVIOUS" != "$TARGET/dist" ]]; then
  ln -s "$PREVIOUS" "$BASE/.previous-$RELEASE"
  mv -Tf "$BASE/.previous-$RELEASE" "$BASE/previous"
fi
echo "已启用版本 $RELEASE（未重启其他站点）"
