# Gate note — Stage 9: clinical UI and naming

Branch `stage-9-clinical-ui`, cut from `origin/main` `b8a8183` (FU-3, FU-4, FU-5, V.1, FU-8 Part A, FU-6 merged) and
merged with `origin/main` `9b405b9` before the gate. Plan: `docs/plans/stage-9-clinical-ui.md` (R55, R56). Executed
locally on 2026-10-03 under the SHOWCASE RULING (Stage 9 moved ahead of FU-7, 7k and FU-9, which are still open).

## 1. What shipped

Every Create and Edit block of the plan was applied mechanically to the branch base (a scratch copy of the plan's own
`stage-9-verify.py` without the prototype comparison): **created 69, edited 17, problems 0** — all 17 find blocks
(E-S9-1…4) still match exactly once on `b8a8183`, so no block needed re-anchoring. Typecheck was clean on the first
apply; every task was then committed and pushed on its own.

| Task | Files | Tests |
|---|---|---|
| 0 | base check; `glossary-additions` (below) | baseline: demo 9 files / 141, controller 38 / 223 |
| 1 | `app/app.css`, `color.ts` | `tokens.test.ts` 3 |
| 2 | `app/glossary-data.ts`, `glossary.ts` (+ entries 300–304, Task 0 Step 5) | `glossary.test.ts` 6 |
| 3 | `store.ts`, `ui.ts`, `router.ts` | `router.test.ts` 8, `ui.dom.test.ts` 4 |
| 4 | `site.ts`, `patients.ts`, `scenario-meta.ts`, `scenarios.ts` | `site.test.ts` 2, `patients.test.ts` 3 |
| 5 | `vitals.ts`, `drugs.ts`, `rhythms.ts`, `describe.ts`, `triggers.ts` | `copy.test.ts` 4 |
| 6 | `session.ts`, `link.ts`, `staging.ts` | `staging.test.ts` 2 |
| 7 | E-S9-2: `controller/src/session/host-session.ts` (guard removed), its test (one assertion + one new test) | controller 223 → 224 |
| 7b | E-S9-4 (re-confirmed by the orchestrator, "Stage 9 plan FIXED"): `skins/src/{types,schema}.ts` one field each, four skin JSONs (`alarms.wording` + provenance), `engine-core/src/l3/alarms/{profile,text}.ts` three reading lines | `skins/test/stage9-wording` 5, `engine-core/test/l3/alarms/stage9-wording` 5 |
| 8 | `shell.ts` | `shell.dom.test.ts` 2 |
| 9–14 | `panel/{ctx,vitals,scenario,drugs,airway,defib,devices,patient,log,panel}.ts`, `commands.ts`, `cards.ts`, `alarms.ts`, `sessionbar.ts` | `alarms.test.ts` 4 |
| 15 | `learner.ts`, `views/{start,monitor,teach}.ts` | (e2e) |
| 16 | `qr.ts`, `pairing.ts`, `views/remote.ts` | `qr.test.ts` 3, `pairing.test.ts` 2 |
| 17 | `views/explore.ts` | (e2e) |
| 18 | `views/{vent,validate,dev,settings}.ts` | (e2e) |
| 19 | `main.ts`; E-S9-1 `apps/demo/index.html` (the whole file is the app); E-S9-3 `controller/src/panel/styles.ts` (opaque drawer, no blur) | demo 21 files / 184 |
| 20 | **skipped** — fonts not approved (Q7); the system font stack ships | — |
| 21 | `e2e/stage9-support.ts`, `stage9-app.e2e.ts` (5), `stage9-glossary.e2e.ts` (1) | Chromium 6/6, WebKit 6/6 |
| 22 | `e2e/stage9-a11y.e2e.ts` (2) | Chromium 2/2, WebKit 2/2 — 0 findings |
| 23 | `e2e/stage9-tasks.e2e.ts` (1) | passes; task 5 an expected failure (§5) |
| 24 | `e2e/stage9-png8.ts`, `stage9-shots.e2e.ts` (4), `scripts/stage9-frames.mjs` | 56 PNGs, all ≤ 60 KB |

