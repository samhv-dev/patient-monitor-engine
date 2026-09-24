# Gate 6b — Scenario timeline runner + ACLS demo (date: 2026-09-25)

Gate question (BUILD-PLAN Stage 6): "Can Ali run a 10-minute ACLS scenario from the laptop without touching the iPad monitor, and recover cleanly from a Wi-Fi drop?" The Wi-Fi drop half was answered at Gate 6a. This gate covers the scenario half: a `pme-scenario/1` timeline runs on the host, the instructor drives it from the panel or the remote, and the learner's actions move it on.

Branch `stage-6b-scenario-runner`, worktree `projects/patient-monitor-engine/scratch/wt-stage-6b`, base `origin/main` at `8e46032` (Stage 6a merged on top of Stage 1.1). Plan: `docs/plans/stage-6b-scenario-runner.md`, Tasks 1–20.

| Check | Result |
|---|---|
| Clean clone typecheck/test/build/check-notices (test totals) | exit code 0 (`git clone` of the branch into a scratch folder → `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test && pnpm build && pnpm check-notices`). **349 tests**: controller **185 (32 files)** (Stage 6a: 97 in 20), engine-core 112 (19), renderer 26 (8), audio 19 (5), validation 6 (2), skins 1. `check-notices: OK (1 governed files)`. The worktree gave the same numbers |
| Schema: invalid documents rejected with path-level messages (acceptance 6) | pass, `schema.test.ts` **21/21**. 18 kinds of broken document are each refused with a path, e.g. `/states/0/transitions/0/when: a trigger must have exactly one of afterS, atScenarioS, vital, event, sensor, manual, all, any` and `/states/1/transitions/0/id: duplicate transition id "t1" (ids are unique per document)`. Several errors are reported at once, each with its own path. An unknown rhythm id is a warning, not an error (`/states/1/onEnter/0/rhythm: "vfCoarse" is not in this engine`) |
| Triggers (acceptance 5): afterS, atScenarioS, vital…forS, event minJ/minDose, sensor, manual, all/any, priority, stay, pause, goto, poll-rate independence | pass, `runner.test.ts` **18/18**. The poll-rate test fires at exactly 12.5 s whether `advance()` is called every tick, once a second or only at inputs |
| Probability 0.3 over 10,000 seeded trials (acceptance 5: 0.30 ± 0.01) | pass, `probability.test.ts` **6/6**, printed `p 0.3 × 10,000: 0.298` (1,000 trials: 0.306). The draws come from `seedStream(seed, 'scenario')`, one `uniform()` per roll |
| Bookmark restore resets exactly (acceptance 5) | pass. `driver.test.ts` › "bookmark = engine snapshot + runner state": the bookmark is taken at 65 s in VF. The run goes on to 200 s with a shock at 70 s, the bookmark is restored and the same shock is given again. The scenario events are identical, and ecgII over 66–199 s is **bit-identical** (`toEqual` on the sample arrays) |
| Replay (acceptance 4) | pass. `driver.test.ts` › "replay identity": two independent runs with seed 42 and the same learner shocks over 400 s give identical ecgII samples, identical dispatch logs, and a `replayRunLog` that reports `ok`. Replaying the same log with other seeds (1–5) diverges, and the result says at which entry. `replay.test.ts` **4/4** |
| ACLS end to end, headless (seed 42, real engine, tick by tick) | pass. With shocks every 2 min from 70 s: `0:stable → 60:vf/arrest → 70:rosc/shockVf` (first draw u = 0.0617 < 0.3). With no shocks: `0:stable → 60:vf → 300:vfFine → 600:asystole`. Every `setRhythm` was accepted, stand-ins included. Ten sim-minutes take ≈ 1.5 s |
| Scenario over HostSession: late join, viewers' commandApplied, one tick per stage group | pass, `host-scenario.test.ts` **6/6**, plus `host-scenario-hook.test.ts` 4/4 and `clinical-commands.test.ts` 2/2 |
| Panel and remote | pass: `scenario-tab.dom.test.ts` 6/6, `remote-scenario.dom.test.ts` 1/1, `view.test.ts` 4/4. In the browser, `stage6b.e2e.ts` passes **1/1** (headless Chrome, ≈ 18 s): the panel loads the ACLS scenario, the remote's "Start VF now" starts VF, and the learner bar's Shock 200 J reaches ROSC, with no page errors. The 6a browser tests still pass **8/8** (`stage6a.e2e.ts`: bc/relay/rtc synced, drift 0; `stage6a-worker`, `iife-smoke`) |
| ajv containment | pass. `patient-monitor.iife.js` **94.05 kB** (unchanged from 6a), with 0 matches for `ajv`. Controller `dist/index.js` 72.46 kB, 0 matches. `dist/scenario.js` 224.03 kB (57.65 kB gzip), 20 matches |
| Viewer follows the scenario | pass (headless Chrome, Task 18 Step 3). `stage6b-acls.html?session=GATE6B` and `stage6a-viewer.html?session=GATE6B&via=bc` ran together, with "Start VF now" in the panel and then "Shock 200 J". The viewer line stayed `viewer GATE6B · link broadcastChannel open · synced · lag 99 ms · beat drift 0.0 ms · resyncs 0` before, in VF and after ROSC |
| iPad host / phone remote on the LAN | **pending Ali** |

