#!/data/data/com.termux/files/usr/bin/bash
# Heinz UI start script: keeps the phone awake, starts Ollama and LiteRT-LM if needed, then the page server.
cd "$(dirname "$0")" || exit 1
export OLLAMA_MAX_LOADED_MODELS="${OLLAMA_MAX_LOADED_MODELS:-1}"   # one model in memory (phone RAM); override by setting it before the call
command -v termux-wake-lock >/dev/null && termux-wake-lock
if ! curl -s -m 2 http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "Starting Ollama ..."
  nohup ollama serve >/dev/null 2>&1 &
  for i in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    curl -s -m 2 http://localhost:11434/api/tags >/dev/null 2>&1 && break
  done
fi
# LiteRT-LM server (optional): started only if installed and not already running (port 9379)
if command -v litert-lm >/dev/null 2>&1 && ! curl -s -m 2 http://127.0.0.1:9379/v1/models >/dev/null 2>&1; then
  echo "Starting LiteRT-LM ..."
  nohup litert-lm serve --cors-origin http://localhost:3000 >/dev/null 2>&1 &
fi
pkill -f "http.server 3000" 2>/dev/null
pkill -f "server.py" 2>/dev/null
sleep 0.5
exec python server.py "$@"
