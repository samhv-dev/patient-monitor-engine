#!/bin/sh
# Screenshots of the six mock-ups at 1440 x 900 (Chrome headless). Serve the repository root over http first (the pages
# link the app's stylesheets and fonts by relative path, which file:// does not load as the app does), for example:
#   python3 -m http.server 9562 --bind 127.0.0.1 --directory <repo root>
# then: sh capture.sh [port] [chrome]
PORT=${1:-9562}
CHROME=${2:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
HERE=$(cd "$(dirname "$0")" && pwd)
PROFILE=$(mktemp -d)
for f in 01-builder-main 02-phase-editor 03-action-editor 04-run-in-place 05-library 06-sign; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$PROFILE" --window-size=1440,900 \
    --virtual-time-budget=3000 --screenshot="$HERE/$f.png" "http://127.0.0.1:$PORT/docs/plans/scenario-builder/mockup/$f.html"
done
rm -rf "$PROFILE"
