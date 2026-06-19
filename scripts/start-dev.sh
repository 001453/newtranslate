#!/usr/bin/env bash
# GlobalBridge AI — 3 servisi birlikte başlatır (Linux/macOS)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -x "$ROOT/backend/.venv/bin/python" ]]; then
  echo "Kurulum eksik. Önce: npm run setup"
  exit 1
fi

if [[ ! -f "$ROOT/.env" && -f "$ROOT/.env.example" ]]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
fi
if [[ ! -f "$ROOT/backend/.env" && -f "$ROOT/.env" ]]; then
  cp "$ROOT/.env" "$ROOT/backend/.env"
fi

echo "GlobalBridge AI — starting services"
echo "  QVAC  → http://127.0.0.1:8765"
echo "  API   → http://127.0.0.1:8000"
echo "  WEB   → http://localhost:3000"
echo "Ctrl+C ile hepsini durdurun."
echo ""

trap 'kill 0' EXIT INT TERM

(cd "$ROOT/qvac-service" && npm start) &
sleep 2
(cd "$ROOT/backend" && .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload) &
sleep 2
(cd "$ROOT/frontend" && npm run dev) &

wait
