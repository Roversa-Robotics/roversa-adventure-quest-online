#!/usr/bin/env bash
# Builds the game into _site/, ready to publish. Used by Cloudflare Pages
# (build command: bash tools/build.sh, output directory: _site) and by
# .github/workflows/pages.yml. See README, "Publishing".
#
# It copies the committed files, leaves out the tools and the relay's code,
# replaces each __BUILD__ with the commit id (so each release loads matching
# files and installed apps notice the update) and fills in the relay address
# from RELAY_URL (empty hides "Play on 2-4 devices").
set -euo pipefail
cd "$(dirname "$0")/.."

SHA="${GITHUB_SHA:-${CF_PAGES_COMMIT_SHA:-$(git rev-parse HEAD)}}"
BUILD="${SHA::7}"
RELAY_URL="${RELAY_URL:-}"

rm -rf _site
mkdir _site
git archive HEAD | tar -x -C _site
rm -rf _site/.github _site/tools _site/relay/worker.js _site/relay/wrangler.toml

grep -rl --include='*.html' --include='*.js' '__BUILD__' _site | xargs sed -i "s/__BUILD__/$BUILD/g"
echo "Stamped build $BUILD"
grep -rl --include='*.js' '__RELAY_URL__' _site | xargs -r sed -i "s#__RELAY_URL__#${RELAY_URL}#g"
echo "Relay: ${RELAY_URL:-(none yet)}"
if grep -rq --include='*.html' --include='*.js' '__BUILD__' _site; then echo "A __BUILD__ was not stamped"; exit 1; fi
