# FU-2: Engine follow-ups (MODELED rate ownership, AF rate control, β venous mobilisation, post-PVC evidence, rhythm on `state`, saadat 8 s HR, MANUAL contractility, volatile CBF, clearance temperature) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> STATUS (2026-09-27): REVIEWED ("FU-2 plan review (2026-09-27 04:55)": READY WITH FIXES F1–F6 + the AF rate-control
> addition — all applied here). Twelve tasks for items 1–5 and 7–9 plus AF rate control (Task 3); item 6 is NOT
> planned (measured and deferred with evidence — see "Item 6: deferred"). VERIFIED: every code block in Tasks 1–12 was
> run, as written here, in the scratch worktree `scratch/proto-fu2` = `origin/main` `5c3d6a5` (7a + 7b + 7g + 7x) plus
> this plan's changes: `pnpm -r typecheck` clean; engine-core fast set **179 files / 769 tests green** (1 skipped),
> slow set **18 files / 85 tests green** (1 skipped; incl. `circ-rate-rule`, `af-rate-control`, the adenosine scenario,
> the vasopressor bands and circ-sanity 1–2); the FU-2 e2e passes on system Chrome (49 s, three JPEGs of 33–41 KB). The code blocks
> were copied mechanically from the prototype files. A block that fails for the executor means main moved (7c or 7d
> landed first): re-anchor by the quoted comment, never "fix" a test by loosening it (R45).

**Goal:** Engine follow-ups before 7d/7e execute: (1) in MODELED mode only sinus-family rhythms follow the
circulation's HR set point — every other rhythm keeps its own rate, AF's ventricular response moves by a bounded
fraction and an AAI/DDD pacer's rate never falls below its lower rate (NR-7g-5, HIGH); (1b) AF rate control — the
β-blocker rows' AV-nodal block slows AF's ventricular response, and the AF rate mapping is re-fitted between 130 and
150 bpm; (2) dobutamine mobilises unstressed venous volume (NR-7g-2); (3) the G7a NR-1
pressure-dependent-compliance mechanism is measured and the post-PVC `it.fails` carries the result; (4) the 1 Hz
`state` event carries the running rhythm and the controllers follow it (G-FU1 item 6); (5) saadat-like's declared
8 s moving-average HR becomes its default; (7) a MANUAL `contractility` target changes CO through the set-and-hold
trackers; (8) 7g's volatile CBF effect carries the tables' DIRECT values (sevoflurane 1.17×, isoflurane 1.72× at 1.5
MAC, beyond coupling); (9) 7g's hepatic drug clearance is scaled by temperature exactly once when 7d's liver function exists. Item 6
(MANUAL tracker ringing at low HR) is measured and deferred (its ruled fix breaks two Stage 2 bands here).

