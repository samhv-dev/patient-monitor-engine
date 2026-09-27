# Stage 7c gate: blood, acid–base, electrolytes, fluids and O2 delivery (date: 2026-09-27)

**Gate question.** Does the blood reproduce the tables' acid–base, electrolyte, fluid and O2-delivery behaviour — dynamic
SID, bounded pH, lactate in shock, hyperchloraemia, hyperkalaemia with its ECG and treatments — observing 7g's drug doses
with one K-shift source, feeding the ODC to 7b's mixing point — without moving any Stage 3/7a/7b/7g acceptance number out
of its band except the six recorded ones, within 0.1 ms per tick?

**Answer.** Yes, with the recorded misses. Every 7c acceptance number inside its band is listed below; the four 7c
bands the model cannot reach are kept as `it.fails` with their numbers (R45: no band widened). Of the six sibling
tests the blood broke, R51 addendum 15 resolved five by re-specification, rig fixes and a test seam; one (7b's OLV
flow share, 0.307 against ≤ 0.30) stays `it.fails`. The blood step costs 0.56 µs per 20 ms tick, against a 100 µs
budget.

Branch `stage-7c-blood`, built task by task from `docs/plans/stage-7c-blood.md` (26 tasks). Tasks 1–25 were run by earlier
sessions, which were stopped by usage caps. This session ran Task 26 only. It merged `origin/main` (7a + 7b + 7g + 7x +
FU-2, `a662eac` and the RESUME commits) into the branch as merge commit `ddade45`. The only conflict was the SLOW list in
`packages/engine-core/vite.config.ts`, and both sides were kept. The numbers below come from the final gate run on that
merge. Tests that do not print their numbers were re-measured with a scratch Vitest file kept outside the repo, using the
tests' own computations.

## 1. Final gate run (after the FU-2 merge)

