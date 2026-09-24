# Stage 4a gate: skins as data and alarm sound profiles

*Branch `stage-4a-skins-audio`. Plan: `docs/plans/stage-4a-skins-audio.md`. Contract for Stage 4b: `packages/skins/CONTRACT.md`.*

## What landed

- `@pme/skins`: a closed JSON Schema (ajv, `@pme/skins/validate`), six skins in the R14 order (`saadat-like`, `philips-like`,
  `zoll-like`, `mindray-like`, `ge-like`, `lifepak-like`), the `iec-defaults` base, themes `projector-light` and `ecg-grid`,
  the `iran-icu-as-found` preset, and `resolveSkin(id, { theme })` with the renderer/audio contract.
- `@pme/audio`: alarm sound profiles `iec-style`, `saadat`, `traditional` as data; `AlarmSounder` on the existing
  look-ahead `ToneScheduler`; volume curves; pitch maps `nellcor-like`, `enhanced`, `none`; charge, ready, shock and
  NIBP-done tones; `createTonePlayer`.
- `apps/demo/stage4a-skins.html`: static preview of every skin, preset and theme; every alarm profile playable.

## Evidence

| Check | Result |
|---|---|
| `@pme/skins` tests | 155 passed (13 files, 21 snapshots) |
| `@pme/audio` tests | 58 passed (10 files; the 19 Stage 1 tests unchanged) |
| whole-repo typecheck / test / build / check-notices | all green: typecheck exit 0; tests 454 passed (skins 155, audio 58, engine-core 112, controller 97, renderer 26, validation 6; demo has no unit tests); build exit 0 (`@pme/skins` `dist/index.js` 58.56 kB, `@pme/audio` 23.11 kB); `check-notices: OK` |
| Playwright `stage4a-skins.e2e.ts` | 2 passed (with `iife-smoke.e2e.ts`: 4 passed, 6.9 s, installed Chrome, headless) |
| `@pme/skins` bundle contains ajv | no (`grep -c ajv packages/skins/dist/index.js` = 0) |

Screenshots: `docs/gates/stage-4a/*.png`, 11 files, each at most 60 KB (1280 × 640 CSS px of `#screen`, `static=1`;
palette-quantised to 256 colours by `docs/gates/stage-4a/shrink-png.py` after capture; see Deviations):

| File | Size |
|---|---|
| `ge-like.png` | 30.1 KB |
| `iran-icu-as-found.png` | 28.9 KB |
| `lifepak-like.png` | 21.9 KB |
| `mindray-like.png` | 30.3 KB |
| `philips-like--ecg-grid.png` | 55.0 KB |
| `philips-like--projector-light.png` | 30.4 KB |
| `philips-like.png` | 30.2 KB |
| `saadat-like--ecg-grid.png` | 47.8 KB |
| `saadat-like--projector-light.png` | 29.8 KB |
| `saadat-like.png` | 29.5 KB |
| `zoll-like.png` | 22.1 KB |

What the images show (Task 18 Step 3, all checked by eye):

- `saadat-like`: green ECG `II X1 NORMAL 25 mm/s AUTO`, magenta pleth, salmon IBP1, light-blue IBP2, yellow resp at
  6 mm/s; grey `NO ALARM` idle bar; red / yellow / cyan level bars with red, yellow, yellow lamps (L3 `yellow-steady`
  is the documented Saadat lamp); crossed bells in every tile and the header.
- `iran-icu-as-found`: two `II X2 MONITOR` lanes, pleth, resp at 12.5 mm/s, date `1402/04/04` (Solar), crossed bells.
- `philips-like`: `***Level high`, `**Level medium`, `*Level low` bars, `II M` and `V1 M` lanes, black idle bar.
- `zoll-like`, `lifepak-like`: three lanes (ECG, pleth, CO2), four tiles; lifepak-like CO2 at 12.5 mm/s.
- `projector-light` and `ecg-grid` themes on saadat-like and philips-like: every trace, numeric and label readable
  on the light background; the grid is drawn under the lanes.

Findings recorded, not fixed (data are as planned):

1. `mindray-like` and `ge-like` preview identically apart from the header label: they differ in data the static preview
   does not draw (ge-like limits `null` with `unverified` tags; mindray-like alarm fields).
2. `philips-like` on `ecg-grid`: the red ART trace over the red grid separates less well than the other traces. The
   theme darkens colours against the background (4.5:1), not against the grid. Worth a look when Stage 4b wires themes.
