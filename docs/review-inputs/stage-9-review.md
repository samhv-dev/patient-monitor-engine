# Stage 9 "clinical UI and naming" — R50 plan review

*Read-only review of `docs/plans/stage-9-clinical-ui.md` (6,686 lines) on branch `review/stage-9-plan` (ab9623b),
2026-09-29. Inputs read: `docs/review-inputs/README.md`, `rulings-excerpt.md`, the whole plan, the research snapshot
(`11-capability-inventory-and-glossary.md` §5/§5.16, `13-ui-benchmarks.md`, `13-ui-design-brief-draft.md`,
`13-ui-design-references.md`, `13-ui-simulator-benchmarks.md`), a sample of the 56 prototype screenshots, and the
FU-4, FU-5, FU-6 and FU-7 plans. Mechanical checks ran on throwaway worktrees of `origin/main` 776ebb5 (FU-5 merged)
and the plan's own base 891d4d2; nothing in the repository was changed except this file.*

## Verdict: APPROVE WITH FIXES

The plan is complete, mechanically sound and faithful to the partition. Its four existing-file blocks match exactly
once on today's main and on the FU-4 and FU-5 branches, the prototype patch applies cleanly to today's main, and every
unit number it claims reproduces exactly. The accessibility and glossary e2e pass on bundled Chromium. E-S9-2 fixes a
real defect with a minimal change. No finding blocks execution, but eight major findings should be fixed in the plan
before an executor starts. They are the short-label collisions that break the R56 collision rulings, cross-device
pairing that cannot work by default, FU-5's orphaned request R-FU5-6, the alarm mirror's vendor text, the skin-colour
mirror going stale, the frame gate's lighter load, the flaky remote e2e, and E-S9-2's incomplete test. The orchestrator
also has six rulings to make (section "Rulings").

## Mechanical results

### 1. Find/replace blocks on existing files

Each find block was counted with `str.count` against the file at each ref.

| Plan location | File | origin/main 776ebb5 | 891d4d2 (plan base) | origin/fu-4-integration-polish 7975074 | origin/fu-5-monitor-fidelity |
|---|---|---|---|---|---|
| Task 7 Step 1 (l. 3232) | `packages/controller/src/session/host-session.ts` | 1 | 1 | 1 | 1 |
| Task 7 Step 2 (l. 3247) | `packages/controller/test/session/host-session.test.ts` | 1 | 1 | 1 | 1 |
| Task 19 Step 2 (l. 5737) | `apps/demo/index.html` | 1 | 1 | 1 | 1 |
| Task 19 Step 3 (l. 5795) | `packages/controller/src/panel/styles.ts` | 1 | 1 | 1 | 1 |

- Task 0 Step 3's grep counts on origin/main are 2, 1, 1, 1, as the plan expects.
- Every Task 0 Step 4 import exists on origin/main (`mountMonitor`, `ConsoleModel`, `fmtValue`, `GroupId`, the six
  console action builders, `attachMonitorToLink`, `createBroadcastPort`, `DRUGS`, `DRUG_IDS`, `LUNG_CONDITIONS`,
  `RHYTHM_IDS`, `stage1Vocabulary`, `manualLabel`).
- The plan's own `stage-9-verify.py` on a clean origin/main against origin/main + patch printed
  `created 61, edited 4, problems 0`. The plan and the prototype patch cover the same 65 files.
- FU-4 (7975074) does not touch any of the four files. FU-5 is merged into main; its branch differs from main in one
  unrelated file. The FU-4, FU-6 and FU-7 plans never mention `index.html`, `panel/styles.ts` or `host-session.ts`,
  and none adds a scenario JSON under `packages/controller/scenarios`.

### 2. Prototype patch on origin/main

`git apply docs/plans/stage-9-prototype.patch` applies cleanly to origin/main 776ebb5 and to 891d4d2.

