#!/bin/sh
# Screenshots of the four mock-ups at 1180 x 870 (Chrome headless). Serve the repository root over http first (the pages
# link the app's stylesheet by relative path), for example:
#   python3 -m http.server 9830 --bind 127.0.0.1 --directory <repo root>
# then: sh capture.sh [port] [chrome]
PORT=${1:-9830}
CHROME=${2:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
HERE=$(cd "$(dirname "$0")" && pwd)
PROFILE=$(mktemp -d)
for f in m1-main m2-modes m3-alarms m4-menu; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$PROFILE" --window-size=1180,870 \
    --virtual-time-budget=3000 --screenshot="$HERE/$f.png" "http://127.0.0.1:$PORT/docs/plans/vent-skin-edp-ts/mockup/$f.html"
done
rm -rf "$PROFILE"
