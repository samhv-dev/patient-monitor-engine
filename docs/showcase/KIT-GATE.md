# Offline showcase kit: gate note

## Redo the kit on a NEW main (rebuild + full proof + videos), one sequence
Needs the `scripts/showcase/` of this branch on that main (PR "Showcase kit: rehearsal and videos on the hotfix
build"); about 25 min in total, every step bounded (server checks ≈ 30 s, rehearsal ≈ 11 min, videos ≈ 9 min).
```
R=/Users/samhv/Desktop/Claude/projects/patient-monitor-engine; K=/Users/samhv/Desktop/Claude/_sandbox/pme-showcase; W=$R/scratch/wt-kit-rebuild
git -C "$R/repo" fetch origin && git -C "$R/repo" worktree add --detach "$W" origin/main && cd "$W" \
 && npx -y pnpm@9.15.9 install --frozen-lockfile \
 && node scripts/showcase/make-bundle.mjs "$K" && grep '^Commit' "$K/VERSION.txt" \
 && node scripts/showcase/check-servers.mjs "$K" --json docs/showcase/results/servers.json \
 && node scripts/showcase/check-subpath.mjs "$K" \
 && SHOWCASE_KIT="$K" SHOWCASE_WORKERS=3 npx playwright test -c scripts/showcase/playwright.showcase.config.ts rehearsal sound \
 && SHOWCASE_KIT="$K" SHOWCASE_PREFIX=/patient-monitor-engine/ SHOWCASE_TAG=-subpath npx playwright test -c scripts/showcase/playwright.showcase.config.ts rehearsal -g "Healthy induction" --project webkit \
 && node scripts/showcase/make-videos.mjs "$K"
```
(If `$W` already exists: `git -C "$W" checkout --detach origin/main` instead of `worktree add`.) Results land in
`$W/docs/showcase/results/*.json` and `rehearsal/*.jpg`; the videos replace `$K/videos/*.mp4` only when all five
recorded. Optional: the multi-window observation (`… playwright test -c … multiwindow`) and the early-CPR probe
(`SHOWCASE_CPR_AT=628 SHOWCASE_TAG=-cpr-at-628 … rehearsal -g haemorrhage`, expected to FAIL its ROSC check, see U1).

**Both builds.** The checks are directions with floors, chosen to hold on the hotfix build and on the FU-7
drug-layer build (independent FU-7 run: bronchospasm VTE ≈ 161 → 305 mL at 3 min, ≈ 360 at 6 min, EtCO2 ≈ 40):
apnoea alarm ≤ 70 s after "Induce now"; MAP falls ≥ 10; Saadat CO2 tile > 25 after intubation; anaphylaxis HR > 120
at 2 min and systolic > 110 within 60 s of epinephrine; bronchospasm VTE rises ≥ 100 mL within 3 min; tamponade MAP
< 40 within 5 min of propofol; haemorrhage pulse lost 8–13 min and systolic > 90 within 7 min of CPR pressed 10 s after
"SPO2 NO PULSE"; second load restarts the clock < 00:20.

---

*Round 2, 2026-10-04: kit rebuilt from `main` **f29951b** (= add125f, the hotfix + kit merge, plus a RESUME-only
commit) into `/Users/samhv/Desktop/Claude/_sandbox/pme-showcase/`; `VERSION.txt` says `Commit: f29951b8…`.
Machine: Apple silicon, Darwin 27, /usr/bin/ruby 2.6.10 + WEBrick, /usr/bin/perl 5.34.1, Xcode installed,
ffmpeg 9.0.1. Default Saadat-style monitor throughout (no skin switch). Labels per step: `RUN-STEPS.md`.*

## Kit layout and launcher (unchanged since round 1)
`app/` (whole `vite build --base ./`, 2.0 MB) · `Start Simulator.command` · `server/` (serve.mjs, serve.rb, serve.pl,
serve.py) · `runtime/` (**empty**: this Mac's node is Homebrew v26.8.2, ad-hoc signed, not an official Node.js build;
nothing downloaded) · `READ ME FIRST.txt` · `VERSION.txt` · `videos/`.
Launcher: server chain bundled node → /usr/bin/ruby (WEBrick) → /usr/bin/perl (core modules) → a real python3 (the
/usr/bin/python3 stub only if `xcode-select -p` succeeds); 127.0.0.1, port 8642 or the next free of 49; temp files
only under $TMPDIR; opens `/#/`; plain banner; closing the window stops the server; failure text points to the rescue
card and the videos folder.

## (a) Server variants — `check-servers.mjs` (launcher selection, `env -i PATH=/usr/bin:/bin`)
All PASS on the rebuilt kit (`results/servers.json`): ruby, perl, python3 (real), node (stand-in: this Mac's node
linked as runtime/node-arm64 in a temp copy), and ruby + perl from a READ-ONLY disk image at a path with spaces.
Each: index.html / entry JS / worker chunk / CSS with correct types, framed page with a query string, HEAD, 404,
three traversal forms refused, POST refused, bound to 127.0.0.1 only, server gone after SIGHUP, bundle untouched.
Sub-path: `check-subpath.mjs` 77 files, 0 root-absolute URLs.

## (b) Five-case rehearsal — perl server through the launcher, 1440×900, fresh page per case, ×4, sim time
| Case | Check | Chromium | WebKit |
|---|---|---|---|
| Healthy induction | apnoea alarm ≤ 70 s after "Induce now" | PASS 57.1 s "CO2 APNEA" | PASS 55.7 s "CO2 APNEA" |
| | MAP falls ≥ 10 | PASS 94.8 → 71.5 | PASS 94.8 → 71.4 |
| | Saadat CO2 tile > 25 after "Intubate and ventilate" | PASS 46 after 5.8 s (tile "CO2 mmHg 46 FiCO2 46 awRR 3") | PASS 46 after 6.2 s |
| Anaphylaxis | reaction starts by itself at 1 min | PASS | PASS |
| | HR > 120 ≈ 2 min in | PASS 135 (ART 97/70) | PASS 135 (95/70) |
| | systolic > 110 ≤ 60 s after "Give epinephrine 100 µg" | PASS 11.7 s; 2 min later 120/88, HR 111 | PASS 11.8 s; 119/88, HR 111 |
| Bronchospasm | button changes state; new label "Salbutamol given: ventilation recovering" shown | PASS / PASS | PASS / PASS |
| | VTE rises ≥ 100 mL within 3 min | PASS 162 → 367 mL (6 min: 379) | PASS 161 → 367 (6 min: 379) |
| Tamponade | MAP < 40 ≤ 5 min after "Give propofol 2 mg/kg" | PASS 112.6 s; 2 min: HR 40, 41/29 (33) | PASS 113.1 s; 39/29 (32) |
| Haemorrhage | pulse lost 8–13 min | PASS 10:03 ("IBP1 STATIC PRESSURE") | PASS 10:03 |
| | CPR pressed 10 s after "SPO2 NO PULSE" (10:40) → systolic > 90 ≤ 7 min | PASS 4.3 min | PASS 4.3 min |
| | "Pulse back: stop CPR" → Return of circulation | PASS; 1 min later 132/89, HR 78, EtCO2 34 | PASS; 132/89 |
| Second scenario in the same page | clock restarts < 00:20 | PASS 02:02 → 00:05, runs on (00:36 8 s later) | PASS 02:02 → 00:04 → 00:35 |
| All runs | no console / page error | none | none |

Bronchospasm ventilator numbers (both browsers): before salbutamol VTE 161–162 mL, Ppeak 35, ExpMinVol 2.3; 3 min
after 367 mL, Ppeak 35, MinVol 5.1; 6 min after 379 mL, MinVol 5.3; "High pressure (Pmax)" banner stays.
Sub-path: "Healthy induction" on WebKit at `http://127.0.0.1:8700/patient-monitor-engine/#/teach` — PASS (apnoea alarm
53.5 s, MAP 94.7 → 71.8, CO2 tile 44 after 9.8 s, no error).

## Early-CPR re-test (haemorrhage) — the VF finding still reproduces on this build
| CPR pressed (sim clock) | Chromium | WebKit |
|---|---|---|
| 10:24–10:26 (`SHOWCASE_CPR_AT=620`) | "ECG VFIB" 10:33; no systolic > 90 in 8 min (best 63); after "Pulse back: stop CPR" pulseless again ("IBP1 STATIC PRESSURE", "SPO2 NO PULSE") | same: VFIB 10:33, best 63, pulseless after stop |
| 10:32–10:33 (`SHOWCASE_CPR_AT=628`) | VFIB 10:33; best 63; pulseless after stop | no VFIB alarm, best 63; after stop "ECG ASYSTOLE" |
| 10:55 (10 s after "SPO2 NO PULSE" at 10:40) | systolic > 90 after 4.3 min, ROSC holds | same |

So on f29951b, at ×4 through the app's own button, pressing CPR before about 10:35 does **not** reach ROSC on either
browser; after "SPO2 NO PULSE" it does, every time. This disagrees with the independent run reported to the
orchestrator; I cannot see how that run pressed (speed, route, exact second), so I report only what this harness
measured. Note the polling lag: the 628 probe actually pressed at 10:32–10:33, so "10:28 exactly" was not hit; the 620
probe (10:24–10:26) brackets it from below. Results: `results/…-cpr-at-620.json`, `…-cpr-at-628.json`.

## (c) Multi-window (re-run on this build; observation only)
Same as round 1 on both engines: a second window at #/monitor, #/explore or #/vent runs its OWN patient (own code, no
scenario, ×1, clock 300–330 s behind the instructor); the Remote from #/remote → "Open the remote in a new window"
stays in step ("Connected to <code>", pressing "Intubate and ventilate" on it moved the host to "Intubated and
ventilated"). Projector set-up that works: instructor window in Monitor view on the projector + the Remote window.

## (d) Sound
Both engines: no AudioContext before the click; one click on **Sound off** → **Sound on**, context `running`; after a
case load + alarm ("!!! Apnoea (no CO₂ breaths)") the first context is `closed` and a new one `running`; no error.

## Videos (ffmpeg 9.0.1)
`make-videos.mjs` (Chromium 1280×800, ×4, recordVideo → H.264 yuv420p, faststart, no audio) into `$K/videos/`,
replacing the round-1 files (all five recording runs passed their checks):

| File | Duration | Size |
|---|---|---|
| 1-healthy-induction.mp4 | 1 min 13 s | 3.3 MB |
| 2-anaphylaxis.mp4 | 1 min 19 s | 3.6 MB |
| 3-bronchospasm.mp4 (includes #/vent before, 3 min and 6 min after salbutamol) | 2 min 03 s | 5.6 MB |
| 4-haemorrhage-cpr.mp4 (CPR 10 s after "SPO2 NO PULSE") | 4 min 07 s | 10.1 MB |
| 5-tamponade.mp4 | 42 s | 2.2 MB |

All H.264, 1280×800. They show the default Saadat-style monitor with its CO2 lane and tile.

## Unexpected behaviour (reported, not fixed)
- **U1 — haemorrhage early CPR: VF / no ROSC** (above). Run sheet: wait for "SPO2 NO PULSE".
- **U2 — pulse loss on the arterial line is "IBP1 STATIC PRESSURE"** (systolic/diastolic blank, mean ≈ 15), never a
  systolic < 20.
- **U3 — "Alarms off" on the top-right button** on every fresh load, and every Saadat tile shows a crossed-out bell,
  while alarms are raised. New detail: at the moment the apnoea alarm fired, the button read "!!! Apnoea (no CO₂
  breaths)" on Chromium but still "Alarms off" on WebKit (sampled within ~1 s; the button is throttled to 2 Hz, so this
  may be timing only).
- **U4 — duplicate state boxes**: "Epinephrine given" ×2, "Salbutamol given: ventilation recovering" ×2, "After
  induction: compensation lost" ×2.
- **U5 — the Remote's speed control shows ×1** while the host runs at ×4.
- **U6 — bronchospasm Ppeak stays 35** (pressure-limited); the new card text ("delivered tidal volume and minute volume
  rise") now matches what the screen shows.
- Fixed by the hotfix and verified here: CO2 lane + tile on Saadat-style; clock restart on a second load; "Choose
  another scenario" now shows the library with **Back to the running case**.

## Files
`scripts/showcase/`: make-bundle.mjs, kit/{start-simulator.command, read-me-first.txt}, server/serve.{mjs,rb,pl,py},
check-servers.mjs, check-subpath.mjs, make-videos.mjs, playwright.showcase.config.ts, global-setup.ts,
showcase-support.ts, rehearsal.showcase.ts, multiwindow.showcase.ts, sound.showcase.ts. Not collected by
`pnpm test:e2e`. The hosted-copy publisher (`publish-pages.mjs`) does not exist: writing it was refused by the
permission system in round 1.
