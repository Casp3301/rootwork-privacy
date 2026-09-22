#!/usr/bin/env bash
# Commit and push the site. GitHub Pages picks it up in about a minute.
#   ./deploy.sh "what changed"
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# the app is closed source and must never end up in this repo
if git ls-files --others --cached | grep -qE '^demo/|\.js\.map$|index-[A-Za-z0-9_-]+\.js$'; then
  echo "Stopping: found app build files in the site folder. Remove them first."
  exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing to commit."
  exit 0
fi

git status --short
git add -A
git commit -m "${1:-Update the site}"
git push origin main
echo "Pushed. Live at https://casp3301.github.io/rootwork-privacy/ in a minute or so."
