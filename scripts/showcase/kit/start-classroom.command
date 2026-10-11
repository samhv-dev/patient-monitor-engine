#!/bin/bash
# Start Classroom — double-click this file in Finder (Stage 12: learners' phones follow the monitor).
#
# It starts the simulator's relay on this computer's NETWORK address: it serves the simulator to this computer and to
# learners' phones on the same Wi-Fi (or this Mac's hotspot), and carries the session from the instructor's page to the
# phones. Phones may only FOLLOW (they cannot run the case). It needs Node.js 22 or later: the kit's own runtime/ if it
# has one, else a Node.js installed on this Mac. Without one, use "Start Simulator" (the second screen still works).
# It writes nothing into its own folder; temporary files go to $TMPDIR.
#
# Knobs for the kit's own tests (a presenter never needs them):
#   PME_NO_OPEN=1      do not open the browser
#   PME_PORT=8650      first port to try (the next 9 are tried if it is busy)
#   PME_NODE=/path     try only this Node.js (the Node >= 22 check's own test)

DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$DIR/app"
RELAY="$DIR/server/relay.mjs"
RT="$DIR/runtime"
START_PORT="${PME_PORT:-8650}"
RPID=""
TMPD=""

printf '\033[8;34;92t' 2>/dev/null
say() { printf '%s\n' "$@"; }
big() {
  say ""
  say "  ======================================================================"
  for line in "$@"; do printf '  \033[1m%s\033[0m\n' "$line"; done
  say "  ======================================================================"
  say ""
}
fail() {
  big "THE CLASSROOM COULD NOT START" "$1"
  if [ -n "$3" ]; then say "  $3"; say ""; fi
  say "  Nothing on this computer has been changed."
  say "  You can still run the case without phones: close this window and double-click \"Start Simulator\"."
  say ""
  say "  (technical detail for the helper: $2)"
  say ""
  exit 1
}
cleanup() {
  if [ -n "$RPID" ]; then kill "$RPID" 2>/dev/null; fi
  if [ -n "$TMPD" ]; then rm -rf "$TMPD"; fi
}
trap cleanup EXIT
trap 'exit 0' HUP INT TERM

clear 2>/dev/null
big "PATIENT MONITOR SIMULATOR - CLASSROOM" "Starting... please wait a few seconds."
[ -f "$APP/index.html" ] && [ -f "$RELAY" ] || fail "The kit is incomplete: the app or the relay is missing." "no $APP/index.html or $RELAY"

# Node.js 22 or later: the kit's runtime first, then an installed one; an older one is named, with the way out (R50 I4)
NODE=""
OLD=""
OLDP=""
if [ -n "${PME_NODE:-}" ]; then
  CANDIDATES=("$PME_NODE")
else
  CANDIDATES=("$RT/node-$(uname -m)" "$RT/node-arm64" "$RT/node-x86_64" "$(command -v node 2>/dev/null)" /opt/homebrew/bin/node /usr/local/bin/node)
fi
for n in "${CANDIDATES[@]}"; do
  [ -n "$n" ] && [ -x "$n" ] || continue
  if "$n" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' >/dev/null 2>&1; then NODE="$n"; break; fi
  [ -n "$OLD" ] || { OLD="$("$n" -v 2>/dev/null)"; OLDP="$n"; }
done
GET="Install Node.js from nodejs.org (the LTS, version 22 or later), then double-click \"Start Classroom\" again."
[ -n "$NODE" ] || [ -z "$OLD" ] || fail "Classroom mode needs Node.js 22 or later; this Mac has Node.js $OLD, which is too old." "found $OLD at $OLDP; no node >= 22" "$GET"
[ -n "$NODE" ] || fail "Classroom mode needs Node.js 22 or later, and this Mac has none." "no runtime/node-* and no node on PATH, /opt/homebrew/bin or /usr/local/bin" "$GET"

TMPD="$(mktemp -d "${TMPDIR:-/tmp}/pme-classroom.XXXXXX" 2>/dev/null)" || fail "This computer did not allow a temporary file." "mktemp failed"
LOG="$TMPD/relay.log"
PORT=""
p=$START_PORT
while [ $p -lt $((START_PORT + 10)) ]; do
  "$NODE" "$RELAY" --port "$p" --static "$APP" >"$LOG" 2>&1 &
  RPID=$!
  i=0
  while [ $i -lt 50 ]; do
    if grep -q 'ready on ws://' "$LOG" 2>/dev/null; then PORT=$p; break 2; fi
    kill -0 "$RPID" 2>/dev/null || break
    sleep 0.2
    i=$((i + 1))
  done
  kill "$RPID" 2>/dev/null
  RPID=""
  p=$((p + 1))
done
[ -n "$PORT" ] || fail "The classroom relay did not start." "$(tail -n 3 "$LOG" 2>/dev/null | tr '\n' ' ')"

URL="http://127.0.0.1:$PORT/?relay#/"
if [ -z "${PME_NO_OPEN:-}" ]; then
  /usr/bin/open "$URL" >/dev/null 2>&1 || say "  (The browser did not open by itself: type the address below.)"
fi
clear 2>/dev/null
big "THE CLASSROOM IS RUNNING" "" "The simulator has opened in your web browser." "" "LEAVE THIS WINDOW OPEN while you teach." "To stop: close this window (click \"Terminate\" if asked)."
say "  If macOS asks whether \"node\" may accept incoming network connections: click ALLOW (phones need it)."
say ""
say "  On this computer:  127.0.0.1:$PORT/?relay"
say "  Phones join with the QR code: Monitor view, \"Phones\" (or the \"Phones\" button at the top right)."
grep "phones reach it at" "$LOG" | sed 's/^ */  /'
say ""
say "ADDRESS: $URL"
say "SERVER: node $("$NODE" -v) ($NODE)"

wait "$RPID"
RPID=""
fail "The classroom relay stopped unexpectedly." "$(tail -n 3 "$LOG" 2>/dev/null | tr '\n' ' ')"