**Changes beyond the plan's blocks (deviations, each its own commit):**
- `app/scenarios.ts` — a document's own `category`, `story`, `objectives` and `durationMin` (added to `pme-scenario/1`
  by FU-8 Part A, R-S9-4) win over `scenario-meta.ts`; no shipped document carries them yet, so the cards are unchanged.
  FU-8's `Labeller` hook (R-S9-2) is not used: the app's `triggers.ts` prints units and drug names the hook does not
  carry ("EtCO₂ ≥ 20 mmHg for 30 s"), so the app keeps its own copy.
- `app/staging.ts` — the batch onset is attached only to `pin` and `setTarget` (was also `release` and `setFactor`).
  Measured through the app on this base: a pin with a 20 s onset ramps HR 70 → 120 over 20 s (the engine honours it);
  a `release` ignores its onset (the value is handed back at once) and `setFactor` is refused. Sending an onset the
  engine ignores would have made the log, the toast and the progress bar promise a slow change that happens at once —
  the app-side face of external review F13. The app sends no modifier ramps, so F13's engine defect is not reachable
  from the UI.
- `e2e/stage9-tasks.e2e.ts` — timed task 5 is marked `test.fail()` while glossary entry 148 (ΔP) has no truth key:
  Stage 7k (which publishes ΔP, R-S9-3) has not merged. Tasks 1–4 run first and must pass; when 7k merges and entry
  148 gains its key, the marker switches itself off and the ΔP line is asserted again.

**External review F17 (explicit MANUAL dropped on scenario load):** not reachable through the app — `AppSession.loadScenario`
creates a NEW engine with the document's `mode` (`session.ts`), so an explicit `manual` document always runs MANUAL
(the timed task 1 loads the ACLS VF case and the session bar reads MANUAL).

## 2. Views

Screenshots are indexed PNGs from `stage9-shots.e2e.ts` (bundled Chromium 1243, headless). Full matrix:
`docs/gates/stage-9/<view>-<size>.png` for 14 views × 1280x800, 1920x1080, 1180x820, 820x1180.

| View | 1280×800 | 820×1180 |
|---|---|---|
| Start — the patient, the monitor and who watches, beside the running monitor | ![](stage-9/start-1280x800.png) | ![](stage-9/start-820x1180.png) |
| Monitor — the learner's full-screen monitor | ![](stage-9/monitor-1280x800.png) | ![](stage-9/monitor-820x1180.png) |
| Instructor, Vitals & rhythm — pin/return per value, the session bar and the staged footer | ![](stage-9/instructor-vitals-1280x800.png) | ![](stage-9/instructor-vitals-820x1180.png) |
| Instructor, Scenario — the ACLS VF case running: next trigger, manual trigger, objectives | ![](stage-9/instructor-scenario-1280x800.png) | ![](stage-9/instructor-scenario-820x1180.png) |
| Instructor, Drugs & fluids | ![](stage-9/instructor-drugs-1280x800.png) | ![](stage-9/instructor-drugs-820x1180.png) |
| Instructor, Devices & alarms | ![](stage-9/instructor-devices-1280x800.png) | ![](stage-9/instructor-devices-820x1180.png) |
| Remote pairing (same browser in v1.0, no QR without a relay) | ![](stage-9/remote-pairing-1280x800.png) | ![](stage-9/remote-pairing-820x1180.png) |
| Remote panel (a second page joined by code) | ![](stage-9/remote-panel-1280x800.png) | ![](stage-9/remote-panel-820x1180.png) |
| Explore, heart and circulation | ![](stage-9/explore-haemodynamics-1280x800.png) | ![](stage-9/explore-haemodynamics-820x1180.png) |
| Explore, respiratory mechanics and volumes (7k's rows; loops to come) | ![](stage-9/explore-respiratory-1280x800.png) | ![](stage-9/explore-respiratory-820x1180.png) |
| Ventilator — the Stage V cockpit linked to this patient | ![](stage-9/ventilator-1280x800.png) | ![](stage-9/ventilator-820x1180.png) |
| Validate — the 8a tools | ![](stage-9/validate-1280x800.png) | ![](stage-9/validate-820x1180.png) |
| Developer — the stage pages | ![](stage-9/developer-1280x800.png) | ![](stage-9/developer-820x1180.png) |
| Settings — the site profile | ![](stage-9/settings-1280x800.png) | ![](stage-9/settings-820x1180.png) |

The first 1280×800 run failed once at the Remote screenshot ("Waiting for the monitor …" for 10 s, the first page of a
cold Vite server); the re-run passed and every other size passed first time. The largest PNG is
`instructor-drugs-1920x1080.png` at 60,204 bytes (limit 61,440); no retry at a smaller scale was needed.

## 3. Accessibility

`stage9-a11y.e2e.ts` (targets ≥ 24 px, 44 px in the panel on touch; names on every control; text contrast from the
rendered colours; no sideways scroll; no clipped labels; one h1 and a main landmark; a visible focus ring on the first
25 tab stops): **0 findings** at 1280×800 (mouse) and 820×1180 (touch), on **Chromium and on WebKit** (R50 F16).
`tokens.test.ts` re-computes the token table: text ≥ 4.5:1 on every dark and light surface, accent text 4.5:1, control
boundaries and the focus ring 3:1, text on the accent fill 4.5:1, danger 4.5:1, the screen #000. The CVD check (Chrome
DevTools vision-deficiency emulation) was **not run** in this headless session: chips and badges carry a glyph and a word,
and the alarm mirror carries a mark and a word, so no state is carried by colour alone by construction — Ali's
rehearsal should look once with deuteranopia emulation.

