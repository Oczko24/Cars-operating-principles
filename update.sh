#!/usr/bin/env bash
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

echo "===================================================="
echo "    Cars Operating Principles - Update & Push       "
echo "===================================================="

# Auto-detect node/npm from NVM or standard PATH
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

# 1. Typecheck & Build validation
echo "[1/4] Sprawdzanie typow TypeScript..."
npx tsc --noEmit

echo "[2/4] Weryfikacja budowania produkcyjnego (Vite build)..."
npm run build

# 2. Status zmian
STATUS=$(git status --porcelain)
if [ -z "$STATUS" ]; then
  echo "Brak nowych zmian w repozytorium do opublikowania."
  echo "Wszystko jest aktualne."
  exit 0
fi

echo "Wykryte zmiany:"
git status -s

# 3. Wiadomosc commita
COMMIT_MSG="$*"
if [ -z "$COMMIT_MSG" ]; then
  read -r -p "Podaj opis zmian (commit message): " COMMIT_MSG
fi

if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="update: automotive principles improvements"
fi

# 4. Git add, commit, push
echo "[3/4] Zatwierdzanie zmian: '$COMMIT_MSG'..."
git add -A
git commit -m "$COMMIT_MSG"

BRANCH="$(git branch --show-current)"
echo "[4/4] Wypychanie do GitHub (origin/$BRANCH)..."
git push origin "$BRANCH"

echo ""
echo "SUKCES! Zmiany zostaly wypchniete na GitHub."
echo "Automatyczny deploy Vercel bedzie dostepny za chwile pod adresem:"
echo "https://cars-operating-principles.vercel.app"