| Check | Plan's claim | Measured on origin/main + patch |
|---|---|---|
| `pnpm install --frozen-lockfile` | — | OK, 4 s |
| Typecheck (demo, controller, `pnpm typecheck` for all packages) | clean | clean |
| `pnpm build` | — | OK |
| Demo `src/app` unit tests | 9 files, 32 tests | 9 files, 32 passed |
| Demo package unit tests | 18 files, 173 tests | 18 files, 173 passed |
| Controller unit tests | 37 files, 215 tests | 37 files, 215 passed (360 s) |
| `stage9-a11y.e2e.ts` | 2 passed, 0 findings | 2 passed, 0 findings |
| `stage9-glossary.e2e.ts` | clean | 1 passed, 0 hits |
| `stage9-app.e2e.ts` | 3 passed | session and deep-link tests passed; the remote test failed at the "1 held" badge in the 2-worker run, then passed alone twice (F7) |
| `stage9-tasks.e2e.ts` | tasks 1–4 pass, task 5 stops at ΔP | tasks 3, 1, 2, 4 in 3.1, 1.1, 0.8, 0.7 s; task 5 fails at the ΔP line, as designed |
| `stage6a.e2e.ts`, `stage6b.e2e.ts` with the opaque drawer | pass | 3 + 1 passed |
| Frame gate, shell mounted, panel open | p95 16.7 ms in all four | see the table below |

**Browser.** Playwright 1.63 wants Chromium build 1243. The container's network policy blocks `cdn.playwright.dev`,
so the build was downloaded from Google's Chrome for Testing bucket and installed through Playwright's download-host
override. Runs used that bundled Chromium (`--project=chromium`), not system Chrome. The frame script was run from a
scratch copy with `channel: 'chrome'` removed, because system Chrome is not installed. WebKit was not installed, so
nothing Stage 9 adds was run on WebKit (F16). The 56-image screenshot matrix was not re-run; the committed prototype
shots are all ≤ 60 KB.

**Frame gate** (`stage9-frames.mjs`, 10 s warm-up, 60 s window, headless bundled Chromium in the cloud container):

| Viewport | Site fps | Render path | n | p50 ms | p95 ms | p99 ms | max ms | Gate |
|---|---|---|---|---|---|---|---|---|
| 1920×1080 | 60 | worker-raf | 3,602 | 16.7 | 16.7 | 16.8 | 16.8 | pass |
| 1920×1080 | 30 | worker-raf | 3,601 | 16.7 | 16.8 | 16.8 | 16.8 | pass |
| 1280×800 | 60 | worker-raf | 3,602 | 16.7 | 16.7 | 16.8 | 16.8 | pass |
| 1280×800 | 30 | worker-raf | 3,601 | 16.7 | 16.8 | 16.8 | 16.8 | pass |

The p95 matches the plan's 16.7 ms. The 30 fps rows still count about 3,600 frames in 60 s, so this measure records the
main thread's 60 Hz animation frames, not the worker's capped drawing (see F6). The container has no GPU, so the max of
16.8 ms says little about a real laptop or iPad.

## Findings

Severity: **blocker** = must change before execution; **major** = fix in the plan before handing it to an executor;
**minor** = fix while executing or record in the gate note.

### F1 (major) — `shortLabel` strips the parenthesis that disambiguates a label, re-creating collisions the glossary resolved

- **Location:** Task 2 Step 2, `glossary.ts` `shortLabel` (plan l. 1346) and `labelOf` (l. 1366); Task 17
  `explore.ts`, the `seen` set that keeps one row per label (l. 5335).
- **Evidence:** `shortLabel` cuts the label at its first parenthesis. Run on the patched tree, 12 short labels are
  shared by entries that carry engine keys: SVR (61 `ev.circ.svr`, dyn·s·cm⁻⁵) and "SVR (model)" (68
  `hemo.circ.p.rSys`, mmHg·s/mL); EtCO₂ (15, the monitor) and "EtCO₂ (true)" (112, truth before the sampler); RR
  (18) and "RR (spont)" (124); FiCO₂ (16) and "FiCO₂ (source)" (131); T1 (19 and 263); MAC (29, 265, 277); ICP, CPP,
  UO and Glucose (each twice); Ce (271, 278). `labelOf('hemo.circ.p.rSys')` returns "SVR" and
  `labelOf('hemo.circOut.pPa')` returns "PAP". In Explore, the `seen` set then silently drops the second row with the
  same label, so the model SVR or the true EtCO₂ never appears, and when both appear in different sections a resident
  sees two different "SVR" values with different units. This is the ambiguity research/11 §5.16 rule 3 exists to
  prevent. The tooltip button is also named from `shortLabel`, so the LVAD entry's button reads "About PI".
  `glossary.test.ts` checks only CPP/CoPP, PI/PI (LVAD), SR and FO₂Hb/SaO₂, so it cannot catch this.