3. The preview's `iran-icu-as-found` keeps the IBP1/IBP2 tiles while its lanes drop IBP (the preset overrides
   `layout.lanes` only), which matches the preset data as written.

Audio timing: `docs/gates/stage-4a/audio-timing.json` (OfflineAudioContext, 48 kHz, onset = first sample above 10 % of
peak; measured, not read from the schedule):

| Profile | Level | Skin | Pulses/burst | Intervals (s) | First-burst onsets (s) | Pulse width (s) | Rise (ms) |
|---|---|---|---|---|---|---|---|
| iec-style | 1 | — | 10, 10, 10 | 10, 10 | 0.002 0.252 0.502 1.002 1.252 2.002 2.252 2.502 3.002 3.252 | 0.146, 0.146, 0.146 | 11 |
| iec-style | 2 | — | 3, 3, 3 | 20, 20 | 0.001 0.401 0.801 | 0.198, 0.198, 0.198 | 12 |
| iec-style | 3 | — | 1 | — | 0.001 | 0.197 | 12 |
| iec-style | 3 | philips-like | 2 | — | 0.001 0.401 | 0.197, 0.197 | 12 |
| iec-style | 1 | zoll-like | 10, 10, 10 | 15, 15 | 0.002 0.252 0.502 1.002 1.252 2.002 2.252 2.502 3.002 3.252 | 0.146, 0.146, 0.146 | 11 |
| saadat | 1 | — | 5, 5, 5 | 10, 10 | 0.002 0.252 0.502 0.952 1.202 | 0.146, 0.146, 0.146 | 11 |
| saadat | 2 | — | 3, 3, 3 | 20, 20 | 0.002 0.252 0.502 | 0.146, 0.146, 0.146 | 11 |
| saadat | 3 | — | 1, 1, 1 | 30, 30 | 0.002 | 0.146, 0.146, 0.146 | 11 |
| traditional | 1 | — | 1, 1, 1, 1 | 1, 1, 1 | 0.001 | 0.198, 0.198, 0.198 | 13 |
| traditional | 2 | — | 1, 1, 1 | 2, 2 | 0.001 | 0.198, 0.198, 0.198 | 12 |

Measured against the profile data (`levelSound` + `burstPulses`, the same numbers the scheduler uses). The 1–2 ms offsets
are the part of the 15 ms raised-cosine ramp below the 10 % detection threshold, the same on every pulse, so intervals
between pulses match the data to the millisecond:

| Profile / level (skin) | Data: pulse ms, gaps ms, repeat s | Data onsets (s) | Measured onsets (s) | Max onset error (ms) | Data vs measured interval (s) |
|---|---|---|---|---|---|
| iec-style L1 | 150, [100, 100, 350, 100, 600, 100, 100, 350, 100], 10 | 0 0.25 0.5 1 1.25 2 2.25 2.5 3 3.25 | 0.002 0.252 0.502 1.002 1.252 2.002 2.252 2.502 3.002 3.252 | 2 | 10 vs 10, 10 |
| iec-style L2 | 200, [200, 200], 20 | 0 0.4 0.8 | 0.001 0.401 0.801 | 1 | 20 vs 20, 20 |
| iec-style L3 | 200, [], not repeated | 0 | 0.001 | 1 | — vs — (one burst) |
| iec-style L3 (philips-like) | 200, [200], not repeated | 0 0.4 | 0.001 0.401 | 1 | — vs — (one burst) |
| iec-style L1 (zoll-like) | 150, [100, 100, 350, 100, 600, 100, 100, 350, 100], 15 | 0 0.25 0.5 1 1.25 2 2.25 2.5 3 3.25 | 0.002 0.252 0.502 1.002 1.252 2.002 2.252 2.502 3.002 3.252 | 2 | 15 vs 15, 15 |
| saadat L1 | 150, [100, 100, 300, 100], 10 | 0 0.25 0.5 0.95 1.2 | 0.002 0.252 0.502 0.952 1.202 | 2 | 10 vs 10, 10 |
| saadat L2 | 150, [100, 100], 20 | 0 0.25 0.5 | 0.002 0.252 0.502 | 2 | 20 vs 20, 20 |
| saadat L3 | 150, [], 30 | 0 | 0.002 | 2 | 30 vs 30, 30 |
| traditional L1 | 200, [], 1 | 0 | 0.001 | 1 | 1 vs 1, 1, 1 |
| traditional L2 | 200, [], 2 | 0 | 0.001 | 1 | 2 vs 2, 2 |