**Architecture:** A new pure module `l2/circ/rate-rule.ts` decides, per rhythm, whether MODELED asks the rhythm
engine for the reflex's rate (the sinus family, DERIVED from the rhythm library as `atria === 'sinus' && rateDrives
=== 'sinus'`, with no instructor-held rate), for max(lower rate, reflex rate) (`pacedAAI`, `pacedDDD`), for the AF set
rate × a bounded AV-nodal drive × (1 − the drug bus's `avNodeBlock`) (`afib`), or for nothing (every other rhythm). The rate the instructor
or the rhythm set is recorded on the circulation (`CircModelState.hrSet`, plain JSON) by one engine helper at each
existing `ps.hr` write. A second pure module `l2/circ/venous.ts` turns the drug bus's dobutamine effect-site
concentration into a β-mediated venous unstressed-volume shift that the 10 Hz control step subtracts from `v0Sv`
(one engine line beside 7g's `ext.drug` line feeds it; the reflex's recruitment and the β term share one 12 mL/kg
reservoir). The β-blocker rows gain an AV-nodal entry and 7g's adenosine hook reads adenosine's own block. The Stage 2 hemo pipeline adds `rhythm: { id, rateBpm }` to
its 1 Hz `state` event from a new `effectiveRateBpm` beside the rhythm table; the controller session copies it into
`ControllerSession.rhythm`. `hrAveragingOf` maps a skin's `method: 'moving-average-seconds'` to a seconds window.
The MANUAL per-beat tracker (`trackCircBeat`) takes an instructor contractility as a fixed Ees factor and keeps only
its resistance knob. In 7g, volatile rows carry the tables' per-MAC CMRO2 fall and Matta's DIRECT CBF (beyond
coupling), which `combine` publishes as `cbfVaso` unchanged (7d's NET CBF = direct × its CMRO2 coupling); `clFactor` stops re-applying temperature to a liver function
that already carries it.

**Tech Stack:** TypeScript 5.9 strict, Vitest 3.2 (happy-dom for the panel test), Playwright 1.63 (system Chrome) for
the gate screenshots, pnpm 9.15.9 via `npx`. No new dependencies.

**Spec:** `../research/00-orchestrator-rulings.md` (workspace, outside this repo): **"FU-2 additions (items 6–9)"**
(2026-09-27, with the 7d plan fix: R-7D-3, R-7D-5a/b), **"FU-2 plan review (2026-09-27 04:55)"** (F1–F6, the AF
rate-control addition, Q1/Q4 rulings, Q-FU2-CBF), **G7g NR-7g-5** (the rate rule),
**G7g NR-7g-2** (dobutamine), **G7a NR-1** (post-PVC, option b), **G-FU1** observations (rhythm on `state`, saadat
8 s), **R45** (mechanisms, never band changes), **R25** (partition, own worktree), **R51 §7** (merge `origin/main`
before every `engine.ts` edit), **CI rule amendments 1–2** (yield per sim-minute; SLOW set in
`packages/engine-core/vite.config.ts`). `docs/RESUME.md` (FU-2 row; executor brief). `docs/physiology/
stage-7-parameter-tables.md` §2 (venous reservoir, `cSv`, `v0Sv`, `rVr`), §6.2 (dobutamine row: Emax +80 % Ees,
EC50 7 µg/kg/min). Code read: `l2/circ/model.ts` (control step, `ext`, HR request), `l2/circ/baroreflex.ts`
(`V0_RECRUIT_MAX_ML_KG` 12 mL/kg), `l2/circ/circuit.ts` + `l2/hemo/circulation.ts` (`compliance(P)`),
`l2/ecg/rhythms.ts` / `rhythm-engine.ts` / `rhythm-state.ts` (`atria`, `rateDrives`, `rateRange`, `pacing`,
`rhythmRate`), `l2/ecg/pacing.ts` (AAI/DDD sensing), `l2/ecg/atria.ts` (`AF_RATE_CAL`), `l2/pk/hooks.ts` (the adenosine
hook), `l2/pk/data/rows-cardiovascular.ts` (esmolol/labetalol/metoprolol/amiodarone/adenosine rows),
`engine.ts` (every `ps.hr =` write), `l2/hemo/pipeline.ts` (`emitSecond` state event, the MODELED `requestHr`
branch), `l3/hr.ts`, `packages/skins/src/data/skins/saadat-like.json` (`hr.method`, `windowDefault: 8`),
`packages/controller/src/session/controller-session.ts`; for items 6–9 `l2/hemo/tracker.ts` + `trackCircBeat`,
`l1/state.ts` (`contractility` is a MANUAL target, `svr` is derived — the brief §4.9 table), `l2/pk/{combine,row,
pipeline}.ts`, `l2/pk/data/rows-anaesthetic.ts`, tables §5.1 (anaesthetic CBF/CMRO2 rows, Matta 1999) and the 7d/7c
plans (`blood.core.liver = liverFn·tempF`, `organs.liver`).

## Global Constraints

- **R45:** mechanisms, never band changes. No existing acceptance band is widened, removed or re-worded to pass. A
  band a mechanism cannot reach stays `it.fails` with the measured number in its title (Task 3's amiodarone, Task 4's
  dobutamine and Task 5's post-PVC `it.fails` carry their numbers; Task 5 changes nothing else). Item 6 is not planned because its ruled fix breaks two Stage 2 bands (R45).
- **The rate rule (G7g NR-7g-5, verbatim):** "only sinus-family rhythms follow the circulation's HR set point;
  SVT/AF/flutter ventricular response/VT/escape/paced rates are rhythm-intrinsic and the circulation must follow THEM
  (the baroreflex may modulate AV conduction in AF/flutter only)." Sinus family (ruled 2026-09-27 04:55, Q1): DERIVED
  as `atria === 'sinus' && rateDrives === 'sinus'`, never a hand list — `sinus`, `sinusBrady`, `sinusTachy`,
  `sinusArrhythmia`, `sinusPause`, `wpwSinus`, `avb1`, `avb2Mobitz1`, `avb2Mobitz2`, `avb2to1`, `avbHighGrade`;
  `avb3Narrow/Wide` excluded (their hr drives the escape). `pacedAAI`/`pacedDDD` are NOT in the family: they request
  `max(pacer lower rate, hrModel)`, so the reflex can let the intrinsic sinus overtake the pacer but never reprogram
  it below its lower rate.
- **Base:** branch `fu-2-engine-followups` from `origin/main` AFTER PR #15 (7g) merged. Worktree
  `projects/patient-monitor-engine/scratch/wt-fu2` (R25: never the shared checkout). Push after every task
  (`git push -u origin fu-2-engine-followups` the first time, `git push` after). Never push to `main`; never merge
  (Task 12 opens the PR and stops).
- **Partition (binding).** Edit ONLY:
  - `packages/engine-core/src/l2/circ/**` — new `rate-rule.ts`, new `venous.ts`; `model.ts` (the `hrSet` field, the
    `betaAgonistU` and `avNodeBlock` ext keys, the baroreflex import, the `v0Sv` line of `control()`).
  - `packages/engine-core/src/l2/ecg/atria.ts` — the `AF_RATE_CAL` table and its comment only (exception **E-FU2-5**,
    ruled Q4).
  - `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` — one appended `avNode` PD entry on the esmolol,
    labetalol and metoprolol rows, nothing else (exception **E-FU2-6**, additive fields only; no digoxin, diltiazem or
    verapamil rows exist, and amiodarone's existing entry is not changed). `packages/engine-core/src/l2/pk/hooks.ts` —
    three import lines, `ADEN_AV`/`adenosineBlock`, and the hook's `block` line (exception **E-FU2-7**, raised by this
    fix: once rate-control drugs feed `bus.avNodeBlock`, stacked rate control reaches 0.5 and would fire the adenosine
    pause on sinus — measured; see Task 3).
  - `packages/engine-core/src/l2/ecg/rhythms.ts` — one appended function `effectiveRateBpm` (rate-drive code).
  - `packages/engine-core/src/engine.ts` — the `holdRate` helper and one call beside each existing `ps.hr =` write
    (MODELED hr lines), plus TWO lines beside 7g's `circ7g.ext.betaBlockAdd` line (exception **E-FU2-1**: the drug
    bus is only visible there — `avNodeBlock`, Task 3; `betaAgonistU`, Task 4), two import lines, and Task 11's two
    `pkCtx` lines (E-FU2-4). Nothing else in `engine.ts`.
  - `packages/engine-core/src/l2/hemo/pipeline.ts` — the `state` push in `emitSecond`, the MODELED `requestHr`
    branch, `RhythmView.opts`, two import lines and the `types.ts` import list.
  - `packages/engine-core/src/types-hemo.ts` — one optional field on the `state` event (exception **E-FU2-2**: the
    event's type lives here) and its import line.
  - `packages/engine-core/src/l3/hr.ts` — `hrAveragingOf` and one constant.
  - Items 7–9: `packages/engine-core/src/l2/hemo/pipeline.ts` (`trackCircBeat`, the MANUAL tracker key);
    `packages/engine-core/src/l2/pk/{row.ts,combine.ts,pipeline.ts}` and `l2/pk/data/rows-anaesthetic.ts` (the
    sevoflurane and isoflurane rows only) — the orchestrator's partition for items 8–9 is `l2/pk/**`; `engine.ts`
    `pkCtx` two lines (exception **E-FU2-4**: the `organs` cast and one `hepFnTemp` line).
  - `packages/controller/src/session/controller-session.ts`; `packages/controller/src/protocol.ts` — one optional
    field on the wire `state` type (exception **E-FU2-3**: the controller's copy of the event type).
  - Tests: new `packages/engine-core/test/l2/circ/{rate-rule,venous}.test.ts`,
    `packages/engine-core/test/l2/pk/{volatile-cbf,clearance-temp,av-node}.test.ts`,
    `packages/engine-core/test/engine/circ-manual-contractility.test.ts`,
    `packages/engine-core/test/engine/{circ-rate-rule,af-rate-control,state-rhythm,hr-skin-averaging}.test.ts`,
    `packages/controller/test/panel/controls-follow-shock.dom.test.ts`; edits to
    `packages/engine-core/test/l2/circ/circuit.test.ts` (one new `it`), `test/l2/ecg/rhythm-atrial.test.ts` (one new
    `it`, E-FU2-5), `test/l3/hr-averaging.test.ts` (the skin-field test), and the TITLE + comment of two existing `it.fails` (`test/engine/hemo-acceptance.test.ts` 5c,
    `test/engine/pk-acceptance-pd.test.ts` dobutamine) — their bodies and bands are untouched.
  - `packages/engine-core/vite.config.ts` — two SLOW entries (CI rule amendment 2).
  - Gate: new `apps/demo/e2e/fu2.e2e.ts` (evidence screenshots only), `docs/gates/fu-2.md`, `docs/gates/fu-2/**`.
  - **Never touch** `packages/engine-core/src/l2/lung/**`, any other `l2/ecg/**` or `l2/pk/**` file or row (7g), `packages/validation/**` (8a), the skin
    JSON files, `l2/hemo/circulation.ts`, `l2/circ/circuit.ts`, the renderer, `package.json`, `pnpm-lock.yaml`.
- **Merging main while other stages land (R51 §7):** before the `engine.ts` edits of Tasks 2, 3, 4 and 11, and again
  in Task 12, run `git fetch origin && git merge origin/main`. 7c (executing) and 7d may land first and move
  lines: every edit below is a find-and-replace anchored on a quoted statement; if a find block no longer matches
  byte for byte, locate the same statement by its quoted comment and make the same insertion; never re-type a line
  you are not changing.
- **CI rules:** `CI=1` for engine tests (6 h long-run horizon). Every engine test that runs more than one sim-minute
  yields once per sim-minute (`await new Promise((r) => setImmediate(r))`); the MODELED rate scenarios file joins
  the SLOW list (Task 2), and so does the AF rate-control file (Task 3). Local runs of the whole suite: `CI=1 npx -y pnpm@9.15.9 test`; the fast/slow split as CI
  runs it: `PME_TEST_SET=fast` / `PME_TEST_SET=slow` inside `packages/engine-core`.
- **Commands:** pnpm is not on PATH: `npx -y pnpm@9.15.9 …`. No `timeout` on macOS. Playwright: `PW_SYSTEM_CHROME=1`.
  Engine test: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run <path>`; controller test:
  `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run <path>` (paths relative to the package).
- Strict TS (`noUncheckedIndexedAccess`, `erasableSyntaxOnly`), `.ts` import extensions, conventional commits. Commit
  messages end with the trailer from the executor brief (RESUME.md: `Co-Authored-By: Claude Fable 5.1
  <noreply@anthropic.com>`; the commands below use it — swap it if your harness gives another).
- Gate screenshots: JPEG clips ≤ 60 KB each.

## Decisions (made while prototyping; the executor does not revisit them)

- **D1 — explicit sinus rate = override, as MANUAL.** A sinus-family rhythm set WITH `opts.rateBpm`, or any
  instructor `setTarget hr` / `pin hr` with a value, holds that rate (ramp included) and the reflex does not move it;
  a sinus-family rhythm set WITHOUT a rate hands the rate back to the reflex. An offset form (instructor rate + reflex
  change) was rejected: at sinus bradycardia 40 the hypotension drives the reflex's HR factor up by ≈ 40 %, so "reads
  40" cannot hold. Engine-initiated sinus rates (7g's adenosine conversion, device shock/ROSC outcomes) belong to the
  reflex (`explicit = false`).
- **D2 — the held rate lives on the circulation** (`CircModelState.hrSet: RampState | null`, a copy of `ps.hr` at the
  write). Snapshots carry it; an older snapshot restores it as `undefined`, which the rule treats as "reflex".
  `setMode` does not clear it: an instructor rate set in MANUAL stays held after switching to MODELED (the MANUAL
  solution becomes the model's baseline, as `setMode` already does for SVR/V0/Ees).
- **D3 — AF only, bounded; AAI/DDD floored.** The AF response = the set rate × clamp(1 + 0.25·(hrModel/hrRest − 1),
  0.9, 1.1) × (1 − `avNodeBlock`) [ENG: AV-nodal share 0.25, bound ±10 %; the block term is D13]. Flutter keeps its
  fixed conduction ratio (a 2:1 → 4:1 change is discrete, not a bounded modulation); pre-excited AF conducts over the
  accessory pathway, not the AV node: not modulated. `pacedAAI`/`pacedDDD` (atrial-sensing pacers, derived from
  `RHYTHMS[id].pacing`) request max(held lower rate, hrModel): phenylephrine cannot pull AAI 70 below 70, a bleed's
  reflex tachycardia takes it to ≈ 91. The rhythm engine renders the higher rate through the pacer clock (the hr ramp
  is the pacer interval; the underlying atrial rate is the row's `atrialDefaultBpm`), so the beats above the lower
  rate are drawn as paced, not as inhibited intrinsic P waves — the rate is right, the morphology is a rendering item
  (Q-FU2-10). The 2:1, high-grade and Mobitz blocks follow the reflex's ATRIAL rate (their hr is the sinus rate).
- **D4 — β venous term = dobutamine only**, Emax = the whole recruitable splanchnic reservoir (12 mL/kg, the same
  physiological bound as the reflexes' recruitment, `V0_RECRUIT_MAX_ML_KG`), EC50 = its inotropic EC50 7 µg/kg/min,
  competitive β shift with the combined drug + chronic β occupancy (as 7g's PD). A larger Emax reaches the band
  (≈ 1.75 L at full effect gave +22.7 %) but is beyond the physiological reservoir — rejected (R45 applies to
  magnitudes too). The resistance to venous return was tried as a second β effect (−30 %): +2.6 points only; not kept. **The reflex's
  recruitment and the β term share the one reservoir (F4):** their sum is clamped to `V0_RECRUIT_MAX_ML_KG · weightKg`
  in `control()` — a 25 % haemorrhage (reflex 669 mL) plus dobutamine (420 mL alone) mobilises 840 mL, not 865.
  Epinephrine's and isoproterenol's β2 venodilation is out of scope (not in `BETA_V0_AGENTS`; calibration pass).
- **D5 — NR-1: no C(P) change.** The circuit's arterial compliance ALREADY rises as pressure falls (Stage 2's
  `C0·e^(−0.01(P − 95))`, clamped 0.5–3×). The sourced Langewouters/Modelflow arctangent law was prototyped in four
  forms (see "Prototype results"); none reaches the band and every form that moves the number breaks other
  calibrated bands. Task 5 records the evidence; the executor must NOT add an arctangent C(P).
- **D6 — `state.rhythm` is optional** on both event types (a host-synthesised `state` has none) and carries
  `effectiveRateBpm` (rate-driven rhythms: the hr value clamped to the rhythm's range, like `rhythmRate` — the
  ventricular rate where every beat conducts, but the hr-driven ATRIAL rate for the 2:1, high-grade and Mobitz blocks,
  whose conducted ventricular rate is lower; flutter: atrial/ratio, variable = 3; arrest rhythms and VF: 0), rounded
  to 0.1 bpm.
- **D7 — saadat mapping in code, not data:** `hrAveragingOf` maps `method: 'moving-average-seconds'` to
  `{ kind: 'seconds', n: windowDefault ?? 8 }`; an explicit `averaging` field still wins. The skin JSON is unchanged
  (its `windowDefault: 8` is the declared 8 s).
- **D8 — the new MODELED scenario files join SLOW** (`circ-rate-rule`: 13 engine runs of 2–4 sim-min, ≈ 10 s wall
  locally; `af-rate-control`: two runs of 15 and 22 sim-min, ≈ 22 s).
- **D9 — MANUAL `contractility` ≠ 1 fixes both ventricles' Emax and removes the pressure tracker's PP knob.** SBP, DBP,
  CVP and HR targets plus Ees determine SV, so CO can only follow the heart if the tracker stops re-solving Ees: it then
  holds MAP (the PP target still sets the MAP it aims for) with the systemic resistance, and pulse pressure is
  emergent (`override` on sbp/dbp while it differs — as a saturated tracker already shows). Contractility 1 (the
  default) is the old code path exactly; the value enters the tracker key so a change re-solves R. `svr` stays
  DERIVED in MANUAL (brief §4.9 table; `state.test.ts` and `hemo-engine.test.ts` pin the rejection): with the
  pressures, CVP, HR and contractility given, SVR = MAP/CO is an output, and it now moves (0.64 → 0.96 at
  contractility 0.5). Making it settable too would over-determine the circuit — open question Q-FU2-6.
- **D10 — volatile CBF: `cbfVaso` is the DIRECT factor (ruled F3, 2026-09-27 04:55).** The tables' CBF column is the
  vasodilation BEYOND flow–metabolism coupling (Matta 1999, MCA velocity under an isoelectric EEG). Sevoflurane and
  isoflurane rows carry `cmro2PerMac` (0.25 / 0.3, floor 0.5) and Matta's direct CBF points (`cbfDirect` +4/+17 % and
  +19/+72 % at 0.5/1.5 MAC); `combine` multiplies `cmro2Mult` by max(0.5, 1 − cmro2PerMac·MAC) and `cbfVaso` by the
  Matta curve itself — no division by the metabolic share. 7d computes the NET CBF = direct × its CMRO2 coupling (7f's
  `cmro2Mult` when present), so at 1.5 MAC sevoflurane with no other agent 7d reads 1.17 × its coupling term. The two
  rows' linear `cbfVaso` PD entries are removed (they would count twice). Desflurane and N2O keep their rows (the
  tables give no numbers). Whether the net should instead reproduce Matta's number is Q-FU2-CBF (Ali's calibration
  pass; not blocking).
- **D11 — temperature once.** `PkCtx.hepFnTemp` is true only when 7c's `blood.core.liver` exists AND 7d's
  `organs.liver` exists (7c alone initialises `core.liver` to 1 with no temperature in it, so "core.liver present" is
  not enough); then the low-extraction hepatic share takes `hepFn` alone, while flow-limited hepatic, renal and other
  clearance keep 7g's −5 %/°C term.
- **D12 — AF rate mapping re-fit (ruled Q4, E-FU2-5).** Measured MANUAL (the rhythm engine alone, `runRhythm`, 600 s,
  seeds 11–13 + 21) before the re-fit: 130 → 130.6 / 131.0 (seeds 11–13 / seed 21), 135 → 136.3 / 137.9 (+2.1 % on
  seed 21), 140 → 139.8 / 141.4, 145 → 144.7 / 146.1, 150 → 149.9 / 151.1. Knots added at 135 (command 131.2) and 145
  (151.5): 135 → 135.4 / 137.0, 145 → 145.1 / 146.3; 130/140 unchanged (their knots are unchanged). The whole engine
  in MANUAL agrees (true mean ventricular rate over 600 s, 4 seeds: 130.7, 135.7, 140.1, 145.3). The "+4 % at 140"
  that Q-FU2-5 attributed to the junction mapping is the MONITOR's HR reading of an irregular rhythm: the same MANUAL
  runs read 136.5 / 141.0 / 144.8 / 149.1 on the HR numeric (+3–5 % over the true mean) — a monitor-algorithm item,
  not the mapping (Q-FU2-11).
- **D13 — AF rate control through the AV node (the review's addition; E-FU2-6/7).** The esmolol, metoprolol and
  labetalol rows gain an `avNode` occupancy entry (Emax 0.5 / EC50 150 µg/kg/min; 0.5 / 2× ref dose; 0.4 / 2× ref
  dose [ENG]): esmolol 150 µg/kg/min → block 0.25, metoprolol 5 mg → 0.25, labetalol 20 mg → 0.2; amiodarone keeps its
  7g entry (0.3 / 1× → 0.15 at a 150 mg load). The circulation reads `bus.avNodeBlock` (`ext.avNodeBlock`) and the AF
  response is multiplied by (1 − block) in MODELED. MANUAL AF keeps the instructor's rate. Band 20–30 % [ENG: the
  tables give no AF rate-control number (T6.2 gives esmolol's sinus HR fall only); the acute response IV rate control
  is chosen for; calibration pass R44]: esmolol 0.5 mg/kg + 150 µg/kg/min slows AF 130 by 26.9 % ✓; amiodarone 150 mg
  by 14.0 % (`it.fails` — raising its 7g Emax is not additive, Q-FU2-9). No digoxin, diltiazem or verapamil rows exist.
  Once rate control feeds the bus, esmolol 300 + metoprolol 10 mg + amiodarone 300 mg block ≥ 0.5 and fired 7g's
  adenosine hook (sinus → `sinusPause`, measured): the hook now reads adenosine's OWN block from its row (E-FU2-7).

## Prototype results (scratch `proto-fu2` on `origin/main` `5c3d6a5`, seed 7 unless stated; before → after)

| Item | Measure | Band / target | Before | After |
|---|---|---|---|---|
| 1 | SVT (AVNRT) set 180, MODELED, monitor HR 60–100 s after onset | 180 ± 5 | 139.9 (state hr 69.2) | **179.9** |
| 1 | sinus bradycardia set 40 | 40 ± 3 | 59.1 | **40.2**; 40.1 on phenylephrine |
| 1 | VT 170 / atrial tachycardia 170 / junctional escape 50 / CHB wide 32 / VVI 70 | ± 3 | 120.0 / 150.0 / 60.0 / 40.0 / 74.5 | **169.8 / 170.0 / 50.0 / 32.0 / 70.0** |
| 1 | AF set 100 (130–220 s after onset) | 100 ± 5 | 78.1 | **101.0**; phenylephrine ×0.947 (95.6) |
| 1 | AF set 140 (monitor 80–120 → 150–240 s; state hr; true beat rate 150–240 s) | (no band) | 78.3 | monitor 149.8 → 157.3; state hr 153.4 (drive at the +10 % bound: hypotensive at fast AF); beats 155.6 |
| 1 | AAI 70: phenylephrine / bleed 1225 mL over 60 s (150–240 s) | ≥ 67 / ≥ 80 | 61.3 / 91.3 | **70.0 / 91.4** |
| 1 | sinusPause, avb2to1, wpwSinus without / with an explicit rate (unit) | reflex / held | held (not in the family) | **reflex / held** |
| 1b | AF mapping, `runRhythm` 600 s, seed 21: 130 / 135 / 140 / 145 | ± 2 % | 131.0 / 137.9 (+2.1 %) / 141.4 / 146.1 | 131.0 / **137.0** / 141.4 / **146.3** (knots 135, 145) |
| 1b | … MANUAL engine, 4 seeds, true mean vs monitor HR at 130 / 140 / 145 | — | 130.7 / 140.1 / 145.0 true; 136.5 / 144.8 / 149.1 monitor | 130.7 / 140.1 / 145.3 true (D12) |
| 1b | MODELED AF 130: esmolol 0.5 mg/kg + 150 µg/kg/min (monitor, 15–20 min after the load) | fall 20–30 % | +1.6 % (rose: the reflex's AV drive) | **fall 26.9 %** (136.3 → 99.7) |
| 1b | … amiodarone 150 mg over 10 min (10–13 min after the load) | fall 20–30 % | +8.8 % (rose) | fall 14.0 % (`it.fails`, Q-FU2-9) |
| 1b | esmolol 300 + metoprolol 10 mg + amiodarone 300 mg on sinus: adenosine hook | no rhythm change | — | block ≥ 0.5 → `sinusPause` without E-FU2-7; **none** with it |
| 1 | sinus at rest + phenylephrine 1 µg/kg/min | HR −5 to −15 | 70.0 → 61.5 | 70.0 → 61.5 (unchanged path) |
| 1 | flutter 2:1 | 150 | 150.0 | 150.0 |
| 1 | adenosine 6 mg on AVNRT (7g scenario) / circ-sanity 1 phenylephrine 100 µg | existing bands | pass | pass |
| 2 | dobutamine 5 µg/kg/min, engine CO at 20 min (7g test) | +20–40 % | +3.9 | **+11.8** (stays `it.fails`) |
| 2 | … β-blocked profile | ≤ half the free rise | +0.9 | +3.4 (≤ 5.9 ✓) |
| 2 | … circ level, unventilated, reflexes on (CO averaged 360–400 s) | — | +7.6 | +17.0 |
| 2 | 25 % haemorrhage + β potency 1 (dobutamine ≈ 7 µg/kg/min): largest mobilised unstressed volume (F4) | ≤ 840 mL (12 mL/kg) | reflex alone 669; unclamped 865 | **840** |
| 2 | phenylephrine 0.1/0.25/0.5/1 · norepinephrine 0.05/0.1/0.2 (MAP %) | 7g bands | pass | 13.7/23.4/29.8/34.2 · 20.2/30.2/40.4 (all in band) |
| 3 | post-PVC SBP (hemo-acceptance 5c, seed 5) | +8–15 | −10.9 | −10.9 (no change, D5) |
| 3 | … Langewouters p0 40.4, p1 39.4 (age 40), whole range | | | −9.9; breaks 5 bands (see Task 5) |
| 3 | … same law below 95 mmHg only | | | −10.4; pleth−radial foot 100.09 ms (band ≤ 100) |
| 3 | … below 80 / 70 mmHg only; unphysiological p0 70 p1 20 | | | −11.2 / −11.0; −8.0 |
| 4 | shock outcome VF → asystole (zoll-like seed 4): panel rhythm select | follows | stays `vfCoarse` | `asystole` |
| 5 | saadat-like, 60 → 120 step, HR at +2…+10 s | pinned | 60 67 75 86 100 120 120 120 120 (settled +7 s) | 64 71 78 85 92 99 106 113 120 (settled +10 s) |
| 6 | 7d check 19 MANUAL Cushing ΔMAP (7d prototype, seed 3) | +30–50 | +24.3 (ringing ±12 mmHg, ≈ 18 s cycle) | NOT PLANNED — see "Item 6: deferred" |
| 7 | MANUAL 110/70, HR 80: contractility 1 → 0.5 (CO / ABP / SVR) | CO ↓, MAP held | 6.82 / 112/71 (85) / 0.64 (contractility ignored) | **4.74 / 102/77 (87) / 0.96** |
| 7 | MANUAL contractility 0.3, CVP 12, 85/55 (tables §7 check 20 premise MAP 65, CVP 12, CO 3.5) | MAP 60–72, CO ≤ 4 | CO 6.4, MAP 55 (7d) | **CO 3.28, MAP 68, CVP 12.0** |
| 8 | direct CBF (bus `cbfVaso`) at 0.5 / 1.5 MAC, sevoflurane | 1.04 / 1.17 (tables §5.1, Matta) | 1.10 / 1.30 (linear) | **1.04 / 1.17** |
| 8 | … isoflurane | 1.19 / 1.72 | 1.20 / 1.60 | **1.19 / 1.72** |
| 8 | CMRO2 (bus `cmro2Mult`) at 1.5 MAC, sevoflurane / isoflurane | 0.625 / 0.55 | 0.70 / 0.70 | **0.625 / 0.55** |
| 9 | midazolam clearance factor at 33 °C with 7d's liver function 0.62 | applied once: 0.62 | 0.50 (0.62 × 0.81) | **0.62**; without 7d 0.81 (unchanged) |

## File map

| File | Task | Responsibility |
|---|---|---|
| `packages/engine-core/src/l2/circ/rate-rule.ts` (new) | 1, 3 | who owns the rate in MODELED; `heldRate`, `modeledHrRequest`; the AF block term |
| `packages/engine-core/src/l2/circ/model.ts` | 1, 3, 4 | `hrSet` field; `avNodeBlock` and `betaAgonistU` ext keys; β term + shared-reservoir clamp in `control()` |
| `packages/engine-core/src/l2/hemo/pipeline.ts` | 2, 6 | MODELED request via the rule; `state.rhythm` |
| `packages/engine-core/src/engine.ts` | 2, 3, 4 | `holdRate` at each `ps.hr` write; `avNodeBlock` and `betaAgonistU` from the bus |
| `packages/engine-core/vite.config.ts` | 2, 3 | SLOW entries |
| `packages/engine-core/src/l2/ecg/atria.ts` (`AF_RATE_CAL`) | 3 | AF mapping knots 135/145 (E-FU2-5) |
| `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts`, `l2/pk/hooks.ts` | 3 | β-blocker AV-nodal entries (E-FU2-6); adenosine hook reads its own block (E-FU2-7) |
| `packages/engine-core/src/l2/circ/venous.ts` (new) | 4 | β venous potency and volume |
| `packages/engine-core/src/l2/ecg/rhythms.ts` | 6 | `effectiveRateBpm` |
| `packages/engine-core/src/types-hemo.ts` | 6 | `state.rhythm?` |
| `packages/controller/src/protocol.ts`, `src/session/controller-session.ts` | 7 | wire type; session follows `state.rhythm` |
| `packages/engine-core/src/l3/hr.ts` | 8 | moving-average mapping |
| `packages/engine-core/src/l2/hemo/pipeline.ts` (`trackCircBeat`, tracker key) | 9 | MANUAL contractility |
| `packages/engine-core/src/l2/pk/{row,combine}.ts`, `l2/pk/data/rows-anaesthetic.ts` | 10 | volatile CMRO2 and direct CBF |
| `packages/engine-core/src/l2/pk/pipeline.ts` (`PkCtx`, `clFactor`), `engine.ts` `pkCtx` | 11 | temperature once |
| `apps/demo/e2e/fu2.e2e.ts` (new), `docs/gates/fu-2.md`, `docs/gates/fu-2/*.jpg` | 12 | gate evidence |

---

### Task 1: The MODELED rate rule (pure module) and the held rate on the circulation

**Files:**
- Create: `packages/engine-core/src/l2/circ/rate-rule.ts`
- Modify: `packages/engine-core/src/l2/circ/model.ts` (imports; `CircModelState`; `createCircModel`)
- Test: `packages/engine-core/test/l2/circ/rate-rule.test.ts`

**Interfaces:**
- Consumes: `RampState`, `rampValue` (`src/l1/ramp.ts`); `RHYTHMS` (`src/l2/ecg/rhythms.ts`, read-only: `atria`,
  `rateDrives`, `pacing`); `CircModelState.hrModel`, `.prof.hrRest`.
- Produces: `SINUS_FAMILY: ReadonlySet<string>` (derived: 11 rhythms), `PACER_SENSING: ReadonlySet<string>` (`pacedAAI`,
  `pacedDDD`), `AV_MODULATED: ReadonlySet<string>`, `AV_MOD_MAX = 0.1`,
  `AV_GAIN = 0.25`, `heldRate(rhythmId: string, explicit: boolean, hr: RampState): RampState | null`,
  `modeledHrRequest(m: CircModelState, rhythmId: string, t: number): number | null`; `CircModelState.hrSet:
  RampState | null` (initialised `null`). Task 2 wires them.

- [x] **Step 0: Worktree and branch (once)**

```bash
cd /Users/samhv/Desktop/Claude/projects/patient-monitor-engine/repo
git fetch origin
git merge-base --is-ancestor origin/stage-7g-pkpd origin/main && echo "7g is on main" || echo "STOP: PR #15 (7g) has not merged — report and wait"
git worktree add -b fu-2-engine-followups ../scratch/wt-fu2 origin/main
cd ../scratch/wt-fu2
npx -y pnpm@9.15.9 install --frozen-lockfile
cp ../../repo/docs/plans/fu-2-engine-followups.md docs/plans/fu-2-engine-followups.md
```

Every later command runs in `../scratch/wt-fu2`. Tick the boxes in THIS copy of the plan and commit it with each task.

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/l2/circ/rate-rule.test.ts`:

```ts
// FU-2 item 1 (NR-7g-5): who owns the ventricular rate in MODELED mode (l2/circ/rate-rule.ts).
import { describe, expect, it } from 'vitest';
import { constantRamp } from '../../../src/l1/ramp.ts';
import { createCircModel } from '../../../src/l2/circ/model.ts';
import { AV_GAIN, AV_MOD_MAX, heldRate, modeledHrRequest, PACER_SENSING, SINUS_FAMILY } from '../../../src/l2/circ/rate-rule.ts';

describe('MODELED rate rule (NR-7g-5)', () => {
  it('the sinus family is derived from the rhythm library (sinus atria, rate driven as sinus): 11 rhythms, complete block excluded', () => {
    expect([...SINUS_FAMILY].sort()).toEqual(['avb1', 'avb2Mobitz1', 'avb2Mobitz2', 'avb2to1', 'avbHighGrade', 'sinus', 'sinusArrhythmia', 'sinusBrady', 'sinusPause', 'sinusTachy', 'wpwSinus']);
    for (const id of ['avb3Narrow', 'avb3Wide', 'atrialTach', 'pacedAAI', 'pacedDDD', 'pacedVVI']) expect(SINUS_FAMILY.has(id)).toBe(false);
    expect([...PACER_SENSING].sort()).toEqual(['pacedAAI', 'pacedDDD']);
  });
  it('heldRate: a sinus rhythm without an explicit rate goes to the reflex (null); an explicit rate or any other rhythm is held', () => {
    const r = constantRamp(40);
    expect(heldRate('sinus', false, r)).toBeNull();
    expect(heldRate('sinusBrady', true, r)).toEqual(r);
    expect(heldRate('svtAvnrt', false, constantRamp(180))).toEqual(constantRamp(180));
    expect(heldRate('pacedAAI', false, constantRamp(70))).toEqual(constantRamp(70)); // a pacer's lower rate is always held
    expect(heldRate('sinusBrady', true, r)).not.toBe(r); // a copy: later writes to ps.hr never alias it
  });
  it('sinus family: the reflex rate unless the instructor holds one', () => {
    const m = createCircModel();
    m.hrModel = 83;
    expect(modeledHrRequest(m, 'sinusTachy', 10)).toBe(83);
    m.hrSet = constantRamp(40);
    expect(modeledHrRequest(m, 'sinusBrady', 10)).toBeNull();
  });
  it('sinus pause, 2:1 block and WPW in sinus: set without a rate they follow the reflex; set with one they hold it', () => {
    const m = createCircModel();
    m.hrModel = 91;
    for (const id of ['sinusPause', 'avb2to1', 'wpwSinus']) {
      m.hrSet = heldRate(id, false, constantRamp(80));
      expect(m.hrSet, id).toBeNull();
      expect(modeledHrRequest(m, id, 10), id).toBe(91);
      m.hrSet = heldRate(id, true, constantRamp(80));
      expect(m.hrSet, id).toEqual(constantRamp(80));
      expect(modeledHrRequest(m, id, 10), id).toBeNull();
    }
  });
  it('rhythm-intrinsic rates are never requested (SVT, atrial tachycardia, flutter, junctional, VT, AIVR, escape, VVI)', () => {
    const m = createCircModel();
    m.hrModel = 90;
    m.hrSet = constantRamp(180);
    for (const id of ['svtAvnrt', 'atrialTach', 'mat', 'aflutter', 'junctionalEscape', 'vtMono', 'aivr', 'avb3Narrow', 'avb3Wide', 'pacedVVI']) expect(modeledHrRequest(m, id, 10), id).toBeNull();
  });
  it('AAI / DDD: max(programmed lower rate, the reflex rate) — the reflex never pulls the rate below the lower rate', () => {
    const m = createCircModel();
    m.hrSet = constantRamp(70);
    for (const id of ['pacedAAI', 'pacedDDD']) {
      m.hrModel = 58; // phenylephrine's reflex bradycardia
      expect(modeledHrRequest(m, id, 10), id).toBe(70);
      m.hrModel = 96; // reflex tachycardia: the intrinsic sinus overtakes the pacer
      expect(modeledHrRequest(m, id, 10), id).toBe(96);
    }
    m.hrSet = null;
    expect(modeledHrRequest(m, 'pacedAAI', 10)).toBeNull();
  });
  it('AF: the set ventricular response × (1 + AV_GAIN·(reflex drive − 1)), bounded ±AV_MOD_MAX', () => {
    const m = createCircModel();
    m.hrSet = constantRamp(100);
    m.hrModel = m.prof.hrRest; // reflex at rest → the set response
    expect(modeledHrRequest(m, 'afib', 10)).toBeCloseTo(100, 9);
    m.hrModel = m.prof.hrRest * 1.2;
    expect(modeledHrRequest(m, 'afib', 10)).toBeCloseTo(100 * (1 + AV_GAIN * 0.2), 9);
    m.hrModel = m.prof.hrRest * 3;
    expect(modeledHrRequest(m, 'afib', 10)).toBeCloseTo(100 * (1 + AV_MOD_MAX), 9);
    m.hrModel = m.prof.hrRest * 0.2;
    expect(modeledHrRequest(m, 'afib', 10)).toBeCloseTo(100 * (1 - AV_MOD_MAX), 9);
    m.hrSet = null; // AF entered by a mode switch with no rate on record: its own rate stands
    expect(modeledHrRequest(m, 'afib', 10)).toBeNull();
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/rate-rule.test.ts`
Expected: FAIL — `Failed to load url ../../../src/l2/circ/rate-rule.ts` (module does not exist).

- [x] **Step 3: Implement** — create `packages/engine-core/src/l2/circ/rate-rule.ts`:

```ts
// FU-2 (NR-7g-5, G7g): who owns the ventricular rate in MODELED mode. Only the sinus node answers to the
// circulation's HR set point (baroreflex, chemoreflex, drugs); every other pacemaker — ectopic atrial foci, the AF
// junction, re-entry circuits, junctional and ventricular foci, escape rhythms, pacemakers — keeps its own rate and
// the circulation follows IT. Two bounded exceptions: in AF the reflex modulates AV-nodal conduction, so the
// ventricular response moves with sympathetic/vagal tone by a bounded fraction; an atrial-sensing pacemaker (AAI,
// DDD) is inhibited when the intrinsic sinus runs faster than its lower rate, so the reflex can raise the rate above
// the programmed lower rate but never pull it below. An explicit instructor rate on a sinus-family rhythm overrides
// the reflex exactly as in MANUAL until a sinus-family rhythm is set without a rate.
import { rampValue, type RampState } from '../../l1/ramp.ts';
import { RHYTHMS } from '../ecg/rhythms.ts';
import type { RhythmId } from '../../types.ts';
import type { CircModelState } from './model.ts';

const IDS = Object.keys(RHYTHMS) as RhythmId[];
/** Rhythms whose rate is the sinus node's, which the circulation's HR set point drives — DERIVED from the rhythm
 * library (sinus atria whose rate the hr ramp drives): the sinus rhythms, sinus pause, WPW in sinus and the AV blocks
 * with a conducted sinus rate (1st degree, Mobitz I/II, 2:1, high grade). Complete block is not in it: its hr drives
 * the escape focus (rateDrives 'escape'). */