| Check | Result |
|---|---|
| `pnpm typecheck` | exit 0, all packages |
| `CI=1 pnpm -r test` | exit 0. engine-core **947 passed, 1 skipped** (220 files); controller 197; skins 168; demo 115; ventilator 88; renderer 67; audio 58; validation 17 passed / 9 skipped. The validation count includes the uncommitted oracle copy (§4). On the committed tree it is 16 / 5 |
| `pnpm build` | exit 0; `dist/stage7c.html` + `stage7c-*.js` emitted |
| `pnpm check-notices` | `OK (3 governed files)`; the N-P08/N-P09/N-P23 rows are enforced by `test/l2/blood/headers.test.ts` (passes) |
| `PW_SYSTEM_CHROME=1 pnpm test:e2e` | **27 passed** (8.5 min; 7g's evidence page 7.2 min). The screenshots the other stages' specs regenerated were reverted |
| Pulse oracle (run alone, after the suite) | 5 passed in 466 s: every row printed `agree`, `expect-differ-ok` or `excluded` (§4) |

## 2. Acceptance numbers (7c)

| Check | Band / source | Result |
|---|---|---|
| ODC P50 (pH 7.4, PCO2 40, 37 °C, DPG 4.65) | 26.8 | **26.77**; S(40) 0.747, S(60) 0.898, S(100) 0.972; Hill n 2.7 |
| ODC shifts | tables §5b.3 | pH 7.2 → 31.4, pH 7.6 → 22.9, 39 °C 29.9, 33 °C 21.4, PCO2 60 27.6, DPG 7 mM 28.5, COHb 0.2 → 22.8 (n 2.48) |
| pH solver | bracket 6.5–7.9 (A13), ≤ 16 iterations | **14** bisection iterations per call (tolerance 1e-4). Bounded and finite for SID −20…200, PCO2 0…400, albumin 0…80 |
| Respiratory compensation | +0.7–1.2 HCO3 / 10 mmHg rising; 0.2 / mmHg falling | rising **+1.0 / 10 mmHg**, BE flat; falling **0.127 / mmHg** → `it.fails` (§3) |
| Baseline, 70 kg man | — | BV 4807, plasma 2644, ISF 11356, ICF 28000 mL; pH 7.398, HCO3 24.4, BE 0.0, AG 11.6, K 4.20, iCa 1.20, COP 22.4 |
| 1 L Ringer's lactate over 30 min, awake (Hahn, Q47) | 48–60 % at end, 13–25 % +30 min | **51.5 %**, **18.7 %** |
| One RBC unit, 4 h | +0.7–1.2 g/dL | **+1.10** |
| Class III haemorrhage, 1750 mL in 10 min (engine with 7a), 30 min | tables 17a lactate 3–5 | **lactate 4.3**, BE −2.3, Hb 14.1, pH 7.23. Circuit −1668 mL at 700 s; CO 6.09 → 2.90 L/min; CO0 5.74 (settled reference, §3 item 5); bvRel 0.653 |
| + 4 warmed RBC + 1 L RL from 40 min, at 120 min | lactate falls | lactate **1.9**, Hb 14.6, K 4.4, iCa 1.22 |
| Massive transfusion, 10 RBC (35 d) in 30 min | K ↑, iCa ↓ | engine **K 5.9, iCa 1.08**, Hb 17.8, core 33.97 °C (10 unwarmed units). Core-only K 5.88, iCa 1.076 (the rate rule gives 1.033; test ±0.05) |
| 2 L saline vs Plasma-Lyte in 30 min under GA, at 60 min | annex D3 Cl +6–8, BE −3 to −5 | engine saline **Cl 109 (+5), BE −2.0**; balanced Cl 103, BE +0.6. Core saline Cl +5.4, BE −2.1 → D3 `it.fails` ×2. The contrast test passes |
| DKA 0.8, engine | AG ↑, HCO3 ↓ | **AG 27, HCO3 8.6, pH 7.08** (fixed ventilator; Winter's belongs to 7f) |
| Hyperventilation RR 12 → 24 under GA | pH ≥ +0.1 | pH **7.50** |
| NaHCO3 50 mmol vs a same-seed control, ΔEtCO2 | transient rise | **+2.5 / +4.4 / +5.0 / +4.9 / +4.7** mmHg at 30 / 60 / 90 / 120 / 150 s; +1.9 at 15 min |
| Untreated VF, 30 min, ventilator on | annex D1: lactate, pH | **lactate 8.7, pH 6.88**; BE −7.3 (D1 says ≤ −12: reported, not asserted); PaCO2 131 |
| Succinylcholine in burns (0.5), through 7g, then CaCl2 1 g at 4 min, then insulin–dextrose at 7 min | tables | **K 7.7 at 4 min; QRS 93 → 126 ms → 93 ms after calcium; K 7.2 → 4.3 at 30 min**; mods.k 4.29 |
| Insulin–dextrose alone (core) | −0.6 to −1.0 over 30–60 min | **−0.59** at 30 min, **−0.87** at 60 min |
| Salbutamol 10 mg nebulised through 7g (`kShift` −0.78) | −0.5 to −1.0 | **K 4.28 → 3.74 (−0.54)** at 30 min. Unit rig: 7c's own curve 3.47; 7g kShift −0.8 3.57; kShift 0 with a salbutamol dose on record 4.18 (never both, decision 18) |
| Anaemia, Hb 7 | SpO2 unchanged, DO2 ↓ | SaO2 0.9982 vs 0.9983; **DO2 × 0.489**; SvO2 0.890 → 0.768; lactate 1.00 |
| COHb 25 % | SpO2 over-reads | displayed **SpO2 99**, co-oximeter SO2 **74.8** |
| MetHb 35 % | SpO2 ≈ 85 (±3) | **SpO2 84**, SO2 64.9 |
| Labs | 1 Hz; ABG after the turnaround | `labs` every simulated second (600 events in 600 s); `labResult` exactly **120 s** after the draw, with the values at draw time; VBG PCO2 about 8.5 above arterial |
| Stage 3 desaturation with the blood (Hb 15, live pH, ODC through 7b's mixing point) | preox 6.5–9.5 min; room air 35–60 s (R39-1); child 130–190 s; obese 1.7–3.7 min | **485 s, 41.0 s, 130.0 s (on the lower band edge), 169 s** |
| 7b OLV, hypercapnic RR 14 rig (re-check file) | nadir 88–96 %, fL < 0.3 | nadir **88.7 % at 46.6 min**, fL 0.266, pH 7.01 |
| CPU | ≤ 0.1 ms per 20 ms tick | **0.00056 ms**. The whole engine: circulation 0.019 ms, lungs 0.0087 ms, 7g 10.1 µs |
| Determinism | same seed + script → same `labs` | SHA-256 of the `labs` stream (seed 3, 1 L bleed + 50 mmol NaHCO3, 600 s): `12f6d8c8e7a580d3…` on both runs |
| 24 h drift (blood stepped against a steady Stage 3 state, h3 → h24) | pH ≤ 0.005, HCO3 ≤ 0.05, K ≤ 0.02, Na ≤ 0.1, lactate ≤ 0.02, Hb ≤ 0.02 | ΔpH 0, ΔHCO3 0, **ΔK 8·10⁻⁴**, ΔNa 0, **Δlactate −6·10⁻⁴**, ΔHb 0; 870,001 steps exactly |
| Physiology console (G7x follow-up) | tree ≤ 2,100 leaves | **1,057 leaves** (22 dropped, 18.4 KB); the `blood.*` rows land in the Blood group; 7c's machinery keys are in `INTERNAL_PREFIXES` (commit `82fb61b`) |

## 3. R51 addendum 15: the six rulings, as applied

| # | Ruling | Outcome |
|---|---|---|
| 1 | 7a `circ-events` 500 mL bleed (497.4 mL): re-specify as haemorrhage accounting | Re-specified, not `it.fails`. The event removes **500.00 mL**; capillary refill **2.61 mL**; the circulation loses **497.39 mL** = 500 − refill. The test asserts all three. Mechanism: `core.bledMl` and `circNetMl` bookkeeping (`b84aec6`, test `2c6059c`) |
| 2 | 7b OLV rigs: ventilate to normocapnia (PaCO2 38–45), bands unchanged, re-measure | `lung-unilateral`: RR 18 before isolation (PaCO2 40.5), then RR 40 at VT 350 during OLV (PaCO2 45 at 5 min, 47 at 10 min, 51 at 60 min). **It now passes**: nadir **90.6 % at 8.1 min**, fL 0.253. `lung-circ` at RR 40: PaCO2 42 → 50 over 30 min; qL share **0.307** (RR 14: 0.325; without 7c: 0.302) → **stays `it.fails`** with that number. **Deviation:** RR alone cannot hold 38–45 at VT 350 in these awake rigs, because Stage 3's calibrated dead space leaves too little alveolar ventilation (NR-7g-3); RR 40 is the closest. HPV potentiation by hypercapnia/acidosis and a mixed-venous PO2 term in `hpvStimulus` go to the calibration queue |
| 3 | 7g phenylephrine rows: first investigate the PaCO2 drift at fixed ventilation | **Finding: the rig, not 7c.** At RR 12 / VT 500 / PEEP 5, the awake patient's VCO2 of 196 mL/min meets an alveolar ventilation of 2.82 L/min (NR-7g-3), so PaCO2 goes 43 → 57 in 22 min **with or without 7c**. 7c changes neither VCO2 nor CO2 elimination. With 7c present, 7g's `acidosisFactor` sees the resulting acidosis (pH 7.27, ×0.68). The PD rigs now run at RR 20, which holds PaCO2 at 38–39 for the whole run. Phenylephrine 0.1 / 0.25 / 0.5 / 1.0 µg/kg/min: MAP **+12.3 / 22.6 / 29.6 / 33.2 %**, all in band. Norepinephrine 18.9 / 27.8 / 39.1 %. Bands unchanged |
| 4 | Pinned-`hbfRel` seam for 7g's Eleveld and acidosis tests | Test-only seam `ps.blood.pinHbfRel` (internal in the console). Eleveld Ce at 3 min: standalone **2.9960**, engine pinned **2.9960** (equality holds); live **3.0074**, asserted to be above standalone and under ×1.1. Acidosis SVR-rise ratio: pinned **0.400**, live 0.400; the live ≥ pinned assertion is kept |
| 5 | Reference resting CO = the circuit's own settled CO | `CO0` low-passes 7a's circuit CO, starting from `ref.co`, and latches at `CO0_SETTLE_S` = 120 s or at the first perturbation (a bleed or fluid, or any 7g drug on the bus; a lab draw does not count). At rest `hbfRel` is 1 on every rig. Unit rigs without a circuit keep CI × weight. Effect: class III lactate at 30 min **4.3** (3.5 with `ref.co`; band 3–5) |
| 6 | `concentrationPct` on 7g's dose log | 7c reads it when present (`DoseLike.concentrationPct`, default 3 %, a 15 min NaCl flow). 7d has not merged, so 7g's `DoseLogEntry` does not carry it yet. The unit test feeds it directly (plan Task 11) |

## 4. Other items the brief asked for

- **`blood.out.dkaSeverity` (R51 addendum 16).** This is the ketoacid drive 7c applies, `keto / DKA_KETO_MMOL_L` (25 mmol/L at `condition dka` severity 1), clamped to 0–1 and published every step (`166c893`). The test checks 0 at rest and 0.6 at severity 0.6. 7e reads it.
- **`metabolic()` stays exported** from `l2/resp/pipeline.ts` with the `gas: 'o2' | 'co2' = 'co2'` argument. The blood calls `metabolic(rs, t, 'o2')` (`l2/blood/pipeline.ts:170`). 7e replaces the body.
- **Pulse oracle (Task 22).** `packages/validation/**` is outside 7c's partition (8a owns it), so the three files were run from an uncommitted copy. That copy is kept at `scratch/7c-oracle/` for 8a to adopt. They read `PULSE_ORACLE_DIR` (`PME_PULSE_DIR` was also set). The numbers are ours vs Pulse 4.3.2, as deltas from baseline:
  - O2b (haemorrhage 20 %): BV −955.6 vs −987.9 mL **agree**; Hb −0.50 vs −0.36 **agree**; lactate +1.00 vs +0.06 **expect-differ-ok (D2)**; pH 0.00 vs −0.00 excluded (D1/D3).
  - O3b (1 L crystalloid): Hb −0.50 vs −2.48 **expect-differ-ok (D10)**; BE −1.60 vs −0.01 **expect-differ-ok (D3)**; Na 0.00 vs +0.88 **agree**.
  - O10b (insulin/glucose): K −0.90 vs −0.11 **expect-differ-ok** (Pulse has no transcellular K shift).
  - O13b (bicarbonate): pH −0.02 vs −0.00 and Na −2.00 vs +1.63, both **excluded**. **Harness finding for 8a:** the dose is dispatched at `atTick` 60 s, and the baseline `labs` is read at 60 s, after the dose has applied (Na 143 at 60 s, 141 at 660 s). The "delta" is therefore the post-bolus decay. The row is excluded, so no verdict depends on it, but the baseline should be read one tick earlier.
- **Numbers that moved after the FU-2 merge.** The 7c-relevant engine files (all `blood-*`, `l2/blood`, `circ-events`, `lung-circ`, `lung-unilateral`, `pk-acceptance-pd/pk`, `truth-event`) were re-run on the pre-merge commit `f5e12ca`, and every printed number was diffed. So was the scratch measurement. Nothing in §2 or §3 moved. The only changes:
  - dobutamine 5 µg/kg/min CO rose from **+3.0 % to +10.5 %** (β-blocked −1.6 → +3.4 %). This is FU-2's β venous term; main alone gives +11.8. It stays FU-2's `it.fails` (band 20–40).
  - the truth tree went from 1,054 to 1,057 leaves.
  - CPU per tick moved by noise.

## 5. `it.fails` records (R45: bands unchanged)

| Test | Band | Measured | Needs |
|---|---|---|---|
| 7b `lung-circ` OLV qL share (sibling) | ≤ 0.30 | 0.307 (RR 40 rig) | 7b calibration: HPV potentiation by hypercapnia/acidosis; mixed-venous PO2 term |
| 7c saline 2 L, engine (`blood-sanity-acid`) | Cl +6–8, BE −3 to −5 (D3) | Cl +5, BE −2.0 | albumin dilution offsets the chloride acidosis; Ali's R44 pass |
| 7c saline 2 L, core (`l2/blood/core`) | same | Cl +5.4, BE −2.1 | same |
| 7c acute respiratory alkalosis (`l2/blood/acid-base`) | 0.2 mmol/L per mmHg | 0.127 | cellular H+ release / alkalosis-stimulated glycolysis; R44 |

The other five sibling records from the plan's Task 15 no longer exist: 7a ×1 and the 7g rows were re-specified or fixed by rulings 1, 3 and 4, and `lung-unilateral` passes after ruling 2.

## 6. Deviations (open ones for Ali's R44 pass)

- The plan's own list of deviations stands. Still open: Q25 (lung-water τ and threshold), Q41/Q42 (regional supply dependence: `REGIONAL_FRAC` 0.6, `kAnaer` 0.05, hepatic flow (CO/CO0)²), Q44/Q46 (iCa contractility and QTc slopes), Q45 (initial offsets), Q47 (Hahn fit). Also open:
  - **Class III BE** −2.3 vs ATLS "−6 to −10". Not asserted; candidate mechanisms are shock-related unmeasured anions and phosphate release.
  - **D1 BE** −7.3 vs ≤ −12.
  - **D3 saline**: see §5.
  - **Alkalosis slope** 0.127 vs 0.2: see §5.
  - **Child desaturation** 130.0 s, on the band edge (Q34).
  - **COHb over-reading** uses "COHb reads as O2Hb", not the tables' regression (Q22).
  - The **isocapnic Bohr coefficient** is Dash–Bassingthwaighte's (−0.34 vs −0.48).
  - **Plasma-Lyte gluconate** is unmetabolised until 7d.
  - **Succinylcholine K** is an additive pulse (decision 7). Burns severity 1 gives +6.5.
- **Ruling 2 deviation:** the OLV rigs reach PaCO2 45–51 at RR 40, not 38–45 (§3).
- **Task 22** committed nothing (partition). The oracle files remain untracked in the worktree and in `scratch/7c-oracle/`.
- **Screenshots** were taken by the Task 24 session (`apps/demo/scripts/stage7c-shots.mjs`) before the FU-2 merge. FU-2 changed MODELED rhythm rates and 7g details. The page runs the default mode, and no 7c number moved (§4), so they were not re-shot.
- **Commit trailer:** Tasks 1–25 carry the plan's `Claude Fable 5.1` line. This session's commits carry the harness's `Claude Opus 5.5 (1M context)` line.

## 7. Screenshots (`docs/gates/stage-7c/`, 1420 × 640, 216-colour PNG, 24–27 KB each)

- **baseline**: the stage7c page at rest, with the live chemistry panel (pH 7.40, lactate 1, K 4.2) beside the monitor.
- **haemorrhage-30min**: class III story at ×4. ART falls, lactate rises and BE falls in the live panel, and an ABG has been sent.
- **haemorrhage-abg**: the ABG result panel, drawn at 1812 s and resulted at 1932 s (lactate 2.9, pH 7.27), next to the live truth at 2494 s (lactate 3.5, pH 7.25, ART 69/47). HR stays 75 because the page runs without the MODELED reflex.
- **hyperk-sux**: burns = 1, succinylcholine then calcium at 240 s. Live K **7.7** and iCa 1.45 at 252 s, peaked T in II/V5.
- **hyperk-calcium**: the ECG after calcium, with the QRS narrowed.
- **saline-2L**: 2 L of 0.9 % saline at 60 min. **Cl 109 ↑, BE −2**, Hb 12.5, AG 8.

## 8. Requests to other stages (updated)

- **7a:** keep `hs.circ.t`, `hs.circ.vol`, `hs.circ.ref.co` and `hs.circOut.pPv`, and keep writing `ext.kChem`. With ruling 5, 7c no longer depends on `ref.co` matching the rig. The resting CO vs `ref.co` gap (−9 … +10 %) stays a 7a calibration item. If 7a's O2 oracle still uses Pulse's `Flow` field, change it to `FlowRate`.
- **7b:** one `it.fails` remains, the OLV flow share of 0.307. Candidate mechanism: HPV potentiation by hypercapnia/acidosis and a mixed-venous PO2 term. 7b may read `blood.out.cop` and `blood.core.fl.kfMult`.
- **7d (not merged):**
  - fill `ps.blood.core.renal = { uopMlH, excretion: { k, na, cl, gluconate } }` and `ps.blood.core.liver = liverFn · tempF`;
  - add `concentrationPct` to 7g's `DoseLogEntry` (7c already reads it);
  - read `blood.out.{hb, albuminGL, bvRel, lactate, hbfRel}`;
  - FU-2's line: `organsCtx.setHr` must call `holdRate(...)`.
- **7e (not merged):**
  - read `blood.out.dkaSeverity` (now published);
  - add endogenous catecholamine/insulin K as an ENDOGENOUS term only (7g's `kShift` stays the only exogenous one);
  - MH K/lactate release;
  - the IV heat term replaces decision 16's `rs.temp.tc -=` line (E-7e-1);
  - replace `metabolic()`'s body (its `gas` argument is ready).
- **7f (not merged):**
  - Winter's compensation reads `blood.core.ab.hco3`;
  - capillary leak via `blood.core.fl.kfMult` / `fl.sigma`;
  - `patient.blood.burns` drives the sux K rise.
- **7g:**
  - the observer contract holds;
  - the salbutamol row's "K −1.4 at full effect (7c)" text is stale (measured −0.54 at 30 min);
  - the PD rigs are now normocapnic at RR 20.
- **8a:**
  - adopt `scratch/7c-oracle/` (blood scenarios, Node shim, test) into the validation package;
  - read O13b's baseline before the dose tick;
  - add to the calibration list: the ATLS BE row, D1's BE ≤ −12, D3's saline BE/Cl, and the 0.2 per mmHg alkalosis slope.

## Partition

- Engine edits outside `src/l2/blood/**` are the plan's anchored blocks: engine wiring, `types.ts`, the `resp/pipeline.ts` blood view, `gas/o2.ts` ODC swap, and E-7c-1's three optional inputs in 7b's `mix-o2.ts` / `lung.ts` / `conditions.ts`.
- Sibling test edits are only those ruled in addendum 15.
- The console follow-up touches `organs.ts` / `truth.ts`.
- The renderer lab panel is new (happy-dom dev dependency for its test, N-009).
- NOTICES rows N-P08/N-P09/N-P23 and `LICENSES/Apache-2.0.txt` are added.
- `packages/validation/**` is untouched in git.