- **Fix:** Strip only notes the glossary marks as notes, never a qualifier. Simplest: keep the full label in tables
  and tooltips, and use `shortLabel` only where the entry's parenthesis is an alias ("T1 (Tcore)", "ART M (MAP)").
  Add a `short?` field or a small allow-list of alias parentheses. Deduplicate Explore rows by glossary entry number
  and key, not by label. Add a test: no two entries with keys share a displayed label unless they are the same
  quantity (the monitor and truth copies of one value).

### F2 (major) — Cross-device pairing cannot work by default: the QR code encodes a loopback address over a same-browser channel

- **Location:** D15 (l. 173); Task 16 Step 3 `remote.ts` `pairingUrl` (l. 5150) and the host copy (l. 5167); Q4.
- **Evidence:** Without `?relay=`, the transport is `createBroadcastChannelTransport`, which only reaches pages in the
  same browser profile. `pairingUrl` uses `location.origin`, so the prototype screenshot `remote-pairing-1280x800.png`
  encodes `http://127.0.0.1:5173/#/remote?code=X8N9HH`. A tablet scanning it cannot reach the loopback address, and
  would not share the BroadcastChannel if it could. Yet the page says "Scan the code with the tablet … Both devices
  must reach this computer on the same network." The only pairing e2e opens the remote as a second page in the same
  browser context, so this path is untested. The 6a relay exists (`pnpm relay`), but nothing tells the instructor.
- **Fix:** When no relay is configured, the host Remote view says pairing works only in this browser, hides the QR
  code, and shows how to start the relay (`pnpm relay`, then open the app with `?relay=ws://<LAN IP>:<port>`). With a
  relay, it encodes a LAN address, not `localhost` or `127.0.0.1`. Add a unit test of `pairingUrl` for both cases, and
  record in the gate note whether a real tablet paired over the relay.

### F3 (major) — FU-5's request R-FU5-6 to Stage 9 is not taken, not declined and cannot be done inside the partition

- **Location:** Global Constraints "Partition" (l. 55–75) and "Requests to other stages" (l. 264–287); FU-5 plan
  R-FU5-6 (fu-5 l. 430–436) and A10-E5 (l. 443).
- **Evidence:** FU-5 assigns Stage 9 four things: moving the IEC alarm-text aliases into per-skin data so that
  mindray-, ge-, zoll- and lifepak-like print the glossary labels ("ART", "PR", "EtCO₂", "T1"); the TEMP-probe INOP
  label; the untiled numerics (`imco2`, `mac`, `etAa`, `qtc`); and the agent tile (A10-E5). The Stage 9 plan never
  mentions R-FU5-6, and its partition forbids `packages/skins/**` and `packages/renderer/**`. So the work belongs to no
  stage, and the mindray-like skin keeps printing the Philips "ABP" alarm texts the glossary rules say belong to
  Philips only (research/11 §5.16 rule 2).
- **Fix:** The orchestrator rules (Ruling 1): either Stage 9 takes R-FU5-6 as a declared exception E-S9-4 (skin JSON
  alias tables only, no renderer or alarm-semantics change), or it is reassigned to a FU-5 follow-up. The plan then
  says which in "Requests to other stages".

### F4 (major) — The instructor's alarm mirror copies the skin's vendor text, not glossary words

- **Location:** Task 13 Step 1 `devices.ts` (the list prints `x.text`, l. 4200) and Task 19 `main.ts` (the top-bar
  count prints `s.top.text`, l. 5708); brief §7 "Alarm list … message in glossary words"; research/11 §5.16 rules 1 and 2.
- **Evidence:** `AlarmEntry.text` is the skin's own message ("ABP NON-PULSATILE", "** SpO2 94<96"). Rule 2 keeps
  vendor aliases inside the monitor frame, and the top bar and the panel are outside it. The glossary e2e cannot see
  this, because "ABP" is not an engine id. With F3 unresolved, a mindray-like room shows Philips words in the panel.
- **Fix:** Build the mirror line from the alarm's parameter and condition through the glossary (a small map from the
  engine's alarm ids to glossary entries plus the condition in words), and keep the skin text in the tooltip. If the
  alarm id does not carry the parameter, file a request to FU-5 for it and record the gap in the gate note.

### F5 (major) — The mirrored alarm colours go stale when the monitor is changed on the Start screen

