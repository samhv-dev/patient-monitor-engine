# Offline showcase kit: gate note

*Branch `showcase-kit`, 2026-10-04. Kit built from `main` bd5880b (before the showcase hotfix) into
`/Users/samhv/Desktop/Claude/_sandbox/pme-showcase/`. Machine: Apple silicon (arm64), macOS (Darwin 27),
/usr/bin/ruby 2.6.10 + WEBrick, /usr/bin/perl 5.34.1, Xcode installed (so /usr/bin/python3 is real here),
ffmpeg 9.0.1. Exact on-screen labels per case: `RUN-STEPS.md`. Raw evidence: `results/*.json`, `rehearsal/*.jpg`.*

## Rebuild (one command, from the repo root of any checkout)
```
node scripts/showcase/make-bundle.mjs /Users/samhv/Desktop/Claude/_sandbox/pme-showcase
```
It installs the workspace dependencies only if `node_modules` is missing, runs `vite build --base ./` for
apps/demo into `app/`, copies the launcher, servers and read-me, writes `VERSION.txt`, and replaces only its own
entries (an existing `videos/` folder is kept). Then, to re-prove and re-record:
```
node scripts/showcase/check-servers.mjs <KIT> --json docs/showcase/results/servers.json     # proof (a), ~20 s
SHOWCASE_KIT=<KIT> npx playwright test -c scripts/showcase/playwright.showcase.config.ts    # (b) (c) (d), ~12 min
node scripts/showcase/make-videos.mjs <KIT>                                                 # videos, ~9 min
node scripts/showcase/check-subpath.mjs <KIT>                                               # no root-absolute URLs
```

## Kit layout
`app/` (whole dist, 2.0 MB, 27 pages + 50 assets; the worker is inlined in `assets/engine.worker-*.js`) ·
`Start Simulator.command` · `server/` (serve.mjs, serve.rb, serve.pl, serve.py) · `runtime/` (EMPTY, see below) ·
`READ ME FIRST.txt` (10 lines) · `VERSION.txt` · `videos/` (made by make-videos.mjs).

**runtime/ is empty:** this machine's node is Homebrew's v26.8.2 (`/opt/homebrew/Cellar/node/26.8.2/bin/node`,
`Signature=adhoc`, no TeamIdentifier) — not an official Node.js Foundation/OpenJS build, so it is not copied (it also
links Homebrew dylibs). Nothing was downloaded. The node path of the launcher is still proven (row "node stand-in").

## Launcher behaviour
Finds the kit by its own path (spaces fine), writes only to `mktemp -d ${TMPDIR:-/tmp}/pme-showcase.XXXXXX`
(removed on exit). Server chain, first that answers HTTP on 127.0.0.1 within 12 s: `runtime/node-<arch>` (Apple
silicon tries node-arm64 then node-x86_64) → `/usr/bin/ruby` if `require "webrick"` works → `/usr/bin/perl` if
IO::Socket::INET/Cwd/POSIX load → python3 (any real one; `/usr/bin/python3` only when `xcode-select -p` succeeds, so
the install-tools dialog is never triggered). Each server tries port 8642 and the next 49 and reports the port it
bound through a temp file (no race). Then `open http://127.0.0.1:<port>/#/` (the Start page), a big plain banner
("THE SIMULATOR IS RUNNING … LEAVE THIS WINDOW OPEN … To stop: close this window (click "Terminate" if asked)" and the
address `127.0.0.1:<port>` to type by hand), and it waits on the server. Closing the window (SIGHUP) stops the server.
Any failure prints "THE SIMULATOR COULD NOT START … Please turn to the RESCUE CARD … The recorded cases are in the
"videos" folder" plus one technical line, and exits non-zero (Terminal keeps the window open). Never asks for input.
Port 8642 is kept stable on purpose: the app's settings (monitor style) live in the browser per address, so the same
port on every start keeps them.

