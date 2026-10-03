# Gate note — FU-9 Parts A and C: blood, fluids, acid–base and kidney integration

Branch `fu-9-blood-fluids`, from `origin/main` 176f702 (FU-3, FU-4, FU-5, V.1, FU-8 Part A and FU-6 merged), merged with
`origin/main` at the gate (9b405b9: docs only since 176f702). Plan: `docs/plans/fu-9-blood-fluids.md` (written and verified
on 2473f0b; every block re-verified here, §6). Executor: one local session, Tasks A0, A0b, A1–A13, C0–C1 and this gate.
**Part B (B0–B2: F10 hypokalaemic NMB potentiation, F7 COPD chronic hypercapnia) is NOT in this PR** — FU-7 has not merged
(it is executing on `fu-7-drug-layer`); Part B becomes a later PR from the same plan, as the plan's Global Constraints
say. Measurements are seed 7 on this Mac (M-series, shared with two other local agents: the wall times are contended).

## 1. Summary

- **Commits:** the plan; A0b (CI amendment 5); one commit per task A1–A13 and C1, each pushed; two test-only commits (the
  A12 flip on FU-6's title; the it.fails titles carrying the merged-tree numbers, plus a quoting fix); one declared R45
  row in an FU-8 test (§5); the slow-group re-split by measured time (D19); two merges of `origin/main` (docs only).
- **Blocks:** the plan's 179 Part A + C blocks (find/replace and creates, in document order) were applied with a script
  that requires every find to match exactly once in the current state: **176 byte-exact, 3 re-anchored** (§6). No block
  needed a change of meaning.
- **New tests:** fast `test/l2/renal/fu9-{expansion,filtration,aki,cold}`, `test/l2/blood/fu9-{oxygen,citrate,leak,albumin,
  potassium,hepatic,mannitol,body-size}`, `test/l2/neuro/fu9-alkalosis`, `test/l2/brain/fu9-osmolality` (14 files);
  slow-c `test/engine/fu9-{kinetics,oxygen,transfusion,leak,potassium,alkalosis,osmolality,iap,mannitol}` (9 files);
  helpers `test/helpers/fu9.ts` (rigs + `once()` memoisation) and `test/helpers/fu9-renal.ts`.

## 2. Suites (merged tree, `CI=1`, local)

| check | result | wall |
|---|---|---|
| `pnpm -r typecheck` | clean, 8 packages | — |
| fast set, engine-core (`PME_TEST_SET=fast`) | **291 files / 1255 passed, 1 skipped, 0 errors** (main: 277 files) | 77 s |
| fast set, other packages | audio 58, skins 179, controller 223, ventilator 97, renderer 89, validation 107 (+11 skipped), demo 141 — all green | — |
| slow-a | 45 files: 44 green; **`pk-longrun` red on this Mac** — TCI propofol Ce 2.5098 vs 2.5 ± 0.005 at 6 h (main passes here; bisected: A8 pass, A9 2.5062, A12 2.5098 — §7); `fu8-body-size` green after its declared split (§5) | first pass 28 files 2465 s (killed, see below) + re-run 18 files 802 s; per-file sum ≈ 2950 s |
| slow-b (before the D19 re-split: 43 files) | **43 files / 226 tests green** | 2350 s (per-file sum 2183 s) |
| slow-c (before the D19 re-split: 11 files) | **11 files / 47 tests green** (9 `fu9-*` + pk-acceptance-pd + endo-acceptance) | 1109 s (per-file sum 1101 s) |
| disjointness step (A0b) after the re-split | slow 99 = slow-a 45 + slow-b 40 + slow-c 14; no overlap, no gap | — |
| `pnpm build` | clean | — |
| `CI=1 pnpm test:e2e` (Chromium + WebKit) | **61 passed, 23 skipped, 2 failed**: `stage6a` rtc and `stage6a-latency` (Chromium) — the WebRTC pair that fails on this machine on main too (G-FU6: the same 61/23/2) | 15.2 min |
| truth tree (`truth-event`, 7x's 2 100-leaf cap) | live tree 1335 → 1345 leaves (FU-9's new state keys); synthetic 12-drug tree 2052 → 2052; busy 58-drug tree capped as on main | — |
| tick bench (`perf:ticks --seconds 60`, base vs branch alternating) | p50 main 0.575 / 0.562 / 0.553 ms, FU-9 0.567 / 0.562 / 0.566 ms (median 0.562 → 0.566, **+0.7 %**); p99 0.99 → 1.01 ms | — |

Load notes, not FU-9's: the first all-package fast run (in parallel with the three slow groups, two coverage runners
and two other agents; load average 160) hit one Vitest `onTaskUpdate` RPC timeout in engine-core and a 5 s timeout in
`ventilator/test/ports.test.ts`; both are green on re-run (engine fast 0 errors; ports 0.5 s alone, 2.3 s in its suite —
main 0.6 s / 1.3 s). The first slow-a run was killed at 18:35 after 28 of 45 files by another executor's unfiltered `pkill -f vitest` (orchestrator notice; the
validation package's run died with exit 143 in the same minute); the remaining 17 files and the edited `fu8-body-size` were re-run
serially on the gate head (`slow-a2`).

