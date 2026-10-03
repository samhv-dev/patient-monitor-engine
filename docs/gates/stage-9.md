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
| Explore, respiratory mechanics (7k slot: placeholder) | ![](stage-9/explore-respiratory-1280x800.png) | ![](stage-9/explore-respiratory-820x1180.png) |
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
| 5. Find the compliance and the driving pressure | Cstat found; **ΔP not found** — Stage 7k not merged (R-S9-3); expected failure |

Ali's own timed run: not yet done.

## 6. Frame gate

FRAMES_PLACEHOLDER

## 7. Decisions, deviations, limits

- D1–D29 as the plan writes them; none revisited. Defaults for Ali's open questions are the plan's recommendations
  (Start screen first; factory saadat-like monitor with the ICU preset one click away; "epinephrine / norepinephrine"
  with the "adrenaline / noradrenaline" site option).
- Deviations from the brief (as the plan lists them): no shareable `?skin=&patient=&theme=` URL state (only `?scenario=`,
  `?session=`, `?relay=`, `?load=`); no rhythm thumbnails; no "Positioning & surgery stimuli" group; no Popover API; no
  "remember the last view"; Shift shortcuts. Deviations from the plan: §1's three.
- v1.0 limits accepted by the orchestrator: the sweep restarts after a Monitor ↔ Instructor switch (ruling 3); the
  Remote pairs in the same browser only (ruling 6).
- Engine behaviour seen through the app (R51: not changed here; for FU-11 / Ali): "Return to model" on HR and SpO₂
  hands the value back but the value stays where the instructor held it (HR 120 and SpO₂ 85 % still there 20–30 s after
  the return in a healthy MODELED adult); holding ART S at 80 shows "Model override" and the model keeps its own
  pressure. The Stage V cockpit (and the app's Ventilator view) drives the patient from its page's animation frames,
  so a hidden or background window ventilates too slowly — keep it in front.
- Requests: R-S9-1 (a) accepted for v1.0, (b)(c) open; R-S9-2 done by FU-8 Part A (Labeller, eleven built-ins,
  tooltip); R-S9-3 open (7k); R-S9-4 done by FU-8 Part A (schema fields; the documents do not use them yet);
  R-S9-5 → 8b; R-S9-6 open; R-S9-7 applied for V.1/FU-6 (entries 300–304), FU-7 pending; R-S9-8 → FU-5 follow-up.
  R-FU5-9 declined on the record.

## 8. Open questions

Q1–Q15 as the plan's table, answered by its recommendations until Ali rules; Q7 (fonts) not approved → Task 20 skipped.
Orchestrator rulings 1–6 on the R50 review applied; E-S9-4 applied in its re-confirmed form.

## 9. Test counts

COUNTS_PLACEHOLDER
