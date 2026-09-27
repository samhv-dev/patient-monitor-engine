# Stage 7e — executor notes: Task 20 stopped on two 7e × 7f interplay failures

*2026-09-27, branch `stage-7e-endocrine-thermal` at 151aa54 (main at 19cbb28 = 7a, 7b, 7g, 7x, FU-2, 7c, 8a, 7f; 7d not yet on main).*

Tasks 12–19 are done, committed and pushed (Task 20 is unticked). After merging 7f (0fa2b41) and taking over 7f's two
hand-overs (6880ae2: R-7f-4, 7e alone validates `stimulus`; R-7f-8, `EndoState.cascade`), Task 20's full run
(`CI=1 pnpm -r test`) has **two new failures in sibling stages' tests** that the plan did not expect. Both are the
same interplay: 7f now publishes `ps.neuro.thermoDepth`, and 7e's heat model takes depth = max(7f `thermoDepth`,
the Stage 3 flag) (R51 addendum 16). So an anaesthetic given through 7g/7f cools the patient by redistribution even
without the Stage 3 `thermal { anaesthesia: 'general' }` flag. Before the 7f merge, `thermoDepth` was absent and
these rigs stayed at 36.8 °C. Per the brief I stopped Task 20 (no gate note, no PR). I did not edit either test, and
no band was touched (R25/R45).

## 1. `test/engine/pk-acceptance-pk.test.ts` › "Eleveld 2 mg/kg in the engine equals the standalone model to 1e-9" (7g)

- The assertion is `toBeCloseTo(x, 6)`. Measured Ce at 240 s: engine **2.996568** vs standalone **2.996015**, a
  difference of 5.5e-4 (ratio 1.000185).
- Cause, from a probe of the same rig: after propofol 2 mg/kg at 60 s, 7f's `thermoDepth` goes 0 → 0.69 → 0.93 →
  0.97 at 120/180/240 s. 7e's thermal depth follows it, and the core cools by redistribution: 36.80 → 36.75 → 36.70
  → **36.65 °C** at 240 s. 7g's own temperature clearance term then acts:
  `pk/pipeline.ts:150`, −5 %/°C below 36.8. Clearance falls slightly and Ce runs 0.02 % above the standalone model.
  The rig already pins `blood.pinHbfRel = 1` so that only PK is compared. It does not pin temperature. The test
  passed on this branch before the 7f merge (Task 13 run).
- Options (not mine to choose; 7g owns the test): pin the core temperature in this rig as well (e.g. `setCoreTarget`
  or a 7e seam), or accept that the engine adds the physiological hypothermic clearance change.

## 2. `test/engine/neuro-longrun.test.ts` › "6 h with a maintenance anaesthetic … DI stays in band" (7f)

- The assertion is `lastDi > 30`. Measured: **DI 30** at 6 h (CI horizon). The 24 h local run was not attempted and
  would be lower.
- Cause, from a probe of the same rig (sevoflurane 2.5 % at FGF 6 plus remifentanil 0.1 µg/kg/min, ventilated,
  unwarmed, no Stage 3 GA flag). 7f's `thermoDepth` drives 7e's anaesthetic thresholds, and the core cools as an
  unwarmed GA patient does (R39-7). The R-7f-8 hand-over now makes 7f's hypothermic MAC reduction live:

  | h | 0.17 | 1 | 2 | 3 | 4 | 5 | 6 |
  |---|---|---|---|---|---|---|---|
  | core °C | 36.41 | 35.64 | 35.32 | 35.04 | 34.79 | 34.55 | 34.34 |
  | `endo.cascade.macF` | 0.970 | 0.932 | 0.916 | 0.902 | 0.889 | 0.878 | 0.867 |
  | DI | 49 | 38 | 35 | 33 | 31 | 30 | 30 |

  Both mechanisms are the ones the rulings ask for: depth = max(7f, Stage 3) and R-7f-8. The 7f band was set on a
  base without 7e, where the core stayed at 36.8 °C and `macF` was 1.
- Options: a ruling on whether the 7f long run should carry forced-air warming (a normothermic maintenance case),
  or whether its DI band should be re-derived with 7e present. R45: I have not moved it.

## Also in the same run (anticipated by the plan)

- Q-7e-8: `resp-oxygen` 5b and `blood-stage3-recheck` child desaturation **128 s** against the band 130–190. It was
  already 129 s on this branch before the Task 12 wiring (baseline run). The plan expected 128.

## Test counts at 151aa54 (CI=1)

engine-core 1,132 passed / 4 failed (the two above + Q-7e-8 ×2) / 1 skipped (1,137); audio 58; skins 169;
ventilator 88; controller 203; renderer 68; validation 93 (+6 skipped); demo 116. Typecheck, build and
check-notices pass. Not yet run for Task 20: `PW_SYSTEM_CHROME=1 pnpm test:e2e` (the stage7e e2e passed in Task 18,
2.3 min), and the PME_TEST_SET fast/slow split.