Behaviour on the live page (Task 17 Step 4, headless Chrome against `vite --port 5209`, tones counted from the
scheduler log): saadat-like L1 / L2 / L3 hand 5 / 3 / 1 pulses to Web Audio; Silence shows a 119 s countdown and a
new L1 during it sounds at once (5 pulses). philips-like L1 / L2 / L3 hand 10 / 3 / 2 pulses; Silence shows 89 s and
a new L1 during it stays silent. Device tones, SpO2 beeps at 100/90/80 and the volume slider ran without page errors.

## What Ali checks at the bedside

### Saadat-like values that are not documented

Every row below is a value the skin or the `saadat` sound profile uses that is **not** taken from the Saadat manual
as published. Tags are research 06's. Rows tagged `measured` (hex sampled from the manual's own screenshots, since
Saadat publishes colour names, not hex) are left out here; photo 1 of the checklist confirms them too.

| Field | Value | Tag | Source / note |
|---|---|---|---|
| skin `foreground` | `"#F0F0F0"` | assumed | research/06 §3.1 F1 — white lane labels; hex not published |
| skin `chrome.windowFrame` | `"#00F000"` | assumed | research/06 §3.1 F4-F5 — colour name documented, hex = ECG green |
| skin `chrome.softkeyFrame` | `"#F0F000"` | assumed | research/06 §3.1 F5 — yellow outline documented, hex assumed |
| skin `font` | `{"stack":"Arial, 'Liberation Sans', Helvetica, sans-serif","numericWeight":400,"labelCase":"upper"}` | inferred | research/06 §3.1 F1; research/06 §3.2 — Arial-like regular; the stack is [ENG] |
| skin `colors.IBP3` | `"#E07000"` | conflict | research/06 §3.2; brief §6.8 — name 'DARK ORANGE'; B9 screenshot shows mid blue ≈#3080F0 |
| skin `colors.IBP4` | `"#008C8C"` | conflict | research/06 §3.2; brief §6.8 — name 'DARK CYAN'; screenshot shows white |
| skin `colors.BFA` | `"#F0F0F0"` | assumed | research/06 §5; brief §6.8 — from the Alvand screenshot |
| skin `colors.AGENTS` | `"#F0F030"` | unverified | research/06 §3.2; brief §6.8 — not in the manual |
| skin `defaultPage` | `"P1"` | eng | ENG — factory page not stated |
| skin `sweep.style` | `"erase-bar"` | inferred | research/06 §3.1 F7 (S8) |
| skin `sweep.gapPx` | `4` | inferred | research/06 §3.1 F7 (S8); brief §3.5 — very narrow gap; verify with checklist photo 2 |
| skin `sweep.cursorLine` | `false` | inferred | research/06 §3.1 F7 (S8); brief §3.5 |
| skin `sweep.lineWidthPx` | `1.5` | eng | brief §3.5 [ENG] |
| skin `nibp.doneTone` | `false` | unverified | research/06 §4.1 — no NIBP-done tone described |
| skin `alarms.lamp.flashHz` | `{"L1":2,"L2":0.6}` | assumed | research/06 §4.2; brief §6.4.1 — not published; IEC-typical 2.0/0.6 Hz |
| skin `alarms.lamp.duty` | `0.5` | assumed | brief §6.4 (visual table) |
| skin `alarms.messageBar` | `{"L1":{"bg":"#F00000","fg":"#000000"},"L2":{"bg":"#F0F000","fg":"#000000"},"L3":{"bg":"#00D0D0","fg":"#000000"},"idle":{"bg":"#E0E0E0","fg":"#000000"},"acknowledged":{"bg":"#E0E0E0","fg":"#000000"},"prefix":"none","rotate":true}` | assumed | research/06 §5; brief §6.8 — colours per M p.38, 47; hex from the report 06 draft |
| skin `alarms.latching` | `false` | unverified | research/06 §4.2; brief §6.4.1 — manual implies non-latching |
| skin `alarms.spo2DelayS` | `null` | unverified | research/06 §4.2 — not stated beyond averaging |
| skin `limits.paed.inherit` | `"adult"` | unverified | research/06 §4.3; brief §6.8 — HR, SpO2, RR, Temp not banded in the manual; adult values inherited and marked approximate |
| skin `limits.neo.inherit` | `"adult"` | unverified | research/06 §4.3; brief §6.8 — adult HR 50-150 is clinically wrong for neonates |
| skin `arrhythmia.asystoleS` | `{"adult":10,"neo":10}` | conflict | research/06 §4.3 (M p.65, 70, 83); brief §6.4.1 — 10 s (ECG chapter) vs 5 s (arrhythmia chapter) |
| skin `arrhythmia.asystoleAltS` | `5` | conflict | research/06 §4.3 (M p.83); brief §6.4.1 |
| skin `beep.pitchMap` | `"none"` | unverified | research/06 §4.1; brief §3.6 — SpO2 pitch modulation not documented |
| skin `beep.baseHz` | `880` | assumed | brief §3.6 — pitch not published |
| skin `glyphs.noValue` | `"---"` | assumed | brief §6.2 |
| audio `saadat.levels.L1.gapsMs` | `[100,100,300,100]` | assumed | brief §6.4.1; research/06 §4.2 (M p.47) — pattern documented; 100/300 ms gaps assumed |
| audio `saadat.levels.L2.gapsMs` | `[100,100]` | assumed | brief §6.4.1 — 3 pulses documented; gaps assumed |
| audio `saadat.levels.L1.pulseMs` | `150` | assumed | brief §6.4.1 |
| audio `saadat.levels.L2.pulseMs` | `150` | assumed | brief §6.4.1 |
| audio `saadat.levels.L3.pulseMs` | `150` | assumed | brief §6.4.1 |
| audio `saadat.levels.L1.freqHz` | `880` | unverified | brief §6.4.1; research/06 §7 — pitch not published; 880 Hz assumed |
| audio `saadat.levels.L2.freqHz` | `880` | unverified | brief §6.4.1; research/06 §7 |
| audio `saadat.levels.L3.freqHz` | `880` | unverified | brief §6.4.1; research/06 §7 |
| audio `saadat.levels.L1.levelDb` | `0` | assumed | brief §6.4 (priorities 3–6 dB apart) |
| audio `saadat.levels.L2.levelDb` | `-4` | assumed | brief §6.4 (priorities 3–6 dB apart) |
| audio `saadat.levels.L3.levelDb` | `-8` | assumed | brief §6.4 (priorities 3–6 dB apart) |
| audio `saadat.harmonicsDb` | `[0,-3,-6,-9,-12]` | eng | brief §6.4.1 (reuse the §6.4 PeriodicWave until recordings) |
| audio `saadat.rampMs` | `15` | eng | brief §6.4 |
| audio `saadat.volume.maxGain` | `0.5` | eng | ENG |

