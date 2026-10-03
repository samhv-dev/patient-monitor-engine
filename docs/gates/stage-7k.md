# Gate 7k — respiratory mechanics and lung volumes (R57)

Branch `stage-7k-respiratory-mechanics`, PR "Stage 7k: respiratory mechanics and lung volumes". Plan:
`docs/plans/stage-7k-respiratory-mechanics.md`. Every number below is measured on the branch (MODELED, seed 7, 5 sim-min
unless stated); the plan's prototype value stands beside it.

## 1. Head and base

- Tested head: `77dc400` (Tasks 0–6 + `git merge origin/main` at `b8a8183`; the merge brought `docs/RESUME.md` only, so the
  tested code equals the Task 6 code `9d0efbf`). The gate note commit sits on top.
- Base: `origin/main` `176f702` (FU-6 merged, PR #28; V.1 merged, PR #26; FU-8 Part A merged, PR #27).
- **Order ruling (orchestrator, 2026-10-03):** 7k runs NOW, in parallel with FU-7 (cloud, `fu-7-drug-layer`) and FU-9
  (local, `fu-9-blood-fluids`) — not after FU-7 as the plan's R60 line says. Neither had merged at the gate
  (`git log origin/main` has no FU-7/FU-9 merge). **Whichever of 7k / FU-7 / FU-9 merges second re-verifies**: the
  SKIP_PATH line in `src/truth.ts` is a union (keep every entry), the 12-drug truth tree (§4: 2 075 of 2 100), and the
  slow lists in `packages/engine-core/vite.config.ts` (7k's one entry stays in `SLOW` and `SLOW_A`; FU-9 creates
  `slow-c` — keep both sides).

## 2. What 7k adds (one owner per quantity)

| Truth path | Glossary label | Owner | How |
|---|---|---|---|
| `resp.mechanics.{ppeak,pplat,peepTot,peepi,dp,cstat,cdyn,rinsp,flow,vt}` (+ internal `kind`, `t`) | Ppeak, Pplat, PEEPtot, PEEPi, ΔP, Cstat, Cdyn, Rinsp, V̇insp, VT | 7k (lungs) | per breath; holds on a copy (D1); Rinsp null without square flow (F7); set PEEP stays `resp.driver.vent.peep` |
| `resp.mechanics.{pesEi,pesEe,plEi,plEe,elErs}` | Pes,ei/ee (estimate), PL,ei/ee, EL/Ers | 7k | awake spontaneous: the model's pleural pressure (West); supine ventilated/anaesthetised: 6.9 + 0.22·(BMI − 22.5)₊ + ΔPpl (D4) |
| `resp.vd.{anat,app,alv,phys,vdvt,peco2}` | VD anat, VD app, VD alv, VD phys, VD/VT, PĒCO₂ | 7k on FU-4's `physicalDeadSpace` | Enghoff with the inspired-CO2 term (D5) |
| `resp.volumes.frc` | FRC | FU-6 `frcNow` via `aeratedFrc` (one function) | D6 |
| `resp.volumes.{frcSit,tlc,rv,vc,erv,ic,cc,fvc,fev1,ratio,pef,fet,pattern,pred.*,fe.*}` | FRC (seated, PFT), TLC, RV, VC, ERV, IC, CC, FVC, FEV₁, FEV₁/FVC, PEF, FET | 7k — the ONE clinical TLC/RV (D17; `TLC_ML_KG`/`RV_ML_KG` relabelled as the model's internal P–V range) | D7–D11 |

Not duplicated: the ventilator link's `Measured.PIP/PLAT/autoPEEP/Cstat/Raw` (V.1) stay the ventilator's own readings.
Proposed glossary entries N1–N7 (unnumbered; Stage 9 numbers them after 294) are in the plan's "Requests → Stage 9".

## 3. Prototype vs branch (every readout × every patient)

### 3a. Before-numbers on the real tree (Task 0 Step 4, before any 7k code; the "before" column)

| rig (5 sim-min) | lungState Crs / R / autoPEEP / VD / FRC | `lung.pInsp` / `lung.peepTot` | PaCO2 |
|---|---|---|---|
| healthy GA, VCV 500 × 12, PEEP 5 | 55 / 10 / 0.1 / 127 / 1 400 | 14.1 / 5.1 | 35.7 |
| healthy awake | 54 / 10 / 0.1 / 154 / 2 100 | 8.9 / 0.1 | 39.2 |
| bronchospasm 1, Pmax 80 | 52 / 60 / 11.9 / 127 / 1 400 | 26.8 / 16.9 | 40.8 |
| ARDS 0.67, 420 × 18, PEEP 10 | 35 / 12 / 0.2 / 127 / 952 | 21.8 / 10.2 | 40.1 |
| obesity 1, BMI 40 | 35 / 13 / 0.1 / 128 / 322 | 19.1 / 5.1 | 40.1 |
| COPD 0.75, 65 y, 490 × 14 | 68 / 25 / 3.7 / 127 / 1 680 | 16.2 / 8.7 | 36.3 |
| ILD 0.6, 60 y, 490 × 14 | 32 / 13 / 0.1 / 127 / 980 | 20.2 / 5.1 | 35.8 |
| simple pneumothorax 0.3 R | 45 / 10 / 0.1 / 127 / 1 169 | 16.4 / 5.1 | 36.2 |
| **4 y child** 16 kg 102 cm, ETT, 112 × 17 (R50 F10 re-measure) | 13 / 44 / 0.3 / 26 / 128 | 14.1 / 5.3 | 35.7 |

The same nine rigs re-run after Task 4 print IDENTICAL lines (7k changes no existing number). The child is unchanged by
V.1's executed E-V1-1 CO reference (prototype base: the same 13 / 44 / 26 / 35.7).

### 3b. Mechanics per breath (`resp-mechanics.test.ts`; branch = prototype unless "proto …")

| patient (rig) | Ppeak | Pplat | PEEPtot / PEEPi | ΔP | Cstat | Cdyn | Rinsp | Pes ei/ee | PL ei/ee | band (source) |
|---|---|---|---|---|---|---|---|---|---|---|
| healthy, GA | 17.1 | 14.2 | 5.1 / 0.1 | 9.1 | 54.7 | 41.2 | 9.9 | 10.8 / 8.3 | 3.3 / −3.3 | Ppeak < 30, Pplat 10–20, ΔP 6–12, Cstat 45–80, Rinsp 6–15 (Hess & Kacmarek; glossary §5.6) — **in** |
| healthy, awake spontaneous | null | null | null | null | null | null | null | −9.4 / −5.4 | +9.4 / +5.4 | West: Ppl ≈ −5 at FRC, ≈ −8 end-insp.; PL,ee 3–7 — **in** |
| bronchospasm 1, Pmax 80 | 44.5 | 26.4 | 16.8 / 11.8 | 9.6 | 51.9 | 18.0 | 60.3 | 14.1 / 11.6 | 12.3 / 5.2 | Ppeak ≥ 40, PEEPi 6–12, Rinsp ≥ 40, Cdyn < ½ Cstat — **in** |
| bronchospasm 1, default Pmax 40 (console, e2e shot) | 40.0 (= Pmax) | 25.7 | 17.0 / 12.0 | 8.7 | 52 | 20 | — (null, F7) | 13.9 / 11.6 | 11.8 / 5.4 | the limit reads Pmax, VT 450 < 500 set (FU-6 D18); proto 25.5 / 11.9 |
| ARDS 0.67, 420 × 18, PEEP 10 | 26.4 | 21.9 | 10.2 / 0.2 | 11.8 | 35.3 | 25.6 | 11.9 | 10.9 / 8.8 | 11.0 / 1.4 | Cstat 30–40, ΔP ≤ 15, PL,ee 0–6 — **in** |
| obesity 1, BMI 40 | 23.0 (proto 23.2) | 19.2 (19.3) | 5.0 / 0.0 | 14.2 (14.3) | 35.2 | 27.7 | 12.8 | 14.6 / 11.7 | 4.6 (4.7) / −6.7 | Cstat 24–40, Pes,ee ≥ 10, PL,ee < 0 — **in** |
| COPD GOLD 3, 65 y, 490 × 14 | 24.4 (24.5) | 15.8 (15.9) | 8.6 / **3.6** | 7.2 (7.3) | 67.7 | 30.8 (30.9) | 25.2 | 12.3 / 9.8 | 3.5 (3.6) / −1.2 | Cstat 43–75, Rinsp 16–33 — **in**; PEEPi 4–8 — **3.6, `it.fails`** |
| ILD 0.6, 60 y, 490 × 14 | 24.8 | 20.4 | 5.0 / 0 | 15.3 | 31.8 | 24.7 | 12.9 | 10.2 / 7.8 | 10.2 / −2.7 | Cstat 28–36, ΔP 13–15.5 — **in** |
| simple pneumothorax 0.3 R | 19.1 | 16.1 | 5.0 / 0 | 11.0 | 45.2 | 35.4 | 10.2 | 10.6 / 8.1 | 5.5 / −3.1 | Cstat 40–50 — **in** |
| 4 y child, 112 × 17 | 18.3 | 14.1 | 5.3 / 0.3 | 8.9 | 12.5 (0.78 /kg) | 8.5 | 43.4 | 10.7 / 8.3 | 3.4 / −3.0 | Cstat 0.6–1.2 /kg, Rinsp ≥ 20, CC null — **in** |

**Awake vs anaesthetised pleural / transpulmonary (F4 ruling):** awake spontaneous Pes −9.4 / −5.4 cmH2O (the model's
pleural pressure: 7a P_PL0 −4 mmHg, swing 4 cmH2O), PL,ei +9.4 / PL,ee +5.4 (positive at FRC, West). Anaesthetised
and ventilated (supine balloon value): Pes 10.8 / 8.3, PL,ei +3.3 / PL,ee −3.3 (Talmor 2008 / Loring 2010 report a
negative supine PL,ee); obese BMI 40: Pes,ee 11.7, PL,ee −6.7.

### 3c. Dead-space set (Enghoff)

| patient | VD anat / app / alv / phys (mL) | VD/VT | band |
|---|---|---|---|
| healthy GA, ETT | 77 / 50 / 13 / 140 | **0.28** | 0.30–0.45 — **`it.fails`** (Q-7k-5) |
| healthy awake | 154 / 0 / 1 / 155 | 0.33 | 0.20–0.35 — in |
| bronchospasm 1 | 77 / 50 / 138 / 265 | 0.53 | ≥ 0.45 — in |
| ARDS 0.67 | 77 / 50 / 109 / 236 | 0.57 | 0.5–0.65 — in |
| COPD GOLD 3 | 77 / 50 / 126 / 253 (proto 131 / 258) | 0.52 | ≈ 0.50 — in |
| ILD 0.6 | 77 / 50 / 56 / 183 | 0.38 | — |
| obesity BMI 40 | 78 / 50 / 12 / 139 (proto 2 / 129) | 0.28 (proto 0.26) | — (FU-8's body-size rule moved the obese PaCO2/e; not asserted) |
| pneumothorax 0.3 R | 77 / 50 / 24 / 151 | 0.30 | — |
| child 4 y | 18 / 8 / 5 / 30 (proto 6 / 31) | 0.27 (proto 0.28) | — |

VD anat + VD app equals lungState's series dead space in every rig (127 = 77 + 50; child 26 = 18 + 8): one dead space.

### 3d. Volumes and the forced expiration (`volumes.test.ts`; identical to the prototype)

| patient | TLC | RV | FRC bedside | FRC seated / ERV | FVC / FEV1 % pred | FEV1/FVC | PEF % pred | pattern | band |
|---|---|---|---|---|---|---|---|---|---|
| healthy 40 y M 175 cm | 6 903 mL (ECSC 6 902.5) | 1 943 | awake 2 100 → GA 1 400 | 3 405 / 1 463 | 100 / 100 (4 686 / 3 875 mL) | 0.83 | 100 (550 L/min) | normal | ECSC — in |
| COPD GOLD 1 / 2 / 3 / 4 (65 y) | 100 / 105 / 115 / 125 % | 115 / 140 / 175 / 220 % | GA 1 680 (GOLD 3) | ERV 971 / 714 / 572 / 365 | FEV1 **71** / 55 / 41 / 28 % | 0.61 / 0.51 / 0.40 / 0.31 | 72 / 58 / 47 / 35 | obstructive | GOLD 2–4 in; GOLD 1 ≥ 80 % — **71 %, `it.fails`** |
| ILD 0.3 / 0.6 / 0.9 (60 y) | 75 / 60 / 45 % | 75 / 60 / 45 % | GA 980 (0.6) | — | FVC 75 / 60 / 45 % | 0.80 / 0.82 / 0.84 | 76 / 62 / 48 | restrictive | FVC 70–80 / 50–70 / < 50 — in |
| acute severe asthma (1) | 110 % | 200 % | — | ERV 542 | FEV1 35 % | 0.39 | **39** | obstructive | FEV1 < 50 %; PEF 33–50 % (BTS/SIGN 2019) — in |
| obesity BMI 40 | 90 % | 100 % | 322 (reported, D16) | 2 384 / 441 | FVC 86 / FEV1 87 % | 0.84 | 87 | normal | TLC ≥ 80 %, ERV < 50 % pred — in |
| pneumothorax 0.3 R | 84 % | 84 % | 1 169 | 2 843 / 1 221 | FVC 83 % | 0.86 | 88 | normal | TLC × (1 − 0.55·0.3) — in |
| 4 y boy 102 cm (pred.) | 1.40–1.50 L (Zapletal) | 0.38–0.42 L | 128 (GA) | 0.65–0.72 L | — | 0.90 | model | — | in |

**PEF vs FEV1 in obstruction (F3):** PEF % predicted tracks FEV1 % predicted within ±15 points — acute severe asthma
39 vs 35, COPD GOLD 1–4 72/58/47/35 vs 71/55/41/28, ILD 0.6 62 vs 62. **Bronchodilator (FU-6 smooth muscle):** asthma
0.7 FEV1 2 386 → 3 166 mL (+32.7 %, +780 mL; ATS/ERS ≥ 12 % and ≥ 200 mL — in); COPD 0.5 2 375 → 2 447 (+3.0 %, < 12 % — in).

## 4. Tests

- Engine fast set (`PME_TEST_SET=fast`): before 277 files / 1 227 passed / 1 skipped / 0 failed; after Task 4 279 files /
  1 247 passed / 1 skipped (+ `volumes` 13, `breath` 7). The full run under a machine load average of 160–225 (three
  other executors running) timed out `engine-rate-sweep` (60 s) and `truth-event`'s pruneTruth cost (2.0 ms > 1 ms);
  both pass re-run on their own (8/8, pruneTruth 0.35 ms) — load, not 7k. Gate run (`PME_TEST_SET=fast pnpm -r test` on the tested head, lower load): **279 files / 1 247 passed / 1 skipped / 0 failed**.
- Engine slow-a (with `resp-mechanics.test.ts`, R50 F1): **46 files / 180 tests passed** (the job was killed by an external SIGTERM after 26 files / 148 tests, all green — a shared-machine event; the 20 remaining files were re-run: 20 / 32 passed). `resp-mechanics.test.ts` wall time: **51.0 s**
  locally in slow-a under a load average of 25–50 (64 s in the Task 4 run under load; prototype 13.9 s idle). slow-b (untouched by 7k): **45 files / 252 passed** (1 614 s; = G-FU6's 252).
- `truth-event.test.ts`: real tree 1 335 → **1 358** leaves (prototype 1 321 → 1 344); synthetic 12-drug tree 2 052 →
  **2 075** (prototype 2 038 → 2 061; **cap 2 100, margin 25**). The +14 on the base since the prototype is V.1 + FU-6 +
  FU-8 Part A as merged.
- Demo console (`src/physiology-console`): 141 → 152 passed (`mechanics-panel` 11). e2e `stage7k-mechanics.e2e.ts`
  (Chromium): 1 passed, 26.5 s, no files written; `PME_SHOTS=1`: 1 passed (shots 33.8 / 43.8 KB). Full e2e (`pnpm build` then `CI=1 pnpm test:e2e`, Chromium + WebKit): **62 passed, 24 skipped, 2 failed** — the two
  WebRTC tests (`stage6a.e2e.ts` host + remote + viewer over rtc, `stage6a-latency.e2e.ts`) that fail locally on main
  and pass on CI (recorded at G-FU6); 15.2 min.
- `pnpm -r test` (fast): audio 58, skins 179, engine-core 1 247 (+1 skipped), controller 223, ventilator 97, renderer
  89, validation 107 (+11 skipped), demo 152 — all green. `pnpm -r typecheck`: clean. `pnpm build`: clean.
- tick-bench (ventilated VCV, `perf:ticks --seconds 60`, A/B interleaved by swapping the two Task 4 source files under
  the same load): p50 before 0.910 / 0.973 / 1.071 ms, after 0.967 / 0.958 / 1.086 ms (median 0.97 → 0.97; prototype
  0.53 → 0.54 on an idle machine). `tick-bench.test.ts` passes.
- **Byte identity (R45):** every non-truth event and the final circulation/gas/lung/blood state of three ventilated
  rigs (healthy, COPD 0.75, tension pneumothorax 0.8 R; 240 s) hash `0b35771bebdfd874 f7d5751c3e14ea5a 0719044f03e3d00f`
  before AND after 7k (prototype base hashes differ — a different base — and were also identical before/after).

## 5. `it.fails` added by 7k (R45)

- `volumes.test.ts` — COPD GOLD 1 FEV1 ≥ 80 % pred with FEV1/FVC < 0.70: measured **71 %** (ratio 0.61; prototype 71 %; Q-7k-2).
- `resp-mechanics.test.ts` — healthy GA Enghoff VD/VT 0.30–0.45: measured **0.28** (VD phys 140 mL; prototype 0.28; Q-7k-5).
- `resp-mechanics.test.ts` — COPD GOLD 3 PEEPi 4–8 at RR 14: measured **3.6** (lungState 3.7; the 7b lung's own value,
  R46 calibration row; prototype 3.6).

No existing test, band or `it.fails` changed except the two console label tests of E-7k-2.

## 6. Calibration queue (R44, Ali)

Ali's: Q-7k-1 (bedside FRC scale vs ECSC), Q-7k-2 (COPD GOLD 1), Q-7k-5 (VD/VT under GA), Q-7k-6 (re-base the model's P–V
range on ECSC, v1.1) — numbers in the plan's "Open questions". Ruled by the orchestrator: ECSC + fixed ratio in v1.0, GLI +
LLN in v1.1; closing capacity a readout in v1.0, a mechanism in v1.1. The obese FRC double count is FU-8's (not listed here).

## 7. Exceptions used

E-7k-1 (`src/truth.ts` SKIP_PATH `resp.brk`, `resp.lung.mp` — the 7x console loses its 30 `resp.lung.mp.*` model-internals
rows, and `lung-labels.test.ts`'s curated `resp.lung.mp.units.3.rIn` label row now describes a path the engine no longer
publishes), E-7k-2 (console label tests: 14 → 15 groups; `resp.lung.peepTot` relabelled "Mean end-expiratory alveolar
pressure"), E-7k-3 (`gas/params.ts` `defaultHeightCm`).

## 8. Re-anchoring (Task 0 Step 3)

`fu-4-verify.py` on `git archive` of `176f702` + the plan: **8 creates, 20 edits, 3 errors** — all three declared in
Task 0 Step 3. Each was re-anchored on the landed text with the SAME change (scratch copy of the plan; the committed
plan is verbatim); with them: 8 creates, 23 edits, 0 errors, and every task's blocks applied by the same script.

| task / file | plan anchor | landed text | cause | change made |
|---|---|---|---|---|
| T4 `l2/resp/pipeline.ts` Edit 1 | `import { CI_LPM_PER_KG, CO_REF_LPM, GA_METABOLIC,` | `import { CI_LPM_PER_KG, coRefLpm, GA_METABOLIC,` | V.1 E-V1-1 (b83631e) replaced `CO_REF_LPM` by `coRefLpm` (R50 F10, declared) | added `apparatusDeadSpaceMl`, `defaultHeightCm`, `FRC_AWAKE_ML_KG` to the landed line |
| T4 `vite.config.ts` Edit 1 | `'test/engine/af-pulse-deficit.test.ts', …\n];` (end of `SLOW`) | `SLOW` now ends with FU-8's `'test/engine/fu8-*.test.ts', …` | FU-8 Part A added its glob after af-pulse-deficit | 7k's entry appended at the end of `SLOW` |
| T4 `vite.config.ts` Edit 2 | `'test/engine/clinical-suite.test.ts'];` (end of `SLOW_A`) | `SLOW_A` is a multi-line list (FU-8 glob + FU-6's 16 entries) ending `'test/engine/resp-suite.test.ts',\n];` | FU-8 Part A and FU-6 extended `SLOW_A` | 7k's entry appended at the end of `SLOW_A` |

The three "(FU-6 line)" anchors (`lungDrive`, `lungMechStep(…, ld.pLimit)`, the SKIP_PATH line ending
`'resp.wakeMmHg']);`) matched exactly once on the merged FU-6 (FU-7 has not merged, so no FU-7 SKIP_PATH union yet).
Preconditions (Task 0 Step 1): `frcNow` (pipeline.ts:397), `physicalDeadSpace(pat, artificialAirway)`, `pLimit`,
`hold: 'insp' | 'exp' | null` (ventilator `types.ts:55`) all present; FU-7 not merged (order ruling, §1).

## 9. Evidence

- `docs/gates/stage-7k/vcv-healthy.jpg` (33.8 KB): Ppeak 17.1, Pplat 14.2, PEEPtot 5.1, ΔP 9.1, Cstat 55, Rinsp 9.9,
  FRC 2 100 (the console patient is not anaesthetised), TLC 6 903, FEV₁/FVC 83 %, PEF 550 L/min, pattern normal.
- `docs/gates/stage-7k/vcv-bronchospasm.jpg` (43.8 KB): Ppeak 40.0 (= the default Pmax, FU-6 D18), PEEPi 12.0, Rinsp "—"
  (null: not square flow, F7 — the plan's Task 6 text "Rinsp ≈ 48" predates F7), VT 450, VD/VT 50 %, FEV₁/FVC 30 %
  (plan text 29 %), PEF 168 L/min, pattern obstructive.

Both taken with `PME_SHOTS=1` (Chromium); CI runs the smoke only. Long labels ("PEEPi (auto-PEEP)", "FRC (seated,
PFT)", "Spirometry pattern") are ellipsised in the 7x console's label column (cosmetic; Stage 9 re-presents the rows).
