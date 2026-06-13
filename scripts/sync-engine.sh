#!/usr/bin/env bash
# sync-engine.sh — 把 engine/src/*.ts（排除 *.test.ts）同步到 web/src/engine/
# 用法：bash scripts/sync-engine.sh（從專案根目錄執行）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SRC="${REPO_ROOT}/engine/src"
DST="${REPO_ROOT}/web/src/engine"

echo "[sync-engine] 來源: ${SRC}"
echo "[sync-engine] 目標: ${DST}"

# 確保目標目錄存在
mkdir -p "${DST}"

# 複製所有 .ts，排除 *.test.ts
find "${SRC}" -maxdepth 1 -name "*.ts" ! -name "*.test.ts" | while read -r file; do
  filename="$(basename "${file}")"
  cp "${file}" "${DST}/${filename}"
  echo "[sync-engine] 已同步: ${filename}"
done

echo "[sync-engine] 完成"