## Numbers ready for the gate note (all measured on this branch)

| Check | Band | Measured |
|---|---|---|
| R39-7 unwarmed GA | −0.5…−1.2 at 30 min / −1.0…−1.6 at 60 / 0.3–0.6 °C/h | −0.93 / −1.25 / 0.38 |
| R39-7 forced air from induction, first-hour nadir | −0.6…−1.2 | −0.90 |
| MH EtCO2 at 0/5/10/15/20 min; slope 10–15 min | ≥ 60 at 10 min; 3–5 mmHg/min | 40/48/63/84/102; 4.2 |
| MH core at 15 min / HR / K at 20 min | ≥ +1 °C / +30 bpm / 5.5–6.5 | +1.17 / 75 → 141 / 6.0 |
| Dantrolene EtCO2 turn (fixed MV) | 5–10 min | peak 110 at +6.0 min |
| Dantrolene + MV × 2: HR at +20 min | < 100 | 121, core 39.78 (`it.fails`, Q-7e-5) |
| Stimulus HR | +15–25 % | 75.1 → 93.8 (+24.8 %) |
| Cortisol at 1…6 h | > 1500 at 4–6 h | 999/1307/1465/1546/1588/1609 |
| Type 1 + insulin 20 U/h under GA | < 65 mg/dL, HR ≥ × 1.2 | 55 mg/dL, 75 → 103 |
| Sepsis MANUAL | HR 110–130, core > 37.8, glucose > 105 | 120, 38.76, 169 |
| Sepsis MODELED warm MAP/HR/CO/SVR | 55–60 / 115–130 / 7–9 / 500–700 | 61 / 131 / 5.0 / 861–866 (4 `it.fails`, Q-7e-7) |
| Sepsis MODELED cold CO/SVR | 3–4 / 1200–1500 | 3.8 ✓ / 1507 (`it.fails`, Q-7e-7) |
| Anaphylaxis III MAP | fall ≥ 30 % in 10 min; rescue ≥ 80 % | 94 → 62 (−34 %) → 101 (107 %) |
| Thyroid storm, 2 h awake | core 38.5–41, VO2 × 1.3–1.8, HR 110–150, SVR × 0.55–0.65 | 38.60, × 1.57, 135, × 0.60 |
| Cold IV, 1 unit (280 mL at 4 °C / 300 s, 70 kg) | ≈ 0.25 °C | 0.235 °C |
| Determinism / CPU / long run | identical / ≤ 0.05 ms per tick / exact index | identical / 0.06–0.07 µs / exact; 24 h local 324 s wall, 6 h CI 53 s |

These numbers were measured after the 7f merge as well: the MANUAL and MODELED acceptance files re-ran green with
the same values (warm SVR 861 vs 866 before).

Sepsis warm attempts within the tables (Task 15 Step 3; warm row dV0Frac / extraSymp, reverted afterwards):

| dV0Frac / extraSymp | warm MAP / HR / CO / SVR | cold CO / SVR |
|---|---|---|
| 0.15 / 0.5 | 60 / 133 / 4.8 / 879 | 3.8 / 1509 |
| 0.10 / 0.5 | 62 / 129 / 5.1 / 851 | 3.8 / 1504 |
| 0.12 / 0.8 | 63 / 133 / 5.1 / 886 | 3.8 / 1507 |
| 0.15 / 0.8 | 62 / 136 / 4.9 / 900 | 3.8 / 1511 |

Each attempt only trades the HR band against the MAP band. None reaches CO 7–9 or SVR 500–700, so the plan's values
are kept (the 7a baroreflex/venous-return requests stand).

Screenshot teaching moments (Task 18): `mh-20min` shows epinephrine 486 pg/mL, stress index 93, MH activity 1 and
sweating. `hypothermia-60min` shows core 35.5 °C, but the vasoconstricted flag is off: 35.5 is above the GA
vasoconstriction threshold of 34.8, so the script comment's "vasoconstricted" does not hold at 60 min.
`hypoglycaemia-60min` shows GLU 3.2 mmol/L. The panel paints that amber, because its red level is < 3.0; the script
comment said red below 3.5. `sepsis-cold` shows the desaturation alarm (SpO2 89) on the unventilated septic patient.
The PNGs were palette-quantised to 41–43 KB (≤ 60 KB).

Other deviations so far:
- `types-endo.ts` imports `StimulusEvent` from `types-neuro.ts`, as the plan's Task 1 note asks when 7f lands first.
- NOTICES N-P18 also names `TissueModel.cpp`, because `glucose.ts`'s Apache header cites its liver-release
  threshold.
- The N-P17/N-P18 rows sit at the end of the Pulse table, after N-092.
