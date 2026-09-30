#!/bin/bash
# Launch the Vite dev server detached (for headless testing in the sandbox).
cd "$(dirname "$0")/.."
source /root/.nvm/nvm.sh >/dev/null
pkill -f "node.*vite" 2>/dev/null
setsid nohup npx vite > /tmp/vite.log 2>&1 < /dev/null &
sleep 5
cat /tmp/vite.log
