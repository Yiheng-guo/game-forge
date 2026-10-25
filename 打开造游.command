#!/bin/zsh
set -e
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null; then
  print '请先安装 Node.js 22.12 或更高版本。'
  read -k 1
  exit 1
fi
if curl --silent --fail --max-time 2 http://127.0.0.1:4317/api/health >/dev/null 2>&1; then
  open http://127.0.0.1:4317
  exit 0
fi
if [[ ! -d node_modules ]]; then npm ci; fi
npm run build
npm start &
forge_pid=$!
trap 'kill "$forge_pid" 2>/dev/null || true' EXIT INT TERM
curl --silent --fail --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:4317/ >/dev/null
open http://127.0.0.1:4317
print '造游正在运行。关闭本窗口会停止创作服务；已保存的游戏与版本不会丢失。'
wait "$forge_pid"