export const SINUS_FAMILY: ReadonlySet<string> = new Set(IDS.filter((id) => RHYTHMS[id].atria === 'sinus' && RHYTHMS[id].rateDrives === 'sinus'));
/** Atrial-sensing pacemakers (AAI, DDD): the rate is max(programmed lower rate, the reflex's sinus rate). */
export const PACER_SENSING: ReadonlySet<string> = new Set(IDS.filter((id) => RHYTHMS[id].pacing === 'AAI' || RHYTHMS[id].pacing === 'DDD'));
/** Rhythms whose ventricular response the reflex modulates through AV-nodal conduction. Flutter conducts at a
 * fixed ratio (a discrete 2:1 → 4:1 change is not a bounded modulation), so it is not listed. */
export const AV_MODULATED: ReadonlySet<string> = new Set(['afib']);
/** Largest fractional change of the AF ventricular response the reflex can cause [ENG, calibration pass R44]. */
export const AV_MOD_MAX = 0.1;
/** AV-nodal share of the sinus node's autonomic rate change (the node's conduction is less tone-sensitive than the
 * sinus node's automaticity) [ENG, calibration pass R44]. */
export const AV_GAIN = 0.25;

/**
 * The rate to hold for a rhythm just set: null hands a sinus-family rate to the reflex (no explicit rate);
 * otherwise the ramp the instructor or the rhythm set (the base of an AF response, a pacer's lower rate, the rate of
 * a focus).
 */
export function heldRate(rhythmId: string, explicit: boolean, hr: RampState): RampState | null {
  return SINUS_FAMILY.has(rhythmId) && !explicit ? null : { ...hr };
}

/** The rate MODELED mode asks the rhythm engine for at time t, or null when the rhythm's own rate stands. */
export function modeledHrRequest(m: CircModelState, rhythmId: string, t: number): number | null {
  if (SINUS_FAMILY.has(rhythmId)) return m.hrSet ? null : m.hrModel;
  if (!m.hrSet) return null; // entered by a mode switch with no rate on record: the rhythm's own rate stands
  if (PACER_SENSING.has(rhythmId)) return Math.max(rampValue(m.hrSet, t), m.hrModel);
  if (AV_MODULATED.has(rhythmId)) {
    const drive = Math.min(1 + AV_MOD_MAX, Math.max(1 - AV_MOD_MAX, 1 + AV_GAIN * (m.hrModel / m.prof.hrRest - 1)));
    return rampValue(m.hrSet, t) * drive;
  }
  return null;
}
```

In `packages/engine-core/src/l2/circ/model.ts`, find:

```ts
import { createCoronary, G_ISCH, type CoronaryState } from './coronary.ts';
```

and replace with:

```ts
import { createCoronary, G_ISCH, type CoronaryState } from './coronary.ts';
import type { RampState } from '../../l1/ramp.ts'; // FU-2
```

find:

```ts
  hrModel: number; // bpm the reflex/drugs ask the rhythm engine for (MODELED)
```

and replace with:

```ts
  hrModel: number; // bpm the reflex/drugs ask the rhythm engine for (MODELED)
  /** FU-2 (NR-7g-5): the rate the instructor or the rhythm set (rate-rule.ts); null = the reflex owns a sinus-family rate. */
  hrSet: RampState | null;
```

and in `createCircModel`, find `hrModel: prof.targets.hr,` and replace it with `hrModel: prof.targets.hr, hrSet: null,`
(the rest of that line unchanged).

- [x] **Step 4: Run it to verify it passes**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/rate-rule.test.ts test/l2/circ`
Expected: PASS — 7 new tests; every existing `test/l2/circ` test still passes. Then `npx -y pnpm@9.15.9 --filter
@pme/engine-core typecheck` clean.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/circ/rate-rule.ts packages/engine-core/src/l2/circ/model.ts packages/engine-core/test/l2/circ/rate-rule.test.ts docs/plans/fu-2-engine-followups.md
git commit -m "feat(circ): MODELED rate rule — only the derived sinus family follows the reflex; AF bounded, AAI/DDD floored (NR-7g-5)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin fu-2-engine-followups
```

---

### Task 2: Wire the rule — the pipeline asks only when the rule says so; the engine records every rate it writes

**Files:**
- Modify: `packages/engine-core/src/l2/hemo/pipeline.ts` (one import; the MODELED `requestHr` branch)
- Modify: `packages/engine-core/src/engine.ts` (one import, the `holdRate` helper, eight calls)
- Modify: `packages/engine-core/vite.config.ts` (SLOW entry)
- Test: `packages/engine-core/test/engine/circ-rate-rule.test.ts`

**Interfaces:**
- Consumes: `heldRate`, `modeledHrRequest` (Task 1); `HemoCtx.rhythm.id`; `ps.hr`, `ps.rhythm.pendingSwitch`.
- Produces: `holdRate(ps: PipelineState, rhythmId: string, explicit: boolean): void` (module-private in `engine.ts`).
  After this task, MODELED writes `ps.hr` only for a reflex-owned sinus-family rhythm (the reflex rate), AF (set rate ×
  AV drive) or AAI/DDD (max(lower rate, reflex rate)).

- [x] **Step 1: Write the failing test** — `packages/engine-core/test/engine/circ-rate-rule.test.ts`:

```ts
// FU-2 item 1 (NR-7g-5, G7g): in MODELED mode only the sinus node follows the circulation's HR set point; every other
// pacemaker keeps its own rate and the circulation follows it; AF's ventricular response moves by a bounded fraction.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, RhythmId } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
type Ev = { type: string; t: number; values?: { hr?: { value: number | null } } };

/** MODELED engine; a rhythm at 20 s, an optional drug event at 120 s; advanced minute by minute with a yield (CI rule). */
async function run(rhythm: RhythmId | null, opts: Record<string, unknown>, drug?: Record<string, unknown>, tEnd = 240, extra?: (e: ReturnType<typeof createEngine>) => void) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(20);
  if (rhythm) e.dispatch(cmd({ type: 'setRhythm', rhythm, opts }));
  if (drug) e.dispatch(cmd({ type: 'applyEvent', event: drug, atTick: 120 * 50 }));
  extra?.(e);
  for (let t = 60; t <= tEnd; t += 60) {
    e.advanceTo(t);
    await yieldNow();
  }
  /** Mean monitor HR (the 1 Hz measurement) over (a, b]. */
  const hr = (a: number, b: number) => {
    const v = (ev as unknown as Ev[]).filter((x) => x.type === 'measurement' && x.values?.hr?.value != null && x.t > a && x.t <= b).map((x) => x.values!.hr!.value as number);
    return v.reduce((p, q) => p + q, 0) / Math.max(1, v.length);
  };
  return { e, ev, hr };
}
const PHE = { kind: 'infusion', drugId: 'phenylephrine', rate: 1, unit: 'mcg/kg/min' };
const BLEED = { kind: 'bleed', volumeMl: 1225, overS: 60 }; // 25 % of an adult's blood volume in a minute: reflex tachycardia