## Screenshots (headless Chrome, `docs/gates/stage-6b/`, each ≤ 60 kB)

- `scenario-tab.png` (58 kB): the panel's Scenario tab in coarse VF. It shows the built-in picker, the state (`Coarse VF · 00:07 in state`), the state notes and the four "Next" rows: three `Force` buttons (shock p 0.3, epinephrine + EtCO2, decay to fine VF) and `ROSC now`. Below them is Go to state.
- `learner-bar.png` (20 kB): the scenario line `[draft] Witnessed VF in PACU — Coarse VF · 00:07 in state` above the learner action bar (Shock 200 J, Start CPR, drugs, pacing, fluid).
- `host-rosc.png` (23 kB): the ROSC moment. Lead II and V5 show the sinus tachycardia sweep overwriting the VT-240 stand-in, and the line reads `ROSC · 00:08 in state · scenario 00:16`.
- `remote-vf.png` (55 kB): the phone-width remote in VF. The scenario strip reads `Coarse VF · 7 s` with one button, `ROSC now`. The log shows `applied rhythm vtMono` (the stand-in the viewers mirror).

## Scenario run log (seed 42)

Headless, real engine, the driver on a bare engine (the `driver.test.ts` ACLS test):

| Sim time | State | Transition |
|---|---|---|
| 0 s | stable | (start) |
| 60 s | vf | arrest (`afterS 60`) |
| 70 s | rosc | shockVf (Shock 200 J; roll u = 0.0617 < p 0.3) |

The same test without shocks: `0 s stable → 60 s vf → 300 s vfFine (decay, afterS 240) → 600 s asystole (afterS 300)`.

In the browser (`stage-6b/run-log.json`, from `stage6b.e2e.ts`; the remote pressed "Start VF now" instead of waiting 60 s):
```
0.32 s → stable
0.50 s → vf (arrest)
9.50 s → rosc (shockVf)
```
The roll entry is `{ op: 'roll', t: 9.5, transitionId: 'shockVf', u: 0.06174324615858495, p: 0.3, success: true }`. The log file also holds every `advance`, `dispatch` (with the scenario-only reasons) and `enter` entry, plus the driver's notes.

One dispatch is rejected at start, by design: the stable state's `device nibp` (auto 3 min) gets `device nibp is not implemented until later stages`. The demo's status line therefore reads `rejected 1`. Stage 4 implements NIBP.

## Clinical review for Ali (all five scenarios are [draft])

Every title starts with `[draft]` and every file has a `$comment` saying it awaits your review. Every probability and timing below is an `[ENG]` placeholder unless a source is named. Each item is a question.

- **acls-vf-witnessed** (seed 42). Stable (60 s, or "Start VF now") → coarse VF. Shock ≥ 150 J → ROSC with p 0.3, else stay in VF. Epinephrine AND EtCO2 ≥ 20 for 30 s → ROSC (live once Stage 2 reports EtCO2). 240 s → fine VF, where a shock gives p 0.15; 300 s → asystole. ROSC is sinus tachycardia 105 → HR 118 over 45 s.
  - ROSC per shock in coarse VF: is 0.3 right? In fine VF, 0.15?
  - Fine VF after 4 min, then asystole 5 min later?
  - Is EtCO2 ≥ 20 for 30 s the right ROSC criterion after epinephrine?
- **acls-pea-hypovolaemia** (seed 7). Haemorrhage: HR 118 → 142 over 120 s; 1 L of fluid early stabilises. PEA at 150 s: sinus tachycardia 128, `pulseless: true`.
  - PEA: fluid ≥ 500 mL AND epinephrine → ROSC with p 0.6?
  - Slow PEA (wide escape 32) after 300 s, then asystole 180 s later?
- **acls-bradycardia-unstable** (seed 11). CHB with a wide escape at 32/min. Pacing ≥ 70 mA → paced (brief §6.5 default threshold). Epinephrine infusion → HR 48. 420 s → asystole.
  - Atropine ≥ 0.5 mg gives a partial response (HR 42) with p 0.2 in wide CHB, fading after 300 s?
  - Pacing in asystole captures with p 0.5?
