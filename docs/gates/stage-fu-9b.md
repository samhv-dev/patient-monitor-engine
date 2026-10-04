# Gate — FU-9 Part B: hypokalaemia and neuromuscular block; chronic hypercapnia in COPD

*Executor (Claude Opus 5.5), 2026-10-04. Branch `fu-9b-blood-fluids` from `origin/main` 4a1cc3f7 (FU-7 #32 merged;
Stage 9, FU-9 Parts A + C before it), merged with `origin/main` 28ee229 (RESUME only) for the gate. Plan:
`docs/plans/fu-9-blood-fluids.md`, Part B (Tasks B0–B2), decisions D9 and D10, exceptions E-FU9-2 and E-FU9-3.*

## 1. Scope

| Task | Finding | Mechanism | Files |
|---|---|---|---|
| B0 | — | base check after FU-7: anchors, drift, before-numbers (plan § "Base drift") | plan only |
| B1 | F10 (BF-09b): hypokalaemia did not potentiate rocuronium | D10 / R6: 7c's plasma K joins FU-7's `InteractionCtx` beside Mg and iCa; `hypokalaemiaMult(K) = max(0.7, 1 − 0.15·(3.5 − K)⁺)` on the non-depolarisers' EC50 inside `ec50Multipliers` | `l2/neuro/{interactions,pipeline}.ts`, `engine.ts` (one line, **E-FU9-2**) |
| B2 | F7 (BF-16b, CM-07a): COPD GOLD 3 was normocapnic | D9: the COPD grade sets `gasPatient().paco2Rest` (tables §1.5: 40/40/45/55 at severity 0.25/0.5/0.75/1, linear between); 7c's `createBloodCore` builds the chronic compensation (+0.35 mmol/L HCO₃ per mmHg, A7's `CHRONIC_HCO3_PER_MMHG`) at that PaCO₂ | `l2/gas/params.ts` (**E-FU9-3**), `l2/blood/{pipeline,core}.ts` |

Both changes are the identity outside their states: K ≥ 3.5 (or no 7c) gives × 1 exactly; a patient without COPD, or
with COPD severity ≤ 0.5, rests at PaCO₂ 40 and `createBloodCore` computes the same HCO₃/pH₀ as before (bitwise:
`NORMAL.hco3 + 0.35·max(0, 40 − 40)`, `max(40, 40)`).

