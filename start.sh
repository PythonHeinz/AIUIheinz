#!/data/data/com.termux/files/usr/bin/bash
# Heinz UI start script: keeps the phone awake, starts Ollama if needed, then the page server.
cd "$(dirname "$0")" || exit 1
command -v termux-wake-lock >/dev/null && termux-wake-lock
if ! curl -s -m 2 http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "Starting Ollama ..."
  nohup ollama serve >/dev/null 2>&1 &
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    curl -s -m 2 http://localhost:11434/api/tags >/dev/null 2>&1 && break
  done
fi
pkill -f "http.server 3000" 2>/dev/null
pkill -f "server.py" 2>/dev/null
sleep 0.5
exec python server.py "$@"