- **svt-adenosine** (seed 3). AVNRT 180. Adenosine ≥ 6 mg → 15 s circulating → a 6 s transient block (brief §4.9: "AV block for 3–10 s, 10–30 s after the push"), shown as CHB narrow with an escape of 20/min. A manual "Vagal manoeuvre works" button is available.
  - Conversion to sinus 92 → 80 with p 0.6 per dose ≥ 6 mg, else SVT resumes?
- **or-induction-hypotension** (seed 5). Propofol (or "Induce") → 60 s → hypotension: sinus tachycardia 102, HR 122 over 90 s. Phenylephrine → sinus 100 → 82 over 60 s. Ephedrine → HR 108. Every BP step is the exact command text in `$comment`.
  - HR ≥ 115 for 20 s → "profound" (a vital trigger on the measured HR): is that a sensible proxy until BP exists?

## Stand-ins in force (Decision 9)

| Scenario id | Shown as (this base) |
|---|---|
| `vfCoarse` | `vtMono` 240/min |
| `vfFine` | `asystole` |
| `pacedVVI` | `avb3Wide` 70/min |
| `pWaveAsystole` | `avb3Narrow` 20/min |
| `junctionalEscape` | `avb3Narrow` 45/min |

The driver checks the engine's own `RHYTHM_IDS` at run time. It substitutes an id only when the engine lacks it, and does so before `HostSession`, so viewers mirror the stand-in. Each substitution is listed in `driver.notes` and shown on the demo page. When the engine has the real ids (Stage 5), the stand-ins disappear with no file change.

## Not done / deferred

- `time step|jump` are still rejected (Decision 16). They are host clock controls, and nothing in 6b needs them.
- BP and EtCO2 steps wait for Stage 2. They are in `$comment` as exact commands, and the ACLS `epiCpr` transition waits for an EtCO2 value.
- The physiology of shocks, drugs and CPR belongs to Stages 4 and 7. The driver accepts `applyEvent`/`attachSensor` as "scenario only" so that transitions can fire (Decision 10).
- LAN and iPad runs (pending Ali).

## Deviations from the plan

1. **Screenshots.** The orchestrator asked for gate screenshots ≤ 60 kB each, of the scenario tab, the learner action bar and the ROSC moment. The plan's full-page `host-vf.png` and `host-rosc.png` were 146 kB each. `stage6b.e2e.ts` now takes clipped screenshots instead, using a small `box()` helper:
   - `scenario-tab.png`: the Scenario pane only. Clipping the whole drawer gave 73 kB, and the tabs plus the pane gave 61 kB.
   - `learner-bar.png`: the scenario line plus the action bar.
   - `host-rosc.png`: the monitor plus the scenario line.

   `remote-vf.png` is unchanged. The test's assertions are unchanged.
2. **Controller build size after Task 13.** `dist/index.js` was 65.02 kB when Task 13 ran, not the plan's ≈ 72.5 kB. The plan's figure includes Tasks 14–15 (panel tab and remote strip). After Task 18 it is 72.46 kB, matching the plan.
3. **"Look at it" and viewer spot check (Tasks 16 and 18).** These ran in headless Chrome (Playwright scripts) against this worktree's own Vite server on `127.0.0.1:5210`, not on 5207 in a visible window. The server was stopped afterwards.
4. **Clean-clone rehearsal.** This ran in the session scratchpad instead of `mktemp -d`.
5. **Commit trailer.** At the orchestrator's instruction, commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
6. **Code:** otherwise none. Every file the plan gives in full was written exactly as given, and every replace-anchor matched once. Every step passed as written, so the reference tree was not needed.
7. **NOTICES:** N-010, N-011 and N-012 were still free when the rows were added. Stage 2's open PR has none of its own, and Stage 5 uses N-050+.

## Notes for other stages

- **Stage 2:** once the engine emits `state` at 1 Hz, `vital` triggers on truth values (etco2, sbp, spo2 …) work with no 6b change (rank 3 > measurement rank 2 > accepted setTarget rank 1). The ACLS `epiCpr` transition and the BP `$comment`s are waiting for it.
- **Stage 5:** the stand-ins vanish automatically when `RHYTHM_IDS` contains `vfCoarse`, `vfFine`, `pacedVVI`, `pWaveAsystole` and `junctionalEscape`. PEA uses `opts.pulseless: true` (Stage 5 contract).
- **Stage 4:** `applyEvent {kind:'defib'|'pacer'}` and `device nibp` should keep the brief's shapes, because the learner bar already sends them.
