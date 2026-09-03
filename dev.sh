#!/usr/bin/env bash
# Auto-detect node/npm from NVM if missing in PATH
if ! command -v npm &> /dev/null; then
  for p in "$NVM_BIN" \
           "$HOME/.var/app/com.visualstudio.code/config/nvm/versions/node"/*/bin \
           "$HOME/.nvm/versions/node"/*/bin; do
    if [ -d "$p" ] && [ -x "$p/npm" ]; then
      export PATH="$p:$PATH"
      break
    fi
  done
fi

npm run dev