The COPD calibration is **mode-independent** (D9: it is the profile's chronic state), so it also moves the cases below.
Measured by the final reviewer's request with a scratch probe (engine `createEngine`, seed 7, 65 y 70 kg man), base
4a1cc3f7 → this branch:

| Arm | Read | Base | Branch |
|---|---|---|---|
| MANUAL, COPD GOLD 3 (PaCO₂ from the EtCO₂ target + the COPD gradient, not the set point) | 30 min: PaCO₂ / HCO₃ / pH | 58.9 / 25.44 / 7.248 | 58.9 / **26.59 / 7.267** |
| MANUAL, COPD GOLD 4 | 30 min | 59.9 / 26.41 / 7.257 | 59.9 / **30.03 / 7.313** |
| MANUAL, healthy | 30 min | 40.7 / 24.46 / 7.392 | identical |
| MODELED, GOLD 3 with an explicit profile `blood.hco3` 30 (honoured; pH₀ and the K reference pH now at 45, not 40) | 30 min; K reference pH | 42.6 / 30.30 / 7.465; 7.488 | **45.4 / 30.02 / 7.433; 7.437** |
| MODELED, GOLD 4 — the start-up transient | 10 s / 2 min / 5 min: PaCO₂, pH | 39.0, 7.407 / 39.4, 7.403 / 38.7, 7.410 | **37.3, 7.485 / 45.2, 7.416 / 47.6, 7.396** |

The K reference pH (`so.set.ph`, the pH at which plasma K equals the profile K) is the patient's own resting pH: GOLD 3
7.377, GOLD 4 7.345 (was 7.398). **Start-up transient:** the gas compartments still seed from L1's EtCO₂ + gradient
(`resp/pipeline.ts`), not from `paco2Rest`, so a GOLD 3/4 patient's blood (calibrated at 45/55) reads alkalaemic for the
first minutes (GOLD 4 pH 7.485 at 10 s, 7.416 at 2 min) while the drive raises PaCO₂ to its set point. The plan's new
comment in `gas/params.ts` ("the gas compartments' start (as PACO2_REST_MMHG is)") overstates this. Seeding the CO₂
stores from `paco2Rest` is a `l2/resp/**` edit outside FU-9's file map — handed on (gate review minor 2).

## 2. Before → after

| Cell / rig | Quantity | Before (4a1cc3f7) | After (this branch) | Band | Verdict |
|---|---|---|---|---|---|
| `fu9-rocuronium` (engine, GA vent, roc 0.6 mg/kg) | T1 25 % after the dose, K 2.5 / K 4.2 | 36.0 / 36.0 min | **47.3 / 36.0 min (+11.3)** | ≥ +1 min | fail → pass |
| BF-09b (BF runner) | t25LowK / t25Normal, dMin | 35.8 / 35.8, 0 | **47.0 / 35.8, +11.2** | dir +1 | WR → **PL** |
| `fu9-copd` (engine, awake RA, 30 min) | GOLD 3 PaCO₂ / HCO₃ / pH | 39.6 / 24.33 / 7.402 | **43.9 / 25.99 / 7.385** | PaCO₂ 43–52, pH 7.35–7.45 | fail → pass |
| | HCO₃ per 10 mmHg vs X-A (39.0 / 24.26) | +1.30 | **+3.52** | 3–4.5 | fail → pass |
| probe (same rig) | GOLD 4 PaCO₂ / HCO₃ / pH | 40.72 / 24.49 / 7.392 | **50.51 / 29.15 / 7.374** | (tables §1.5: 55) | — |
| probe | GOLD 2 PaCO₂ / HCO₃ / pH | 38.85 / 24.24 / 7.408 | 38.85 / 24.24 / 7.408 (identical) | 40 | — |
| BF-16b (BF runner) | paco2Copd / hco3Copd / phCopd | 39.57 / 24.334 / 7.402 | **43.924 / 25.994 / 7.385** | — | — |
| | hco3Per10 | 1.31 | **3.52** | 3–4.5 | TW → **PL** |
| | dPaco2 (vs X-A) | 0.6 | **4.9** | 5–15 | TW → TW (by 0.1) |
| BF-15b (BF runner) | dPaco2 (metabolic alkalosis, Part A's F9) | +6.24 | +6.24 | 5–9 | PL → PL |
| `l2` units | `hypokalaemiaMult` 1 / 1 / 1 / 0.85 / 0.7 at K —, 4.2, 3.5, 2.5, 0.5; `restingPaco2` 40/40/40/45/55; GOLD 3 core HCO₃ 26.15, pH ≥ 7.37 | missing | pass | — | — |

BF-16b's `dPaco2` misses its 5 mmHg floor by 0.1: the COPD arm reaches 43.9 (the tables' 45 is the set point; the
awake drive settles just under it), and the X-A arm rests at 39.0 since FU-7/Part A (the prototype on `2473f0b` read
44.14 against 40). Recorded, not tuned (R44); the BF runner is not a repo test, and the plan's engine acceptance
(PaCO₂ 43–52 absolute) passes.

**`it.fails`:** Part B adds none. One pre-declared `it.fails` flips to `it` (R45, named in the plan's B2 Step 5 with both
numbers; band unchanged): `test/engine/lung-circ.test.ts` "COPD GOLD 3 at RR 26: auto-PEEP reaches the heart — MAP
falls vs RR 10 by > 2 mmHg" — **1.79 (101.4 → 99.6) → 2.5 (102.0 → 99.5)**; its companion CO band (≥ 10 % fall) still
passes (4.61 → 3.50). Cause: the GOLD 3 patient now rests at PaCO₂ 45 with HCO₃ 26 (was 40 / 24.4).

## 3. Base drift (the plan's "Base drift" section, in short)
- All ten B0 anchors print exactly one line on 4a1cc3f7; every B1/B2 find block matches byte for byte; FU-7 Task 14's
  merged call line IS the plan's call-line block. No block needed re-anchoring.
- Placement 1 (`engine.ts`, E-FU9-2): FU-7 put 7c's electrolytes on their own line of the neuro context
  (`mgMmolL: … iCaMmolL: …`); `kMmolL` goes on that line (R6 "beside Mg and iCa"), not the `tempC:` line the plan
  anchored on. Still one engine line.
- Placement 2 (`NeuroEnv`): `kMmolL?` follows FU-7's `mgMmolL?`/`iCaMmolL?` instead of sitting between `tempC` and
  `mechanical`.
- Before-numbers moved by FU-7/Part A: T1 25 % 35.7 → 36.0 min (engine rig); COPD GOLD 3 39.7 → 39.57, HCO₃ 24.35 →
  24.33; X-A awake PaCO₂ 40 → 39.0.

## 4. Suites (local, Apple silicon; shared machine, load average up to 143 during development)

| Suite | Result |
|---|---|
| `pnpm -r typecheck` | clean |
| engine-core fast (`PME_TEST_SET=fast`) | **306 files / 1 368 passed, 1 skipped**; truth 12-drug tree **2 077** leaves (cap 2 100, unchanged) |
| other packages (`--filter '!@pme/engine-core' -r test`) | audio 58, skins 191, controller 226, ventilator 97, renderer 90, validation 107 (+11 skipped), apps/demo 200 — all pass |
| slow-c (16 files) | **44 passed**; per-file sum 1 346 s; `fu9-rocuronium` 51 s, `fu9-copd` 19 s |
| slow-f (3 files) | **59 passed**; per-file sum 860 s (drug-layer 519, drug-apnoea 217, pk-acceptance-pd 124) |
| COPD-profile engine files outside slow-c/f | lung-copd, resp-coupling (slow-b); resp-bronchodilation, resp-mechanics, resp-suite (slow-d); lung-longrun (slow-a); lung-capno/circ/commands/gas/state/wiring, types-lung (fast) — all pass after the `lung-circ` flip; `neuro-engine` (slow-b) passes |
| `audit:physiology` (FU-4's arrest behaviour; 2 727 lines) on the base 4a1cc3f7 and on this branch | **identical** apart from the wall-clock seconds in the scenario headers: every arrest time, the propofol matrix and the extremes table are unchanged (no audit scenario has COPD or a K below 3.5) |
| build, check-notices | pass; `check-notices: OK (3 governed files)` |
| e2e Chromium + WebKit: stage9-app, stage9-glossary, showcase-clock, showcase-capnogram, showcase-events-layout | **20 passed** (2.2 min) |
| slow-group disjointness (the CI step, run locally) | slow 109 = a 28 + b 38 + c 16 + d 19 + e 5 + f 3 (main: 107 = … c 15 … f 2); no overlap, no gap |

**Slow groups.** The `fu9-*` glob in `SLOW_C` keeps both new engine files in slow-c (every other group excludes
`SLOW_C`, so an `fu9-*` file cannot be listed elsewhere without changing A0b's matcher). slow-c was the heaviest group
on PR #32's two CI runs (2 295 / 2 315 s of tests), so `pk-acceptance-pd` (239 s on CI) moved to `SLOW_F`
(862 / 1 807 s on those runs). Projected CI sums: slow-c ≈ 2 290 − 239 + ≈ 150 ≈ 2 200 s (≈ 37 min), slow-f ≈ 1 100 /
2 050 s. The PR's own CI run gives the real numbers.

## 5. Showcase rehearsal (KIT-GATE.md procedure)
Kit built from this branch (`VERSION.txt` Commit a97dff3) into `<scratchpad>/fu-9b/kit`, perl server through the
launcher, `SHOWCASE_WORKERS=3`, five cases + the second-load check on Chromium and WebKit: **12 passed (10.2 min)**, no
console or page error. Compared with kit round 3 (`origin/showcase-kit-3`, run on 4a1cc3f7 = this branch's base):
anaphylaxis HR 135, epinephrine 11.3 s; bronchospasm VTE 161/162 → 305 mL; tamponade MAP < 40 at 112.6/112.7 s;
haemorrhage pulse lost 10 min, CPR → systolic > 90 at 4.3 min, ROSC — the same within one polling sample.

Numbers that differ from `KIT-GATE.md` (round 2, hotfix build f29951b — before FU-7):
- **Bronchospasm VTE after salbutamol 367 → 305 mL** (both engines): FU-7's, as KIT-GATE itself predicts ("independent
  FU-7 run: … 161 → 305 mL at 3 min"); round 3 on the base reads 304/305.
- **Healthy induction apnoea alarm 57.1 / 55.7 s → 62.3 / 59.6 s** in the 3-worker run (CO₂ tile 46 after 7.3 s /
  45 after 5.3 s). Two re-runs of that case alone (2 workers) read **55.0 / 55.1 s and 55.0 / 55.0 s**, CO₂ tile 46 after
  7.3 s — round 3's values on the base. The first run's later alarm is harness timing under parallel load (the case
  pressed "Induce now" at the same sim second; the alarm sample came at 98.6 vs 90 s). Part B cannot reach this case:
  K stays ≥ 3.5 and the patient has no COPD.
- Clock restart 02:02 → 00:05 vs 02:03 → 00:04 (one polling sample).

Results were copied to `<scratchpad>/fu-9b/rehearsal-out/` and `docs/showcase` was restored (`git checkout`).

## 6. Exceptions as applied
- **E-FU9-2** (B1): one line of `engine.ts` — FU-7's electrolyte line of the neuro context gains `kMmolL` (drift
  placement 1).
- **E-FU9-3** (B2): `l2/gas/params.ts` — `COPD_PACO2_REST`, `restingPaco2`, and the `paco2Rest:` line of `gasPatient`.
- Outside the plan's Part B File map: `packages/engine-core/vite.config.ts` (`pk-acceptance-pd` from `SLOW_C` to
  `SLOW_F`, by CI time — the executor brief's "place new slow files by measured time") and
  `test/engine/lung-circ.test.ts` (the `it.fails` → `it` flip, R45). No band widened.

## 7. Open questions (unchanged from the plan)
- OQ9 (D10's size, [ENG]): K 2.5 → EC50 × 0.85 → T1 25 % +11.3 min on the engine rig (plan: +11.2 / +10.8).
- D9's GOLD 4 point: the awake GOLD 4 patient reaches 50.5 of the tables' 55 at 30 min (drive settles under its set
  point); not tuned (R44).

## 8. Final whole-branch review (fresh reviewer, Opus)
Verdict "ready to merge with fixes"; no Critical. **Important 1** (the COPD calibration also moves MANUAL mode and an
explicit profile HCO₃, undeclared) — addressed in §1 with measured before → after rows (gate-note text; no code change).
Minors, deferred to the orchestrator (not fixed here):
- M2: COPD GOLD 3/4 start alkalaemic for a few minutes (CO₂ stores seed from L1's EtCO₂, not `paco2Rest`); the
  `gas/params.ts` comment overstates the seeding. Fix lives in `l2/resp/pipeline.ts` (outside FU-9's file map).
- M3: `restingPaco2` takes the first `copd` entry and maps a NaN severity to 55, where `resolveLung` skips non-positive/NaN
  severities and applies every entry; a one-line `filter(… severity > 0)` + max would align them.
- M4: `Math.max(NORMAL.paco2, paco2)` in `createBloodCore`'s pH₀ would mis-calibrate a future resting PaCO₂ below 40
  (pregnancy 31); unreachable today (`restingPaco2` ≥ 40).
- M5: the K term cites "Miller 10e ch. 27" while the file's other NMB interactions cite "M10 ch. 24 p. 698"; align the
  chapter/page (the plan's text, kept verbatim).
- M6: `vite.config.ts` outside the File map — declared (§6).