### Bedside checklist (research 06 §7)

Before starting: **Setup → LOAD DEFAULT** (ask biomed first), and set the date to Solar. Phone camera, B9 on a
patient simulator or a consenting monitored patient, no patient identifiers on screen.

| # | Capture | Settles (fields above) |
|---|---|---|
| 1 | Factory main screen, P1, straight on and in focus | colours, tile grid, crossed bells (`colors.*`, `layout.*`, `foreground`, `chrome.*`) |
| 2 | Same screen at 1/15 s shutter, or a 240 fps slow-motion clip of ~3 s on the ECG lane | `sweep.gapPx`, `sweep.cursorLine`, `sweep.style` |
| 3 | MODULE COLOR window (Home → Module Setup → Module Color) | `colors.IBP3`, `colors.IBP4` (conflicts), palette names |
| 4 | Each alarm level on screen: HR high limit < HR (L1), then HR level 2, then unplug the SpO2 probe (L3); close-up of bar and lamp | `alarms.messageBar`, `alarms.lamp.*` (and flash rate from a video) |
| 5 | Silence pressed: header countdown icon, what the flashing numeric does | `alarms.silence.*` visuals |
| 6 | Paediatric and neonatal categories after LOAD DEFAULT: HR, SpO2 and Resp alarm windows | `limits.paed.inherit`, `limits.neo.inherit` |
| 7 | P5 (12-lead) and P10 (PUMP) with IBP connected | `pages` |
| 8 | An OR monitor and an ICU monitor **as found**, before touching anything | `iran-icu-as-found`; are alarms on in ORs? |
| Audio | Phone 30 cm away, quiet room: 40 s each of L1, L2, L3; QRS beep at volume 3 while SpO2 falls | `saadat.levels.*.pulseMs/gapsMs/freqHz`, `beep.pitchMap`, `beep.baseHz` |
| Stopwatch | Lead-off-with-asystole-simulator → alarm: 5 s or 10 s? HR 80→120 at 8 s average | `arrhythmia.asystoleS` (conflict) |