**Slow-group times (CI amendment 5, D19).** Per-file sums on the merged tree (contended): slow-b 2183 s, slow-c 1101 s;
slow-a ≈ 2950 s. slow-b was 58 min on CI at G-FU6, so the gate moved three slow-b files to slow-c by measured time
(organs-renal 164 s, blood-sanity-acid 168 s, pk-acceptance-pk 137 s; one-literal edit of `SLOW_C`, its own commit):
slow-b ≈ 1714 s, slow-c ≈ 1570 s by the same sums. The CI times of the three jobs on the PR head are the arbiter (§9).

## 3. Findings: before → after (BF, RH and SP runners; `docs/gates/fu-9/{bf,rh,sp}-before-after.md`)

Runners: `research/22-audit-scripts` (BF, 74 cells), `research/13-audit-scripts` (RH, 62), `research/21-audit-scripts`
(SP-08, 5), each pointed with `PME_ENGINE` at a detached worktree of `origin/main` (before) and of the gate head (after).
**Automatic verdicts — BF: main {PL 29, TW 10, TS 8, WR 7, MI 1, NE 19} → {PL 34, TW 11, TS 5, WR 4, MI 1, NE 19}.
RH: {PL 23, TW 11, TS 7, WR 12, MI 1, NE 8} → {PL 33, TW 10, TS 6, WR 5, NE 8}. SP-08: {WR 4, NE 1} → {TW 1, WR 3, NE 1}.**
(Main's BF totals differ from the plan's 2473f0b row — FU-6/FU-8 moved cells before FU-9; the before column here is
today's main.)

| F | cell | quantity: main → FU-9 (merged tree) | expected | auto verdict |
|---|---|---|---|---|
| F1/H1 | BF-02a | retAwake30 0.53 → **0.23**; retGA30 0.53 → **0.35**; GA − awake 0 → **+0.12** | 0.2–0.3; ≥ +0.05 | WR → **PL** |
| F1/H1 | BF-02b | class III − GA 0 → **+0.19** | ≥ +0.05 | WR → **PL** |
| F1/H1 | BF-04 | dHb1h 0.546 → **0.734**; 4 h 0.547 → 0.886 | 0.7–1.3 | TW → **PL** |
| F1 | BF-01a / 01b / 14 | dCl 5.45 → 4.82, dBE −0.44 → −0.70 / BE 1.77 → 1.45 / 5 L dBE −3.25 → −3.34, retained 3377 → 2813 mL | | TW / WR / TW (OQ10) |
| F1/R4 | BF-12 | dNa 6.92 → 6.99 | +4–7 | PL |
| F3 | BF-29b | SvO₂ low flow 79.7 → **56.0 %** (normal arm 85.9 → 84.4) | 30–65 | TS → **PL** |
| F4 | BF-20a | septic ΔEVLWI 0 → **0.55**; healthy 2.68 → 1.02; ΔPaO₂ septic 22 → 11 | sepsis > healthy | WR (OQ3) |
| F5/R1 | BF-05a | iCa nadir 0.30 → **0.958**; citrate peak 10.7 → 1.12; asystole at 2430 s → **none** | 0.6–0.95 | TS → TW (OQ2) |
| F5/R1 | BF-05d | BE nadir −5.6 → −0.16; lactate peak 21 → 7.4; arrest → **none** | BE ≤ −10; lact 4–12 | TS → TW (OQ2) |
| F6 | BF-08d | ΔK furosemide −0.002 → **−0.029**; ΔUOP 154 → 235 mL/h | < −0.1 | TW (OQ5) |
| F8/R2 | BF-22a | COP 8.65 → **11.7**; oedema threshold 6.7 → 9.7 | 11–17 | TS → **PL** |
| F8 | BF-22b | dAG −0.16 → **−4.86** | −6.5 to −3.5 | TW → **PL** |
| F8 | BF-03a | effEnd 0.99 → 0.96; eff60 0.93 → 0.85 | 0.8–1 / 0.7–1 | PL |
| F9 | BF-15b | dPaCO₂ −0.19 → **+6.24** | +5 to +9 | WR → **PL** |
| F11 | BF-11b | ΔICP max 0.10 → **0.41** | > 1 (dirOnly) | TW (OQ8) |
| H1 | RH-01a / 01b | GA urine 0.35 → **0.57** mL/kg/h; vNh 0.58 → 1.00; OLIGURIA flag on → **off** | 0.5–1 | TS → PL / WR → PL |
| H2 | RH-01c / 02b | FF GA 0.48 → **0.26**; class III GFR −1.3 → −24.7 %, FF 0.79 → 0.52 | | TS → PL / TS |
| H1 | RH-03a | first bin ≥ 0.5 never → **+10 min**; 30–60 min mean 0.23 → 0.33 | ≥ 0.5 | MI → TW (OQ11) |
| H3 | RH-16 / 06d | sevoflurane HBF +5.3 → **−15.2 %**; IAP 20 HBF 0 → **−26.3 %** | | WR → PL / WR → PL |
| H4 | RH-06a | IAP 15 urine 0 → **−14 %**; IAP 25 0.36 → 0.42 mL/kg/h | < 0.1 at 25 | WR → TS (H5 handed) |
| H6 | RH-10a | CKD-proxy rocuronium × 1.24 → **× 1.40**; aki 1 GFR 76.8 → 25.1 (RH-09a) | | TW → **PL** |
| H8 | RH-08a / 08c | BV peak −2.4 → **+116 mL**; Na 15 min +0.1 → **−7.6**; osm +0.2 → +8.7 | osm +20–30 | WR → PL / WR (OQ12) |
| H10 | RH-20c | 33 °C urine −24.2 → **+29.1 %** | | WR → **PL** |
| H4 | SP-08e | IAP 14 urine +0.6 → **−10 %** (CO +1.2 %, SVR −0.1 %) | ≤ −30 % | WR → TW (H5 handed, R-FU9-8) |

**Cells that moved against the grain** (declared; not tuned — R44):
- **BF-21b** (HFrEF + 1.5 L) PL → TW: extra EVLWI 4.97 → **2.77** (band 3–15). The plan predicted 2.95 with Part A and
  3.35 (PL) with Part C on 2473f0b; on the merged tree Part C does not lift it back. The awake HFrEF kidney now excretes
  part of the load (F1 + H4 at its CVP).
- **BF-19** (ANH, FU-6 R11's cell) PL → TS: CO +16.7 → +11.6 % (the exchange keeps less volume: 5 % albumin is
  iso-oncotic (R2) and the kidney excretes part of it). BF-18a/b stay PL (dBv 234 → 68 mL; CO +27.4 → +20.4 %).
- **RH-02a** PL → TS (awake class II/III urine 29.7 → 32.7 and 14.0 → 18.4 mL/h: `EABV_EXP` 0.35), **RH-13** PL → TS
  (hepatic-failure RL lactate +0.91 → +1.04), **RH-20a** PL → TW (fentanyl −7.9 → −6.2 %/°C) — as the plan predicted
  (calibration queue, FU-9 ruling of 2026-09-30).
- **RH-09b** stays WR: the 3 h K excess with or without AKI −0.014 → −0.159 in BOTH arms (the finite K pool, A6).

## 4. `it.fails` (all with the merged-tree numbers in their titles)

Added by FU-9 (Part A):

| file | target | measured (merged tree) | plan's prototype |
|---|---|---|---|
| `test/l2/blood/core.test.ts` (E-FU9-1) | iCa −0.1 per unit-per-5-min (Q46) | **1.137** vs 1.033 ± 0.05 (main 1.076) | 1.137 |
| `fu9-transfusion` | class IV + MTP iCa ≤ 0.95 and BE ≤ −10 | **iCa 0.958, BE −0.2** (no arrest, lactate 7.5) | 0.955 / −0.1 |
| `fu9-leak` | septic ΔEVLWI > healthy and PaO₂ falls | **+0.90 vs +1.68 mL/kg; PaO₂ +10 (healthy +6)** | +0.87 vs +1.85; +11 |
| `fu9-potassium` | furosemide at K 7.5: ΔK ≤ −0.1 at 3 h | **−0.029** | −0.030 |
| `fu9-osmolality` | glycine 3 L: ΔICP ≥ 1 mmHg | **+0.26** (Na 119.3, osm 276, brain water +1.99 mL) | +0.29 |
| `fu9-kinetics` | class III + RL 2 L: 30–60 min urine ≥ 0.5 mL/kg/h | **0.33** (bins 0.97 0.52 0.29 0.31 0.33 0.35; main 0.23) | 0.37 |
| `fu9-filtration` | IAP 25: UOP < 0.1 mL/kg/h | **0.69** (kidney alone) | 0.69 |
| `fu9-iap` | IAP 14: urine ≤ −30 % (SP-08e) | **−12.5 %** | −12.5 % |
| `fu9-iap` | IAP 14: CO −10 to −30 % (SP-08a) | **0.0 %** | 0.0 % |
| `fu9-mannitol` | 1 g/kg: osmolality +20–30 at 15 min | **+8.7** (BV +73 mL, Na −7.6) | +8.7 |

Declared on an existing test (R45, §5): `fu8-body-size` "127 kg: resting CO ≤ 1.5 × the 70 kg adult" — **× 1.53** at
the single 300 s sample (lean 4.85 vs 5.14 on main), × 1.38 as the 240–300 s mean on both trees.

Flipped `it.fails` → `it`: `neuro-engine` "propofol 2 mg/kg: depth-index nadir < 52" — **50** (bisected: 52 at A11, 50 at
A12; H3's hepatic flow). The plan's second flip (`fidelity-lowflow` technical short cycle, A9) was already an `it` on
main (FU-8 A2, E-FU8-1), so it had nothing to flip (§6). Part B adds no `it.fails` (not executed).

The passing FU-9 rows on the merged tree (engine tests): retention awake 0.23 / GA 0.35 / class III 0.54; 1 u RBC Hb
+0.73 at 1 h; GA hour-2 urine 0.57 mL/kg/h; recovery bin 0.97 at +10 min; SvO₂ 56.0 % at 2 L (control 84.4), ER 0.46;
septic σ 0.70, ΔEVLWI +0.90; furosemide ΔK −0.029, cells −4.4 mmol; HCO₃ 34 → PaCO₂ 45.2 vs 39.0, pH 7.497; glycine
brain water +1.99 mL, ΔICP +0.26; IAP 14 urine −12.5 %; mannitol BV +73 mL, Na −7.6, osm +8.7. Unit rigs reproduce the
plan's numbers exactly (5 % BV → 5.50/3.30 mL/kg/h; GA demand 0.60 vs 0.49; low-flow GFR 79, FF 0.342; IAP
0/15/25 → 1.00/0.81/0.69; aki 0.5/1 → GFR 75/22, RBF 917/865; COP 20 g/L → 11.7; profile albumin 20 AG 6.9 vs 11.6;
10 FFP citrate 0.39, iCa 1.06, BE +4.32; 20 mmol K loss → 4.100; brain −15 mOsm → +2.15 mL; mannitol unit +8.5/−7.6/+116 mL).

## 5. FU-4's arrest behaviour and the moved rows (`audit:physiology`, 79 scenarios; `docs/gates/fu-9/audit-diff.md`)

**Chaos envelope on today's main** (A0 Step 4; `paco2SetPoint` + δ, δ = ±1e-5, ±1e-4, ±3.1476e-4, ±1e-3 mmHg, a throwaway
detached tree of `origin/main`): **D0 1450–1475 s, D2 1160–1230 s, K-ptx 395–400 s** (first MAP < 30 380–385 s). Main
itself: D0 1460, D2 1180, K-ptx 400. (The plan's 2473f0b envelope — D0 1770–1775, D2 1285–1355, K-ptx 665–685 — predates
FU-8 and FU-6, which moved these rows.)