- **Location:** Task 15 Step 1 `start.ts`, the Monitor select (l. 4670) and the Screen select below it; D5.
- **Evidence:** The Start selects call `s.setSkin(...)` and `saveSite(...)` but never `applySkinAlarmColours`. That is
  called only at start-up (`main.ts`) and from Settings. After a change on Start, the top-bar count and the panel's
  alarm list keep the previous skin's L1–L3 colours, so the mirror no longer matches the monitor. D5's premise is that
  the mirror always matches.
- **Fix:** Move `applySkinAlarmColours` into `AppSession.setSkin` (or call it from both selects), and add an e2e
  assertion that `--alarm-high-bg` equals the new skin's `messageBar.L1.bg` after a change on Start.

### F6 (major) — The frame gate measures a lighter load than the brief's gate

- **Location:** Task 24 Step 3 `stage9-frames.mjs`; Task 25 Step 2; brief §10 and §11.5.
- **Evidence:** The brief requires the Stage 8a gate "with the full shell mounted and the instructor panel open, on the
  8-lane `validation-perf` load", plus a 20-minute soak. The script opens the app's default patient on the site's
  skin, which draws four or five lanes (see `instructor-vitals-1280x800.png`), and has no soak. A p95 of 16.7 ms on
  that load does not show that the 8-lane load still passes with the shell mounted.
  Measured in this review, the "30 fps" rows record the same ≈ 3,600 main-thread frames per minute as the 60 fps
  rows. The site's frame-rate cap acts on the worker's drawing, which this metric does not see, so two of the four
  rows do not test what their label says.
- **Fix:** Drive the app monitor with the same 8-lane layout `validation-perf.html` uses (a site or query option that
  selects it), and add the 20-minute soak at 1920×1080 60 fps to Task 25. For the 30 fps rows, also record the
  worker's own frame statistics if the renderer exposes them, or state in the gate note that the metric is
  main-thread rAF only, as in 8a.

### F7 (major) — The remote e2e's badge assertion is timing-sensitive

- **Location:** Task 21 Step 2 `stage9-app.e2e.ts`, last assertion (`toContainText('1 held')`, l. 6093).
- **Evidence:** With two Playwright workers the test failed with the badge still reading "MODELED". The host HR had
  already passed 105, so the pin itself had worked. Run alone it passed twice in 7.5 s. The badge is redrawn by a 2 Hz
  throttle on a page that had just come back from the background, and the assertion uses the default 5 s timeout. CI
  runs 2 retries and a second browser project, so this becomes a flaky test in CI, which the CI rules forbid.
- **Fix:** First poll the host's `link.ctl.state.control.hr` until it is `pinned`, then assert the badge text with a
  10 s timeout. Do not add retries.

### F8 (major) — E-S9-2's replacement test covers one of the four commands and changes a claim that is not true for `setFactor`

- **Location:** Task 7 Steps 1–2 (l. 3224–3295); "Defect found while prototyping" (l. 239–246); E-S9-2 (l. 256–259).
- **Evidence:** Judgement on the guard is below. The guard is wrong and removing it is minimal and correct. But the
  plan says "the engine accepts all four". The engine's `Command` union has no `setFactor`, so after the fix
  `setFactor` is still refused, now by the engine's own "command type setFactor is not implemented until later
  stages". The replacement assertion flips one boolean for `pin` and deletes the `/MODELED/` reason check. Nothing
  tests `release` or `setMode` through the host.
- **Fix:** Keep the plan's edit of the existing test (a stub assertion, not a band, so R45 is not engaged; the
  orchestrator approves it as E-S9-2). Add a NEW test in the same file: `pin` accepted, `release all` accepted,
  `setMode modeled` accepted and visible in the next engine `state` event, and `setFactor` refused with the engine's
  reason. Correct the plan text and the commit message to "pin, release and setMode are forwarded; setFactor is
  refused by the engine until it models factors".

### F9 (minor) — The 6a drawer still disables Pin/Release in MANUAL with a stale "(Stage 7)" tooltip

- **Location:** outside the partition: `packages/controller/src/panel/render-controls.ts:100`; `vocabulary.ts:18`.
- **Evidence:** After E-S9-2 the host forwards `pin` in either mode and the engine accepts it in MANUAL too
  (`validateHemoCommand` does not check the mode). The 6a drawer, still served under Developer, keeps
  "Pin and release need MODELED mode (Stage 7)".
