#!/bin/bash
# Start Simulator — double-click this file in Finder.
#
# It starts a small web server on this computer only (127.0.0.1), then opens the simulator in the default browser.
# It writes nothing into its own folder (the kit can run from a read-only USB stick); temporary files go to $TMPDIR.
# Server, first that works: (a) runtime/node-<cpu> bundled with the kit, (b) /usr/bin/ruby + WEBrick,
# (c) /usr/bin/perl (core modules only), (d) python3 — only a real one, never the macOS install stub.
#
# Knobs for the kit's own tests (a presenter never needs them):
#   PME_ONLY=node|ruby|perl|python   try only that server
#   PME_NO_OPEN=1                    do not open the browser
#   PME_PORT=8642                    first port to try (the next 49 are tried if it is busy)

DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$DIR/app"
SRV="$DIR/server"
RT="$DIR/runtime"
START_PORT="${PME_PORT:-8642}"
ONLY="${PME_ONLY:-}"
SPID=""
TMPD=""

printf '\033[8;34;92t' 2>/dev/null # make the Terminal window big enough for the messages (ignored if unsupported)

say() { printf '%s\n' "$@"; }
big() {
  say ""
  say "  ======================================================================"
  for line in "$@"; do printf '  \033[1m%s\033[0m\n' "$line"; done
  say "  ======================================================================"
  say ""
}
fail() {
  big "THE SIMULATOR COULD NOT START" "$1"
  say "  Nothing on this computer has been changed."
  say "  Please turn to the RESCUE CARD (the printed sheet that came with the kit)."
  say "  The recorded cases are in the \"videos\" folder next to this file."
  say ""
  say "  (technical detail for the helper: $2)"
  say ""
  exit 1
}
cleanup() {
  if [ -n "$SPID" ]; then kill "$SPID" 2>/dev/null; fi
  if [ -n "$TMPD" ]; then rm -rf "$TMPD"; fi
}
trap cleanup EXIT
trap 'exit 0' HUP INT TERM

clear 2>/dev/null
big "PATIENT MONITOR SIMULATOR" "Starting... please wait a few seconds."

[ -f "$APP/index.html" ] || fail "The kit is incomplete: the app folder is missing." "no $APP/index.html"

TMPD="$(mktemp -d "${TMPDIR:-/tmp}/pme-showcase.XXXXXX" 2>/dev/null)" || TMPD="$(mktemp -d /tmp/pme-showcase.XXXXXX 2>/dev/null)"
[ -n "$TMPD" ] && [ -d "$TMPD" ] || fail "This computer did not allow a temporary file." "mktemp failed"
PORTFILE="$TMPD/port"
LOG="$TMPD/server.log"
TRIED=""

# answer: is the server on $1 serving the app?
answers() {
  if [ -x /usr/bin/curl ]; then
    /usr/bin/curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:$1/index.html" 2>/dev/null
  else
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null
  fi
}

# start "$name" cmd...: run the server in the background, wait up to 12 s for it to answer
start() {
  local name="$1"
  shift
  TRIED="$TRIED $name"
  rm -f "$PORTFILE" "$PORTFILE.tmp"
  "$@" "$APP" "$START_PORT" "$PORTFILE" >"$LOG" 2>&1 &
  SPID=$!
  local i=0
  while [ $i -lt 60 ]; do
    if ! kill -0 "$SPID" 2>/dev/null; then SPID=""; return 1; fi
    if [ -s "$PORTFILE" ]; then
      PORT="$(head -n 1 "$PORTFILE" | tr -dc '0-9')"
      if [ -n "$PORT" ] && answers "$PORT"; then RUNTIME="$name"; return 0; fi
    fi
    sleep 0.2
    i=$((i + 1))
  done
  kill "$SPID" 2>/dev/null
  SPID=""
  return 1
}

want() { [ -z "$ONLY" ] || [ "$ONLY" = "$1" ]; }

try_node() {
  local list=("$RT/node-$(uname -m)")
  # Apple silicon: the arm64 build first even if this shell runs under Rosetta, then the Intel build (Rosetta)
  if [ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null)" = "1" ]; then list=("$RT/node-arm64" "$RT/node-x86_64"); fi
  local n
  for n in "${list[@]}"; do
    [ -x "$n" ] || continue
    "$n" -e 'process.exit(0)' >/dev/null 2>&1 || continue
    start "node ($(basename "$n"))" "$n" "$SRV/serve.mjs" && return 0
  done
  return 1
}
try_ruby() {
  [ -x /usr/bin/ruby ] || return 1
  /usr/bin/ruby -e 'require "webrick"' >/dev/null 2>&1 || return 1
  start "ruby" /usr/bin/ruby "$SRV/serve.rb"
}
try_perl() {
  [ -x /usr/bin/perl ] || return 1
  /usr/bin/perl -MIO::Socket::INET -MCwd -MPOSIX -e 1 >/dev/null 2>&1 || return 1
  start "perl" /usr/bin/perl "$SRV/serve.pl"
}
try_python() {
  local p
  for p in $(type -a -p python3 2>/dev/null) /opt/homebrew/bin/python3 /usr/local/bin/python3 /Library/Frameworks/Python.framework/Versions/Current/bin/python3; do
    [ -x "$p" ] || continue
    # /usr/bin/python3 is a stub that pops an "install developer tools" dialog unless the tools are installed
    if [ "$p" = "/usr/bin/python3" ]; then /usr/bin/xcode-select -p >/dev/null 2>&1 || continue; fi
    "$p" -c 'import http.server' >/dev/null 2>&1 || continue
    start "python3 ($p)" "$p" "$SRV/serve.py" && return 0
  done
  return 1
}

PORT=""
RUNTIME=""
ok=1
want node && try_node && ok=0
[ $ok -ne 0 ] && want ruby && try_ruby && ok=0
[ $ok -ne 0 ] && want perl && try_perl && ok=0
[ $ok -ne 0 ] && want python && try_python && ok=0
[ $ok -eq 0 ] || fail "No way to run the small web server was found on this Mac." "tried:${TRIED:- nothing}; last log: $(tail -n 3 "$LOG" 2>/dev/null | tr '\n' ' ')"

URL="http://127.0.0.1:$PORT/"
if [ -z "${PME_NO_OPEN:-}" ]; then
  /usr/bin/open "$URL#/" >/dev/null 2>&1 || say "  (The browser did not open by itself: type the address below.)"
fi

clear 2>/dev/null
big "THE SIMULATOR IS RUNNING" "" "It has opened in your web browser." "" "LEAVE THIS WINDOW OPEN while you use the simulator." "To stop: close this window (click \"Terminate\" if asked)."
say "  If the browser did not open, open Safari or Chrome and type this address:"
say ""
printf '        \033[1m%s\033[0m\n' "127.0.0.1:$PORT"
say ""
say "ADDRESS: $URL"
say "SERVER: $RUNTIME"

wait "$SPID"
SPID=""
fail "The small web server stopped unexpectedly." "server $RUNTIME exited; log: $(tail -n 3 "$LOG" 2>/dev/null | tr '\n' ' ')"