| row | main → FU-9 (merged tree) | status |
|---|---|---|
| B2-tamp-prop2 / B7-ali (Ali's tamponade, PEA) | **830 → 830 s** (first MAP < 30 810 → 810) | **E-FU9-5 does NOT reproduce here**: the declared 830 → 825 s was on 2473f0b |
| B6-chain | 1135 → 1135 s | unchanged (plan: 1130 → 1125 on 2473f0b) |
| I1-apnoea | **1220 → 1220 s**; first MAP < 30 "–" → **1215 s** | arrest unchanged (plan: 910 → 920 on 2473f0b; FU-6/FU-8 had moved it to 1220). Bisected: A1 alone 1205, A2–A8 1220, A9–A11 1210, A12 on 1220 — a 5 s-sample row; the final first-MAP < 30 sample appears one sample before the arrest |
| C1-bleed-prop2 | no arrest; first MAP < 30 1005 → 1005 s | unchanged |
| B9-tamp-prop4 | arrest 760 → 760 s; first MAP < 30 **740 → 735 s** | declared: one audit sample, bisected to **A9** (H2/H4) |
| D0-pe | 1460 → 1455 s | inside the envelope |
| D2-pe-peep15 | 1180 → 1190 s | inside the envelope |
| K-ptx-ctl / prop2, E1, E2 | 400 → 400 s | unchanged |
| C4 645, F2 295, F3 280, F4 2785, G2b 65, G3 645, G3b 525, D1 720, K-pe 720, L-C4 640, X1 305 | identical | — |
| minimum HR in the last minute before arrest | B2/B7 47 → 46, B6 48 → 47, B9 47 → 46, D0 110 → 118, D2 126 → 123, F2 62 → 59 | second-order |
| propofol matrix | healthy ΔHR 2 → 3, ΔCO −0.31 → −0.32; 80 y HTN pre CO 4.69 → 4.70; AS+CAD ΔMAP −25.3 → −25.4; tamponade pre CO 3.06 → 3.03, ΔCO −3.12 → −3.03; PE nadir t+225 → 230 s, ΔMAP −62.2 → −61.7; septic pre HR 138 → 137, CO 5.18 → 5.12 (A4's σ); MANUAL hypovolaemia nadir 260 → 230 s, ΔCO −0.41 → −0.64 (as the plan predicted); every arrest column identical | second decimals |

FU-4 engine files on the gate head: `clinical-suite`, `circ-lowflow-arrest`, `circ-hypoxic-arrest`, `blood-k-rhythm`,
`fidelity-lowflow` — green (slow-a/slow-b).

**Declared R45 row (for the orchestrator).** `test/engine/fu8-body-size.test.ts` "127 kg / 175 cm … resting CO 1.2–1.5 ×
the 70 kg adult" read **× 1.53**: the CO is ONE low-passed sample at 300 s, which swings 4.63–5.36 L/min with the
ventilator cycle in the 70 kg arm. Bisected: × 1.44 at A8, × 1.50 at A9, × 1.53 with Part C. The output itself did not
move: the 240–300 s mean is 5.049 (main) → 5.044 L/min (FU-9) at 70 kg and 6.970 → 6.970 at 127 kg — × 1.38 on both trees
(tables 1.35). The test was split: the BV band and the ≥ 1.2 floor stay an `it`; the ≤ 1.5 edge is an `it.fails` with
the number. Recommendation: read the resting CO as the mean over a ventilator cycle (FU-8's test; not changed here).

## 6. Re-anchorings (the plan was verified on 2473f0b; FU-8 Part A and FU-6 merged since)

1. **A7, `spont.ts` call line.** FU-6 R10 had already edited `s.paco2Set = paco2SetPoint(…)` (its `setShift`); the plan's
   merged form was applied verbatim: `paco2SetPoint(s.paco2Rest - (x.setShift ?? 0), x.hco3, x.paco2); // FU-6 R10: … ;
   FU-9 F9: the metabolic HCO3`.
2. **A9, `fidelity-lowflow.test.ts`.** The plan's block flips the "technical short cycle" `it.fails` to `it`; FU-8 A2
   (E-FU8-1) had already flipped it ("measured 0 after FU-8"), so the block had nothing to change and was dropped. The
   row is green on the gate head.
3. **A12, `neuro-engine.test.ts`.** FU-6 had re-titled the depth-nadir `it.fails` ("… 52 again with FU-6 …"); the flip
   was applied on FU-6's title after measuring it on this tree (52 at A11, 50 at A12). The block that adds the nadir
   console line matched as written.

Every other block (176) matched exactly once, byte for byte. FU-6's R11 viscosity and FU-8's body-size code were not on
any FU-9 line; Part C's `sizeWeightKg(band, weightKg, heightCm?)` is FU-8's merged signature, and the new test's equality
with `resolveProfile().bloodVolumeMl` holds for every adult 50–160 kg, M/F, with and without a height.

## 7. Exceptions as applied

- **E-FU9-1** (A3): `core.test.ts` massive-transfusion iCa rule split — K ≥ 5.5 stays `it`; the chelation-rate rule is
  `it.fails` (1.137 vs 1.033; main 1.076).
- **E-FU9-4** (A9): `renal/model.test.ts` shock-start asserts GFR < 0.2 · gfrSet and urine < 0.05 mL/kg/h, not GFR 0.
- **E-FU9-5** (A1): declared on 2473f0b (B2/B7 830 → 825 s, I1 910 → 920 s); **on the merged tree no arrest row moves**
  (B2/B7 830 → 830, B6 1135 → 1135, I1 1220 → 1220). Two first-MAP < 30 samples move (B9 740 → 735, A9; I1 – → 1215).
- E-FU9-2 / E-FU9-3: Part B, not executed.
- **New, declared for a ruling:** the `fu8-body-size` CO-ratio edge (§5).
- **`pk-longrun` (slow-a), declared — the CI run decides.** "6 h: TCI propofol + remifentanil + sevoflurane … targets
  held": propofol Ce **2.5098** vs 2.5 ± 0.005 on this Mac (main 2.5, passes here). Bisected: A8 passes, **A9 2.5062**
  (H2/H4: filtration equilibrium, `EABV_EXP` 0.35), A10–A11 2.5062, **A12 2.5098** (H3: hepatic flow = CO/CO₀ × 7d's
  factor, sevoflurane ×0.8/MAC — propofol's flow-limited clearance falls, so the open-loop TCI's effect site drifts above
  its target by 0.4 %). The plan records this test as G-FU4's known macOS red (2.5065 on 2473f0b, green on CI's Linux),
  so it is NOT edited here: if CI's slow-a also reads it outside ± 0.005, the propofol line becomes an `it.fails` with
  the CI number (R45, the TCI band unchanged) in a follow-up commit on this PR (§9).
- **Intermediate commits.** `blood-sanity-acid` ("saline Cl up > 4") reads Cl 106.8 (+2.8) at A1 alone (the expansion
  urine carries chloride) and 108.5 (+4.5 → lab 109) from A13 on; it is green on the gate head (slow-b). Probed only at
  main (109.4), A1 and A13.

## 8. Requests and open questions

The plan's Requests (R-FU9-1 … R-FU9-10) and Open questions 1–14 stand as written, with these merged-tree numbers:
OQ2 (MTP: BE −0.2, iCa 0.958), OQ3 (septic +0.90 vs healthy +1.68 mL/kg, PaO₂ +10 vs +6), OQ5 (−0.029 mmol/L at 3 h),
OQ8 (ΔICP +0.26), OQ11 (30–60 min mean 0.33), OQ12 (+8.7). Added: the `fu8-body-size` CO sample (§5); BF-21b's
against-the-grain move with Part C on the merged tree (§3); SP-08's CO now +1.2 % (was −2.9 % in the plan's prototype;
FU-9 has no IAP → circulation term — breath-phase sampling, R-FU9-8 owns the mechanism).

## 9. CI

PR opened on the gate head; the CI result (build, slow-a, slow-b, slow-c with their times) is recorded in the PR
conversation and the executor's report. Stage 7k (PR #30) had not merged at the gate: if it lands first, the truth-tree
12-drug count (7k: 2 075 of 2 100) is re-measured after merging it, and non-physiological internals go to `SKIP_PATH`
(declared) rather than raising the cap.