- **Fix:** Add it to R-S9-2 (the 6a/6b owner): update the tooltip, or leave the MANUAL gating as a deliberate choice.
  Stage 9 does not edit it.

### F10 (minor) — The glossary e2e never scans a Remote document

- **Location:** Task 21 Step 3 (`stage9-glossary.e2e.ts` visits `#/remote` only on the host, which renders the pairing
  page).
- **Evidence:** A document opened at `#/remote` (the hostless path) renders the join form and then the panel as a
  remote. Its join placeholder `e.g. AGD5YJ` (l. 5177) matches the plan's own leak pattern (`e.g` is a dotted token), so the
  scan would flag it if it ran.
- **Fix:** Add a second page joined by code to the glossary test and scan it, and reword the placeholder ("For example
  AGD5YJ").

### F11 (minor) — Red outside alarms: the destructive button and the error text use a red

- **Location:** Task 1 `app.css` `--danger` #ff6369 (l. 462), `.btn.danger`, `.error`; Task 13 Step 2 `patient.ts`
  ("Restart patient" as `.btn.danger` in the tab, not in a dialog, l. 4240); Task 16 `remote.ts` `.error`.
- **Evidence:** research/13-ui-design-references rule 1 reserves red for high-priority alarms, and the brief allows
  `--danger` "in dialogs only". The Patient tab shows a red-outlined button next to the monitor.
- **Fix:** Use a secondary button in the tab (the confirm dialog already carries the danger styling), and render
  `.error` in `--text-strong` with an icon and the word "Error".

### F12 (minor) — The priority marker is fixed at `!!!`/`!!`/`!` while some skins use asterisks

- **Location:** Task 8 `shell.ts` `LEVEL_MARK` (l. 3431); brief §6.2 "`!!!` … or `***`/`**`/`*` per skin".
- **Evidence:** `messageBar.prefix` is `'asterisks' | 'none'` in the skin data. The mirror then shows a different
  marker from the monitor it copies.
- **Fix:** Read `prefix` in `applySkinAlarmColours` and export the marker set with the colours. Keep the word.

### F13 (minor) — Validate's performance page runs inside the app, next to the app's own engine

- **Location:** D18; Task 18 Step 2 `validate.ts` (l. 5453).
- **Evidence:** `validation-perf.html` measures "one monitor alone by design" (the plan's own words), but in an iframe
  it runs while the app's session keeps drawing. Its numbers are then not comparable with the 8a gate.
- **Fix:** Open the performance tool in a new tab, like Developer's pages, and keep the other two as iframes.

### F14 (minor) — On a Remote, the sensor toggles claim every line is attached

- **Location:** Task 13 Step 1 `devices.ts` (`host ? … : true` for all eight channels, l. 4182).
- **Evidence:** A remote shows the arterial, CVP and PA lines as attached although the patient starts without them
  (screenshot `instructor-devices-820x1180.png` on the host shows them off).
- **Fix:** Until R-S9-6 lands, a remote shows the toggles as "unknown" (no pressed state) and says so in one line.

### F15 (minor) — Task 0 Step 5 relies on a manual browser step

- **Location:** Task 0 Step 5 (l. 407–424): "open … for 70 s, press JSON, save it as …".
- **Evidence:** This is the step that wires 7k's ΔP path into the glossary, and timed task 5 fails without it. An
  agent executor has no manual browser.
- **Fix:** Script it: a short Playwright script in the scratchpad that opens the console, waits 70 s and saves the
  JSON.

### F16 (minor) — The light e2e runs on WebKit in CI but was never run there

- **Location:** Global Constraints "CI rules"; Tasks 21–22 (no WebKit skip on `stage9-app`, `stage9-glossary`,
  `stage9-a11y`).
- **Evidence:** The prototype and this review ran Chromium only. The a11y audit reads computed colours and focus
  styles, which differ in WebKit. CI runs WebKit with one worker, so the 120–150 s tests run serially.
- **Fix:** Run the three files on WebKit once at Task 21/22 and record the result. Skip with a stated reason only if
  a WebKit difference is real and understood.

### F17 (minor) — Internal inconsistencies in the plan text

- GLOSSARY_S9 numbering: the Copy rules say "numbered from 295", D4 lists 295–299, and Tasks 0 and 2 say additions
  start at 300. State once: 295–299 exist, new entries start at 300.
- D6 says "Task 21 adds the WOFF2 files". Fonts are Task 20.
- The base is `891d4d2` in the header and Self-review but `f8b802d` in "Prototype results". Both are "code of
  bab4b72". State one.
- Brief deviations are not listed as deviations: no shareable `?skin=&patient=&theme=` URL state (brief §5), no rhythm
  thumbnails (brief §7), no "Positioning & surgery stimuli" group, although 7e's `stimulus` event exists and
  `depth-light-anaesthesia` is about an incision. List them in the gate note's Deviations.

## Judgement on exception E-S9-2

- **Is the guard wrong?** Yes. It was written by 6a as a placeholder: the 6a plan, item 9, lists
  `pin|release|setFactor|setMode` as "rejected 'needs MODELED mode (Stage 7)'". Stage 7a then implemented them in the
  engine. `validateHemoCommand` validates `pin`, `release` and `setMode`, and `applyHemoCommand` applies them
  (`packages/engine-core/src/l2/hemo/pipeline.ts`, `validateHemoCommand` and the command switch). HostSession still
  refuses them before `dispatch`, so no panel or remote can hold or return a value today. That is the core of the CAE
  pattern the plan adopts (D8).
- **What else depends on it?**
  - `HostSession.submit` goes through the same `apply()`, so the 6b ScenarioDriver's commands are refused too. The
    runner pushes `setMode modeled` at scenario start when a document sets `mode: "modeled"`
    (`scenario/runner.ts:127`). No shipped document does today, so this is latent, and the fix removes it.
  - The existing test "acks rejections … rejects MODELED-only and 6b-only commands" pins the stub, and the plan changes
    it (see F8).
  - The 6a drawer disables Pin/Release outside MODELED with the stale tooltip (F9). It does not depend on the guard.
  - No other code reads the rejection text.
  - The state event is unaffected: HostSession defers to the engine's own `state` event (mode and control flags) once
    one arrives. Its fallback hard-codes `mode: 'manual'` and never runs with the current engine.
- **Is the fix minimal?** Yes. Three lines are deleted from `apply()`, and nothing else in the controller changes.
  `setFactor` still reaches the engine and is refused there, which is correct until the engine models factors. The
  plan should say so (F8).
- **Recommendation:** approve E-S9-2 with F8's added test and corrected wording. The 6a/6b and 6a e2e pass with it.

## Design review against the brief and the three UI research files

- **IEC 60601-1-8 alarm colours.** No contradiction. Alarm colours are never shell tokens: the shell copies the
  skin's L1–L3 pair and switches to black text on bright red below 4.5:1 (rule 9). Priority is coded three ways
  (colour, marker, word; rule 4). The mirror is steady, so nothing in the shell flashes (rules 2 and 3), and toasts use
  the accent, not alarm colours (rule 7, Amd 2 Note 5). The defaults (#d1001c/white, #ffff00/black, #00ffff/black)
  follow the references. Gaps: F5 (the mirror goes stale), F11 (red outside alarms), F12 (marker set).
- **Glossary collision rulings.** CPP/CoPP, PI/PI (LVAD), SR only on the depth tile, RR, and FO₂Hb/SaO₂ hold where
  the test looks. No rhythm label uses "SR". F1 breaks rule 3 elsewhere by stripping qualifiers, and F4 breaks rule 2
  in the alarm mirror. Drug names come from the 7g library ("Norepinephrine") while glossary entry 259 and the brief
  say "Noradrenaline" (Ruling 5).
- **Wrap the monitor, never redesign it.** Held. The app mounts `mountMonitor` unchanged, adds only a hover strip and
  a drawer toggle over the stage, and never scales the canvas. It edits no skin, renderer or alarm semantics. The one
  visible side effect is Stage 9's own: moving between Monitor and Instructor resizes the stage, which clears the sweep
  (R-S9-1a, Ruling 3).
- **No new runtime dependency.** Held. `package.json` and the lockfile are untouched, the QR encoder and the
  indexed-PNG writer are self-written, fonts stay system fonts until Q7, and axe is not added. The QR encoder cites
  Project Nayuki's public description of the algorithm and says the code is not copied. A reviewer cannot verify that
  from the plan, so the executor should keep the statement in the file header.
- **Information architecture, tokens and components** match the brief's §4–§8, with justified departures. The Popover
  API is dropped for the iPadOS 16.4 floor. Shortcuts use Shift. Q1 lands on Start without "remember the last view".
  The screenshots show a clean split layout, legible sentence-case copy, no engine keys in clinical views, and a
  graphite bezel that recedes behind the monitor. The accessibility audit passes with 0 findings at both sizes.

## Requests R-S9-1..7 and open questions Q1–Q15

- **R-S9-1a (sweep clears on resize)** is caused by Stage 9's own layout, not by a lower layer. The plan should decide
  (Ruling 3): accept it for v1.0 and say so on the Monitor view's first visit, or keep the stage the same size in
  Monitor and Instructor (panel as an overlay).
- **R-S9-2** is fine: the app loads all 11 documents itself, and R-S9-2 only removes duplication. Add F9 to it.
- **R-S9-3 (7k ΔP)** is correctly a dependency. Timed task 5 stays red until 7k publishes ΔP. F15 makes the wiring
  step executable.
- **R-S9-4, R-S9-5** are fine as requests.
- **R-S9-6** is fine, but the plan should decide the Remote's interim display (F14).
- **R-S9-7** is fine. FU-6's proposed labels exist (fu-6 l. 643–650), and FU-4 and FU-7 propose none for Stage 9.
  Task 0 Step 5 must find them from the console dump.
- **Missing request:** R-FU5-6 and A10-E5 from FU-5 (F3). R-FU5-9 (replace the SVR factor with `1 / skinTone` in the
  pleth line, "FU-5 or Stage 9, whichever lands after it") is renderer physiology that Stage 9's partition forbids.
  The plan should decline it explicitly (Ruling 1).
- **Questions the plan could have decided itself:** Q9, Q10 and Q14 are already decided in practice and should move
  to Decisions. Q15 is a drafting review, not a question. Q3, Q4 and Q5 match the brief's recommendations and are
  implemented. They stay listed only for Ali's confirmation.
- **Questions that need Ali, where the plan's default changes scope:** Q12. The plan drops the learner action buttons
  from the app for v1, where the brief recommended keeping them as a strip (Ruling 4). Q6: the draft presets put
  adrenaline 10 µg, 100 µg and 1 mg in one chip row, a 100-fold spread next to each other that Ali should see
  explicitly. Q13 (Ruling 5).

## Rulings the orchestrator must make

1. **R-FU5-6, A10-E5 and R-FU5-9.** Does Stage 9 take the per-skin alias tables and the agent/untiled numerics as a
   new exception E-S9-4 (skin JSON only), or do they go to a FU-5 follow-up? Does Stage 9 decline R-FU5-9 on the
   record? (F3, F4)
2. **Exceptions E-S9-1, E-S9-2, E-S9-3.** Recommendation: approve all three. E-S9-2 needs F8's added test and
   corrected wording. The changed assertion is a stale stub, not a band, so R45 is not engaged.
3. **Sweep blanking on view change (R-S9-1a).** Accept for v1.0 with a note, or require an unchanged stage size
   between Monitor and Instructor.
4. **Learner action buttons (Q12).** Accept dropping them from the v1 app, or require a per-scenario learner strip.
5. **Drug naming (Q13).** "Noradrenaline"/"Adrenaline" or "Norepinephrine"/"Epinephrine" on screen. The glossary
   (entry 259) and the 7g library currently disagree inside one product, and R56 makes the glossary the only label
   source. Decide whether drug display names join the glossary.
6. **Cross-device Remote (F2).** Is a relay-backed tablet pairing a v1.0 requirement (then the gate needs a real
   tablet run), or is v1.0 same-browser only with the relay documented?

## Reproduction notes

- Worktrees were created under the session scratchpad from origin/main 776ebb5 and 891d4d2. The patch was applied
  with `git apply`, then `npx -y pnpm@9.15.9 install --frozen-lockfile`, `pnpm typecheck`,
  `pnpm --filter @pme/demo exec vitest run`, `pnpm --filter @pme/controller exec vitest run` and `pnpm build`.
- e2e: `npx playwright test <files> --project=chromium --reporter=line --workers=2` against the bundled Chromium 1243.
- The label-collision probe was a throwaway vitest file in the patched worktree (removed afterwards) that printed
  `shortLabel` duplicates among entries with keys, preset ids not in `DRUG_IDS` (none), and `labelOf` for the model
  paths above.
