#!/usr/bin/env bash
# 从 GitHub Release 拉取最新 APK 到网站下载目录。
# Release 资产使用 ASCII 名称，用户下载文件使用中文名称。
set -euo pipefail

PROXY="http://127.0.0.1:7890"
DEST="/root/library/public/downloads"
LATEST_URL="https://github.com/kkkkonoha/tianyanglibrary/releases/latest"

FINAL=$(curl --silent --output /dev/null --proxy "$PROXY" --max-time 30 --write-out "%{url_effective}" --location "$LATEST_URL")
TAG=$(echo "$FINAL" | sed 's/.*tag\///')
if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
  echo "$(date '+%F %T') 解析最新版本失败（final=$FINAL tag=$TAG）" >> /var/log/fetch-apk.log
  exit 0
fi

VERSION="${TAG#v}"
RELEASE_FILE="tianyang-library-v${VERSION}.apk"
HOSTED_FILE="天央图书馆-v${VERSION}.apk"
URL="https://github.com/kkkkonoha/tianyanglibrary/releases/download/${TAG}/${RELEASE_FILE}"
mkdir -p "$DEST"

# 临时文件校验通过后再替换，避免 404 页面或半包进入公开目录。
TMP="$DEST/.${RELEASE_FILE}.tmp"
if ! curl --fail --silent --proxy "$PROXY" --max-time 300 --location --output "$TMP" "$URL"; then
  rm -f "$TMP"
  echo "$(date '+%F %T') 下载失败: $RELEASE_FILE" >> /var/log/fetch-apk.log
  exit 0
fi

if [ "$(stat -c%s "$TMP" 2>/dev/null || echo 0)" -gt 1048576 ] && [ "$(head -c 2 "$TMP")" = "PK" ]; then
  mv -f "$TMP" "$DEST/$HOSTED_FILE"
  chmod 644 "$DEST/$HOSTED_FILE"
  echo "$(date '+%F %T') 已更新: $HOSTED_FILE ($(stat -c%s "$DEST/$HOSTED_FILE") bytes)" >> /var/log/fetch-apk.log
else
  rm -f "$TMP"
  echo "$(date '+%F %T') 下载无效（可能 asset 未就绪）: $RELEASE_FILE" >> /var/log/fetch-apk.log
fi