When the recordings arrive, the WAVs go to `research/` and the values change in `packages/audio/src/profiles/saadat.ts`
and `packages/skins/src/data/skins/saadat-like.json` with their tags moved to `measured` and the source updated;
the tests then pin the new numbers.

## Requests for Stage 4b and the engine

Not implemented here (R25: this stage does not touch `packages/renderer`, `packages/engine-core` or `packages/controller`).
The same list is in `packages/skins/CONTRACT.md`.

| ID | Owner | Request | Why / what 4a does meanwhile |
|---|---|---|---|
| RR-1 | renderer (Stage 4b) | Replace `monitor-core.ts` `THEME` and the literal `LaneConfig` values with `ResolvedSkin.render`; let `mountMonitor` accept any `resolveSkin` id instead of throwing for non-`philips-like` | Contract in `packages/skins/CONTRACT.md`; the preview page proves it with `SweepLane` |
| RR-2 | renderer | ECG gain AUTO (`LaneRender.autoGain`) | 4a starts AUTO lanes at 10 mm/mV |
| RR-3 | renderer | Optional cursor line in `SweepLane` (`render.cursorLine`) | All shipped skins say `false` |
| RR-4 | renderer | A background painter hook in `SweepLane.reset/clearSpan` so the `ecg-grid` theme's grid survives the erase bar | Preview multiplies the grid in after drawing |
| RR-5 | renderer | `NumericTile` colour/font/glyphs from the skin | Preview builds its own static tiles |
| RR-6 | renderer | `mount.ts` scheduler `play` → `createTonePlayer(...)` so alarm pulses and device tones play, not only `playBeep` | `createTonePlayer` ships and is tested |
| E-4a-1 | engine | ECG filter as a band (skin names beyond monitor 0.5–40 / diagnostic 0.05–150: 0.5–24, 0.05–100, 1–20, 0.5–20, 5–25, 0.05–32, 0.05–25, 0.05–40, 0.5–150) | `render.ecgFilter` gives the nearest engine mode with `exact: false` |
| E-4a-2 | engine | HR `moving-average-seconds` (4/8/16 s, 1 Hz) and the HR-source AUTO chain with PR relabel | `render.hrMethod.engine = null` for saadat-like |
| E-4a-3 | engine / 4b | Alarm events `{id, level, raised/cleared}` for the `AlarmSounder`, and `chargeS` on `charge` tone events | Preview raises alarms by hand |

## Deviations from the plan

Plan steps were run as written, in order; code and data files are the plan's text, extracted verbatim. Where the
run differed:

1. **Screenshot size.** The gate caps each PNG at 60 KB; the Playwright captures are 22–163 KB (the `ecg-grid` ones
   are largest). Added `docs/gates/stage-4a/shrink-png.py` (ffmpeg palette quantiser, 256 colours, no dither; stdlib
   PNG writer). Run it after the e2e test (command in its header); it is deterministic and reproduced the committed
   files byte for byte after the Task 19 re-run. 96–99 % of pixels are unchanged; only anti-aliased edges move.
2. **`@pme/skins` specifier in `apps/demo/package.json`.** `pnpm add @pme/skins@workspace:*` wrote `workspace:^`;
   changed to `workspace:*` like the demo's other workspace dependencies (and the plan author's reference tree), then
   re-locked.
3. **Task 17 Step 4** ("look at it" in your own terminal) was done headless: Vite on port 5209 from the worktree and a
   Playwright script that switched every skin × theme, raised each level, silenced and played the device tones and
   beeps (results above). The server was stopped afterwards.
4. **Commit trailer.** Commits carry `Co-Authored-By: Claude Opus 5.5 (1M context)`, the executing model's own
   attribution, as the plan's Global Constraints allow.
5. **NOTICES.** ajv was not on `origin/main` or any pushed branch when Task 1 ran, so this stage added it at 8.20.0 as
   N-010 (main ended at N-009; the Stage 5 branch uses N-050…N-052, no clash).
6. The worktree is the plan's own path, `projects/patient-monitor-engine/scratch/wt-stage-4a`; no substitution was needed.