## 4. Glossary (R56)

- `stage9-glossary.e2e.ts`: **0 engine ids** in 8 instructor tabs, 12 Explore sections, the other views, the Remote join
  form and every tab of a remote joined by code — Chromium and WebKit.
- Additions for Ali's review (Task 0 Step 5 / Task 2 Step 4; `GLOSSARY_S9`): 300 `resp.lung.lp.waterShunt` "Lung-water
  shunt" (fraction); 301 `ev.lungState.pleuralCmH2O` "Ppl (extra)" (cmH₂O); 302 `neuro.resp.loc` "LOC"; 303
  `neuro.resp.pain` "Nociceptive drive"; 304 `neuro.resp.hvrDep` "HVR depression" (0–1) — the labels V.1 and FU-6
  proposed. `resp.gaLvl`, `resp.bd`, `resp.driver.vent.pmax` and `resp.palvObs` are not on a console truth path on this
  base (no entry). **Follow-up when they merge:** FU-7's `pk.bus.cns.*`, 7k's mechanics and volumes (ΔP into entry 148,
  Ppeak, PL, Cdyn, auto-PEEP, VD/VT, ERV/RV/TLC/VC/IC), FU-9's new leaves.
- Truth paths labelled by console group (healthy adult, 40 s): monitor 21 / 58 internals, circulation 45 / 206, ECG 1 /
  76, lungs 57 / 189, blood 47 / 112, brain 12 / 33, kidney 10 / 31, liver 4 / 12, endocrine 13 / 48, neuro 18 / 99,
  drugs 0 / 56 (per-drug rows appear once a drug is given), devices 17 / 148, controls 6 / 153 — 251 of 1,520 paths.
- `SHORT` ("TOF T1", "UO/kg") and `SAME_AS` (ICP, CPP, glucose) as the plan writes them, for Ali's review.
- Alarm ids the mirror did not know (`alarmLine(…).known === false`): none (`alarms.test.ts` covers every device-layer id).

## 5. Five timed tasks (automated, through the visible UI)

| Task | Time |
|---|---|
| 3. Hold SpO₂ at 85 %, then return it to the model | 2.8 s |
| 1. Load the ACLS VF case | 0.8 s |
| 2. Give norepinephrine 0.1 µg/kg/min | 0.9 s |
| 4. Silence the alarm and bookmark | 0.8 s |
| 5. Find the compliance and the driving pressure | 0.9 s (after the 7k merge; before it, an expected failure) |

Ali's own timed run: not yet done.

## 6. Frame gate

`apps/demo/scripts/stage9-frames.mjs` against `vite` on this machine, bundled Chromium 1243 headless, the shell mounted,
the instructor panel open, the 8-lane `validation-perf` load (`?load=perf8`), 10 s warm-up, worker-raf path:

| Viewport | fps | n | p50 | p95 | p99 | max | worst 60 s p95 | gate |
|---|---|---|---|---|---|---|---|---|
| 1920×1080 | 60 | 3,601 | 16.7 | 16.8 | 16.8 | 16.8 | 16.8 | pass |
| 1920×1080 | 30 | 3,601 | 16.7 | 16.7 | 16.8 | 16.8 | 16.7 | pass |
| 1280×800 | 60 | 3,601 | 16.7 | 16.8 | 16.8 | 16.8 | 16.8 | pass |
| 1280×800 | 30 | 3,601 | 16.7 | 16.8 | 16.8 | 16.8 | 16.8 | pass |
| 1920×1080 soak, 20 min | 60 | 71,608 | 16.7 | 16.8 | 16.8 | **1,383.3** | 16.8 | pass |

All inside 8a's p95 < 25 ms (60 fps) / < 50 ms (30 fps), and the soak's worst minute too. The soak's single 1.38 s
interval is one stall while the 7k and FU-9 executors were running their test suites on the same machine; it moves no
percentile. The metric is the MAIN thread's frame intervals, as in 8a: the renderer draws the sweep in its worker and
exposes no worker frame statistics, so the 30 fps rows show that the shell stays inside the 30 fps budget, not that the
worker drew at 30 (D23). iPad Safari run (brief §10): **not run — no iPad on the bench.**

## 7. Decisions, deviations, limits

- D1–D29 as the plan writes them; none revisited. Defaults for Ali's open questions are the plan's recommendations
  (Start screen first; factory saadat-like monitor with the ICU preset one click away; "epinephrine / norepinephrine"
  with the "adrenaline / noradrenaline" site option).
- Deviations from the brief (as the plan lists them): no shareable `?skin=&patient=&theme=` URL state (only `?scenario=`,
  `?session=`, `?relay=`, `?load=`); no rhythm thumbnails; no "Positioning & surgery stimuli" group; no Popover API; no
  "remember the last view"; Shift shortcuts. Deviations from the plan: §1's three.
- v1.0 limits accepted by the orchestrator: the sweep restarts after a Monitor ↔ Instructor switch (ruling 3); the
  Remote pairs in the same browser only (ruling 6).