## (a) Server variants — `check-servers.mjs`, launched through the launcher with `env -i PATH=/usr/bin:/bin PME_ONLY=<v> PME_NO_OPEN=1`
| Variant | Chosen by launcher | index.html | entry JS | worker chunk (591,688 B) | CSS | HEAD | 404 | traversal (3 forms) | POST | bind | stops on SIGHUP | bundle untouched |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ruby (WEBrick) | ruby, 8642 | 200 text/html | 200 text/javascript | 200 text/javascript | text/css | 200 | 404 | 400 ×3 | 405 | 127.0.0.1 | yes | yes |
| perl (core only) | perl, 8642 | 200 text/html | 200 text/javascript | 200 text/javascript | text/css | 200 | 404 | 403 ×3 | 405 | 127.0.0.1 | yes | yes |
| python3 (real) | /usr/bin/python3 | 200 text/html | 200 text/javascript | 200 text/javascript | text/css | 200 | 404 | 404 ×3 | 501 | 127.0.0.1 | yes | yes |
| node (stand-in: this machine's node linked as runtime/node-arm64 in a temp copy) | node (node-arm64) | 200 text/html | 200 text/javascript | 200 text/javascript | text/css | 200 | 404 | 403 ×3 | 405 | 127.0.0.1 | yes | yes |
| ruby from a READ-ONLY disk image (UDRO, mounted read-only at ".../USB stick (read only)/pme showcase") | ruby | ok | ok | ok | ok | ok | ok | 400 ×3 | 405 | 127.0.0.1 | yes | yes |
| perl from the same read-only image | perl | ok | ok | ok | ok | ok | ok | 403 ×3 | 405 | 127.0.0.1 | yes | yes |

All rows PASS (`results/servers.json`). Every server also serves a framed page with a query string
(`vent-hamilton.html?link=…`). **Not tested here:** a real Finder double-click (Gatekeeper and the "Terminal wants to
access files on a removable volume" prompt are covered by READ ME lines 2–3), the launcher's `open` of the default
browser (suppressed in tests so no browser opened on this Mac), and the python stub-skip branch (Xcode is installed
here, so `/usr/bin/python3` is real).

## (b) Five-case rehearsal — `rehearsal.showcase.ts`, perl server through the launcher, 1440×900, fresh page load per case, ×4
Values read from the engine's `measurement` events through the app hook (= the monitor's numbers, whatever the
skin; EtCO2 is available although the Saadat-style layout does not show it yet). Sim time.

| Case | Expected (orchestrator) | Chromium | WebKit |
|---|---|---|---|
| Healthy induction | apnoea ≤ 60 s after "Induce now"; MAP falls ≥ 10; EtCO2 > 25 after "Intubate and ventilate" | PASS — apnoea 54.4 s (RR 0; "CO2 APNEA" at 52.7 s); MAP 94.8 → 71.7; EtCO2 46 after 5.4 s | PASS — apnoea 56.7 s ("CO2 APNEA"); MAP 94.8 → 71.6; EtCO2 46 after 5.4 s |
| Anaphylaxis under anaesthesia | HR > 120 at ≈ 2 min; epinephrine 100 µg at ≈ 2 min → systolic > 110 within 60 s | PASS — reaction by itself at 60 s; HR 135 (ART 96/70); systolic > 110 after 11.5 s; 2 min later 121/88, HR 110 | PASS — HR 135 (97/70); systolic > 110 after 11.4 s; 2 min later 122/88, HR 112 |
| Severe bronchospasm on the ventilator | loads; "Give salbutamol 250 µg" works and changes the state; #/vent screenshots | PASS — spasm → treatedByButton; vent VTE 162 → 367 ml, Ppeak 35 → 35, MinVol 2.3 → 5.1 | PASS — same (VTE 161 → 367, Ppeak 35 → 35, MinVol 2.3 → 5.1) |
| Severe tamponade, then induction | arterial mean < 40 after the induction action | PASS — "Give propofol 2 mg/kg" → MAP < 40 after 113 s; 2 min: HR 40, 39/29 (32), SpO2 83 | PASS — after 113 s; 2 min: HR 40, 41/29 (33), SpO2 82 |
| Class IV haemorrhage, PEA and resuscitation | pulse lost 8–13 min; CPR → systolic > 90 within 7 min; then "Pulse back: stop CPR" | PASS — pulse lost 10:03 (static arterial pressure); CPR pressed 10:56 (10 s after "SPO2 NO PULSE"); systolic > 90 after 4.3 min; stop CPR → rosc, 1 min later 131/88 | PASS — identical timings (4.3 min), 1 min after stop 131/88 |

No console error and no page error in any of the 10 runs (nor in the probes, multi-window or sound runs).
Screenshots: `rehearsal/<case>-<browser>.jpg` (960 px, ≤ 45 KB) plus the two #/vent pairs.

Two departures from the brief's wording, both measured, nothing tuned:
1. **"Arterial systolic < 20" never happens**: at 10:03 the monitor raises "IBP1 STATIC PRESSURE" and blanks
   systolic/diastolic (mean ≈ 15 stays). The rehearsal counts that as pulse loss (first run, which waited for
   systolic < 20, ran to asystole at 15:00 without ever seeing it).
2. **The moment CPR is pressed decides the outcome** (U1 below). The rehearsal presses 10 s after "SPO2 NO PULSE".

## Sub-path (hosted-copy layout) proof
`check-subpath.mjs`: 77 HTML/CSS/JS files, 27 pages with 320 `./` references, **0 root-absolute URLs** (no
`src="/…"`, `href="/…"`, `url(/…)` or `"/assets/…"`); the worker is inlined (no worker URL to resolve); the remote
pairing link is built from `location.pathname`. Runtime: the app copied under `/patient-monitor-engine/` of a temp
root, served by `serve.pl`, "Healthy induction" on **WebKit** at `http://127.0.0.1:8700/patient-monitor-engine/#/teach`
— PASS (apnoea 53.4 s, MAP 94.8 → 71.4, EtCO2 back after 5.6 s, no console error;
`results/rehearsal-healthy-induction-webkit-subpath.json`). Run: `SHOWCASE_PREFIX=/patient-monitor-engine/
SHOWCASE_TAG=-subpath SHOWCASE_KIT=<KIT> npx playwright test -c scripts/showcase/playwright.showcase.config.ts
rehearsal -g "Healthy induction" --project webkit`.
The publishing script for GitHub Pages (`publish-pages.mjs`) was NOT written: writing it was refused by the
permission system (see the PR body); nothing was pushed to a gh-pages branch and Pages was not touched.

## (c) Multi-window — `multiwindow.showcase.ts` (one browser context; A = #/teach running "Healthy induction" at ×4)
| Second window | Chromium | WebKit | What it shows |
|---|---|---|---|
| B: new window at #/monitor | NOT in step | NOT in step | Its own patient: new session code, "M 40 y 70 kg", "No scenario", ×1, own clock (110–127 s behind A); A's "Induce now" changes nothing in B |
| C: new window at #/explore | NOT in step | NOT in step | Same: its own default patient and engine |
| D: new window at #/vent | NOT in step | NOT in step | Same: its ventilator is linked to D's own patient (`?link=v<D's code>`) |
| R: Remote opened from A (#/remote → "Open the remote in a new window") | IN step | IN step | "Connected to <A's code>", shows A's scenario and state; pressing "Intubate and ventilate" on R moved A (now on #/monitor) to "Intubated and ventilated", EtCO2 45 |

Every document opened at an app address starts its own engine; only `#/remote` joins a session. So for a projector:
**A in Monitor view on the projector + the Remote window on the laptop** works on both engines; a second
#/monitor, #/explore or #/vent window does NOT mirror the instructor (and adds a second running engine). Within ONE
window, switching Instructor/Monitor/Explore/Ventilator keeps the same patient (by design). Remote cosmetic: its speed
control shows ×1 selected while the host runs at ×4 (U5). Screenshots `rehearsal/multiwindow-*.jpg`.

## (d) Sound — `sound.showcase.ts`
Both engines: no AudioContext before the click; after one click on **Sound off** the button reads **Sound on** and the
page's AudioContext is `running`; after loading the tamponade case + propofol (alarms "!!! Apnoea (no CO₂ breaths)")
the first context is `closed` and a new one `running` (the scenario load remounts the monitor and recreates audio);
no console error. Headless browsers cannot be heard.

## Videos (ffmpeg 9.0.1 present)
`make-videos.mjs`: the same rehearsal on Chromium 1280×800 at ×4 with recordVideo, converted to H.264/yuv420p
.mp4 (faststart, QuickTime-compatible) in `<KIT>/videos/`: "1 healthy induction.mp4" 72 s 3.3 MB · "2 anaphylaxis
under anaesthesia.mp4" 78 s 3.7 MB · "3 severe bronchospasm on the ventilator.mp4" 77 s 3.7 MB · "4 severe tamponade
then induction.mp4" 42 s 2.3 MB · "5 class IV haemorrhage PEA and resuscitation.mp4" 246 s 10.6 MB. No sound
track, no captions. They show the default Saadat-style monitor of this build (no CO2 lane) — re-record after the hotfix.

## Unexpected behaviour (reported, not fixed)
- **U1 — haemorrhage: CPR pressed early gives VF and no return of circulation.** Pressed at 10:28 (25 s after "IBP1
  STATIC PRESSURE", before "SPO2 NO PULSE"): "ECG VFIB" at 10:33 and no pulse in 8 min of CPR (best systolic 63) on
  BOTH browsers; after "Pulse back: stop CPR" the patient was pulseless again. Pressed at 10:52, 10:56 or 11:47 (after
  "SPO2 NO PULSE" at 10:40): systolic > 90 after 4.3 min every time. The card says nothing about VF; a presenter who
  reacts fast would hit this. Run-sheet cue: wait for "SPO2 NO PULSE". (`results/…-cpr-at-628/645/700.json`)
- **U2 — the arterial line shows pulse loss as "IBP1 STATIC PRESSURE"** with systolic/diastolic blank and a mean of
  ≈ 15, not as a low systolic.
- **U3 — the top-right alarm button reads "Alarms off" on every fresh load** and whenever no alarm is active, and every
  Saadat-style tile shows a red crossed-out bell; alarms are nevertheless raised and shown ("CO2 APNEA", "IBP1 STATIC
  PRESSURE", "SPO2 NO PULSE", "ECG VFIB"). Either the default profile reports all alarms off or the label is wrong —
  an attending may ask.
- **U4 — duplicate boxes in the state strip:** "Epinephrine given" ×2 (anaphylaxis), "Salbutamol given: pressures
  falling" ×2 (bronchospasm), "After induction: compensation lost" ×2 (tamponade) — two states with one label (the
  button route and the drug route).
- **U5 — the Remote's speed control shows ×1 while the host runs at ×4.**
- **U6 — bronchospasm: Ppeak stays 35 (pressure-limited)** while VTE 162 → 367 ml (confirms the orchestrator's finding;
  the card's "watch the pressures fall" is not what the screen shows).
- Confirmed from earlier: no CO2 lane/tile on the default Saadat-style monitor (S1, hotfix).

## Files
`scripts/showcase/`: make-bundle.mjs, kit/start-simulator.command, kit/read-me-first.txt, server/serve.{mjs,rb,pl,py},
check-servers.mjs, check-subpath.mjs, make-videos.mjs, playwright.showcase.config.ts, global-setup.ts,
showcase-support.ts, rehearsal.showcase.ts, multiwindow.showcase.ts, sound.showcase.ts. `.gitignore`: `pme-showcase/`.
None of these is collected by `pnpm test:e2e` (its testDir is apps/demo/e2e).