describe('MODELED rate ownership (NR-7g-5)', () => {
  it('SVT (AVNRT) set at 180 reads 180 ± 5 on the monitor (was 140: the reflex request, clamped to the SVT range)', async () => {
    const r = await run('svtAvnrt', { rateBpm: 180 }, undefined, 120);
    console.log(`FU-2 SVT 180 MODELED: monitor ${r.hr(80, 120).toFixed(1)}`);
    expect(Math.abs(r.hr(80, 120) - 180)).toBeLessThanOrEqual(5);
  }, 300_000);
  it('sinus bradycardia set at 40 reads 40 ± 3 and holds through phenylephrine (the instructor rate overrides the reflex)', async () => {
    const r = await run('sinusBrady', { rateBpm: 40 }, PHE);
    console.log(`FU-2 sinusBrady 40 MODELED: ${r.hr(80, 120).toFixed(1)} → ${r.hr(150, 240).toFixed(1)} with phenylephrine`);
    expect(Math.abs(r.hr(80, 120) - 40)).toBeLessThanOrEqual(3);
    expect(Math.abs(r.hr(150, 240) - 40)).toBeLessThanOrEqual(3);
  }, 300_000);
  it('the rhythm-intrinsic rates hold: VT 170, atrial tachycardia 170, junctional escape 50, complete block 32, VVI 70 (± 3)', async () => {
    for (const [id, rate] of [['vtMono', 170], ['atrialTach', 170], ['junctionalEscape', 50], ['avb3Wide', 32], ['pacedVVI', 70]] as [RhythmId, number][]) {
      const r = await run(id, { rateBpm: rate }, undefined, 120);
      console.log(`FU-2 ${id} ${rate} MODELED: ${r.hr(80, 120).toFixed(1)}`);
      expect(Math.abs(r.hr(80, 120) - rate)).toBeLessThanOrEqual(3);
    }
  }, 600_000);
  it('AF set at 100 holds its mean (100 ± 5); phenylephrine slows the response through the AV node by 2–12 %', async () => {
    const a = await run('afib', { rateBpm: 100 });
    const b = await run('afib', { rateBpm: 100 }, PHE);
    const f = b.hr(150, 240) / a.hr(150, 240);
    console.log(`FU-2 AF 100 MODELED: ${a.hr(150, 240).toFixed(1)}; with phenylephrine ${b.hr(150, 240).toFixed(1)} (×${f.toFixed(3)})`);
    expect(Math.abs(a.hr(150, 240) - 100)).toBeLessThanOrEqual(5);
    expect(f).toBeGreaterThanOrEqual(0.88);
    expect(f).toBeLessThanOrEqual(0.98);
  }, 600_000);
  it('AAI 70: phenylephrine cannot pull it below 70; the reflex tachycardia of a bleed lets the intrinsic sinus overtake it', async () => {
    const a = await run('pacedAAI', { rateBpm: 70 }, PHE);
    const b = await run('pacedAAI', { rateBpm: 70 }, BLEED);
    console.log(`FU-2 AAI 70 MODELED: phenylephrine ${a.hr(80, 120).toFixed(1)} → ${a.hr(150, 240).toFixed(1)}; bleed ${b.hr(80, 120).toFixed(1)} → ${b.hr(150, 240).toFixed(1)}`);
    expect(Math.abs(a.hr(150, 240) - 70)).toBeLessThanOrEqual(3);
    expect(b.hr(150, 240)).toBeGreaterThanOrEqual(80);
  }, 600_000);
  it('sinus at rest still follows the reflex: phenylephrine brings the rate down 5–15; a rate-less sinus hands a held rate back', async () => {
    const r = await run(null, {}, PHE);
    const d = r.hr(150, 240) - r.hr(80, 120);
    console.log(`FU-2 sinus rest + phenylephrine: ${r.hr(80, 120).toFixed(1)} → ${r.hr(150, 240).toFixed(1)}`);
    expect(d).toBeLessThanOrEqual(-5);
    expect(d).toBeGreaterThanOrEqual(-15);
    const h = await run('sinusBrady', { rateBpm: 40 }, undefined, 180, (e) => e.dispatch(cmd({ type: 'setRhythm', rhythm: 'sinus', atTick: 90 * 50 })));
    console.log(`FU-2 sinusBrady 40 → sinus (no rate) at 90 s: ${h.hr(60, 90).toFixed(1)} → ${h.hr(140, 180).toFixed(1)}`);
    expect(h.hr(140, 180)).toBeGreaterThan(60); // the reflex owns it again (rest ≈ 70)
  }, 600_000);
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-rate-rule.test.ts`
Expected: FAIL — SVT reads ≈ 139.9 (the reflex's ≈ 69 clamped to the SVT range 140–280), sinus bradycardia ≈ 59
(clamped to 59), VT ≈ 120, CHB ≈ 40, VVI ≈ 74.5, AF ≈ 78, AAI 70 on phenylephrine ≈ 61.3 (the bleed half, 91.3,
passes already); the sinus-at-rest test passes already.

- [x] **Step 3: Implement**

Merge main first (R51 §7): `git fetch origin && git merge origin/main`.

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
import { DEFAULT_PROFILE, type CircProfile, type ConditionId } from '../circ/profile.ts'; // Stage 7a
```

and replace with:

```ts
import { DEFAULT_PROFILE, type CircProfile, type ConditionId } from '../circ/profile.ts'; // Stage 7a
import { modeledHrRequest } from '../circ/rate-rule.ts'; // FU-2
```

find:

```ts
      const want = hs.circ.hrModel; // Stage 7a MODELED: the reflexes drive the rhythm engine's rate
      if (Math.abs(want - rampValue(ctx.hr, t1)) > 0.2) ctx.requestHr(want);
```

and replace with:

```ts
      const want = modeledHrRequest(hs.circ, ctx.rhythm.id, t1); // FU-2 (NR-7g-5): only the sinus node follows the reflex (AF conduction, AAI/DDD: bounded)
      if (want !== null && Math.abs(want - rampValue(ctx.hr, t1)) > 0.2) ctx.requestHr(want);
```

In `packages/engine-core/src/engine.ts` (nine edits; each anchor is unique):

(a) find:

```ts
import { circCardiacOutput, type CircModelState } from './l2/circ/model.ts'; // Stage 7g
```

and replace with:

```ts
import { circCardiacOutput, type CircModelState } from './l2/circ/model.ts'; // Stage 7g
import { heldRate } from './l2/circ/rate-rule.ts'; // FU-2
```

(b) find:

```ts
/** hr truth when a rhythm starts: RhythmOpts.rateBpm, else the rhythm default (flutter: atrial/ratio). */
```

and replace with:

```ts
/** FU-2 (NR-7g-5): record the rate just written to ps.hr for MODELED mode's rate rule (explicit = the instructor's own rate). */
function holdRate(ps: PipelineState, rhythmId: string, explicit: boolean): void {
  ps.hemo.circ.hrSet = heldRate(rhythmId, explicit, ps.hr);
}

/** hr truth when a rhythm starts: RhythmOpts.rateBpm, else the rhythm default (flutter: atrial/ratio). */
```

(c) constructor — find:

```ts
    this.syncCo2Sampler(); // R39-5
    for (const ch of ['vcgX', 'vcgY', 'vcgZ', ...lanes] as ChannelId[]) this.bufs.set(ch, new RingBuffer(ECG_RATE, BUFFER_SECONDS));
```

and replace with:

```ts
    holdRate(this.st, rhythmId, rhythmOpts.rateBpm !== undefined); // FU-2
    this.syncCo2Sampler(); // R39-5
    for (const ch of ['vcgX', 'vcgY', 'vcgZ', ...lanes] as ChannelId[]) this.bufs.set(ch, new RingBuffer(ECG_RATE, BUFFER_SECONDS));
```

(d) 7g's rhythm request — find:

```ts
      ps.hr = constantRamp(startRate(req7g.id, req7g.opts));
```

and replace with:

```ts
      ps.hr = constantRamp(startRate(req7g.id, req7g.opts));
      holdRate(ps, req7g.id, false); // FU-2: an engine-initiated sinus rate belongs to the reflex
```

(e) device host `setRhythm` — find:

```ts
        ps.hr = constantRamp(startRate(id, opts));
        applyRhythm(ps.rhythm, id, opts, simT, true, rhythmCtx(ps));
```

and replace with:

```ts
        ps.hr = constantRamp(startRate(id, opts));
        holdRate(ps, id, false); // FU-2: device outcomes (shock, ROSC) hand a sinus rate to the reflex
        applyRhythm(ps.rhythm, id, opts, simT, true, rhythmCtx(ps));
```

(f) device host `setHr` — find:

```ts
      setHr: (value, ramp) => {
        ps.hr = retarget(ps.hr, simT, value, ramp);
```

and replace with:

```ts
      setHr: (value, ramp) => {
        ps.hr = retarget(ps.hr, simT, value, ramp);
        holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, false); // FU-2
```

(g) device host `setL1` — find:

```ts
        if (v === 'hr') ps.hr = retarget(ps.hr, simT, value, ramp);
        else setL1Target(ps.l1, v as L1Var, simT, value, ramp);
```

and replace with:

```ts
        if (v === 'hr') {
          ps.hr = retarget(ps.hr, simT, value, ramp);
          holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, false); // FU-2
        } else setL1Target(ps.l1, v as L1Var, simT, value, ramp);
```

(h) `apply()`'s `setHr` (the Stage 2 `pin hr` value path) — find:

```ts
    const setHr = (v: number, r?: Ramp) => {
      ps.hr = retarget(ps.hr, simT, v, r);
```

and replace with:

```ts
    const setHr = (v: number, r?: Ramp) => {
      ps.hr = retarget(ps.hr, simT, v, r);
      holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, true); // FU-2: the instructor's rate
```

(i) `apply()`'s `setTarget` and `setRhythm` cases — find:

```ts
      case 'setTarget':
        ps.hr = retarget(ps.hr, simT, cmd.value, cmd.ramp);
        return;
      case 'setRhythm': {
        const opts = cmd.opts ?? {};
        ps.hr = constantRamp(startRate(cmd.rhythm, opts));
```

and replace with:

```ts
      case 'setTarget':
        ps.hr = retarget(ps.hr, simT, cmd.value, cmd.ramp);
        holdRate(ps, ps.rhythm.pendingSwitch?.id ?? ps.rhythm.id, true); // FU-2: the instructor's rate
        return;
      case 'setRhythm': {
        const opts = cmd.opts ?? {};
        ps.hr = constantRamp(startRate(cmd.rhythm, opts));
        holdRate(ps, cmd.rhythm, opts.rateBpm !== undefined); // FU-2
```

Check: `grep -n "ps.hr = " packages/engine-core/src/engine.ts` lists exactly one line WITHOUT a `holdRate` call
right after it — the MODELED `requestHr` callback (`ps.hr = constantRamp(bpm); // Stage 7a: MODELED mode drives the
rhythm engine's rate`), which must stay as it is. If a sibling stage added another `ps.hr =` write, add the matching
`holdRate` call (explicit = `true` only for an instructor command) and record it in the gate note.

In `packages/engine-core/vite.config.ts`, find:

```ts
  'test/engine/pk-acceptance-*.test.ts',
];
```

and replace with:

```ts
  'test/engine/pk-acceptance-*.test.ts',
  'test/engine/circ-rate-rule.test.ts', // FU-2: MODELED rhythm-rate scenarios (2–4 sim-min each)
];
```

- [x] **Step 4: Run it to verify it passes, and the paths the rule must not change**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-rate-rule.test.ts
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/pk-acceptance-scen.test.ts test/engine/circ-sanity-1.test.ts test/engine/circ-modeled.test.ts test/engine/pk-wiring.test.ts
npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck
```

Expected: the new file PASSES with the logged numbers of the prototype table (SVT 179.9; brady 40.2 → 40.1; VT 169.8,
AT 170.0, JE 50.0, CHB 32.0, VVI 70.0; AF 101.0, phenylephrine ×0.947; AAI 70: phenylephrine 70.0, bleed 91.4; sinus
70.0 → 61.5; hand-back 40.3 → 70.1);
the adenosine scenario (pause, then sinus ≤ 110), phenylephrine 100 µg (MAP +15–25, HR −5–15), the 7a MODELED tests
and 7g's wiring tests still pass. Then the fast set: `cd packages/engine-core && PME_TEST_SET=fast CI=1 npx vitest
run; cd ../..` — green.

- [x] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/src/engine.ts packages/engine-core/vite.config.ts packages/engine-core/test/engine/circ-rate-rule.test.ts docs/plans/fu-2-engine-followups.md
git commit -m "fix(engine): MODELED keeps rhythm-intrinsic rates — SVT 180 reads 180, sinus brady 40 reads 40, AAI never below its lower rate (NR-7g-5)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 3: AF rate control — the AF mapping re-fit (E-FU2-5) and the β-blockers' AV-nodal block (E-FU2-6/7)

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/atria.ts` (`AF_RATE_CAL` and its comment only — E-FU2-5)
- Modify: `packages/engine-core/test/l2/ecg/rhythm-atrial.test.ts` (one new `it`)
- Modify: `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (one appended `avNode` entry on the esmolol,
  labetalol and metoprolol rows — E-FU2-6, additive only)
- Modify: `packages/engine-core/src/l2/pk/hooks.ts` (three imports; `ADEN_AV`, `adenosineBlock`; the `block` line —
  E-FU2-7)
- Modify: `packages/engine-core/src/l2/circ/model.ts` (`ext.avNodeBlock`), `packages/engine-core/src/l2/circ/rate-rule.ts`
  (the AF line and the header comment), `packages/engine-core/src/engine.ts` (one line beside 7g's `ext` lines —
  E-FU2-1), `packages/engine-core/vite.config.ts` (one SLOW entry)
- Test: `packages/engine-core/test/l2/pk/av-node.test.ts`, `packages/engine-core/test/engine/af-rate-control.test.ts`

**Interfaces:**
- Consumes: `modeledHrRequest` (Task 1; its AF branch gains the block factor); `combine` → `bus.avNodeBlock` (7g: the
  product-occupancy of every row's `avNode` entry); `rhythmRequest`, `createHookState` (`l2/pk/hooks.ts`); `hill`
  (`l2/pk/pd.ts`); `concOf(pk, id)` (`l2/pk/pipeline.ts`); `runRhythm`, `mean`, `diffs` (`test/helpers/rhythm.ts`).
- Produces: `CircModelState.ext.avNodeBlock?: number` (0–1, fed from `ps.pk.bus.avNodeBlock` every drug pass); the
  MODELED AF request = held rate × AV drive × (1 − avNodeBlock); `AF_RATE_CAL` knots `[135, 131.2]`, `[145, 151.5]`.
  Task 4 adds its `betaAgonistU` ext key and engine line beside the ones added here (same anchors).

Why (D12, D13): the ruling (Q4) re-fits the AF mapping between the 130 and 150 knots; the review's addition makes the
AF ventricular response answer to rate control. Before this task a rate-control drug SPEEDS MODELED AF (esmolol
+1.6 %, amiodarone +8.8 %: the drugs' hypotension drives the reflex's AV term up), because nothing reads the bus's
`avNodeBlock` except the adenosine hook — which is also why the hook must stop reading the combined block (E-FU2-7).

- [ ] **Step 1: Write the failing mapping test** — in `packages/engine-core/test/l2/ecg/rhythm-atrial.test.ts`, find:

```ts
  it('afib beats carry k_rhythm 0.8 × f_fill(RR) and short RRs lose ejection (brief §4.8)', () => {
```

and replace with:

```ts
  it('FU-2 (E-FU2-5): afib mean ventricular rate within ±2 % at 130, 135, 140 and 145 bpm (knots at 135 and 145)', () => {
    for (const hr of [130, 135, 140, 145]) {
      const { beats } = runRhythm('afib', 600, { hr, seed: 21 }); // not a calibration seed (11–13)
      const got = 60 / mean(diffs(beats.map((b) => b.t)));
      expect(Math.abs(got - hr) / hr, `target ${hr}, got ${got.toFixed(1)}`).toBeLessThan(0.02);
    }
  });

  it('afib beats carry k_rhythm 0.8 × f_fill(RR) and short RRs lose ejection (brief §4.8)', () => {
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg/rhythm-atrial.test.ts`
Expected: FAIL — `target 135, got 137.9` (130 → 131.0, 140 → 141.4 and 145 → 146.1 are inside ±2 %; the MONITOR's
"+4 % at 140" of the old Q-FU2-5 is its HR numeric on an irregular rhythm, not the mapping — D12).

- [ ] **Step 3: Re-fit the mapping** — in `packages/engine-core/src/l2/ecg/atria.ts`, find:

```ts
 * threshold/refractory formulas that yields the target mean ventricular rate (simulated, 600 s × seeds 11–13).
 */
const AF_RATE_CAL: ReadonlyArray<readonly [number, number]> = [
  [20, 30], [40, 45.1], [50, 51.8], [60, 59.1], [70, 68.8], [80, 79.1], [90, 89.0], [100, 101.5], [110, 110.1],
  [120, 116.6], [130, 124.9], [140, 141.3], [150, 160.5], [160, 189.1], [170, 230.8], [180, 274.0],
];
```

and replace with:

```ts
 * threshold/refractory formulas that yields the target mean ventricular rate (simulated, 600 s × seeds 11–13). FU-2
 * (E-FU2-5) added the 135 and 145 knots (135 read +1.0 %, +2.1 % on seed 21, between the 130 and 140 knots).
 */
const AF_RATE_CAL: ReadonlyArray<readonly [number, number]> = [
  [20, 30], [40, 45.1], [50, 51.8], [60, 59.1], [70, 68.8], [80, 79.1], [90, 89.0], [100, 101.5], [110, 110.1],
  [120, 116.6], [130, 124.9], [135, 131.2], [140, 141.3], [145, 151.5], [150, 160.5], [160, 189.1], [170, 230.8], [180, 274.0],
];
```

(The two commands were interpolated from the measured command→rate curve on seeds 11–13: 135 → 135.4, 145 → 145.1.)

- [ ] **Step 4: Run it to verify it passes**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/ecg`
Expected: PASS — the new `it` (seed 21: 131.0 / 137.0 / 141.4 / 146.3) and the Stage 1.1 M1 test (±5 % over 40–180);
every other `test/l2/ecg` test unchanged.

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/ecg/atria.ts packages/engine-core/test/l2/ecg/rhythm-atrial.test.ts docs/plans/fu-2-engine-followups.md
git commit -m "fix(ecg): AF rate mapping knots at 135 and 145 bpm — ±2 % from 130 to 145 (E-FU2-5, ruled Q4)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

- [ ] **Step 6: Write the failing rate-control tests** — create `packages/engine-core/test/l2/pk/av-node.test.ts`:

```ts
// FU-2 (AF rate control, E-FU2-6/E-FU2-7): the β-blocker rows feed the drug bus's AV-nodal block; the adenosine hook
// reads adenosine's own block, so rate-control drugs never fire the adenosine pause or conversion.
import { describe, expect, it } from 'vitest';
import { combine, type PdContext } from '../../../src/l2/pk/combine.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import { createHookState, rhythmRequest } from '../../../src/l2/pk/hooks.ts';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';
import type { Command } from '../../../src/types.ts';

const CTX: PdContext = { ph: 7.4, betaBlockC: 0, vasoResp: 1, ageY: 40, macBrain: 0 };
const block = (id: string, c: number) => combine([{ row: DRUGS[id] as DrugRow, c }], CTX).bus.avNodeBlock;
const give = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;

describe('AV-nodal block on the drug bus (FU-2 AF rate control)', () => {
  it('esmolol 150 µg/kg/min 0.25, metoprolol 5 mg 0.25, labetalol 20 mg 0.2, amiodarone 150 mg 0.15 (its 7g entry)', () => {
    expect(block('esmolol', 150)).toBeCloseTo(0.25, 9);
    expect(block('metoprolol', 2)).toBeCloseTo(0.25, 9);
    expect(block('labetalol', 2)).toBeCloseTo(0.2, 9);
    expect(block('amiodarone', 1)).toBeCloseTo(0.15, 9);
  });
  it('stacked rate control (esmolol 300 + metoprolol 10 mg + amiodarone 300 mg) blocks ≥ 0.5 but never fires the adenosine hook', () => {
    const pk = createPkState();
    applyPkCommand(pk, give({ kind: 'infusion', drugId: 'esmolol', rate: 300, unit: 'mcg/kg/min' }), 0);
    applyPkCommand(pk, give({ kind: 'drug', drugId: 'metoprolol', dose: 10, unit: 'mg', route: 'iv' }), 0);
    applyPkCommand(pk, give({ kind: 'drug', drugId: 'amiodarone', dose: 300, unit: 'mg', route: 'iv' }), 0);
    advancePk(pk, NEUTRAL_PK_CTX, 900);
    expect(pk.bus.avNodeBlock).toBeGreaterThanOrEqual(0.5);
    for (const id of ['sinus', 'afib', 'svtAvnrt'] as const) expect(rhythmRequest(pk, createHookState(), { id, pinned: false }, 900), id).toBeNull();
  });
});
```

and `packages/engine-core/test/engine/af-rate-control.test.ts`:

```ts
// FU-2 (AF rate control, E-FU2-6): the AV-nodal block of the β-blocker rows (esmolol, metoprolol, labetalol) and of
// amiodarone reaches the drug bus's `avNodeBlock`, and MODELED AF's ventricular response is the set response × the
// reflex's AV drive × (1 − avNodeBlock). Band: a clinical esmolol infusion or an amiodarone load slows AF by 20–30 %
// [ENG: the tables give no AF rate-control number (§6 T6.2 gives esmolol's sinus HR fall only); the acute rate-control
// response the ACLS/AF-guideline drugs are chosen for; calibration pass R44].
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
type Ev = { type: string; t: number; values?: { hr?: { value: number | null } } };

/** MODELED AF set at 130 from 20 s; drug events at 120 s; mean monitor HR at 80–120 s (before) and over [a, b]. */
async function afFall(drugs: Record<string, unknown>[], a: number, b: number) {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(20);
  e.dispatch(cmd({ type: 'setRhythm', rhythm: 'afib', opts: { rateBpm: 130 } }));
  for (const d of drugs) e.dispatch(cmd({ type: 'applyEvent', event: d, atTick: 120 * 50 }));
  for (let t = 60; t <= b; t += 60) {
    e.advanceTo(t);
    await yieldNow();
  }
  const hr = (p: number, q: number) => {
    const v = (ev as unknown as Ev[]).filter((x) => x.type === 'measurement' && x.values?.hr?.value != null && x.t > p && x.t <= q).map((x) => x.values!.hr!.value as number);
    return v.reduce((s, x) => s + x, 0) / Math.max(1, v.length);
  };
  return { before: hr(80, 120), after: hr(a, b), fall: 100 * (1 - hr(a, b) / hr(80, 120)) };
}

describe('AF rate control through the AV node (FU-2, E-FU2-6)', () => {
  it('esmolol 0.5 mg/kg load + 150 µg/kg/min: AF 130 slows by 20–30 % at 15–20 min', async () => {
    const r = await afFall([{ kind: 'drug', drugId: 'esmolol', dose: 0.5, unit: 'mg/kg', route: 'iv' }, { kind: 'infusion', drugId: 'esmolol', rate: 150, unit: 'mcg/kg/min' }], 1020, 1320);
    console.log(`FU-2 AF 130 + esmolol 150: ${r.before.toFixed(1)} → ${r.after.toFixed(1)} (fall ${r.fall.toFixed(1)} %)`);
    expect(r.fall).toBeGreaterThanOrEqual(20);
    expect(r.fall).toBeLessThanOrEqual(30);
  }, 600_000);
  // Amiodarone's row already carried an AV-nodal entry (Emax 0.3, EC50 1× the 150 mg load) that no consumer read; E-FU2-6
  // only ADDS fields, so its block at the load's peak is 0.15 and AF falls 14.0 % (below the band). Raising that Emax
  // is a calibration-pass change to a 7g row (R44), not FU-2's.
  it.fails('amiodarone 150 mg over 10 min: AF 130 slows by 20–30 % at its peak (10–13 min) (measured 14.0)', async () => {
    const r = await afFall([{ kind: 'drug', drugId: 'amiodarone', dose: 150, unit: 'mg', route: 'iv' }], 720, 900);
    console.log(`FU-2 AF 130 + amiodarone 150 mg: ${r.before.toFixed(1)} → ${r.after.toFixed(1)} (fall ${r.fall.toFixed(1)} %)`);
    expect(r.fall).toBeGreaterThanOrEqual(20);
    expect(r.fall).toBeLessThanOrEqual(30);
  }, 600_000);
});
```

- [ ] **Step 7: Run them to verify they fail**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk/av-node.test.ts test/engine/af-rate-control.test.ts`
Expected: FAIL — `av-node`: esmolol's block is 0 (no entry yet) and the stacked combination blocks only 0.2
(amiodarone alone); `af-rate-control`: esmolol logs `136.3 → 138.4 (fall -1.6 %)` (AF speeds up). The amiodarone
`it.fails` shows as passed (its band is not met: `fall -8.8 %`).

- [ ] **Step 8: Implement**

In `packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts` (E-FU2-6: append one entry per row, change nothing
else), esmolol — find:

```ts
    pd: [{ target: 'betaBlock', emax: 0.9, ec50: 100 }, { target: 'hr', emax: -0.35, ec50: 250 }, { target: 'ees', emax: -0.2, ec50: 250 }],
```

and replace with:

```ts
    pd: [{ target: 'betaBlock', emax: 0.9, ec50: 100 }, { target: 'hr', emax: -0.35, ec50: 250 }, { target: 'ees', emax: -0.2, ec50: 250 }, { target: 'avNode', emax: 0.5, ec50: 150 }], // FU-2 E-FU2-6: AV-nodal block (AF rate control) [ENG]
```

labetalol — find:

```ts
    pd: [{ target: 'betaBlock', emax: 0.6, ec50: 1 }, { target: 'hr', emax: -0.3, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'svr', emax: -0.25, ec50: 1 }],
```

and replace with:

```ts
    pd: [{ target: 'betaBlock', emax: 0.6, ec50: 1 }, { target: 'hr', emax: -0.3, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'svr', emax: -0.25, ec50: 1 }, { target: 'avNode', emax: 0.4, ec50: 2 }], // FU-2 E-FU2-6 [ENG]
```

metoprolol — find:

```ts
    pd: [{ target: 'betaBlock', emax: 0.7, ec50: 1 }, { target: 'hr', emax: -0.3, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }],
```

and replace with:

```ts
    pd: [{ target: 'betaBlock', emax: 0.7, ec50: 1 }, { target: 'hr', emax: -0.3, ec50: 1 }, { target: 'ees', emax: -0.2, ec50: 1 }, { target: 'avNode', emax: 0.5, ec50: 2 }], // FU-2 E-FU2-6 [ENG]
```

(Amiodarone's existing `{ target: 'avNode', emax: 0.3, ec50: 1 }` is NOT changed — E-FU2-6 is additive only; no
digoxin, diltiazem or verapamil rows exist.)

In `packages/engine-core/src/l2/pk/hooks.ts` (E-FU2-7), find:

```ts
import { concOf, type PkState } from './pipeline.ts';
```

and replace with:

```ts
import { concOf, type PkState } from './pipeline.ts';
import { DRUGS } from './data/drugs.ts'; // FU-2 (E-FU2-7)
import { hill } from './pd.ts'; // FU-2 (E-FU2-7)
import type { PdEffect } from './row.ts'; // FU-2 (E-FU2-7)
```

find:

```ts
export function rhythmRequest(
```

and replace with:

```ts
/** FU-2 (E-FU2-7): adenosine's OWN AV-nodal block (its row's avNode entry). The β-blocker and amiodarone rows feed the
 * bus's avNodeBlock too (AF rate control), and stacked rate control must never fire the adenosine pause/conversion. */
const ADEN_AV = DRUGS.adenosine?.pd.find((e) => e.target === 'avNode') as PdEffect;
const adenosineBlock = (pk: PkState) => hill(concOf(pk, 'adenosine'), ADEN_AV.ec50, ADEN_AV.emax, ADEN_AV.hill ?? 1);

export function rhythmRequest(
```

find:

```ts
  const block = pk.bus.avNodeBlock;
```

and replace with:

```ts
  const block = adenosineBlock(pk); // FU-2 (E-FU2-7): was pk.bus.avNodeBlock
```

In `packages/engine-core/src/l2/circ/model.ts`, find:

```ts
    drug?: DrugEffect; betaBlockAdd?: number; // Stage 7g: the PK/PD layer's multipliers
```

and replace with:

```ts
    drug?: DrugEffect; betaBlockAdd?: number; // Stage 7g: the PK/PD layer's multipliers
    avNodeBlock?: number; // FU-2 (AF rate control): the drug bus's AV-nodal block 0–1 (rate-rule.ts)
```

In `packages/engine-core/src/l2/circ/rate-rule.ts`, find:

```ts
// ventricular response moves with sympathetic/vagal tone by a bounded fraction; an atrial-sensing pacemaker (AAI,
```

and replace with:

```ts
// ventricular response moves with sympathetic/vagal tone by a bounded fraction, and falls with the drugs' AV-nodal
// block (β-blockers, amiodarone, adenosine: the drug bus's avNodeBlock); an atrial-sensing pacemaker (AAI,
```

find:

```ts
    return rampValue(m.hrSet, t) * drive;
```

and replace with:

```ts
    return rampValue(m.hrSet, t) * drive * (1 - (m.ext.avNodeBlock ?? 0)); // AF rate control: the drugs' AV-nodal block
```

Merge main (R51 §7): `git fetch origin && git merge origin/main`. In `packages/engine-core/src/engine.ts`, find:

```ts
      circ7g.ext.betaBlockAdd = ps.pk.betaBlockAdd;
```

and replace with:

```ts
      circ7g.ext.betaBlockAdd = ps.pk.betaBlockAdd;
      circ7g.ext.avNodeBlock = ps.pk.bus.avNodeBlock; // FU-2 (AF rate control)
```

In `packages/engine-core/vite.config.ts`, find:

```ts
  'test/engine/circ-rate-rule.test.ts', // FU-2: MODELED rhythm-rate scenarios (2–4 sim-min each)
```

and replace with:

```ts
  'test/engine/circ-rate-rule.test.ts', // FU-2: MODELED rhythm-rate scenarios (2–4 sim-min each)
  'test/engine/af-rate-control.test.ts', // FU-2: AF rate control (13–22 sim-min each)
```

- [ ] **Step 9: Run them to verify they pass; adenosine and the rate rule are unchanged**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk test/l2/circ/rate-rule.test.ts test/engine/af-rate-control.test.ts
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/pk-acceptance-scen.test.ts test/engine/circ-rate-rule.test.ts test/engine/pk-wiring.test.ts
npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck
```

Expected: `av-node` 2 passed; `af-rate-control` logs `136.3 → 99.7 (fall 26.9 %)` for esmolol (band 20–30 % ✓) and
`136.3 → 117.2 (fall 14.0 %)` for amiodarone (its `it.fails` still fails the band → shown as passed; if it ever
reaches 20 %, turn it into `it` and record it in the gate note); the adenosine scenario (7g, pause then sinus ≤ 110)
and every `circ-rate-rule` number unchanged (AF 100 → 101.0, no drug on the bus). Then the fast set: `cd
packages/engine-core && PME_TEST_SET=fast CI=1 npx vitest run; cd ../..` — green.

- [ ] **Step 10: Commit and push**

```bash
git add packages/engine-core/src/l2/pk/data/rows-cardiovascular.ts packages/engine-core/src/l2/pk/hooks.ts packages/engine-core/src/l2/circ/model.ts packages/engine-core/src/l2/circ/rate-rule.ts packages/engine-core/src/engine.ts packages/engine-core/vite.config.ts packages/engine-core/test/l2/pk/av-node.test.ts packages/engine-core/test/engine/af-rate-control.test.ts docs/plans/fu-2-engine-followups.md
git commit -m "feat(pk,circ): AF rate control — β-blocker AV-nodal block slows MODELED AF (esmolol −26.9 %); adenosine hook reads its own block (E-FU2-6/7)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 4: β-agonist mobilisation of unstressed venous volume (dobutamine, NR-7g-2) — one reservoir with the reflex (F4)

**Files:**
- Create: `packages/engine-core/src/l2/circ/venous.ts`
- Modify: `packages/engine-core/src/l2/circ/model.ts` (imports; `ext.betaAgonistU`; the `v0Sv` line of `control()`)
- Modify: `packages/engine-core/src/engine.ts` (one import; one line beside 7g's `ext` lines — E-FU2-1)
- Modify: `packages/engine-core/test/engine/pk-acceptance-pd.test.ts` (the dobutamine `it.fails` title + comment ONLY)
- Test: `packages/engine-core/test/l2/circ/venous.test.ts`

**Interfaces:**
- Consumes: `hill`, `competitiveEc50` (`src/l2/pk/pd.ts`, read-only); `V0_RECRUIT_MAX_ML_KG` (`baroreflex.ts`);
  `ps.pk.bus.agents` (7g `BusAgent.brain`); `m.ext.betaBlockAdd`, `m.prof.betaBlockC`, `m.weightKg`.
- Produces: `BETA_V0_MAX_ML_KG` (= 12), `BETA_V0_AGENTS` (`{ dobutamine: 7 }`), `betaVenousUnits(agents:
  Readonly<Record<string, { brain: number }>>): number`, `betaDV0Ml(u: number, occ: number, weightKg: number):
  number`; `CircModelState.ext.betaAgonistU?: number`. In `control()` the reflex's `dV0` and the β term share the one
  recruitable reservoir: `recruit = max(−V0_RECRUIT_MAX_ML_KG · weightKg, b.dV0 − dv0Beta)` (F4). Epinephrine's and
  isoproterenol's β2 venodilation is out of scope (not listed in `BETA_V0_AGENTS`).

- [ ] **Step 1: Write the failing test** — `packages/engine-core/test/l2/circ/venous.test.ts`:

```ts
// FU-2 item 2 (NR-7g-2): β-adrenergic mobilisation of unstressed venous volume (l2/circ/venous.ts).
import { describe, expect, it } from 'vitest';
import { betaDV0Ml, betaVenousUnits, BETA_V0_MAX_ML_KG } from '../../../src/l2/circ/venous.ts';
import { circCardiacOutput, createCircModel, CTL_DT, RESTING_ENV, stepCircModel } from '../../../src/l2/circ/model.ts';
import { createOut } from '../../../src/l2/circ/circuit.ts';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import { V0_RECRUIT_MAX_ML_KG } from '../../../src/l2/circ/baroreflex.ts';
import { driver, runTo } from '../../helpers/circ.ts';
import type { Command } from '../../../src/types.ts';

describe('β venous mobilisation (NR-7g-2)', () => {
  it('potency: dobutamine Ce / 7 µg/kg/min; other agents are ignored', () => {
    expect(betaVenousUnits({ dobutamine: { brain: 7 } })).toBeCloseTo(1, 12);
    expect(betaVenousUnits({ norepinephrine: { brain: 0.3 }, phenylephrine: { brain: 1 } })).toBe(0);
    expect(betaVenousUnits({})).toBe(0);
  });
  it('volume: Emax = the recruitable reservoir (12 mL/kg), half at u = 1; β occupancy 0.5 doubles the EC50', () => {
    expect(BETA_V0_MAX_ML_KG).toBe(12);
    expect(betaDV0Ml(1, 0, 70)).toBeCloseTo(420, 9);
    expect(betaDV0Ml(1, 0.5, 70)).toBeCloseTo(840 / 3, 9);
    expect(betaDV0Ml(0, 0, 70)).toBe(0);
  });
  it('the control step moves the volume out of the unstressed pool (default 0 leaves the state identical)', () => {
    const step = (u?: number) => {
      const m = createCircModel();
      if (u !== undefined) m.ext.betaAgonistU = u;
      stepCircModel(m, CTL_DT / 2, RESTING_ENV, createOut());
      return m;
    };
    const a = step();
    expect(step(0).p).toEqual(a.p);
    expect(a.p.v0Sv - step(1).p.v0Sv).toBeCloseTo(betaDV0Ml(1, 0, 70), 6);
  });
  it('F4: the β term and the reflex share one reservoir — a 25 % haemorrhage + dobutamine never mobilise more than 12 mL/kg', () => {
    /** Largest unstressed volume moved out of the reservoir (base − current v0Sv, mL) over a bleed of 25 % of the blood
     * volume in 60 s and 4 min after it, reflexes on, with β potency u (1 ≈ dobutamine 7 µg/kg/min at the effect site). */
    const most = (u: number) => {
      const m = createCircModel();
      const dr = driver(m);
      runTo(dr, 30, RESTING_ENV);
      m.vol.push({ rate: (-0.25 * m.prof.bloodVolumeMl) / 60, until: 90 });
      m.ext.betaAgonistU = u;
      let v = 0;
      for (let t = 30.5; t <= 330; t += 0.5) {
        runTo(dr, t, RESTING_ENV);
        v = Math.max(v, m.base.v0Sv - m.p.v0Sv);
      }
      return v;
    };
    const cap = V0_RECRUIT_MAX_ML_KG * 70;
    const reflex = most(0);
    const both = most(1);
    console.log(`FU-2 F4 haemorrhage 25 %: reflex recruits ${reflex.toFixed(0)} mL; + dobutamine (u 1, ${betaDV0Ml(1, 0, 70).toFixed(0)} mL alone) ${both.toFixed(0)} mL (cap ${cap})`);
    expect(reflex + betaDV0Ml(1, 0, 70)).toBeGreaterThan(cap); // unclamped, the two would overdraw the reservoir
    expect(both).toBeLessThanOrEqual(cap + 1e-6);
    expect(both).toBeGreaterThanOrEqual(reflex); // the β term still adds while there is room
  }, 120_000);
  it('closed loop: dobutamine 5 µg/kg/min (7g multipliers) raises CO ≥ 8 points more with the venous term than without', () => {
    const pk = createPkState();
    applyPkCommand(pk, { type: 'applyEvent', event: { kind: 'infusion', drugId: 'dobutamine', rate: 5, unit: 'mcg/kg/min' } } as unknown as Command, 0);
    advancePk(pk, NEUTRAL_PK_CTX, 1200);
    const rise = (venous: boolean) => {
      const m = createCircModel();
      const dr = driver(m);
      /** CO averaged over [a, b] at 20 Hz (a single reading carries the 4 s filter's beat ripple, ±10 %). */
      const coMean = (a: number, b: number) => {
        let sum = 0;
        let n = 0;
        for (let t = a; t < b; t += 0.05, n++) {
          runTo(dr, t, RESTING_ENV);
          sum += circCardiacOutput(m);
        }
        return sum / n;
      };
      const co0 = coMean(30, 60);
      m.ext.drug = pk.fx;
      m.ext.betaAgonistU = venous ? betaVenousUnits(pk.bus.agents) : 0;
      runTo(dr, 360, RESTING_ENV);
      return 100 * (coMean(360, 400) / co0 - 1);
    };
    const without = rise(false);
    const withV = rise(true);
    console.log(`FU-2 dobutamine 5 (circ level, reflexes on): CO +${without.toFixed(1)} % → +${withV.toFixed(1)} % with the β venous term`);
    expect(withV - without).toBeGreaterThanOrEqual(8);
  }, 120_000);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/venous.test.ts`
Expected: FAIL — `Failed to load url ../../../src/l2/circ/venous.ts`. (Once `venous.ts` exists, the F4 `it` fails
alone until the clamp is in: the unclamped sum logs `+ dobutamine … 865 mL (cap 840)`.)

- [ ] **Step 3: Implement** — create `packages/engine-core/src/l2/circ/venous.ts`:

```ts
// FU-2 (NR-7g-2, G7g): β-adrenergic mobilisation of unstressed venous volume. β-stimulation shifts blood out of the
// compliant splanchnic reservoir into the stressed pool (hepatic outflow dilation, Green 1977; the two-compartment
// venous return picture, Caldini 1974; Magder 2016), raising mean systemic filling pressure — so a β-agonist
// raises venous return and not only contractility, which 7a's venous-return-limited circulation needs for the
// tables' dobutamine CO rise (§6.2, sanity CO +20–40 % at 5 µg/kg/min). β-blockade shifts the EC50 competitively,
// as 7g's PD does for the drug's other β targets (l2/pk/combine.ts).
import { competitiveEc50, hill } from '../pk/pd.ts';
import { V0_RECRUIT_MAX_ML_KG } from './baroreflex.ts';

/** Most volume the β mechanism can move out of the unstressed pool, mL/kg: the whole recruitable splanchnic
 * reservoir (≈ 1 L in an adult; Guyton, Magder 2016) — the same physiological bound as the reflexes' recruitment. */
export const BETA_V0_MAX_ML_KG = V0_RECRUIT_MAX_ML_KG;
/** β-agonists with a venous (β2) action and their EC50, in the bus's rate-equivalent unit (µg/kg/min): dobutamine's
 * inotropic EC50 from tables §6.2 [ENG: the same EC50 for the venous action]. */
export const BETA_V0_AGENTS: Readonly<Record<string, number>> = { dobutamine: 7 };

/** β venous potency units Σ Ce/EC50 over the listed agents on the drug bus. */
export function betaVenousUnits(agents: Readonly<Record<string, { brain: number }>>): number {
  let u = 0;
  for (const id in BETA_V0_AGENTS) {
    const a = agents[id];
    if (a) u += Math.max(0, a.brain) / (BETA_V0_AGENTS[id] as number);
  }
  return u;
}

/** Volume (mL) moved from the unstressed to the stressed venous pool at potency u and β occupancy occ. */
export function betaDV0Ml(u: number, occ: number, weightKg: number): number {
  return hill(u, competitiveEc50(1, occ), BETA_V0_MAX_ML_KG * weightKg);
}
```

In `packages/engine-core/src/l2/circ/model.ts`, find:

```ts
import { createBaro, K_PP, stepBaro, type BaroState } from './baroreflex.ts';
```

and replace with:

```ts
import { createBaro, K_PP, stepBaro, V0_RECRUIT_MAX_ML_KG, type BaroState } from './baroreflex.ts'; // FU-2 F4: V0_RECRUIT_MAX_ML_KG
```

find:

```ts
import type { RampState } from '../../l1/ramp.ts'; // FU-2
```

and replace with:

```ts
import type { RampState } from '../../l1/ramp.ts'; // FU-2
import { betaDV0Ml } from './venous.ts'; // FU-2
```

find:

```ts
    drug?: DrugEffect; betaBlockAdd?: number; // Stage 7g: the PK/PD layer's multipliers
```

and replace with:

```ts
    drug?: DrugEffect; betaBlockAdd?: number; // Stage 7g: the PK/PD layer's multipliers
    betaAgonistU?: number; // FU-2 (NR-7g-2): β-agonist venous potency units from the drug bus (venous.ts)
```

find (in `control()`):

```ts
  p.v0Sv = base.v0Sv * (1 - (x.endoDV0Frac ?? 0)) + b.dV0 + de.v0Frac * m.prof.bloodVolumeMl + man.dV0;
```

and replace with:

```ts
  const betaOcc = 1 - (1 - (x.betaBlockAdd ?? 0)) * (1 - m.prof.betaBlockC); // FU-2: as 7g's competitive β shift
  const dv0Beta = betaDV0Ml(x.betaAgonistU ?? 0, betaOcc, m.weightKg); // FU-2 (NR-7g-2)
  const recruit = Math.max(-V0_RECRUIT_MAX_ML_KG * m.weightKg, b.dV0 - dv0Beta); // FU-2 F4: reflex + β share one reservoir
  p.v0Sv = base.v0Sv * (1 - (x.endoDV0Frac ?? 0)) + recruit + de.v0Frac * m.prof.bloodVolumeMl + man.dV0;
```

(If 7c/7e landed first and this line carries more terms, keep them and replace only `+ b.dV0` by `+ recruit`.)

Merge main (R51 §7): `git fetch origin && git merge origin/main`. In `packages/engine-core/src/engine.ts`, find:

```ts
import { heldRate } from './l2/circ/rate-rule.ts'; // FU-2
```

and replace with:

```ts
import { heldRate } from './l2/circ/rate-rule.ts'; // FU-2
import { betaVenousUnits } from './l2/circ/venous.ts'; // FU-2
```

find:

```ts
      circ7g.ext.betaBlockAdd = ps.pk.betaBlockAdd;
```

and replace with:

```ts
      circ7g.ext.betaBlockAdd = ps.pk.betaBlockAdd;
      circ7g.ext.betaAgonistU = betaVenousUnits(ps.pk.bus.agents); // FU-2 (NR-7g-2)
```

In `packages/engine-core/test/engine/pk-acceptance-pd.test.ts`, find:

```ts
  it.fails('dobutamine 5 µg/kg/min: CO +20–40 % (measured +4.2)', async () => {
```

and replace with (the test body and its band stay exactly as they are):

```ts
  // FU-2 item 2 (NR-7g-2): the β venous term (l2/circ/venous.ts, Emax = the 12 mL/kg recruitable reservoir) lifts it to
  // +11.8 % (β-blocked +3.4 %); circ level at rest +17 % (+7.6 % without the term). The rest of the gap is the reflexes
  // returning about half of the mobilised volume (cardiopulmonary + arterial venous limbs) and the ventilated
  // engine's lower venous-return reserve; reaching +20 % needs ≈ 730 mL at 5 µg/kg/min, beyond the ≈ 1 L reservoir.
  it.fails('dobutamine 5 µg/kg/min: CO +20–40 % (measured +11.8 with the FU-2 β venous term)', async () => {
```

If your measured number differs from +11.8 (main moved), put YOUR number in the title and the comment.

- [ ] **Step 4: Run it to verify it passes; the vasopressor bands hold**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/venous.test.ts test/l2/circ/r48-r49-seams.test.ts
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/pk-acceptance-pd.test.ts test/engine/circ-sanity-1.test.ts
npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck
```

Expected: `venous.test.ts` 5 passed, logging `reflex recruits 669 mL; + dobutamine (u 1, 420 mL alone) 840 mL (cap
840)` and `CO +7.6 % → +17.0 %`; seams unchanged (default 0 → identical state);
`pk-acceptance-pd`: every phenylephrine/norepinephrine band passes (13.7/23.4/29.8/34.2 %, 20.2/30.2/40.4 %), the
dobutamine `it.fails` still fails its band (logs `dobutamine 5: CO 11.8 %`) and so shows as passed, the β-blocked
relation passes (`β-blocked 3.4 %`); circ-sanity 1 passes. If the free dobutamine rise ever reaches +20–40 %, the
`it.fails` turns red: change it to `it` and record that in the gate note — do not touch the band.

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/circ/venous.ts packages/engine-core/src/l2/circ/model.ts packages/engine-core/src/engine.ts packages/engine-core/test/l2/circ/venous.test.ts packages/engine-core/test/engine/pk-acceptance-pd.test.ts docs/plans/fu-2-engine-followups.md
git commit -m "feat(circ): β-agonist unstressed-volume mobilisation sharing the reflex's 12 mL/kg reservoir — dobutamine 5 CO +3.9 → +11.8 % (NR-7g-2; band still it.fails)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 5: G7a NR-1 — the pressure-dependent compliance evidence (no C(P) change)

**Files:**
- Modify: `packages/engine-core/test/l2/circ/circuit.test.ts` (one import, one `it`)
- Modify: `packages/engine-core/test/engine/hemo-acceptance.test.ts` (the 5c `it.fails` title + comment ONLY)

**Interfaces:**
- Consumes: `compliance(p: number): number` (`src/l2/hemo/circulation.ts`, read-only; the circuit's `L_compliance`).
- Produces: nothing new. The prototype measured the ruled mechanism (G7a NR-1 option b) four ways; D5 records why no
  C(P) is added. Do NOT add `arterial.ts` or change `circuit.ts` (the numbers below are the reason).

What the prototype did (for the gate note; not to be repeated): `artCompliance(P) = K/(1 + ((P − p0)/p1)²)` with
the Langewouters 1984 arctangent law's Modelflow coefficients (Wesseling 1993: p0 = 76 − 0.89·age, p1 = 57 −
0.44·age; age 40 → 40.4 / 39.4 mmHg), normalised to `WK_C` at 95 mmHg, with the closed-form volume
`K·p1·(atan((P − p0)/p1) − atan(−p0/p1))` in `arterialVolume`. Results (seed 5; baseline −10.9, pre-beat DBP 64.4):
whole range −9.9 (DBP 67.4) but five bands move — pleth−radial foot 101.1 ms (≤ 100), H5 PE CO 4.60 L/min (needs
< 4.21), R46 per-lung split 4.77 (needs < 4.69), H7 tamponade CO fall, phenylephrine 1 µg/kg/min MAP +29.5 %
(30–45); below 95 mmHg only −10.4 (DBP 67.1) with the foot at 100.09 ms; below 80 or 70 mmHg only −11.2 / −11.0;
unphysiological p0 70, p1 20 −8.0. Slower run-off does raise the pre-beat DBP (+1.4–3 mmHg), but the next ejection
then fills a more compliant bed, so SBP barely moves; the missing physics is the elastance heart's filling through
the pause (EDV +5 %), a calibration item.

- [ ] **Step 1: Write the test** — in `packages/engine-core/test/l2/circ/circuit.test.ts`, find:

```ts
import { H_S, P_PL0 } from '../../../src/l2/circ/params.ts';
```

and replace with:

```ts
import { H_S, P_PL0 } from '../../../src/l2/circ/params.ts';
import { compliance } from '../../../src/l2/hemo/circulation.ts'; // FU-2 item 3
```

and append, inside the `describe('circuit ODE', …)` block, after its last `it`:

```ts

  it('FU-2 item 3 (G7a NR-1): arterial compliance already rises as pressure falls — C(P) = C0·e^(−0.01(P − 95)), ×1.42 at 60 mmHg', () => {
    expect(compliance(60) / compliance(95)).toBeCloseTo(Math.exp(0.35), 9);
    expect(compliance(60)).toBeGreaterThan(compliance(80));
    expect(compliance(80)).toBeGreaterThan(compliance(120));
  });
```

- [ ] **Step 2: Run it**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/circ/circuit.test.ts`
Expected: PASS (this pins the existing mechanism; it documents rather than drives a change, so it passes at once —
the one task in this plan without a red step, by D5).

- [ ] **Step 3: Annotate the `it.fails`** — in `packages/engine-core/test/engine/hemo-acceptance.test.ts`, find:

```ts
  // it.fails keeps CI green while flagging the gap; it starts failing (i.e. the band is met) once the ruling lands.
  it.fails('5c. post-PVC potentiation: the next beat SBP is +8–15 mmHg on average over isolated PVCs', () => {
```

and replace with (the body and band stay exactly as they are):

```ts
  // it.fails keeps CI green while flagging the gap; it starts failing (i.e. the band is met) once the ruling lands.
  // FU-2 item 3 (G7a NR-1, option b) measured the ruled mechanism: the circuit's arterial C(P) already rises as pressure
  // falls (Stage 2's C0·e^(−0.01(P − 95))). A sourced Langewouters/Modelflow arctangent law (p0 = 76 − 0.89·age,
  // p1 = 57 − 0.44·age at 40 y) gives −9.9 mmHg and moves five calibrated 7a/7g bands (PE CO, tamponade CO, R46 lung
  // split, phenylephrine 1 µg/kg/min 29.5 %, pleth−radial foot 101 ms); the same law below 95 mmHg only gives −10.4 and
  // still breaks the foot band (100.1 ms); below 80 or 70 mmHg only: −11.2 / −11.0; even an unphysiological p0 70,
  // p1 20 reaches −8.0. Slower run-off raises the pre-beat DBP by 1.4–3 mmHg, but the ejection then fills a more
  // compliant bed, so SBP barely moves. The mechanism cannot reach +8–15; the gap is the elastance heart's filling
  // through the pause (EDV +5 %). C(P) stays Stage 2's; measured −10.9 (seed 5). Calibration pass (R44).
  it.fails('5c. post-PVC potentiation: the next beat SBP is +8–15 mmHg on average over isolated PVCs (measured −10.9; FU-2 item 3)', () => {
```

- [ ] **Step 4: Run it**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/hemo-acceptance.test.ts`
Expected: PASS (all tests; 5c still fails its band and is reported as passed).

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/test/l2/circ/circuit.test.ts packages/engine-core/test/engine/hemo-acceptance.test.ts docs/plans/fu-2-engine-followups.md
git commit -m "test(circ): G7a NR-1 — pin the existing C(P); post-PVC it.fails carries the compliance-mechanism evidence" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 6: The running rhythm on the 1 Hz `state` event

**Files:**
- Modify: `packages/engine-core/src/l2/ecg/rhythms.ts` (import; append `effectiveRateBpm`)
- Modify: `packages/engine-core/src/types-hemo.ts` (import; `state.rhythm?`)
- Modify: `packages/engine-core/src/l2/hemo/pipeline.ts` (imports; `RhythmView.opts`; the `state` push)
- Test: `packages/engine-core/test/engine/state-rhythm.test.ts`

**Interfaces:**
- Consumes: `RHYTHMS`, `DEFAULT_FLUTTER_ATRIAL_BPM` (same file); `ctx.rhythm` (the engine passes `ps.rhythm`, a
  `RhythmState`, which carries `opts`); `rampValue(ctx.hr, t)`.
- Produces: `effectiveRateBpm(id: RhythmId, opts: RhythmOpts, hr: number): number`; the `state` event field
  `rhythm?: { id: RhythmId; rateBpm: number }` (engine `HemoEvent`); `RhythmView.opts?: RhythmOpts`. Task 7 consumes
  the field.

- [ ] **Step 1: Write the failing test** — `packages/engine-core/test/engine/state-rhythm.test.ts`:

```ts
// FU-2 item 4 (G-FU1 item 6): the 1 Hz `state` event carries the running rhythm (id + effective rate), so controllers
// follow rhythm changes the engine makes on its own (shock outcome, drug conversion).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { effectiveRateBpm } from '../../src/l2/ecg/rhythms.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, devRig } from '../helpers/device.ts';

type State = Extract<EngineEvent, { type: 'state' }>;
const lastState = (ev: EngineEvent[]) => ev.filter((x): x is State => x.type === 'state').pop()!;
const defib = (action: string) => cmd({ type: 'applyEvent', event: { kind: 'defib', action } });

describe('state event rhythm (FU-2 item 4)', () => {
  it('effectiveRateBpm: rate-driven rhythms clamp the hr value to their range; flutter = atrial/ratio; arrest and VF 0', () => {
    expect(effectiveRateBpm('sinus', {}, 72)).toBe(72);
    expect(effectiveRateBpm('sinusBrady', {}, 72)).toBe(59);
    expect(effectiveRateBpm('svtAvnrt', {}, 180)).toBe(180);
    expect(effectiveRateBpm('aflutter', { ratio: 4 }, 0)).toBe(75);
    expect(effectiveRateBpm('aflutter', { atrialRateBpm: 280, ratio: 'variable' }, 0)).toBeCloseTo(280 / 3, 9);
    for (const id of ['vfCoarse', 'asystole', 'pWaveAsystole'] as const) expect(effectiveRateBpm(id, {}, 80)).toBe(0);
  });
  it('the state event names the rhythm and its rate, and follows instructor changes', () => {
    const e = createEngine({ seed: 3 });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    e.advanceTo(3);
    expect(lastState(ev).rhythm).toEqual({ id: 'sinus', rateBpm: 75 });
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'svtAvnrt', opts: { rateBpm: 180 } }));
    e.advanceTo(5);
    expect(lastState(ev).rhythm).toEqual({ id: 'svtAvnrt', rateBpm: 180 });
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'aflutter', opts: { ratio: 4 } }));
    e.advanceTo(7);
    expect(lastState(ev).rhythm).toEqual({ id: 'aflutter', rateBpm: 75 });
  });
  it('an engine-initiated change (VF → shock → asystole, zoll-like seed 4) reaches the state event with no command', () => {
    const { e, ev } = devRig('zoll-like', { seed: 4 });
    e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
    e.dispatch(defib('charge'));
    e.advanceTo(6);
    expect(lastState(ev).rhythm).toEqual({ id: 'vfCoarse', rateBpm: 0 });
    e.dispatch(defib('shock'));
    e.advanceTo(20);
    const status = ev.filter((x): x is Extract<EngineEvent, { type: 'deviceStatus' }> => x.type === 'deviceStatus').pop()!;
    expect(status.defib!.lastShock!.outcome).toBe('asystole');
    expect(lastState(ev).rhythm).toEqual({ id: 'asystole', rateBpm: 0 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/state-rhythm.test.ts`
Expected: FAIL — `effectiveRateBpm is not a function` / `does not provide an export named 'effectiveRateBpm'`.

- [ ] **Step 3: Implement**

In `packages/engine-core/src/l2/ecg/rhythms.ts`, find:

```ts
import type { RhythmGroup, RhythmId } from '../../types.ts';
```

and replace with:

```ts
import type { RhythmGroup, RhythmId, RhythmOpts } from '../../types.ts';
```

and append at the end of the file:

```ts

/**
 * FU-2 (G-FU1 item 6): the rate the hr ramp drives when it reads `hr` — rate-driven rhythms clamp it to their range
 * (as rhythmRate does), so it is the ventricular rate where every beat conducts, but the hr-driven ATRIAL (sinus) rate
 * for the 2:1, high-grade and Mobitz blocks (their conducted ventricular rate is lower); flutter conducts its atrial
 * rate at the ratio (variable counts as 3:1, as the engine's startRate); arrest rhythms and VF run at 0. Published on
 * the 1 Hz `state` event.
 */
export function effectiveRateBpm(id: RhythmId, opts: RhythmOpts, hr: number): number {
  const d = RHYTHMS[id];
  if (d.atria === 'flutter') {
    const r = opts.ratio ?? 2;
    return (opts.atrialRateBpm ?? DEFAULT_FLUTTER_ATRIAL_BPM) / (r === 'variable' ? 3 : r);
  }
  if (d.rateDrives === 'none') return 0;
  return Math.min(d.rateRange[1], Math.max(d.rateRange[0], hr));
}
```

In `packages/engine-core/src/types-hemo.ts`, find:

```ts
import type { Ramp, SimSeconds, StateVar } from './types.ts';
```

and replace with:

```ts
import type { Ramp, RhythmId, SimSeconds, StateVar } from './types.ts';
```

find:

```ts
      values: Partial<Record<StateVar, number>>; control: Partial<Record<StateVar, ControlFlag>>;
    }; // the brief §7.3 `alarm` event (NIBP INOP) is Stage 5's copy in types.ts
```

and replace with:

```ts
      values: Partial<Record<StateVar, number>>; control: Partial<Record<StateVar, ControlFlag>>;
      rhythm?: { id: RhythmId; rateBpm: number }; // FU-2 (G-FU1 item 6): the running rhythm, engine-initiated changes included
    }; // the brief §7.3 `alarm` event (NIBP INOP) is Stage 5's copy in types.ts
```

In `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
import type { ChannelId, Command, EngineEvent, Measured, NumericId, PatientProfile, Ramp, StateVar } from '../../types.ts';
```

and replace with:

```ts
import type { ChannelId, Command, EngineEvent, Measured, NumericId, PatientProfile, Ramp, RhythmId, RhythmOpts, StateVar } from '../../types.ts';
```

find:

```ts
import { modeledHrRequest } from '../circ/rate-rule.ts'; // FU-2
```

and replace with:

```ts
import { modeledHrRequest } from '../circ/rate-rule.ts'; // FU-2
import { effectiveRateBpm } from '../ecg/rhythms.ts'; // FU-2
```

find:

```ts
export interface RhythmView {
  id: string;
  records: readonly EngineEvent[];
}
```

and replace with:

```ts
export interface RhythmView {
  id: string;
  records: readonly EngineEvent[];
  opts?: RhythmOpts; // FU-2: for the state event's effective rate
}
```

find:

```ts
  hs.out.push({ type: 'state', t, tick: Math.round(t * 50), mode: ctx.l1.mode, values, control: flags });
```

and replace with:

```ts
  const rid = ctx.rhythm.id as RhythmId; // FU-2 (G-FU1 item 6): controllers follow engine-initiated rhythm changes
  const rhythm = { id: rid, rateBpm: Math.round(effectiveRateBpm(rid, ctx.rhythm.opts ?? {}, rampValue(ctx.hr, t)) * 10) / 10 };
  hs.out.push({ type: 'state', t, tick: Math.round(t * 50), mode: ctx.l1.mode, values, control: flags, rhythm });
```

- [ ] **Step 4: Run it to verify it passes**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/state-rhythm.test.ts test/engine/hemo-engine.test.ts test/engine/engine-seams.test.ts test/engine/defib-engine.test.ts
npx -y pnpm@9.15.9 typecheck
```

Expected: 3 new tests pass; the existing state-event and defib tests pass; the whole workspace typechecks (the
renderer, demo and controller read `state` without the new optional field).

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/ecg/rhythms.ts packages/engine-core/src/types-hemo.ts packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/engine/state-rhythm.test.ts docs/plans/fu-2-engine-followups.md
git commit -m "feat(engine): the 1 Hz state event carries the running rhythm and its effective rate (G-FU1 item 6)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 7: Controllers follow engine-initiated rhythm changes

**Files:**
- Modify: `packages/controller/src/protocol.ts` (one optional field — E-FU2-3)
- Modify: `packages/controller/src/session/controller-session.ts` (the `state` branch of `onEvent`; a doc comment)
- Test: `packages/controller/test/panel/controls-follow-shock.dom.test.ts`

**Interfaces:**
- Consumes: the engine `state.rhythm` (Task 6); the panel's existing follow logic (`render-controls.ts` updates the
  rhythm select from `ControllerSession.rhythm` unless focused — FU-1, untouched).
- Produces: `StateEvent.rhythm?: { id: RhythmId; rateBpm: number }` on the wire type; `ControllerSession.rhythm` set
  from every engine `state` event that carries it.

- [ ] **Step 1: Write the failing test** — `packages/controller/test/panel/controls-follow-shock.dom.test.ts`:

```ts
// @vitest-environment happy-dom
// FU-2 item 4 (G-FU1 item 6): the 1 Hz `state` event carries the running rhythm, so the panel follows a rhythm change
// the ENGINE makes on its own — a shock outcome emits neither a setRhythm commandApplied nor (for asystole) a
// rhythmSegment.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { mountInstructorPanel } from '../../src/panel/panel.ts';
import { stage1Vocabulary } from '../../src/vocabulary.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';

let cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
  document.body.replaceChildren();
});

describe('controls follow an engine-initiated rhythm change (FU-2 item 4)', () => {
  it('VF → shock → asystole (zoll-like, seed 4): ControllerSession.rhythm and the panel select show asystole', async () => {
    const host = manualHost({ seed: 4, device: { skin: 'zoll-like' } });
    const outcomes: string[] = [];
    host.on((e) => {
      const s = e as { type: string; defib?: { lastShock?: { outcome: string } } };
      if (s.type === 'deviceStatus' && s.defib?.lastShock) outcomes.push(s.defib.lastShock.outcome);
    });
    const hub = createInProcessHub();
    const hs = new HostSession({ session: 'FQW235', target: host, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const panelS = new ControllerSession({ session: 'FQW235', transport: hub.connect() });
    await waitFor(() => panelS.hostOnline);
    const panel = mountInstructorPanel(document.body, { session: panelS, vocabulary: stage1Vocabulary() });
    cleanup.push(() => panel.destroy(), () => panelS.close(), () => hs.close());
    const select = () => panel.el.querySelector('select[name=rhythm]') as HTMLSelectElement;

    await panelS.send({ type: 'setRhythm', rhythm: 'vfCoarse' });
    await panelS.send({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } });
    host.advance(6000);
    await waitFor(() => select().value === 'vfCoarse');
    await panelS.send({ type: 'applyEvent', event: { kind: 'defib', action: 'shock' } });
    host.advance(14_000);
    expect(outcomes.at(-1)).toBe('asystole'); // the seed's drawn outcome (engine defib-engine test, seed 4)
    await waitFor(() => panelS.rhythm === 'asystole', 2000, 'session rhythm');
    await waitFor(() => select().value === 'asystole', 2000, 'panel select');
    expect(panelS.state?.rhythm).toEqual({ id: 'asystole', rateBpm: 0 });
  }, 60_000);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/panel/controls-follow-shock.dom.test.ts`
Expected: FAIL — `timed out waiting for session rhythm` (the outcome assertion before it passes: the shock drew
`asystole`; asystole emits no `rhythmSegment` and no command, so the session still says `vfCoarse`).

- [ ] **Step 3: Implement**

In `packages/controller/src/protocol.ts`, find:

```ts
      type: 'state'; t: SimSeconds; tick: Tick; mode: 'manual' | 'modeled';
      values: Partial<Record<StateVar, number>>; control: Partial<Record<StateVar, ControlFlag>>;
    }
```

and replace with:

```ts
      type: 'state'; t: SimSeconds; tick: Tick; mode: 'manual' | 'modeled';
      values: Partial<Record<StateVar, number>>; control: Partial<Record<StateVar, ControlFlag>>;
      rhythm?: { id: RhythmId; rateBpm: number }; // FU-2: the engine's running rhythm (absent from a host-synthesised state)
    }
```

In `packages/controller/src/session/controller-session.ts`, find:

```ts
  /** The host's current rhythm (FU-1): from `rhythmSegment` events and applied `setRhythm` commands; null until seen. */
```

and replace with:

```ts
  /** The host's current rhythm (FU-1): from `rhythmSegment` events, applied `setRhythm` commands and (FU-2) the 1 Hz `state` event; null until seen. */
```

find:

```ts
    if (e.type === 'state') this.state = e;
```

and replace with:

```ts
    if (e.type === 'state') {
      this.state = e;
      if (e.rhythm) this.rhythm = e.rhythm.id; // FU-2: engine-initiated changes (shock outcome, drug conversion) too
    }
```

(the `else if (e.type === 'rhythmSegment')` line that follows stays as it is).

- [ ] **Step 4: Run it to verify it passes; the FU-1 follow tests still pass**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/controller exec vitest run test/panel/controls-follow-shock.dom.test.ts test/panel/controls-follow.dom.test.ts test/session
npx -y pnpm@9.15.9 --filter @pme/controller typecheck
```

Expected: PASS — the new test (≈ 150 ms) and every FU-1 follow/session test.

- [ ] **Step 5: Commit and push**

```bash
git add packages/controller/src/protocol.ts packages/controller/src/session/controller-session.ts packages/controller/test/panel/controls-follow-shock.dom.test.ts docs/plans/fu-2-engine-followups.md
git commit -m "feat(controller): the session follows the state event's rhythm — a shock outcome updates the panel select" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 8: saadat-like's declared 8 s moving-average HR becomes its default

**Files:**
- Modify: `packages/engine-core/src/l3/hr.ts` (`hrAveragingOf`, one constant)
- Modify: `packages/engine-core/test/l3/hr-averaging.test.ts` (the skin-field test; one new `it`)
- Test: `packages/engine-core/test/engine/hr-skin-averaging.test.ts`

**Interfaces:**
- Consumes: `resolveSkin(id).skin.hr` (`method`, `windowDefault`, optional `averaging`); the engine's cached
  `hrAveraging()` (unchanged: it already calls `hrAveragingOf` per skin).
- Produces: `MOVING_AVERAGE_DEFAULT_S = 8`; `hrAveragingOf(skin: { hr: { averaging?: HrAveraging; method?: string;
  windowDefault?: number | null } }): HrAveraging | undefined`.

- [ ] **Step 1: Write the failing tests**

Create `packages/engine-core/test/engine/hr-skin-averaging.test.ts`:

```ts
// FU-2 item 5: saadat-like's declared 8 s moving-average HR is now its default (G-FU1 observation). Pinned numbers:
// a 60 → 120 bpm step (no HRV) read once per second. Before FU-2 saadat-like read the trimmed mean of 12 RR, exactly as
// philips-like: 60, 67, 75, 86, 100, 120 at +2…+7 s (settled at +7 s); now an 8 s window: settled at +10 s.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

/** HR readings at +2 … +10 s after an instant 60 → 120 step at 30 s. */
function stepSeries(skin: string): (number | null)[] {
  const e = createEngine({ seed: 3, device: { skin }, patient: { baseline: { hr: 60 } } });
  e.dispatch(cmd({ type: 'setModifiers', modifiers: { hrvScale: 0 } }));
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(30);
  e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 120 }));
  e.advanceTo(41);
  const at = new Map<number, number | null>();
  for (const x of ev) if (x.type === 'measurement' && x.values.hr) at.set(Math.round(x.t), x.values.hr.value);
  return [32, 33, 34, 35, 36, 37, 38, 39, 40].map((t) => at.get(t) ?? null);
}

describe('saadat-like 8 s HR averaging (FU-2 item 5)', () => {
  it('saadat-like: 64, 71, 78, 85, 92, 99, 106, 113, 120 at +2 … +10 s (8 s moving average)', () => {
    expect(stepSeries('saadat-like')).toEqual([64, 71, 78, 85, 92, 99, 106, 113, 120]);
  });
  it('philips-like is unchanged: 60, 67, 75, 86, 100, 120 … (trimmed mean of 12 RR)', () => {
    expect(stepSeries('philips-like')).toEqual([60, 67, 75, 86, 100, 120, 120, 120, 120]);
  });
});
```

In `packages/engine-core/test/l3/hr-averaging.test.ts`, find:

```ts
  it('skin field: optional, validated, and absent from every shipped skin (defaults unchanged)', () => {
    for (const id of ['philips-like', 'saadat-like', 'zoll-like', 'ge-like', 'mindray-like', 'lifepak-like']) expect(hrAveragingOf(resolveSkin(id).skin)).toBeUndefined();
```

and replace with:

```ts
  it('skin field: optional and validated; only saadat-like (declared moving average) averages by default (FU-2 item 5)', () => {
    for (const id of ['philips-like', 'zoll-like', 'ge-like', 'mindray-like', 'lifepak-like']) expect(hrAveragingOf(resolveSkin(id).skin)).toBeUndefined();
    expect(resolveSkin('saadat-like').skin.hr.method).toBe('moving-average-seconds');
    expect(hrAveragingOf(resolveSkin('saadat-like').skin)).toEqual({ kind: 'seconds', n: 8 });
```

and append, inside the `describe('HR averaging option (E-4a-2)', …)` block after its last `it`:

```ts

  it("FU-2 item 5: 'moving-average-seconds' maps to its declared windowDefault; an explicit averaging field wins", () => {
    const hr = (over: Record<string, unknown>) => ({ hr: { method: 'moving-average-seconds', windowDefault: 8, ...over } });
    expect(hrAveragingOf(hr({}))).toEqual({ kind: 'seconds', n: 8 });
    expect(hrAveragingOf(hr({ windowDefault: 16 }))).toEqual({ kind: 'seconds', n: 16 });
    expect(hrAveragingOf(hr({ windowDefault: null }))).toEqual({ kind: 'seconds', n: 8 });
    expect(hrAveragingOf(hr({ averaging: { kind: 'beats', n: 4 } }))).toEqual({ kind: 'beats', n: 4 });
    expect(hrAveragingOf({ hr: { method: 'trimmed-mean-12rr' } })).toBeUndefined();
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3/hr-averaging.test.ts test/engine/hr-skin-averaging.test.ts`
Expected: FAIL — saadat-like reads `[60, 67, 75, 86, 100, 120, 120, 120, 120]` (the trimmed mean, same as
philips-like; the "before" numbers of the gate note) and `hrAveragingOf` returns `undefined` for the moving-average
cases; philips-like passes.

- [ ] **Step 3: Implement** — in `packages/engine-core/src/l3/hr.ts`, find:

```ts
/** The skin's HR averaging option, or undefined (the default method). */
export function hrAveragingOf(skin: { hr: { averaging?: HrAveraging } }): HrAveraging | undefined {
  return skin.hr.averaging;
}
```

and replace with:

```ts
/** Window a skin declaring `method: 'moving-average-seconds'` uses when it names no `windowDefault` (s). */
export const MOVING_AVERAGE_DEFAULT_S = 8;

/**
 * The skin's HR averaging option, or undefined (the default method). An explicit `averaging` wins; otherwise a skin
 * that declares `method: 'moving-average-seconds'` (saadat-like) gets the time window it declares as its default
 * (FU-2 item 5: saadat-like's 8 s).
 */
export function hrAveragingOf(skin: { hr: { averaging?: HrAveraging; method?: string; windowDefault?: number | null } }): HrAveraging | undefined {
  if (skin.hr.averaging) return skin.hr.averaging;
  if (skin.hr.method === 'moving-average-seconds') return { kind: 'seconds', n: skin.hr.windowDefault ?? MOVING_AVERAGE_DEFAULT_S };
  return undefined;
}
```

- [ ] **Step 4: Run them to verify they pass**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l3 test/engine/hr-skin-averaging.test.ts test/engine/alarms-engine.test.ts
npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck
```

Expected: PASS — saadat-like `[64, 71, 78, 85, 92, 99, 106, 113, 120]` (settles at +10 s, was +7 s), philips-like
unchanged; the rest of `test/l3` and the alarm-engine tests pass.

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l3/hr.ts packages/engine-core/test/l3/hr-averaging.test.ts packages/engine-core/test/engine/hr-skin-averaging.test.ts docs/plans/fu-2-engine-followups.md
git commit -m "feat(hr): saadat-like's declared 8 s moving-average HR is its default (settles +10 s, was +7 s)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 9: MANUAL `contractility` acts — through the set-and-hold pressure tracker (item 7)

**Files:**
- Modify: `packages/engine-core/src/l2/hemo/pipeline.ts` (`trackCircBeat`; the MANUAL tracker `key`)
- Test: `packages/engine-core/test/engine/circ-manual-contractility.test.ts`

**Interfaces:**
- Consumes: L1 `contractility` (MANUAL target, default 1, range 0.1–2 — `l1/state.ts`, unchanged); `hs.circ.man.{eesF,
  eesRvF}`; `trackBeat(tr, b, target, pFloor, lim, gCap)` (`l2/hemo/tracker.ts`, unchanged).
- Produces: in MANUAL, contractility c ≠ 1 ⇒ `man.eesF = man.eesRvF = c` every reference beat (even while the pressure
  tracker holds), the tracker's g pinned to c (limits `gMin = gMax = c`), R alone re-solved; c = 1 ⇒ the unchanged
  Stage 7a path. `svr` stays derived (D9).

- [ ] **Step 1: Write the failing test** — `packages/engine-core/test/engine/circ-manual-contractility.test.ts`:

```ts
// FU-2 item 7 (G7d R-7D-5b): in MANUAL an instructor `contractility` (≠ 1) is both ventricles' Emax factor. The
// set-and-hold pressure tracker then holds MAP with the systemic resistance alone, so CO follows the heart, SVR (derived)
// rises and pulse pressure narrows; contractility 1 (the default) leaves the tracker exactly as before.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

const yieldNow = () => new Promise((r) => setImmediate(r));
const m = (a: number[]) => a.reduce((p, q) => p + q, 0) / Math.max(1, a.length);

/** MANUAL at HR 80: targets from 20 s, contractility (if not 1) with them; means over 150–180 s. */
async function manual(c: number, sbp: number, dbp: number, cvp: number) {
  const e = createEngine({ seed: 4, patient: { baseline: { hr: 80 }, sensors: { abp: 'connected', cvp: 'connected' } } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.advanceTo(20);
  e.dispatch(cmd({ type: 'setTarget', variable: 'sbp', value: sbp }));
  e.dispatch(cmd({ type: 'setTarget', variable: 'dbp', value: dbp }));
  e.dispatch(cmd({ type: 'setTarget', variable: 'cvp', value: cvp }));
  if (c !== 1) e.dispatch(cmd({ type: 'setTarget', variable: 'contractility', value: c }));
  for (let t = 60; t <= 180; t += 60) {
    e.advanceTo(t);
    await yieldNow();
  }
  const late = <T extends EngineEvent['type']>(type: T) => ev.filter((x) => x.type === type && (x as { t: number }).t > 150) as Extract<EngineEvent, { type: T }>[];
  const abp = late('measurement').filter((x) => x.values.abpMean?.value != null);
  const r = {
    co: m(late('circ').map((x) => x.co)),
    sys: m(abp.map((x) => x.values.abpSys!.value as number)),
    dia: m(abp.map((x) => x.values.abpDia!.value as number)),
    map: m(abp.map((x) => x.values.abpMean!.value as number)),
    svr: m(late('state').map((x) => x.values.svr as number)),
  };
  console.log(`FU-2 MANUAL contractility ${c} at ${sbp}/${dbp}, CVP ${cvp}: CO ${r.co.toFixed(2)}, ABP ${r.sys.toFixed(0)}/${r.dia.toFixed(0)} (${r.map.toFixed(0)}), SVR ${r.svr.toFixed(2)}`);
  return r;
}

describe('MANUAL contractility acts through the trackers (FU-2 item 7)', () => {
  it('contractility 0.5 at 110/70: CO falls ≥ 20 %, MAP held (± 5), SVR rises, pulse pressure narrows', async () => {
    const a = await manual(1, 110, 70, 6);
    const b = await manual(0.5, 110, 70, 6);
    expect(b.co).toBeLessThanOrEqual(0.8 * a.co);
    expect(Math.abs(b.map - a.map)).toBeLessThanOrEqual(5);
    expect(b.svr).toBeGreaterThan(a.svr * 1.2);
    expect(b.sys - b.dia).toBeLessThan(a.sys - a.dia);
  }, 300_000);
  it('the low-output premise of tables §7 check 20 is reachable: contractility 0.3, CVP 12, 85/55 → MAP 60–72, CO ≤ 4 L/min', async () => {
    const r = await manual(0.3, 85, 55, 12);
    expect(r.map).toBeGreaterThanOrEqual(60);
    expect(r.map).toBeLessThanOrEqual(72);
    expect(r.co).toBeLessThanOrEqual(4);
  }, 300_000);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-manual-contractility.test.ts`
Expected: FAIL — contractility is ignored: CO at 0.5 equals CO at 1 (≈ 6.8 L/min), and the check-20 case reads CO
≈ 6.4 with MAP ≈ 55–60 (the tracker restores Ees and saturates R).

- [ ] **Step 3: Implement** — in `packages/engine-core/src/l2/hemo/pipeline.ts`, find:

```ts
function trackCircBeat(hs: HemoState, ctx: HemoCtx, b: SiteBeatStat): void {
  const target = { sbp: l1Value(ctx.l1, 'sbp', b.t), dbp: l1Value(ctx.l1, 'dbp', b.t) };
  const tr = hs.manHold;
  if (!tr.pActive) return; // set-and-hold (see HemoState.manHold)
```

and replace with:

```ts
function trackCircBeat(hs: HemoState, ctx: HemoCtx, b: SiteBeatStat): void {
  const target = { sbp: l1Value(ctx.l1, 'sbp', b.t), dbp: l1Value(ctx.l1, 'dbp', b.t) };
  const tr = hs.manHold;
  // FU-2 item 7: an instructor contractility (≠ 1) IS both ventricles' Emax factor; the tracker then holds MAP with the
  // systemic resistance alone and pulse pressure (and CO) follow the heart — low output narrows PP, SVR rises (derived)
  const cT = l1Value(ctx.l1, 'contractility', b.t);
  const cOwned = Math.abs(cT - 1) > 1e-9;
  if (cOwned || hs.circ.man.eesRvF !== 1) hs.circ.man.eesRvF = cT;
  if (cOwned) hs.circ.man.eesF = cT;
  if (!tr.pActive) return; // set-and-hold (see HemoState.manHold)
```

find:

```ts
  trackBeat(hs.sys, b, target, hs.circOut.pSv, CIRC_LIMITS, CIRC_LIMITS.gMax);
```

and replace with:

```ts
  trackBeat(hs.sys, b, target, hs.circOut.pSv, cOwned ? { ...CIRC_LIMITS, gMin: cT, gMax: cT } : CIRC_LIMITS, cOwned ? cT : CIRC_LIMITS.gMax); // FU-2 item 7
```

and find (the MANUAL 10 Hz block):

```ts
      const key = `${Math.round(l1Value(ctx.l1, 'sbp', t1) * 10)}/${Math.round(l1Value(ctx.l1, 'dbp', t1) * 10)}/${Math.round(rampValue(ctx.hr, t1) * 10)}/${ctx.rhythm.id}`;
```

and replace with:

```ts
      const key = `${Math.round(l1Value(ctx.l1, 'sbp', t1) * 10)}/${Math.round(l1Value(ctx.l1, 'dbp', t1) * 10)}/${Math.round(rampValue(ctx.hr, t1) * 10)}/${ctx.rhythm.id}/${Math.round(l1Value(ctx.l1, 'contractility', t1) * 100)}`; // FU-2 item 7: contractility
```

(If 7d landed first and added to this key, keep its additions and append the contractility term.)

- [ ] **Step 4: Run it to verify it passes; the MANUAL bands are unchanged**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/engine/circ-manual-contractility.test.ts test/engine/circ-manual.test.ts test/engine/hemo-acceptance.test.ts test/engine/hemo-engine.test.ts test/l1 test/l2/hemo
npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck
```

Expected: the new file passes, logging `contractility 1 … CO 6.82, ABP 112/71 (85), SVR 0.64`, `contractility 0.5 …
CO 4.74, ABP 102/77 (87), SVR 0.96`, `contractility 0.3 at 85/55, CVP 12: CO 3.28, ABP 76/62 (68)`; the 90/50 ramp
tests (hemo-acceptance 3, circ-manual), the transducer test and the `svr is derived` rejections pass unchanged.

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/hemo/pipeline.ts packages/engine-core/test/engine/circ-manual-contractility.test.ts docs/plans/fu-2-engine-followups.md
git commit -m "feat(hemo): MANUAL contractility is the Emax factor; the tracker holds MAP with resistance — CO follows the heart (FU-2 item 7)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 10: Volatile cerebral blood flow per tables §5.1 — `cbfVaso` is the direct factor (item 8, 7g; F3)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/row.ts` (`CnsSpec`: two optional fields)
- Modify: `packages/engine-core/src/l2/pk/combine.ts` (`volatileCbfDirect`; the CNS loop's CMRO2 line)
- Modify: `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts` (sevoflurane and isoflurane rows only)
- Test: `packages/engine-core/test/l2/pk/volatile-cbf.test.ts`

**Interfaces:**
- Consumes: `combine(actives, ctx)`; a volatile's active concentration `c` = its age-adjusted MAC fraction (7g's
  pipeline pushes `{ row, c: macFrac }`).
- Produces: `CnsSpec.cmro2PerMac?: number`, `CnsSpec.cbfDirect?: readonly [number, number]`, `volatileCbfDirect(mac:
  number, direct: readonly [number, number]): number`; `bus.cns.cmro2Mult` (the tables' per-MAC CMRO2) and
  `bus.cns.cbfVaso` = the tables' DIRECT CBF factor (Matta 1999, beyond coupling; 1.17 / 1.72 at 1.5 MAC). NET CBF is
  7d's product: direct × its CMRO2 coupling (7f's `cmro2Mult` when present) — D10; Q-FU2-CBF is Ali's.

- [ ] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/volatile-cbf.test.ts`:

```ts
// FU-2 item 8 (G7d R-7D-3, tables §5.1): the volatile's cerebral effect on 7g's bus — CMRO2 falls per MAC, and `cbfVaso`
// carries the DIRECT vasodilation beyond flow–metabolism coupling (Matta 1999, MCA velocity under an isoelectric EEG):
// sevoflurane +4 % / +17 %, isoflurane +19 % / +72 % at 0.5 / 1.5 MAC (was a linear 1.10 / 1.30 and 1.20 / 1.60).
// NET CBF is 7d's product of this direct factor × its CMRO2 coupling.
import { describe, expect, it } from 'vitest';
import { combine, volatileCbfDirect, type PdContext } from '../../../src/l2/pk/combine.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';

const CTX: PdContext = { ph: 7.4, betaBlockC: 0, vasoResp: 1, ageY: 40, macBrain: 0 };
const cns = (id: string, mac: number) => combine([{ row: DRUGS[id] as DrugRow, c: mac }], { ...CTX, macBrain: mac }).bus.cns;

describe('volatile CBF on the drug bus (FU-2 item 8)', () => {
  it('direct CBF (cbfVaso) at 0.5 / 1.5 MAC: sevoflurane 1.04 / 1.17, isoflurane 1.19 / 1.72 — no division by the CMRO2 share', () => {
    expect(cns('sevoflurane', 0.5).cbfVaso).toBeCloseTo(1.04, 9);
    expect(cns('sevoflurane', 1.5).cbfVaso).toBeCloseTo(1.17, 9);
    expect(cns('isoflurane', 0.5).cbfVaso).toBeCloseTo(1.19, 9);
    expect(cns('isoflurane', 1.5).cbfVaso).toBeCloseTo(1.72, 9);
  });
  it('CMRO2 per tables §5.1: sevoflurane ×(1 − 0.25·MAC), isoflurane ×(1 − 0.3·MAC), floor 0.5', () => {
    expect(cns('sevoflurane', 1.5).cmro2Mult).toBeCloseTo(0.625, 9);
    expect(cns('isoflurane', 1.5).cmro2Mult).toBeCloseTo(0.55, 9);
    expect(cns('isoflurane', 2.5).cmro2Mult).toBeCloseTo(0.5, 9);
  });
  it('no volatile → neutral; the direct curve is continuous at 0.5 MAC', () => {
    expect(combine([], CTX).bus.cns.cbfVaso).toBe(1);
    expect(volatileCbfDirect(0.5, [0.04, 0.17])).toBeCloseTo(1.04, 12);
    expect(volatileCbfDirect(0.5 + 1e-9, [0.04, 0.17])).toBeCloseTo(1.04, 6);
    expect(volatileCbfDirect(0, [0.04, 0.17])).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk/volatile-cbf.test.ts`
Expected: FAIL — `volatileCbfDirect` is not exported (and, once it is, the old rows' linear `cbfVaso` gives 1.10/1.30
sevoflurane and 1.20/1.60 isoflurane at 0.5/1.5 MAC, CMRO2 0.70 at 1.5 MAC for both).

- [ ] **Step 3: Implement**

In `packages/engine-core/src/l2/pk/row.ts`, find:

```ts
  cmro2?: number; // fractional CMRO2 fall at uHyp = 1 (tables §5.1)
}
```

and replace with:

```ts
  cmro2?: number; // fractional CMRO2 fall at uHyp = 1 (tables §5.1)
  /** FU-2 item 8, volatiles: CMRO2 × max(0.5, 1 − cmro2PerMac·MAC) (tables §5.1 rows; replaces `cmro2`). */
  cmro2PerMac?: number;
  /** FU-2 item 8, volatiles: DIRECT CBF change at 0.5 and 1.5 MAC — the vasodilation beyond flow–metabolism coupling
   * (Matta 1999 under an isoelectric EEG, tables §5.1); published as `cbfVaso`, and 7d's NET CBF = direct × coupling. */
  cbfDirect?: readonly [number, number];
}
```

In `packages/engine-core/src/l2/pk/combine.ts`, find:

```ts
export function combine(
```

and replace with:

```ts
/** Direct CBF factor of a volatile at `mac` — the vasodilation beyond flow–metabolism coupling (Matta 1999 MCA velocity
 * under an isoelectric EEG, tables §5.1) — piecewise linear through (0, 1), (0.5, 1 + at05), (1.5, 1 + at15), extended
 * with the upper slope (FU-2 item 8). */
export function volatileCbfDirect(mac: number, direct: readonly [number, number]): number {
  const [at05, at15] = direct;
  if (!(mac > 0)) return 1;
  return mac <= 0.5 ? 1 + (at05 * mac) / 0.5 : 1 + at05 + (at15 - at05) * (mac - 0.5);
}

export function combine(
```

find:

```ts
    if (r.cns?.cmro2) bus.cns.cmro2Mult *= 1 - hill(a.c / (hypC50 ?? 1), 1, r.cns.cmro2);
```

and replace with:

```ts
    if (r.cns?.cmro2PerMac !== undefined) {
      // FU-2 item 8 (tables §5.1): CMRO2 per MAC, and the DIRECT vasodilation beyond coupling (7d's NET CBF = direct × coupling)
      bus.cns.cmro2Mult *= Math.max(0.5, 1 - r.cns.cmro2PerMac * a.c);
      if (r.cns.cbfDirect) bus.cns.cbfVaso *= volatileCbfDirect(a.c, r.cns.cbfDirect);
    } else if (r.cns?.cmro2) bus.cns.cmro2Mult *= 1 - hill(a.c / (hypC50 ?? 1), 1, r.cns.cmro2);
```

In `packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts`, sevoflurane row — find:

```ts
      { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'cbfVaso', emax: 0.2, ec50: 1, linear: true }, { target: 'hpvInhibit', emax: 0.2, ec50: 1, linear: true },
    ],
    cns: { cmro2: 0.5 },
```

and replace with:

```ts
      { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'hpvInhibit', emax: 0.2, ec50: 1, linear: true },
    ],
    cns: { cmro2PerMac: 0.25, cbfDirect: [0.04, 0.17] }, // FU-2 item 8: tables §5.1 (Matta 1999): CMRO2 ×(1 − 0.25·MAC), direct CBF +4 % / +17 % at 0.5 / 1.5 MAC
```

isoflurane row — find:

```ts
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 }, { target: 'cbfVaso', emax: 0.4, ec50: 1, linear: true },
    ],
    cns: { cmro2: 0.5 },
```

and replace with:

```ts
      { target: 'v0Frac', emax: 0.03, ec50: 1, linear: true }, { target: 'gv', emax: -0.3, ec50: 1, linear: true }, { target: 'bronchodilation', emax: 1, ec50: 0.5 },
    ],
    cns: { cmro2PerMac: 0.3, cbfDirect: [0.19, 0.72] }, // FU-2 item 8: tables §5.1 (Matta 1999): CMRO2 ×(1 − 0.3·MAC), direct CBF +19 % / +72 % at 0.5 / 1.5 MAC
```

(The desflurane and N2O rows are not touched — D10.)

- [ ] **Step 4: Run it to verify it passes; 7g's suites are unchanged**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk test/engine/pk-bus.test.ts test/engine/pk-wiring.test.ts
npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck
```

Expected: `volatile-cbf.test.ts` 3 passed; every other `test/l2/pk` file and the pk engine tests pass (`test/l2/pk`
16 files / 76 tests at this point — 7g's 14 files, Task 3's `av-node` and this one; the prototype's 17 / 79 includes
Task 11's file).

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/pk/row.ts packages/engine-core/src/l2/pk/combine.ts packages/engine-core/src/l2/pk/data/rows-anaesthetic.ts packages/engine-core/test/l2/pk/volatile-cbf.test.ts docs/plans/fu-2-engine-followups.md
git commit -m "fix(pk): volatile CBF per tables §5.1 — CMRO2 per MAC; cbfVaso = Matta's direct CBF (sevo 1.17×, iso 1.72× at 1.5 MAC) (FU-2 item 8)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 11: Hepatic drug clearance scaled by temperature once (item 9, 7g)

**Files:**
- Modify: `packages/engine-core/src/l2/pk/pipeline.ts` (`PkCtx`, `NEUTRAL_PK_CTX`, `clFactor` exported)
- Modify: `packages/engine-core/src/engine.ts` (`pkCtx`: the `organs` cast and one line — E-FU2-4)
- Test: `packages/engine-core/test/l2/pk/clearance-temp.test.ts`

**Interfaces:**
- Consumes: `ps.blood.core.liver` (7c; 7d writes `liverFn·tempF`), `ps.organs.liver` (7d), both duck-typed; the
  existing `hepFn`/`hepFlow`/`renal`/`tempC` context.
- Produces: `PkCtx.hepFnTemp: boolean` (`NEUTRAL_PK_CTX.hepFnTemp = false`); `export function clFactor(row: DrugRow,
  ctx: PkCtx): number`.

- [ ] **Step 1: Write the failing test** — `packages/engine-core/test/l2/pk/clearance-temp.test.ts`:

```ts
// FU-2 item 9: hepatic drug clearance is scaled by temperature exactly once — by 7g's own −5 %/°C term, or by the liver
// function 7d writes into 7c's `blood.core.liver` (= liverFn·tempF) when that exists, never by both.
import { describe, expect, it } from 'vitest';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import { clFactor, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';

const row = (id: string) => DRUGS[id] as DrugRow;
const at33 = { ...NEUTRAL_PK_CTX, tempC: 33 }; // 3.8 °C below the engine's 36.8 °C normothermia → 7g term 0.81

describe('clearance temperature counted once (FU-2 item 9)', () => {
  it('without 7d (hepFn = 1, no temperature in it): 7g scales the whole clearance — midazolam 0.81 at 33 °C', () => {
    expect(clFactor(row('midazolam'), at33)).toBe(0.81);
    expect(clFactor(row('midazolam'), NEUTRAL_PK_CTX)).toBe(1);
  });
  it('with 7d (hepFn = liverFn·tempF): the low-extraction hepatic share takes hepFn alone — midazolam 0.62, not 0.62 × 0.81', () => {
    expect(clFactor(row('midazolam'), { ...at33, hepFn: 0.62, hepFnTemp: true })).toBe(0.62);
    expect(clFactor(row('midazolam'), { ...at33, hepFn: 0.62, hepFnTemp: false })).toBe(0.5); // the old double count (0.502)
  });
  it('the other shares keep 7g’s term: renal/other of a mixed row, and flow-limited hepatic clearance', () => {
    const r = row('rocuronium');
    const h = r.elim?.hepatic ?? 0;
    const rn = r.elim?.renal ?? 0;
    expect(clFactor(r, { ...at33, hepFn: 0.62, hepFnTemp: true })).toBeCloseTo(Math.round((h * 0.62 + (rn + Math.max(0, 1 - h - rn)) * 0.81) * 100) / 100, 9);
    const hx = Object.values(DRUGS).find((d) => (d as DrugRow).elim?.highExtraction) as DrugRow;
    expect(clFactor(hx, { ...at33, hepFn: 0.62, hepFnTemp: true })).toBe(clFactor(hx, at33));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk/clearance-temp.test.ts`
Expected: FAIL — `clFactor` is not exported (with it exported but unchanged, the 7d case reads 0.50: temperature
counted twice).

- [ ] **Step 3: Implement** — in `packages/engine-core/src/l2/pk/pipeline.ts`, find:

```ts
  hepFlow: number; hepFn: number; renal: number; betaBlockC: number; vasoResp: number;
}
export const NEUTRAL_PK_CTX: PkCtx = { coLpm: 5, vaLpm: 4.2, frcL: 2.1, tempC: 37, ph: 7.4, hepFlow: 1, hepFn: 1, renal: 1, betaBlockC: 0, vasoResp: 1 };
```

and replace with:

```ts
  hepFlow: number; hepFn: number; renal: number; betaBlockC: number; vasoResp: number;
  /** FU-2 item 9: hepFn already carries the temperature (7d's `blood.core.liver = liverFn·tempF`), so clFactor must not
   * apply its own temperature term to the hepatic share again. */
  hepFnTemp: boolean;
}
export const NEUTRAL_PK_CTX: PkCtx = { coLpm: 5, vaLpm: 4.2, frcL: 2.1, tempC: 37, ph: 7.4, hepFlow: 1, hepFn: 1, renal: 1, betaBlockC: 0, vasoResp: 1, hepFnTemp: false };
```

find:

```ts
/** Clearance factor from liver flow/function, kidney and temperature (decision 7), quantised to 1 % (cache hits). */
function clFactor(row: DrugRow, ctx: PkCtx): number {
  const h = row.elim?.hepatic ?? 0;
  const r = row.elim?.renal ?? 0;
  const organ = h * (row.elim?.highExtraction ? ctx.hepFlow : ctx.hepFn) + r * ctx.renal + Math.max(0, 1 - h - r);
  const temp = Math.max(0.5, 1 - 0.05 * Math.max(0, NORMOTHERMIA_C - ctx.tempC)); // [ENG] ≈ −5 %/°C below normothermia (M10 ch. 24 p. 698 direction)
  return Math.round(organ * temp * 100) / 100;
}
```

and replace with:

```ts
/**
 * Clearance factor from liver flow/function, kidney and temperature (decision 7), quantised to 1 % (cache hits).
 * FU-2 item 9: temperature is applied once — when `hepFn` carries it (7d), the low-extraction hepatic share takes
 * `hepFn` alone and 7g's own term scales the rest (flow-limited hepatic, renal, other).
 */
export function clFactor(row: DrugRow, ctx: PkCtx): number {
  const h = row.elim?.hepatic ?? 0;
  const r = row.elim?.renal ?? 0;
  const temp = Math.max(0.5, 1 - 0.05 * Math.max(0, NORMOTHERMIA_C - ctx.tempC)); // [ENG] ≈ −5 %/°C below normothermia (M10 ch. 24 p. 698 direction)
  const hep = row.elim?.highExtraction ? ctx.hepFlow * temp : ctx.hepFn * (ctx.hepFnTemp ? 1 : temp);
  const organ = h * hep + (r * ctx.renal + Math.max(0, 1 - h - r)) * temp;
  return Math.round(organ * 100) / 100;
}
```

Merge main (R51 §7): `git fetch origin && git merge origin/main`. In `packages/engine-core/src/engine.ts` (`pkCtx`),
find:

```ts
    const organs = (ps as unknown as { organs?: { kidney?: { gfrRel?: number } } }).organs;
```

and replace with:

```ts
    const organs = (ps as unknown as { organs?: { kidney?: { gfrRel?: number }; liver?: unknown } }).organs;
```

find:

```ts
      hepFn: blood?.core?.liver ?? 1,
```

and replace with:

```ts
      hepFn: blood?.core?.liver ?? 1,
      hepFnTemp: blood?.core?.liver !== undefined && organs?.liver !== undefined, // FU-2 item 9: 7d's liverFn·tempF carries the temperature
```

(If 7c or 7d landed first and already typed `ps.blood`/`ps.organs` without the casts, keep their form and add only the
`hepFnTemp` line with the same two conditions.)

- [ ] **Step 4: Run it to verify it passes; PK unchanged without 7d**

```bash
CI=1 npx -y pnpm@9.15.9 --filter @pme/engine-core exec vitest run test/l2/pk test/engine/pk-wiring.test.ts test/engine/pk-acceptance-pk.test.ts
npx -y pnpm@9.15.9 --filter @pme/engine-core typecheck
```

Expected: 3 new tests pass; every PK test passes unchanged (without 7d, `hepFnTemp` is false and `clFactor` returns
exactly the old product: Eleveld engine = standalone, TTPE/CSHT, sugammadex bands).

- [ ] **Step 5: Commit and push**

```bash
git add packages/engine-core/src/l2/pk/pipeline.ts packages/engine-core/src/engine.ts packages/engine-core/test/l2/pk/clearance-temp.test.ts docs/plans/fu-2-engine-followups.md
git commit -m "fix(pk): hepatic clearance counts temperature once when 7d's liver function carries it (FU-2 item 9)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 12: Gate — evidence screenshots, full verification, gate note, pull request

**Files:**
- Create: `apps/demo/e2e/fu2.e2e.ts`, `docs/gates/fu-2.md`, `docs/gates/fu-2/*.jpg`
- Modify: this plan (tick the boxes)

**Interfaces:**
- Consumes: the Stage 7a demo page's hook `window.__pme7a` (`send`, `events` — it keeps `state` and `circ` events —,
  `simT`, `timeScale`, `ready`); the page starts in MODELED by default.
- Produces: three JPEG clips ≤ 60 KB; the gate note; the PR.

- [ ] **Step 1: Write the evidence e2e** — `apps/demo/e2e/fu2.e2e.ts`:

```ts
// FU-2 engine follow-ups: evidence screenshots for the gate note (docs/gates/fu-2.md) — MODELED rhythm-intrinsic
// rates on the live 7a page (NR-7g-5). JPEG clips ≤ 60 KB.
// Run: PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/fu2.e2e.ts
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let vite: ViteDevServer;
let base = '';
const out = resolve(import.meta.dirname, '../../../docs/gates/fu-2');

test.beforeAll(async () => {
  vite = await createServer({ root: resolve(import.meta.dirname, '..'), configFile: resolve(import.meta.dirname, '../vite.config.ts'), server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
  await vite.listen();
  const addr = vite.httpServer?.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  mkdirSync(out, { recursive: true });
});
test.afterAll(async () => vite?.close());

type Ev = { type: string; t: number; values?: Record<string, number | undefined>; rhythm?: { id: string; rateBpm: number } };
type Hook = { send(c: Record<string, unknown>): Promise<{ accepted: boolean }>; events: Ev[]; simT(): number; timeScale(k: number): void; ready: boolean };
const send = (p: Page, c: Record<string, unknown>) => p.evaluate((c) => (window as unknown as { __pme7a: Hook }).__pme7a.send(c), c);
const simT = (p: Page) => p.evaluate(() => (window as unknown as { __pme7a: Hook }).__pme7a.simT());
const waitSim = (p: Page, t: number) => p.waitForFunction((t) => (window as unknown as { __pme7a: Hook }).__pme7a.simT() >= t, t, { timeout: 120_000 });
/** The rhythm's rate truth over the last `s` sim-seconds: mean `state.values.hr` and the last `state.rhythm` (the page keeps state events). */
const rateTruth = (p: Page, s: number) =>
  p.evaluate((s) => {
    const h = (window as unknown as { __pme7a: Hook }).__pme7a;
    const t1 = h.simT();
    const st = h.events.filter((e) => e.type === 'state' && e.t > t1 - s);
    const v = st.map((e) => e.values?.hr ?? 0);
    return { hr: v.reduce((a, b) => a + b, 0) / Math.max(1, v.length), rhythm: st.at(-1)?.rhythm };
  }, s);

async function shot(page: Page, name: string) {
  const path = resolve(out, `${name}.jpg`);
  await page.screenshot({ path, type: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: 760, height: 560 } });
  expect(statSync(path).size).toBeLessThanOrEqual(60_000);
}

test('NR-7g-5 on the live MODELED page: SVT 180, sinus bradycardia 40 and AF 100 keep their own rates', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1120, height: 620 });
  await page.goto(`${base}/stage7a.html`);
  await page.waitForFunction(() => (window as unknown as { __pme7a?: { ready: boolean } }).__pme7a?.ready === true);
  await page.evaluate(() => (window as unknown as { __pme7a: Hook }).__pme7a.timeScale(4));
  // AF: the reflex may move the response by ≤ 10 % (AV_MOD_MAX) — the others hold their rate exactly
  for (const [rhythm, rate, tol, name] of [['svtAvnrt', 180, 1, 'modeled-svt-180'], ['sinusBrady', 40, 1, 'modeled-sinus-brady-40'], ['afib', 100, 10, 'modeled-af-100']] as const) {
    await send(page, { type: 'setRhythm', rhythm, opts: { rateBpm: rate } });
    await waitSim(page, (await simT(page)) + 60);
    const r = await rateTruth(page, 20);
    console.log(`FU-2 e2e ${rhythm} ${rate}: state hr ${r.hr.toFixed(1)}, rhythm ${JSON.stringify(r.rhythm)}`);
    expect(r.rhythm?.id).toBe(rhythm);
    expect(Math.abs(r.hr - rate)).toBeLessThanOrEqual(tol);
    await shot(page, name);
  }
});
```

- [ ] **Step 2: Merge main and run everything**

```bash
git fetch origin && git merge origin/main
npx -y pnpm@9.15.9 install --frozen-lockfile
npx -y pnpm@9.15.9 typecheck
CI=1 npx -y pnpm@9.15.9 test
(cd packages/engine-core && PME_TEST_SET=fast CI=1 npx vitest run && PME_TEST_SET=slow CI=1 npx vitest run)
npx -y pnpm@9.15.9 build
npx -y pnpm@9.15.9 check-notices
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 exec playwright test apps/demo/e2e/fu2.e2e.ts
PW_SYSTEM_CHROME=1 npx -y pnpm@9.15.9 test:e2e
```

If the CI `build` job's headless WebKit times out on `fu2.e2e.ts` (it runs three sim-minutes at ×4), skip WebKit in
that file with a comment — the orchestrator's rule for heavy evidence e2e (G7g follow-through): add
`test.skip(({ browserName }) => browserName === 'webkit', 'heavy evidence run: Chromium only (G7g rule)');` right
after the imports' `let base = '';` line, and record it in the gate note.

Expected: all green; `check-notices: OK` (no third-party material: the Langewouters/Wesseling citation in a test
comment is a reference, not copied code or data). The FU-2 e2e logs `svtAvnrt 180: state hr 180.0`, `sinusBrady
40: state hr 40.0`, `afib 100: state hr ≈ 104.7` (104.6 on the pre-review base; 104.7 re-measured on `5c3d6a5` with every fix: the AF
re-fit's knots are at 135/145 and no drug is on the bus, so AF 100 is unchanged within noise) and writes `docs/gates/fu-2/modeled-{svt-180,sinus-brady-40,
af-100}.jpg` (33–41 KB in the prototype). If a sibling stage merged meanwhile (7c, 7d), re-run the FU-2 engine tests
and record any number that moved. The 24 h long-run horizon is the local requirement (run without `CI=1` on an idle
machine once, and record the wall time).

- [ ] **Step 3: Write `docs/gates/fu-2.md`** with these sections, filled with YOUR measured numbers:
  1. *What shipped* — one row per item (1–5, 7–9, plus 1b AF rate control and the mapping re-fit): mechanism, files,
     tests, evidence (the File map above); the exceptions E-FU2-1…7 with the lines each touched; item 6: not planned,
     with the "Item 6: deferred" numbers.
  2. *Numbers vs bands* — the "Prototype results" table re-measured: before/after for every row, with the band and
     pass/`it.fails`. Item 5 before/after HR settling series for saadat-like and philips-like.
  3. *Screenshots* — embed the three JPEGs with one sentence each (the HR tile reads the set rate; the ART waveform
     follows the rhythm).
  4. *Decisions* — D1–D13 one line each; *Deviations* — anything that differs from this plan and why, incl. any extra
     `holdRate` call for a sibling stage's `ps.hr` write.
  5. *For the orchestrator / Ali* — the open questions below; the calibration items (dobutamine gap, NR-1 evidence,
     `AV_GAIN`/`AV_MOD_MAX`, the AF rate-control Emax values and amiodarone's 14 %, the monitor's AF over-read, item
     6's two options); what 7d's executor can flip (check 20's premise through MANUAL contractility, the cbfVaso
     deviation — 7d now multiplies the DIRECT factor by its coupling, the temperature double count).
  6. *Sibling requirements (F5; also copied into the 7d and 7e executor briefs by the orchestrator)* — two lines,
     verbatim:
     - **7d:** `organsCtx.setHr` (the Cushing / organ HR write) must call `holdRate(ps, ps.rhythm.pendingSwitch?.id ??
       ps.rhythm.id, false)` right after its `ps.hr` write, like every other engine-initiated rate (Task 2 (d)–(g)).
     - **7e:** the endocrine HR factor `hrAt × endoHrF` applies to the sinus family only (`SINUS_FAMILY.has(ps.rhythm.id)`
       from `l2/circ/rate-rule.ts`); every other rhythm keeps its own rate (NR-7g-5).
  7. *MANUAL-held rate, for console users (7x physiology console and the instructor panel)* — one paragraph: a rate
     set with `setTarget hr` / `pin hr`, or a rhythm set WITH `rateBpm`, is HELD — in MANUAL as before, and after a
     switch to MODELED too (D2: `setMode` keeps `hrSet`), so the reflex and drugs do not move it; the reflex takes a
     sinus-family rate back only when a sinus-family rhythm is set WITHOUT a rate. Rhythm-intrinsic rates (SVT, VT,
     escape, VVI) always hold; AF moves by ≤ ±10 % with the reflex and falls with rate-control drugs; AAI/DDD never fall
     below their lower rate.
  8. *Test counts* — per package, fast/slow split, e2e list.

- [ ] **Step 4: Commit, push, open the PR (do NOT merge)**

```bash
git add apps/demo/e2e/fu2.e2e.ts docs/gates/fu-2.md docs/gates/fu-2 docs/plans/fu-2-engine-followups.md
git commit -m "docs: FU-2 gate note and evidence screenshots" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
gh pr create --base main --head fu-2-engine-followups --title "FU-2: engine follow-ups (MODELED rhythm rates, AF rate control, dobutamine venous term, rhythm on state, saadat 8 s HR, MANUAL contractility, volatile CBF, clearance temperature)" --body "$(cat <<'BODY'
Implements docs/plans/fu-2-engine-followups.md. Gate note: docs/gates/fu-2.md.

- NR-7g-5 (HIGH): in MODELED only the sinus family (derived: atria sinus, rate driven as sinus — 11 rhythms) follows the reflex's HR set point; SVT/AT/junctional/VT/AIVR/escape/VVI keep their own rate (SVT 180 reads 180, was 140; sinus brady 40 reads 40, was 59); AAI/DDD request max(lower rate, reflex) (AAI 70 stays 70 on phenylephrine, 91 after a bleed); AF's ventricular response moves by ≤ ±10 % through the AV node; an explicit instructor sinus rate overrides the reflex as in MANUAL
- AF rate control: the esmolol/metoprolol/labetalol rows gain an AV-nodal block (E-FU2-6) that slows MODELED AF (esmolol 0.5 mg/kg + 150 µg/kg/min: −26.9 %); amiodarone's existing entry gives −14.0 % (it.fails, band 20–30 %); the adenosine hook reads adenosine's own block so stacked rate control never fires it (E-FU2-7); AF rate mapping knots at 135/145 (±2 % from 130 to 145, E-FU2-5)
- NR-7g-2: β-agonist unstressed-venous-volume mobilisation (dobutamine; Emax = the 12 mL/kg recruitable reservoir, shared with the reflex's recruitment — the sum is clamped): CO +3.9 → +11.8 % at 5 µg/kg/min; the +20–40 % band stays it.fails with the number (R45)
- G7a NR-1: the ruled pressure-dependent-compliance mechanism measured four ways — it cannot reach the post-PVC band and breaks other bands; C(P) unchanged, evidence in the it.fails
- The 1 Hz state event carries { rhythm: { id, rateBpm } }; the controller session follows it (a shock outcome updates the panel's rhythm select)
- saadat-like's declared 8 s moving-average HR is its default (settles +10 s, was +7 s); other skins unchanged
- MANUAL contractility (≠ 1) is the Emax factor and the tracker holds MAP with resistance only: CO 6.82 → 4.74 at 0.5; the check-20 premise (MAP 68, CVP 12, CO 3.3) is reachable
- 7g volatile CBF per tables §5.1: cbfVaso = Matta's DIRECT CBF, 1.17× sevoflurane / 1.72× isoflurane at 1.5 MAC (was a linear 1.30× / 1.60×); CMRO2 per MAC; 7d computes NET = direct × coupling
- 7g hepatic clearance: temperature applied once when 7d's liver function (liverFn·tempF) exists
- Item 6 (MANUAL tracker ringing at HR 48): not changed — the ruled α_R 0.15 breaks two Stage 2 bands on this base; evidence in the gate note
- No band widened; vasopressor, adenosine, circ-sanity and Stage 2 bands unchanged
- For 7d/7e (F5): 7d's organsCtx.setHr must call holdRate(...); 7e's hrAt × endoHrF is gated by the sinus family

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

Report: commits, test counts, the numbers table, deviations, anything undone. Stop.

---

## Item 6: deferred (measured; not planned — R45)

The ruling asks for 7a's MANUAL per-beat tracker R-gain 0.15 (the 7d fixer's prototype) with a test that the tracker
settles without oscillation at HR 40–50 and the 90/50 ramp test unchanged. Measured on this base (`7f64d90`) and on
a copy of the 7d prototype (`scratch/proto-7d` state, check 19 MANUAL, seed 3):

| Variant | 7d check 19 MANUAL ΔMAP (+30–50) | Stage 2 bands on this base |
|---|---|---|
| `TRACK_ALPHA_R` 0.5 (today) | +24.3; head MAP rings 99 ↔ 127 on an ≈ 18 s cycle | all pass |
| 0.15 everywhere (the ruled fix) | **+31.9**, no ringing | **2 fail:** hemo-acceptance 3 (90/50 ramp, 4.19 mmHg off vs ±3) and 8 (transducer ζ 1.2: DBP −0.78, must rise) |
| 0.5 → 0.15 scheduled on the mean reference RR (1.0 → 1.25 s) | +20.6, still rings (±10) | pass |
| 0.5 × (R₀/R)² (damped when the surge raises R) | +24.7 / +24.5 (k = 3) | pass |

On this base, WITHOUT 7d, the tracker does not ring at HR 40–60: Cushing-shaped surges of the targets (SBP +52,
DBP +34 over 30–60 s with HR 80 → 40/48/60, ventilated RR 18, adult/hfref/elderly/htn) settle with a site-MAP range
of 4–7 mmHg at 0.5 (8–11 mmHg at 0.15, i.e. slower, not better). The ringing needs 7d's own loop (its per-tick
Cushing writes: L1 `coupled` sbp/dbp and an HR retarget with a 1 s ramp at every 0.5 bpm step, measured on the
last beat's MAP). A test that is red at FU-2's base therefore cannot be written, and the only fix that removes the
ringing breaks two Stage 2 bands. Recommendation (orchestrator): diagnose on the 7d branch with check 19 as the red
test (the loop between 7d's writes and the tracker, e.g. the HR retarget cadence or smoothing 7d's coupled targets),
or rule on the two Stage 2 bands. The 7d `it.fails` stays.

## Open questions (for the orchestrator; the plan does not wait on them)

- **Q-FU2-1 (sinus family): CLOSED** (ruled 2026-09-27 04:55) — derived as `atria === 'sinus' && rateDrives ===
  'sinus'` (11 rhythms); `avb3Narrow/Wide` excluded; `pacedAAI`/`pacedDDD` request max(lower rate, reflex). Tasks 1–2.
- **Q-FU2-2 (explicit sinus rate):** D1 holds an explicit rate like MANUAL (no reflex on top). Should a later drug
  (atropine, esmolol) move a held sinus rate? Today only a new rhythm without a rate hands it back.
- **Q-FU2-3 (dobutamine gap):** +11.8 % vs +20–40 %. The reflexes return about half of the mobilised volume
  (cardiopulmonary venous limb `G_CP_V` 200 mL/mmHg × 0.3 on withdrawal, arterial `G_V` 20); the unventilated circ
  model reaches +17 %. A calibration-pass item (reflex venous gains or the tables' dobutamine row), not FU-2.
- **Q-FU2-4 (NR-1):** the ruled option (b) is refuted by measurement; the remaining lever is filling through the
  compensatory pause (EDPVR/diastasis of the elastance heart). Calibration pass.
- **Q-FU2-6 (MANUAL `svr`):** kept derived (D9). If instructors must set SVR in MANUAL, one of SBP/DBP/CVP/contractility
  has to become an output while it is set; which one is a teaching decision (Ali).
- **Q-FU2-7 (item 6):** see "Item 6: deferred" — diagnose on the 7d branch with check 19 red, or rule on hemo-acceptance
  3 and 8 if a global α_R 0.15 is wanted anyway.
- **Q-FU2-8 (desflurane, N2O CBF):** the tables give no numbers; their rows keep 7g's linear `cbfVaso` and CMRO2 hill.
- **Q-FU2-CBF (volatile CBF net vs direct; ruled not blocking):** `cbfVaso` is Matta's DIRECT factor (D10), so 7d's
  NET at 1.5 MAC sevoflurane is 1.17 × its CMRO2 coupling, below Matta's 1.17 when coupling is below 1. Whether the
  engine's net should reproduce the measured number is Ali's calibration-pass call.
- **Q-FU2-9 (amiodarone rate control):** its 7g `avNode` entry (Emax 0.3, EC50 1× the 150 mg load) gives −14.0 % on AF
  130; the 20–30 % band needs Emax ≈ 0.5–0.6 — a value change to a 7g row, outside E-FU2-6 (additive only). The
  `it.fails` carries the number.
- **Q-FU2-10 (AAI/DDD above the lower rate):** the rate is right (max(lower rate, reflex)), but the rhythm engine draws
  the faster beats as PACED (the hr ramp is the pacer interval), not as inhibited intrinsic P waves. Rendering the
  intrinsic sinus overtaking the pacer needs the sinus atrial rate to follow the reflex in paced rows (`l2/ecg/**`, out
  of FU-2's partition).
- **Q-FU2-11 (monitor HR in AF):** the HR numeric over-reads an irregular rhythm by 3–5 % at 130–145 (MANUAL, 4
  seeds: true 130.7 / 140.1 / 145.3, monitor 136.5 / 144.8 / 149.1) — the monitor's averaging, not the AF mapping (D12).
  Whether real monitors do the same is a calibration question (l3/hr).
- **E-FU2-7 (for the orchestrator's acknowledgement):** raised by this fix, not by the review — the adenosine hook in
  `l2/pk/hooks.ts` reads adenosine's own block; without it, stacked rate control (esmolol 300 + metoprolol 10 mg +
  amiodarone 300 mg) reaches `avNodeBlock` ≥ 0.5 and turns sinus into `sinusPause` (measured, Task 3's `av-node`
  test).