- The Stage V cockpit (and the app's Ventilator view) drives the patient from its page's animation frames, so a hidden
  or background window ventilates too slowly — keep it in front.
- Requests: R-S9-1 (a) accepted for v1.0, (b)(c) open; R-S9-2 done by FU-8 Part A (Labeller, eleven built-ins,
  tooltip); R-S9-3 done (7k merged; keys wired, polish round item 6); R-S9-4 done by FU-8 Part A (schema fields; the documents do not use them yet);
  R-S9-5 → 8b; R-S9-6 open; R-S9-7 applied for V.1/FU-6 (entries 300–304), FU-7 pending; R-S9-8 → FU-5 follow-up.
  R-FU5-9 declined on the record.

## 8. Open questions

Q1–Q15 as the plan's table, answered by its recommendations until Ali rules; Q7 (fonts) not approved → Task 20 skipped.
Orchestrator rulings 1–6 on the R50 review applied; E-S9-4 applied in its re-confirmed form.

## 9. Test counts

On the tree merged with `origin/main` `9b405b9` (local, `CI=1`, while the 7k and FU-9 executors were also running on
this machine):

| Check | Result |
|---|---|
| `pnpm -r typecheck` | clean, 8 packages |
| fast set, every package (`PME_TEST_SET=fast`) | engine-core 278 files / 1,232 passed, 1 skipped (incl. the new `stage9-wording` 5); audio 58; skins 184 (179 + 5 new); controller 224 (223 + E-S9-2's new test; one assertion changed); renderer 89; validation 107 (+ 11 skipped); demo 21 files / 184 (141 + 43 new); ventilator 96 of 97 — `ports.test.ts` "monitor side: frames replay…" hit its 5 s timeout under the machine's load (the package's run took 397 s); re-run alone: 3 / 3 passed. Stage 9 does not touch `packages/ventilator`. |
| `pnpm build` | clean; `dist/index.html` is the app |
| `pnpm check-notices` | OK (no new dependency) |
| `CI=1 pnpm test:e2e` (Chromium + WebKit) | 82 passed, 28 skipped, **2 failed: `stage6a.e2e.ts` "host + remote + viewer over rtc" and `stage6a-latency.e2e.ts` (Chromium)** — local WebRTC, the same two FU-6's gate recorded on `origin/main` on this machine (they pass on CI). Every Stage 9 file passed: app 5 and glossary 1 and a11y 2 on both browsers; tasks 1 and shots 4 on Chromium (skipped on WebKit by design). 15.3 min. |
| `stage9-app.e2e.ts` × 3 under two workers (R50 F7) | 3 / 3 runs green (5 passed each, 18.6–19.1 s), no retries |

Stage 9 e2e files: `stage9-app` (5), `stage9-glossary` (1), `stage9-a11y` (2), `stage9-tasks` (1), `stage9-shots` (4).

## 10. Polish round (orchestrator gate on PR #29)

1. **"Return to model" works (E-S9-5, engine).** Cause: the engine, not the controller — in MODELED a hold of HR
   recorded the instructor's rate (`hemo.circ.hrSet`), so the reflex never asked for a rate again, and a hold of SpO₂
   solved the shunt for the held value; `release` only dropped the flag. Fix (`engine.ts`, `l1/state.ts`; pin/release
   semantics only, no physiology constant): a MODELED hold remembers the value's pre-hold target (`l1.preHold`) and a
   release (one value or all) puts it back; a release of HR hands the rate to the reflex (`holdRate(…, false)`). Test
   `engine-core/test/engine/stage9-release.test.ts` (3) — fails on `b496803` (HR 120.0 vs model 69.4; SpO₂ 84.7 vs 96.6),
   passes now (HR and SpO₂ within ± 5 of an unpinned twin 30 s after the release; RR, PI and core temperature back to
   their pre-hold values after "Return all"). Engine fast set 279 files / 1,235 passed, 1 skipped; controller 224.
2. **Honest MODELED rows.** Measured (healthy adult, hold for 30 s): a hold moves **HR, SpO₂, PI, RR, VT, FiO₂, shunt,
   core temperature, PA S and PA D**; the model keeps computing **ART S, ART D, CVP, PAWP and EtCO₂** (flag "Model
   override", value unmoved) — in MODELED these rows show "Follows the model: change it with drugs, fluids or bleeding,
   or switch to MANUAL." and no stepper or Set; **K⁺, QTc and SVR** are refused by the engine in both modes ("not
   implemented until Stage 5", "derived") — their rows are not shown; the **pacing threshold** is always sent as a target
   (the engine refuses a hold on it).
3. **Bookmarks are markers only.** Measured through the app (ACLS VF: bookmark at 6 s, go to VF, return): HR and SpO₂
   went back, but the ECG lane kept the VF trace, the pleth went flat and the session clock stopped at 00:18 (external
   review F03–F05, F09). "Return here" is hidden; Bookmark (button, Shift+B) still logs a marker for the debrief. The
   restore returns with the engineering-hardening plan (FU-11).
4. **Pleth line after a view switch.** Not reproduced in a live Monitor ↔ Instructor switch at 1280×800 (FU-8's
   backfill redraws the lanes cleanly). The line in `instructor-drugs-1180x820.png` sits about 1 s after a **scenario
   load** (a new engine): it is the first pleth samples of the new patient, drawn by the renderer's backfill — not a
   stale one-frame draw, and the renderer is outside Stage 9's partition. Left as is (it clears after one sweep).
5. **Remote "Waiting for the monitor".** Warm: connected in < 0.5 s (measured). The cold-start wait (once, the first
   page on a cold Vite server) was not reproduced and its cause is not isolated; the Remote now reads Connected as soon
   as the host's 1 Hz state arrives, not only after the snapshot answer.
6. **Stage 7k merged (PR #30, main `0eed975`) and is merged here.** Glossary keys moved to 7k's truth leaves as its plan
   requests: #125 VT + `resp.mechanics.vt`; #143 Ppeak, #144 Pplat, #146 PEEPtot, #147 PEEPi, #148 ΔP, #151 Cstat,
   #152 Cdyn, #155 Rinsp → `resp.mechanics.*`; #149 "PL (Pes-based, direct)" (PL,ei / PL,ee) and #150 "Pes (estimate)"
   with the per-context normals; #161–#165 → `resp.vd.*` (VD/VT in %); #166–#176 → `resp.volumes.*` (FVC and FEV₁ in
   mL, FEV₁/FVC in %, as the console shows them). New entries for Ali's review: 305 "FRC (seated, PFT)", 306 "PĒCO₂",
   307 "EL/Ers", 308 "V̇insp", 309 "FET", 310 "Spirometry pattern", 311 the eight "… predicted" rows (7k's N1–N7), and
   312 "VD alv fraction" (the per-lung fraction that #163 used to name; `glossary.test.ts` now expects "R VD alv fraction").
   The model's own `resp.lung.pInsp`, `resp.lung.peepTot`, `ev.lungState.*` compliance/resistance/dead space/FRC copies
   are model internals now. Explore → "Respiratory mechanics and volumes" lists 7k's console group first (in its order),
   then the other §5.6 rows; a value not measured yet (pressures on a spontaneous breath) shows "—", and the intro says
   so; the placeholder keeps only the loops. **Timed task 5 passes** (0.9 s; the `test.fail` marker switched itself off).
7. **CI failure on `2bb00d3`** (run 37136321632, `build` job; slow-a and slow-b green): `stage9-glossary.e2e.ts` on
   **WebKit**, 3 of 3 attempts — the remote page joined by code stayed on "Waiting for the monitor" for 10 s. The host
   had just been walked through every view and was on the Ventilator view (cockpit driving the patient at 50 Hz); on
   the 2-vCPU runner WebKit's host answered too late (the same file passes locally on WebKit, and the other remote test,
   with the host on its Remote view, passed on CI). Fix (robustness, not a skip): the test pairs the way an instructor
   does — the host shows its Remote view while the remote joins — with 20 s to connect; `stage9-shots` does the same.
   (The Chromium `stage9-tasks` "✘" in that log is the expected failure of task 5, counted as passed.)
8. **After the 7k merge** (local): typecheck clean; fast set — engine-core 1,255 passed / 1 skipped, controller 224,
   demo 195, skins 184, renderer 89, validation 107, audio 58, ventilator 96/97 (`ports.test.ts` 5 s timeout under this
   machine's load again; 3/3 alone; green on CI); Stage 9 e2e on Chromium + WebKit 17 passed, 1 skipped (tasks on WebKit
   by design); the 56 screenshots re-taken (all ≤ 60 KB).

9. **CI, Linux WebKit, remote join** (runs 37135860205 … 37164182362; the first green-looking run 37133952802 failed it
   too): `[webkit] › stage9-glossary.e2e.ts:16:1 › no engine id reaches a clinical view` — "Received string: \"Waiting
   for the monitor E8U43H…\"", "Timeout: 20000ms", "41 × locator resolved to … Waiting for the monitor", 3 of 3
   attempts (51.7 s each); in the same job `stage9-a11y` 820×1180 lost its page once ("Target page, context or browser
   has been closed") and passed on retry. It is not the 7k merge or the engine change (it fails on every head since
   the first). It does NOT reproduce on macOS WebKit or Chromium, also not under CDP CPU throttling ×6 or an 8-process
   CPU hog (measured: the remote connects in ≈ 1 s), and the other remote test (host never visited Validate or the
   Ventilator) passes on CI WebKit. What the failing walk alone does: it visits **Validate**, whose two tool frames each
   run their own monitor engine and kept running in the hidden view, and the **Ventilator** cockpit. Changes (commit
   4e54da7): Validate unloads its frames on leave (a hidden view does no work, D26); the remote repeats its hello every
   2 s until the host answers; the test prints both sides' received-message counts, the host's stats, page errors and
   crashes if it fails again. **The next run named the cause** (run 37168675988, Linux WebKit, 3 of 3): `[remote-join] host
   {"received":{}} … "hidden":false` and `[remote-join] remote {"sent":10,"received":{},"transport":"open"}` with no page
   error or crash — the walked host's BroadcastChannel received none of the remote's 10 hellos, and nothing reached the
   remote: BroadcastChannel delivery between those two pages had stopped. It is not CPU (both pages visible, no stall:
   the host's sim clock ran) and it is Linux-WebKit-only (macOS WebKit and Chromium: paired in ≈ 1 s, host received
   1 hello). Which part of the walk breaks it (the scenario deep link, the Validate frames — now unloaded on leave — or
   the Ventilator cockpit) is not isolated. The test now scans the joined remote on a fresh host (the way the passing
   remote test pairs) and keeps pairing with the walked host as a recorded probe (an annotation, not a failure), so CI
   reports it every run. For the showcase (Chrome on macOS) pairing works after every view.
10. **Task 26 — showcase additions.**
    - *Acute events* in the **Patient** tab (it is what happens to the patient; the Scenario tab is the script): 15 engine
      conditions with clinical names and a tooltip — cardiac tamponade, tension pneumothorax, massive PE, anaphylaxis,
      septic shock, malignant hyperthermia, RV infarction, thyroid storm, SIRS, hypermetabolic state, DKA, major burns,
      TBI, acute liver failure, AKI — Mild / Moderate / Severe (0.33 / 0.67 / 1), Start and Stop, staged and committed
      with the footer, logged ("Cardiac tamponade: severe"), shown in the session bar ("M 40 y 70 kg · Cardiac tamponade
      (severe)") and in the Patient card. The engine accepts every one in MODELED and MANUAL (unit-tested); in MANUAL a
      line says the vital signs stay what the instructor set. **Hyperkalaemia and myocardial ischaemia have no engine
      command**: their rows say how to produce them (burns + succinylcholine; the "Aortic stenosis and CAD" patient; RV
      infarction is in the list).
    - *Five showcase cases* (`apps/demo/src/app/showcase/*.json`, pme-scenario/1 with category/story/objectives/
      duration, not drafts, first in the library under "Showcase"): healthy induction; severe tamponade then induction;
      class IV haemorrhage → PEA → CPR + 2 L + epinephrine; severe bronchospasm on the ventilator → salbutamol;
      anaphylaxis → epinephrine. Each has manual buttons for the next step and also advances when the learner gives the
      drug. All validate; loaded at ×4 none of their commands was refused; anaphylaxis falls to ART S 94 with HR 137
      within a minute; the tamponade patient compensates at ART S ≈ 105, HR ≈ 94.
    - *Short lung-condition names* through the glossary (`LUNG_LABELS`, "Pulmonary hypertension"); the catalogue's text is
      the tooltip and the hint ("e.g." written out — the glossary e2e caught it).
    - **Found on the way: the session bar offered ×8, which the host refuses ("scale must be 0.25–4")** — the control
      now stops at ×4.
    - Tests: `events.test.ts` (3), `showcase.test.ts` (1); e2e `stage9-events.e2e.ts` (Chromium): tamponade started from
      the panel, propofol 2 mg/kg from Drugs & fluids, **pulseless 128 s (sim) later** at ×4. The rule is stroke volume
      < 6 mL for 5 s: in the app's default adult the stroke volume settles on its 5.2 mL floor (no output), so fu4's
      < 5 mL never fires there.

### Ali should not demo (what remains true)

- Ventilator view in a hidden or background window (under-ventilates; keep it in front; its numbers settle after ≈ 60 s).
- Bookmark restore (hidden in the app: markers only).
- Remote: same browser only; open it from the host's "Open the remote in a new window".
- IBP lanes are empty until the arterial line is attached (Devices & alarms; the showcase cases attach it); the
  saadat-like monitor's idle alarm bar is a bright slab and its alarms are off at power-on (skin data).
- After "Load scenario" or "Restart patient" the waveforms restart (one sweep with a join on the pleth).
- Speed above ×4 (the host's limit).
- Acute events started on a Remote are not shown on the host's session bar, and vice versa (the engine does not report
  active conditions; each panel shows what it started).
