#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Ship the site.
#
#  The hero runs the real app, which means /demo is a build artefact of
#  ../rootwork rather than something you edit here. Copying it by hand is
#  the kind of step that gets skipped once and then the site is quietly
#  advertising last month's app, so it lives in here instead.
#
#    ./deploy.sh                 rebuild the app, sync /demo, commit, push
#    ./deploy.sh "message"       ... with your own commit message
#    ./deploy.sh --site-only     skip the app rebuild (copy edits, etc.)
#
#  Pages is already pointed at main:/ and rebuilds itself in about a minute.
# ---------------------------------------------------------------------------
set -euo pipefail

SITE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$(cd "$SITE/../rootwork" && pwd)"

SITE_ONLY=0
MSG=""
for arg in "$@"; do
  case "$arg" in
    --site-only) SITE_ONLY=1 ;;
    *) MSG="$arg" ;;
  esac
done

if [ "$SITE_ONLY" -eq 0 ]; then
  echo "==> building the app"
  ( cd "$APP" && npm run build )

  echo "==> syncing /demo"
  # wiped rather than merged: vite hashes its filenames, so copying over the
  # top leaves every previous bundle behind for ever
  rm -rf "$SITE/demo"
  mkdir -p "$SITE/demo"
  cp -r "$APP/dist/." "$SITE/demo/"
fi

cd "$SITE"

if [ -z "$(git status --porcelain)" ]; then
  echo "==> nothing changed; not pushing"
  exit 0
fi

echo "==> changes"
git status --short

git add -A
git commit -m "${MSG:-Update the site}"
git push origin main

echo "==> pushed. Pages usually catches up within a minute:"
echo "    https://casp3301.github.io/rootwork-privacy/"
echo
echo "==> build status"
gh api repos/Casp3301/rootwork-privacy/pages/builds/latest \
  --jq '"    " + .status + "  " + (.commit[0:8]) + "  " + ((.error.message) // "no errors")' \
  2>/dev/null || echo "    (couldn't read it; check the Actions tab)"
