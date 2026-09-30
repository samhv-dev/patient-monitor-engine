# 13 — Coverage run RH: renal and hepatic (R54 matrix)

*Coverage auditor, 2026-09-29. Read-only on the repo. The engine is `origin/main` **7c60b2b** (engine code = the V.1
merge ed530d5: FU-3, FU-4, FU-5 and V.1 merged), in a detached throwaway worktree, seed 7. Scripts:
`13-audit-scripts/`, which can be re-run; `out/cells.json` holds one graded record per cell and no raw rows.*

> **Provenance.** The runner is the BF run's (research/22-audit-scripts), extended for 7d/7g: kidney (RBF, GFR, UO,
> OLIGURIA flag, KDIGO stage, renal controllers), liver (HBF, lactate clearance, liver function), 7g clearance factors
> and effect-site levels, and a Ppeak probe. Four measurement artefacts were fixed before grading; each is marked
> "resume fix" in the scripts:
> - **RH-06c:** the first Ppeak probe read an empty window;
> - **RH-10a/b:** a TOF `device` command is rejected on main (as BF-09 found); T1 comes from the truth event, as a
>   fraction 0–1, not a percentage;
> - **RH-17a:** the first run stopped at 2 h, 45 KDIGO-minutes short of the stage-1 clock, so it now runs 3 h.
>
> Hand confirmations (research/12 §2.2) are in `hands.ts`, apart from the cell specs.

## 0. Headline

- **62 cells:**
  - the 54 cells of research/12 §5.1 (RH-01…25), split into readouts;
  - RH-01c (resting renal haemodynamics), RH-12e (fentanyl as the flow-limited quiet check), RH-26a/b (PEEP →
    HBF/UO) and RH-27a/b (autoregulation plateau, pressure natriuresis), which the brief asked for;
  - 2 MANUAL twins (RH-M1/M2).

  By tier: **18 P1, 42 P2, 2 P3**. Every intervention cell has a control arm at the same sim time. Where
  state-dependence is the question (RH-04, 09, 10, 11, 12, 13, 15), the healthy reference runs the same timeline.
- **Verdicts:**

  | verdict | all | P1 | P2 | P3 | of which owned elsewhere (FU-7 / FU-8 / FU-9 / CM) |
  |---|---|---|---|---|---|
  | plausible (PL) | **22** | 6 | 16 | — | — |
  | too weak (TW) | **12** | 4 | 8 | — | 6 (RH-07b, 23c, 25b: FU-9; RH-12b: CM C11; RH-15b: → FU-7; RH-17b: → 7e / ET run) |
  | too strong (TS) | **6** | 4 | 2 | — | 2 (RH-05a/b: the HFrEF state → FU-8) |
  | wrong (WR) | **11** | 2 | 9 | — | — (RH-09b is FU-9 A6 plus the new H6) |
  | missing (MI) | **3** | 2 | 1 | — | — (RH-12d is the new H9, routed to FU-7) |
  | inconsistent (IN) | **0** | — | — | — | — |
  | not expressible (NE) | **8** | — | 6 | 2 | 3 are 7i (v1.1); 3 missing profiles/states; 1 metabolites (FU-7); 1 rhabdomyolysis |

  - **32 cells are graded non-PL and non-NE.** 24 of them rest on at least one **new** mechanism no stage owns
    (H1–H12, §3; H9 is routed to FU-7 because it is a drug-layer fix). The other 8 wait only on FU-7, FU-8, FU-9,
    research/19's C11 or 7e (§4).
  - Run time: ≈ 25 min of engine wall time for all cells (the longest arm is 4 h of GA).
- **New findings, ranked** (§3 has the smallest mechanism and the file for each):
  1. **A healthy anaesthetised patient is oliguric (H1; P1; 10 cells).** At MAP 93 under GA, urine is
     0.35–0.38 mL/kg/h for 4 h (tables §5.2: 0.5–1). The OLIGURIA flag is on from 6 min and for 225 of 240 min, and
     at KDIGO time-scale 3 the healthy control reaches **AKI stage 1** by 3 h. Cause: the kidney's "effective arterial
     volume" is (CO/CO₀)^0.75 against a fixed 0.08 L/min/kg reference. GA's normal ≈ 15 % fall in CO therefore reads as
     13 % hypovolaemia: neurohumoral factor 0.58, angiotensin 0.37, RBF −45 %. That is stacked on the GA stress
     factor S 0.6, which already models ADH. The same term:
     - holds urine at 0.21–0.23 mL/kg/h for 2 h after 2 L of Ringer's has restored MAP 92 and CO 5.3 in class III
       (no 10-min bin reaches 0.5);
     - cuts furosemide 40 mg to +168 mL in 2 h;
     - turns 33 °C, PEEP and old age into "hypovolaemia".

     The MANUAL twin, with CO held, makes 0.8 mL/kg/h.
  2. **No filtration equilibrium (H2; P1).** The glomerular oncotic pressure is a constant, so tubuloglomerular
     feedback can always restore GFR:
     - class III (MAP 71, below the autoregulatory range): GFR −1 % while RBF −43 %, a filtration fraction of **0.80**;
     - under GA: 0.48 (physiological 0.2, ceiling ≈ 0.3–0.35);
     - PEEP 15: GFR −1.6 % (Annat: −19 %).
  3. **Hepatic blood flow has one input, (CO/CO₀)² (H3).** 7d's splanchnic factor (volatile ×0.8/MAC, α-agonist,
     sympathetic) is dead code whenever 7c is present:
     - sevoflurane 1 MAC: HBF +5.6 %;
     - PEEP 15: −29 %, from CO alone;
     - class III: HBF/CO 0.60, right by coincidence.
  4. **Intra-abdominal pressure reaches only the kidney, and not even its urine (H4, H5).**
     - IAP 25: RBF −28 %, but UO is unchanged (0.35), because the pressure-natriuresis term reads MAP, not
       MAP − IAP.
     - CO, SVR, CVP, Ppeak, compliance and HBF are all bit-identical at IAP 0 and 25.
  5. **The `aki` condition is nearly inert (H6).**
     - Severity 0.5 leaves GFR 125 and UO 0.95 awake.
     - Severity 1 gives GFR 51 (77 under GA) and RBF **rises** 17 %.
     - So the "CKD 5" proxy prolongs rocuronium only ×1.14 (research/12: ×1.3–1.5), and a K⁺ load persists no
       longer than in health.
  6. **Mannitol is not a plasma osmole (H8).** 1 g/kg gives osmolality +0.2 and no volume expansion (−2 mL); the
     diuresis is right (+624 mL in 3 h). The brain and the kidney each keep a private mannitol pool.
  7. **Gamma-curve drugs ignore the organs (H9 → FU-7).** Hepatic failure 0.8 leaves midazolam's level unchanged
     (×1.00; MacGilchrist ×2). The same holds for morphine, ketamine, dexmedetomidine, etomidate, thiopental and
     neostigmine, and for hypothermia and low flow.
  8. **The hypertensive kidney passes for the wrong reason (H7).** There is no `renalLowerLimit`. The HTN–healthy
     difference at MAP 65 comes from H1 (vNh 0.44 vs 0.99) and a 3.4 mmHg lower achieved MAP.
  9. **No cold diuresis (H10).** At 33 °C urine falls 27 %; the kidney has no temperature input.
  10. **The HFrEF profile never reaches check 20's low-output state** (CO 6.3, MAP 87, CVP 4.5). The pre-existing
      `it.fails` in `organs-renal.test.ts:39/64` stay failing, and FU-8 A12 leaves HFrEF untouched (→ FU-8).
- **What works:**
  - urine in class II/III awake: 30 and 14.6 mL/h (ATLS 20–30 / 5–15);
  - class III: urine 0.04 mL/kg/h, lactate +2.2, HBF/CO 0.60, lactate clearance −36 %;
  - propofol Ce ×1.73 in class III (FU-4 G10);
  - fentanyl unchanged in hepatic failure (Haberer; flow-limited, as modelled);
  - hepatic failure: lactate 2.1 at 2 h and a Ringer's load retained (+0.92 vs +0.68);
  - succinylcholine +0.47 in AKI, as in health;
  - 4 u stored RBC K⁺ +0.73;
  - sugammadex in renal failure ×1.12 with no re-curarisation;
  - hypothermia: drug clearance −8.7 %/°C and lactate clearance −24 %;
  - noradrenaline in septic shock: MAP 49 → 66 raises urine, 66 → 75 does not (LeDoux/Bourgoin);
  - glycine 3 L: Na 119.5, osmolal gap 32, MAP +26, HR −12, CVP +12.5;
  - 3 % saline Na +2.3;
  - pressure natriuresis ×3.9 from MAP 88 to 151, with GFR flat;
  - furosemide's early venodilation (CVP −0.46).

## 1. Method and rig

- **Design source:** research/12 §5.1 (RH, 25 scenarios / 54 cells), §2 (cell record and grading), §3 (tiers) and §6
  (runner). Names follow the research/11 glossary: RBF, GFR, UO, HBF, MAP, CO, CVP, K⁺, Ce, T1, TOFR.
- **Rig.** Adult 40 y, 70 kg, 175 cm, male.
  - **"GA vent":** ETT + VCV 12 × 600 mL, PEEP 5, FiO₂ 0.5 and the Stage 3 GA flag (`thermal anaesthesia general`)
    from t = 1 s.
  - **"Awake":** no airway device, spontaneous breathing on room air.
  - Interventions at t = 300 s. Haemorrhage: a 10-min bleed from 60 s (class II 1000 mL, class III 1500 mL); the
    intervention at 960 s.
  - Warm septic shock: 7e `condition sepsis 1 warm` at 60 s; intervention at 1260 s.
  - Pressures held by MANUAL instructor targets (`setTarget` sbp/dbp) where a MAP is the variable (RH-04, RH-27).
    Hypothermia by `setTarget tempCore 33` over 10 min, which Stage 3 follows in MODELED.
- **Contexts:**
  - X-A;
  - 80 y + HTN (research/19 XEH);
  - HFrEF 60 y 80 kg;
  - `aki` 1 (AKI proxy);
  - research/19's CKD proxy (`aki` 1 + K 5.5, Hb 10, HCO₃ 20);
  - `hepaticFailure` 0.8;
  - research/19's Child C proxy (+ albumin 25, 55 y);
  - IAP by the 7d `renal` event (`iapMmHg`).
- **Urine** is read from the cumulative counter (mL/kg/h over a stated window), the way a urometer is read. The
  OLIGURIA flag and KDIGO stage come from the 7d `organs` event and state.
- **Grading** (research/12 §2.2): automatic first, then every non-PL is confirmed by hand. `HAND` in the tables gives
  the code reason. Bands are **proposals for Ali** with their source; none was widened (R45). Cells without a sourced
  magnitude are `dirOnly` and listed in §6.

## 2. Results

How to read the tables:
- **Measured** values are control-subtracted unless the key names an arm. `…Pct` means % against the control or the
  reference arm; `uo…` is mL/kg/h unless stated.
- **Graded items** give value vs band [source].
- Gap ids refer to §3 (H1–H12). FU-7/FU-8/FU-9/CM C11 mark findings routed to an in-flight plan (§4); `7i` marks a
  blocked cell (§5).
- Every table is regenerated by `report.ts` from `out/cells.json`.

Family by family:
- **2.1 Kidney at rest and under GA.** Awake is right (UO 0.94, GFR 126, RBF 15 % of CO). GA makes a normal patient
  oliguric (H1), with an impossible filtration fraction (H2).
- **2.2 Haemorrhage.**
  - Awake class II/III urine, HBF and lactate are right.
  - GFR never falls (H2).
  - Recovery after resuscitation is too slow (H1).
  - The MANUAL kidney keeps its volume arm (Q for Ali).
- **2.3 Pressure and output.** Pressure natriuresis and GFR autoregulation are right. The hypertensive shift is
  missing (H7). HFrEF cannot be made low-output (→ FU-8).
- **2.4 Drug disposition.** Propofol is right in shock; fentanyl is weak (→ FU-7). HBF under sevoflurane is right
  only by accident (H3).
- **2.5 IAP and PEEP.** IAP is inert everywhere but the renal blood flow (H4, H5). PEEP lowers HBF through CO only
  (H3) and urine too much (H1, H2).
- **2.6 Diuretics and osmotic loads.**
  - Furosemide is too early and too small (FU-7 Task 2; H1).
  - Mannitol is not an osmole (H8).
  - Glycine and hypertonic-saline chemistry are right; their volume is not excreted (FU-9 A1).
- **2.7 Renal failure and sepsis.**
  - The AKI proxy barely lowers GFR (H6).
  - K⁺ excretion is blind (FU-9 A6).
  - Succinylcholine and sugammadex are right.
  - The septic kidney is right, but the healthy control reaches AKI too (H1).
- **2.8 Liver failure and hypothermia.**
  - Lactate, the Ringer's load and fentanyl are right.
  - Midazolam is unchanged (H9 → FU-7).
  - Glucose is too high (CM C11).
  - Hypothermic drug and lactate clearance are right.
  - No cold diuresis (H10).


### 2.1 The kidney at rest and under GA (P1)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| RH-01a | P1 | X-A GA vent vs X-A awake · GA maintained (Stage 3 GA flag), normovolaemic, MAP ≈ 93 → GA 4 h, VCV 12 × 600, no surgery: hourly urine output | uoGA1 0.38; uoGA2 0.35; uoGA3 0.35; uoGA4 0.35; uoGAmin 0.35; uoAw1 0.94; uoAw4 0.94; mapGA 93.67; coGA 4.91; coAw 5.7; vNhGA 0.58; vNhAw 0.88; angGA 0.37 | TS: uoGAmin = 0.35 below [0.5, 1] (lower = stronger/faster) [tables §5.2 `S` row ("intra-op UOP 0.5–1 despite normal MAP"); Miller 10e ch. 17 (renal physiology: GA lowers UO through ADH/sympathetic tone, not to oliguria at a normal MAP); KDIGO 2012 (oliguria < 0.5 mL/kg/h)]<br>PL: uoAw4 = 0.94 in [0.5, 1.5] [tables §5.2 `UOP0` 1.0 (0.5–1.5) mL/kg/h awake]<br>HAND TS (automatic TS): H1: at MAP 93 the GA patient makes 0.35 mL/kg/h — the GA stress factor S 0.6 (renal/params.ts:56) is stacked on a neurohumoral factor vNh 0.58 and angiotensin 0.37 that `eabv` (renal/model.ts:59–61) derives from GA's normal ≈ 15 % fall in CO against a fixed 0.08 L/min/kg reference; the MANUAL twin (CO held, vNh 1.00) makes 0.8 | **TS** | H1 · 7d renal/model.ts eabv + S_GA |
| RH-01b | P1 | X-A GA vent · GA maintained, normovolaemic → GA 4 h: OLIGURIA flag and KDIGO stage | flagFirstS 360; flagAny true; flagMinutesOn 225; akiStage4h 0; flagAwake false | WR: flagAny = true (expected false) [KDIGO 2012: oliguria = UO < 0.5 mL/kg/h for ≥ 6 h (stage 1); a healthy anaesthetised patient at a normal MAP is not oliguric (tables §5.2 alarm row, Q40)]<br>PL: flagAwake = false (expected false) [as above (awake reference)]<br>HAND WR (automatic WR): the flag is on from 360 s and for 225 of 240 min in a healthy patient: the hourly UO itself is < 0.5 (H1); FU-8 A8 only defers the first flag to a completed 10-min bin (≈ 20 min), so the flag still fires; KDIGO's 6-h window is Ali's W9 | **WR** | H1, FU-8 · 7d organs/pipeline.ts oliguria flag (FU-8 A8) + RH-01a cause |
| RH-01c | P1 | X-A awake vs GA vent · resting, normovolaemic → resting renal haemodynamics: RBF, GFR, filtration fraction | rbfAw 873; rbfGA 476; rbfPctCoAw 15.31; gfrAw 126; gfrGA 126; ffAw 0.26; ffGA 0.48; rbfGAvsAwPct -45.4 | PL: rbfPctCoAw = 15.31 in [15, 25] [Guyton & Hall 14e ch. 27: RBF ≈ 1100 mL/min ≈ 20–22 % of CO; tables §5.2 / ICRP-89 17 %]<br>TS: ffAw = 0.26 above [0.15, 0.25] [Guyton & Hall 14e ch. 27: filtration fraction ≈ 0.2 (GFR 125 / RPF 650)]<br>TS: ffGA = 0.48 above [0.15, 0.3] [Guyton & Hall: FF rises with efferent (AngII) tone but filtration equilibrium caps it (≈ 0.3); Miller 10e ch. 17]<br>TS: rbfGAvsAwPct = -45.4 below [-30, 0] [Miller 10e ch. 17: anaesthetics lower RBF modestly through MAP/CO; RBF autoregulated over RPP 80–180 (tables §5.2 rblLL) — at MAP ≈ 93 the fall should be small]<br>HAND TS (automatic TS): H2 + H1: under GA RBF 476 mL/min (−45 % vs awake at the same MAP) while TGF holds GFR at 126 → filtration fraction 0.48; π_gc is a constant (kidney.ts:44), so nothing stops the filtration fraction (filtration equilibrium caps it near 0.3) | **TS** | H1, H2 · 7d renal/kidney.ts (filtration equilibrium) + model.ts eabv |
| RH-M1 | P1 | X-A MANUAL, GA vent (MODELED twin RH-01a) · GA, normovolaemic → GA 2 h: hourly urine output and the flag | uo1 0.79; uo2 0.81; flagAny false; vNh 1; map 107.42 | PL: uo2 = 0.81 in [0.5, 1] [as RH-01a (tables §5.2 S row); Q9 open] | **PL** | — · Q9 / 7d renal |

### 2.2 Haemorrhage and resuscitation (P1)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| RH-02a | P1 | X-A awake (and GA vent) · class II (1000 mL / 10 min) and class III (1500 mL / 10 min) → urine output in the hour after the bleed (mL/h) | uoAw2 30; uoAw3 14.6; uoAw0 65.8; uoGA2 7.3; uoGA3 2.7; uoGA0 24.8; uoGA3kgH30 0.04; mapAw2 93.62; mapAw3 86.86; mapGA3 71; hrAw3 87.76; arrest false | PL: uoAw2 = 30 in [20, 30] [ATLS 10e table 3-1: class II (15–30 %) urine 20–30 mL/h]<br>PL: uoAw3 = 14.6 in [5, 15] [ATLS 10e table 3-1: class III (31–40 %) urine 5–15 mL/h]<br>PL: uoGA3kgH30 = 0.04 in [0, 0.3] [tables §7 check 17a: class III UOP < 0.3 mL/kg/h by 30 min] | **PL** | — · 7d renal/model.ts volumeFactor / natriuresis |
| RH-02b | P1 | X-A GA vent · class II and class III → renal autoregulation: RBF falls before GFR (filtration fraction rises) | rbfPct2 -43.1; gfrPct2 -0.9; rbfPct3 -42.9; gfrPct3 -1.1; gfrMinusRbf2 42.2; gfrMinusRbf3 41.8; ff0 0.48; ff2 0.82; ff3 0.8; map3 71 | PL: gfrMinusRbf2 = 42.2 (sign 1, beyond 5) [Guyton & Hall ch. 27 (AngII efferent constriction keeps GFR while RBF falls); research/12 RH-02 ("RBF falls before GFR")]<br>PL: rbfPct3 = -42.9 (sign -1, beyond 10) [ATLS 10e / Guyton: class III renal vasoconstriction lowers RBF]<br>TS: ff3 = 0.8 above [0.2, 0.35] [Guyton & Hall: FF rises in hypovolaemia (efferent AngII) but filtration equilibrium caps it (≈ 0.3–0.35)]<br>HAND WR (automatic TS): H2: in class III (MAP 71, RPP ≈ 63, below the autoregulatory range) GFR is held at −1 % while RBF falls 43 %: filtration fraction 0.80 — physically impossible (plasma oncotic pressure at the efferent end would exceed the capillary pressure); the TGF target (kidney.ts:50–58) can always be met because π_gc does not rise with FF | **WR** | H2 · 7d renal/kidney.ts (angiotensin, filtration equilibrium) |
| RH-02c | P1 | X-A GA vent · class III (1500 mL / 10 min) → hepatic blood flow and lactate clearance vs cardiac output | coRel 0.62; hbfRel 0.37; hbfOverCo 0.6; kLacPct -35.5; dLact30 2.24; hbfRel2 0.56; coRel2 0.75 | PL: hbfOverCo = 0.6 in [0.5, 0.75] [tables §5.3 `hbfFactor` ×0.6 in class III (splanchnic vasoconstriction: HBF falls more than CO; Guyton ch. 16 splanchnic reservoir)]<br>PL: kLacPct = -35.5 (sign -1, beyond 15) [tables §5.3 kLac ×HBF_rel; research/12 RH-02 (lactate clearance falls with HBF)]<br>PL: dLact30 = 2.24 in [2, 4] [tables §7 check 17a: class III lactate 3–5 by 30 min (from 1.0)] | **PL** | — · 7c blood/core.ts hbfRel (HBF_EXP) / 7d liver hbfFactor |
| RH-03a | P1 | X-A GA vent · class III (1500 mL / 10 min) → Ringer's lactate 2 L over 30 min at 960 s: urine recovery | uoPre 0.4; uoBleed 0.05; uo0to30 0.21; uo30to60 0.23; uoCtl30to60 0.04; uoNormGA30to60 0.35; mapEnd 91.68; mapNorm 93.45; coEnd 5.27; coNorm 4.8; vNh60 0.46; bvRel60 0.97 | TW: uo30to60 = 0.23 below [0.5, 1.5] [ATLS 10e ch. 3: UO ≥ 0.5 mL/kg/h is the adult resuscitation end point; it recovers within 30–60 min of restoring MAP/CO (research/12 RH-03)]<br>MI: tUo05: not a finite number (null) [ATLS 10e: urine recovers within 30–60 min of MAP/CO restoration (a 10-min bin ≥ 0.5 mL/kg/h)]<br>HAND TW (automatic MI): MAP 92 and CO 5.3 (above the normovolaemic 4.8) are restored at 1860 s, but UO is 0.21 then 0.23 mL/kg/h and no 10-min bin reaches 0.5 in 2 h: vNh is still 0.46 at +60 min (fast-on/slow-off lag on a noisy CO, renal/model.ts:124–125, plus H1's CO reference); the GA ceiling is 0.35 anyway (RH-01a) | **TW** | H1 · 7d renal/model.ts (vNh washout τ 45 min, eabv) |
| RH-03b | P1 | X-A GA vent · class III (1500 mL / 10 min) → 2 u RBC over 20 min at 960 s: urine recovery | uoPre 0.4; uoBleed 0.05; uo0to30 0.07; uo30to60 0.08; uoCtl30to60 0.04; uoNormGA30to60 0.35; mapEnd 79.06; mapNorm 93.64; coEnd 3.89; coNorm 4.64; vNh60 0.21; bvRel60 0.83 | PL: uo30to60 = 0.08 (sign 1, beyond 0) [direction: 2 u (≈ 600 mL) replace 40 % of the loss — partial recovery; the band belongs to full restoration (RH-03a)]<br>TW: uo30to60 = 0.08 below [0.3, 1.5] [ATLS 10e (as RH-03a) — partial replacement: above the class III 5–15 mL/h (0.07–0.2 mL/kg/h), below the target] | **TW** | H1 · 7d renal/model.ts |
| RH-21 | P1 | X-A MANUAL, GA vent · class III (1500 mL / 10 min), instructor targets unchanged → urine output vs the MANUAL control | dMap -49.02; uoI 0.03; uoC 0.8; uoPct -96.25; vNhI 0.16; vNhC 0.99; coPct -45.6 | WR: uoPct = -96.25 (quiet, tol ±25) [research/12 RH-21 design check (audit 08 Q9): in MANUAL, UO follows the (held) MAP only — no neurohumoral arm; Q9 open]<br>HAND PL (automatic WR): direction-only (Q9 open): the MANUAL bleed is not "held" — MAP falls 49 mmHg and UO falls 96 % with it. The cell's premise ("no neurohumoral arm in MANUAL") is false: vNh 0.16 vs 0.99 — the kidney's volume arm runs in MANUAL (question for Ali) | **PL** | — · Q9 (MANUAL physiology) / 7d renal eabv |
| RH-M2 | P1 | X-A MANUAL, GA vent (MODELED twin RH-03a) · class III → Ringer's lactate 2 L over 30 min: urine output 30–60 min after | uoI 0.55; uoC 0.07; dUo 0.48; dMap 41.38 | PL: dUo = 0.48 (sign 1, beyond 0.05) [direction (Q9 open): a 2 L load after class III raises urine output] | **PL** | — · Q9 / 7d renal |

### 2.3 Pressure, output and the kidney (P1; RH-27 P2)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| RH-04a | P1 | X-E 80 y + HTN vs X-A, MANUAL, GA vent · GA; MAP held at 65 vs 80 (instructor targets) → urine output at MAP 65 vs 80 | uoH65 0.09; uoH80 0.16; uoA65 0.29; uoA80 0.45; ratioH 0.56; ratioA 0.64; htnMinusHealthy65 -0.2; mapH65 61.73; mapA65 65.16; mapH80 76; mapA80 79.75; vNhH65 0.44; vNhA65 0.99; coH65 4.65; coA65 6.98; cvpH65 10.3; cvpA65 10.38 | PL: htnMinusHealthy65 = -0.2 (sign -1, beyond 0.03) [tables §1.5 htn: renal autoregulation lower limit +10 mmHg ("earlier renal hypoperfusion at a given MAP"); research/12 RH-04]<br>HAND MI (automatic PL): right for the wrong reason: the kidney has no hypertension term (tables §1.5 `renalLowerLimit` +10 is not implemented; renalIn reads no profile). The HTN–healthy difference comes from eabv reading the elderly profile's lower CO as hypovolaemia (vNh 0.44 vs 0.99 at CO 4.65 vs 6.98) and a MAP 3.4 mmHg lower than targeted | **MI** | H1, H7 · 7d renal (no htn term: tables §1.5 `renalLowerLimit`) |
| RH-04b | P1 | X-E 80 y + HTN vs X-A, MANUAL, GA vent · GA; MAP held at 65 → RBF and GFR at MAP 65 relative to MAP 80 | rbfH65vs80 -2.7; rbfA65vs80 -35.8; gfrH65vs80 -37.5; gfrA65vs80 -13.6; gfrShiftEffect -23.9; rbfShiftEffect 33.1 | PL: gfrShiftEffect = -23.9 (sign -1, beyond 2) [tables §1.5 htn (`renalLowerLimit` +10) / Renal-AR PMC4042104: the hypertensive kidney loses GFR at a higher pressure]<br>HAND MI (automatic PL): as RH-04a: GFR −37.5 % (HTN) vs −13.6 % (healthy) from 80 → 65 comes from angiotensin/eabv (CO) and the achieved MAPs (61.7/76 vs 65.2/79.8), not from a shifted autoregulation curve; RBF even falls LESS in the hypertensive (−2.7 vs −35.8 %) | **MI** | H1, H7 · 7d renal/kidney.ts tgfTarget (no htn shift) |
| RH-05a | P1 | HFrEF 60 y 80 kg (profile hfref), awake · compensated/low-output HFrEF at rest → none (the state): urine output in the low-output state | uoPre 0.64; uoPreHour 0.65; map 86.69; cvp 4.52; co 6.27; vNh 0.77 | TS: uoPreHour = 0.65 above [0.1, 0.15] [tables §7 check 20: low-flow HFrEF (MAP 65, CVP 12) UOP 0.1–0.15 mL/kg/h]<br>HAND TS (automatic TS): the state is not reached: the hfref profile rests at CO 6.3 L/min (CI ≈ 3.2), MAP 87, CVP 4.5 (tables check 20: MAP 65, CVP 12, low output). For the circulation it sees, the kidney is right (0.65 mL/kg/h). Profile defect (research/19 C5); FU-8 A12 takes C5 for the age bands only — HFrEF targets stay bit-identical → routed to FU-8 | **TS** | FU-8 · 7a hfref profile (state) / 7d renal eabv |
| RH-05b | P1 | HFrEF 60 y 80 kg, awake · low-output HFrEF → dobutamine 5 µg/kg/min from 900 s: urine output at 30–60 min vs control | uo30to60 0.71; uoCtl30to60 0.54; uo0to30 0.75; coPct 23.5; dMap 4.06; dCvp 1.24 | TS: uo30to60 = 0.71 above [0.2, 0.3] [tables §7 check 20: dobutamine 5 µg/kg/min → CO +30 %, MAP 72, CVP 10 → UOP 0.2–0.3 within 30–60 min]<br>PL: coPct = 23.5 in [20, 45] [tables §7 check 20 (CO +30 %); FU-7 Task 17 band 20–45 %]<br>HAND TS (automatic TS): dobutamine raises CO +23.5 % (PL) and UO 0.54 → 0.71 mL/kg/h, but from a non-low-output start (RH-05a); the check-20 band cannot be tested until the profile has a low-output grade | **TS** | FU-8 · 7d renal (eabv) / 7a / 7g dobutamine |
| RH-27a | P2 | X-A MANUAL, GA vent · MAP held at ≈ 90, 120, 150 (instructor targets) → RBF and GFR across the autoregulatory range | map90 88.1; map150 151.3; rbf90 722; rbf150 849; rbfPct150vs90 17.6; gfrPct150vs90 -0.3 | TS: rbfPct150vs90 = 17.6 above [-10, 15] [tables §5.2 `rblLL/rblUL` 80–180 (Renal-AR PMC4042104; Guyton & Hall ch. 27: RBF and GFR autoregulated within ≈ 10 % over 80–170 mmHg)]<br>PL: gfrPct150vs90 = -0.3 in [-10, 15] [as above (GFR)]<br>HAND TS (automatic TS): small (H12): RBF +17.6 % from MAP 88 to 151 while GFR is flat (−0.3 %) — the myogenic ceiling (R_AFF_MAX = Pulse × 2, renal/params.ts:25–26) lets RBF drift at the top of the range; GFR autoregulation is right | **TS** | H12 · 7d renal/kidney.ts (TGF + myogenic) |
| RH-27b | P2 | X-A MANUAL, GA vent · MAP held at ≈ 90, 120, 150 → pressure natriuresis: urine output at 150 vs 90–100 | uo90 0.53; uo120 1.02; uo150 2.06; ratio150vs90 3.89 | PL: ratio150vs90 = 3.89 in [2, 4] [tables §5.2 U(): 3× at RPP 150 vs 100 (Guyton renal output curve); Guyton & Hall ch. 19] | **PL** | — · 7d renal/kidney.ts natriuresis |

### 2.4 Drug disposition in shock and hepatic flow under a volatile (P1)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| RH-15a | P1 | X-A GA vent · class III (1500 mL / 10 min) vs normovolaemic → propofol 1 mg/kg at 960 s: peak effect-site concentration and its clearance factor | peakRatio 1.73; ce10Ratio 1.83; fShock 0.53; fNorm 0.95; qShock 0.46; hbf 0.24; coRel 0.55 | PL: peakRatio = 1.73 in [1.5, 2] [Johnson 2003 Anesthesiology 99:409 (haemorrhagic shock: smaller central volume and clearance → higher propofol concentrations); research/12 RH-15 (Ce ↑ 1.5–2×); audit 08 G10] | **PL** | — · 7g pk/pipeline.ts distFactor / clFactor (FU-4 G10) |
| RH-15b | P1 | X-A GA vent · class III vs normovolaemic → fentanyl 2 µg/kg at 960 s: effect-site level at 10 and 30 min (flow-limited hepatic clearance) | ce10Ratio 1.1; ce30Ratio 1.19; peakRatio 1.06; fShock 0.4; fNorm 0.93 | TW: ce30Ratio = 1.19 below [1.3, 2] [Egan 1999 Anesthesiology 91:156 (haemorrhagic shock ≈ doubles opioid concentrations: reduced clearance and central volume); fentanyl is flow-limited (ER ≈ 0.8, Miller 10e ch. 24) — band a proposal]<br>HAND TW (automatic TW): the hepatic flow term works (clearance factor 0.40 vs 0.93) but fentanyl Ce is only +19 % at 30 min: fentanyl has no `flowDist` (rows-anaesthetic.ts:111), so shock does not shrink its central volume or slow its distribution (FU-4 G10 applied that to propofol only) → FU-7 | **TW** | FU-7 · 7g pk/pipeline.ts clFactor (hepFlow) / distFactor (fentanyl has no flowDist) |
| RH-16 | P1 | X-A GA vent · GA flag, no volatile vs sevoflurane → sevoflurane 2.2 % (≈ 1 MAC) for 1 h: hepatic blood flow and function | hbfPct 5.6; coPct 2.8; dMap -9.3; mac 0.84; dLiverFn 0; kLacPct 3 | WR: hbfPct = 5.6 above [-20, 0] [Miller 10e ch. 20 (inhaled anaesthetics: total HBF falls ≤ 20 % at 1 MAC; sevoflurane preserves hepatic arterial flow — Frink 1992 Anesthesiology 76:85); tables §5.3 hbfFactor ×0.8 at 1 MAC]<br>PL: dLiverFn = 0 (quiet, tol ±0.02) [Miller: hepatic function preserved under sevoflurane (quiet)]<br>HAND TW (automatic WR): H3: HBF +5.6 % (noise ±10 %) with CO +2.8 %: 7c's hbfRel = (CO/CO₀)² (blood/core.ts:132) is the only hepatic-flow input; 7d's own factor (volatile ×0.8/MAC, α-agonist, splanchnic sympathetic; liver.ts:53–57) is dead code whenever 7c is present (liver.ts:61). Sevoflurane preserving total HBF is the published answer, but the model gets it only because CO did not fall | **TW** | H3 · 7c hbfRel / 7d liver hbfFactor |

### 2.5 Intra-abdominal pressure and PEEP (P2)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| RH-06a | P2 | X-A GA vent · IAP 15 / 20 / 25 mmHg (renal event iapMmHg) from 300 s → urine output 20–40 min after the IAP step | uo0 0.36; uo15 0.36; uo20 0.36; uo25 0.35; uo15Pct 0; gfr25 126.4; rbf25Pct -28; gfr15Pct -0.1 | WR: uo15Pct = 0 (expected sign -1) [WSACS 2013 (Kirkpatrick, Intensive Care Med 39:1190): oliguria from IAP ≈ 15; Barash 9e ch. laparoscopy (renal perfusion ↓ with pneumoperitoneum)]<br>TS: uo25 = 0.35 above [0, 0.1] [research/12 RH-06 / WSACS: anuria at IAP > 25 (renal filtration gradient MAP − 2·IAP ≈ 45)]<br>HAND WR (automatic WR): H4: IAP 15/20/25 leave UO at 0.36/0.36/0.35 mL/kg/h. IAP enters only as the renal-vein and Bowman pressure (model.ts:63–65, 90, 128): RBF −28 % at 25 but TGF re-dilates the afferent and holds GFR at 126, and the pressure-natriuresis term reads the MAP, not the renal perfusion pressure (model.ts:104 `natriuresis(inp.map, …)`; tables §5.2 writes U(RPP)) | **WR** | H4 · 7d renal/kidney.ts (IAP → renal vein and Bowman) |
| RH-06b | P2 | X-A GA vent · IAP 15 / 20 / 25 mmHg → circulation: cardiac output, SVR, CVP | co15Pct 0; co25Pct 0; svr25Pct 0; dCvp25 0; dMap25 0 | WR: co25Pct = 0 (expected sign -1) [Barash 9e (laparoscopy / IAH): CO falls (IVC compression, venous return ↓) and SVR rises; WSACS 2013; tables §5.2 `iap` row ("venous return ↓")]<br>WR: svr25Pct = 0 (expected sign 1) [Barash 9e: SVR ↑ with IAP (aortic/splanchnic compression, catecholamines, vasopressin)]<br>HAND WR (automatic WR): H5: IAP is a kidney-only input (organs/pipeline.ts:76, 327): CO, SVR, CVP and MAP are bit-identical at IAP 25 (Δ 0.0) — no IVC compression, no afterload | **WR** | H5 · new: 7a (IAP → venous return / SVR) |
| RH-06c | P2 | X-A GA vent · IAP 15 / 20 / 25 mmHg → lung mechanics: peak airway pressure and compliance | dPpeak20 0; dPpeak25 0; crs20Pct 0; frc20Pct 0; ppeak0 19.6 | WR: crs20Pct = 0 (expected sign -1) [Barash 9e (pneumoperitoneum): respiratory compliance −30–50 %, Ppeak ↑; tables §5.2 `iap` row ("compliance ↓"); WSACS]<br>WR: dPpeak20 = 0 (expected sign 1) [as above (Ppeak ↑ at fixed VT)]<br>HAND WR (automatic WR): H5: Ppeak 19.6 at IAP 0, 20 and 25 (Δ 0.0); compliance and FRC unchanged — IAP does not reach 7b's chest wall | **WR** | H5 · new: 7b (IAP → chest-wall elastance, FRC) |
| RH-06d | P2 | X-A GA vent · IAP 20 / 25 mmHg → hepatic blood flow | hbf20Pct 0; hbf25Pct 0; kLac25Pct 0 | WR: hbf20Pct = 0 (expected sign -1) [Diebel 1992 J Trauma 33:279 (IAP 20: hepatic arterial and portal flow fall); WSACS 2013 (hepatic hypoperfusion in IAH)]<br>HAND WR (automatic WR): H3 + H5: HBF is (CO/CO₀)² only, and IAP moves neither CO nor any hepatic term (Δ 0.0 at IAP 20 and 25) | **WR** | H3, H5 · new: 7c hbfRel / 7d liver (IAP term) |
| RH-26a | P2 | X-A GA vent · normovolaemic, GA → PEEP 5 → 15 at 300 s: hepatic blood flow | hbfPct -29; coPct -15.5; dCvp 3.22 | PL: hbfPct = -29 in [-35, -10] [Brienza 1995 AJRCCM 152:504 / Matuschak 1987 J Appl Physiol 62:1377: PEEP 15–20 lowers portal and total hepatic flow ≈ 20–35 % (CO fall + hepatic venous back-pressure)] | **PL** | H3 · 7c hbfRel (CO only; no hepatic venous pressure term) |
| RH-26b | P2 | X-A GA vent · normovolaemic, GA → PEEP 5 → 15: urine output | uoPct -48.6; uoI 0.18; uoC 0.35; gfrPct -1.6 | TS: uoPct = -48.6 below [-40, -10] [Annat 1983 Anesthesiology 58:136 (PEEP 10: UO, GFR and RPF fall ≈ 20–35 %, ADH ↑); tables §5.2 PEEP row (×0.9 per 10 cmH2O + CVP/CO)]<br>HAND TS (automatic TS): UO −49 % at PEEP 15 (Annat: −34 % at PEEP 10) with GFR −1.6 % (Annat −19 %): most of the fall comes from CO −15.5 % read as hypovolaemia (H1) times PEEP_PER_10; GFR cannot fall while TGF can always restore it (H2) | **TS** | H1, H2 · 7d renal (PEEP_PER_10, CVP) |

### 2.6 Diuretics, osmotherapy and sodium loads (P2)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| RH-07a | P2 | X-A GA vent · normovolaemic, GA → furosemide 20 and 40 mg IV at 300 s: diuresis time course | onset40S 30; peakT40Min 2.5; peakUo40MlMin 3.1; peakUo20MlMin 2.37; extra2h40 167.5; extra2h20 119.6 | TW: onset40S = 30 below [120, 600] [Miller 10e ch. 17 (renal pharmacology) / furosemide label: IV diuresis within 5 min (onset 5–10 min in research/12)]<br>TW: peakT40Min = 2.5 below [15, 45] [label / Miller: peak ≈ 30 min after IV]<br>TW: extra2h40 = 167.5 (sign 1, beyond 300) [direction (dose-dependent natriuresis; 40 mg IV in normal kidneys ≈ 1 L in 2–3 h: Brater 1998 NEJM 339:387 — band a proposal)]<br>HAND TW (automatic TW): magnitude: 40 mg gives +168 mL in 2 h and a peak of 3.1 mL/min (7d's own awake test: 8.2 mL/min, 0.92 L in 4 h) because the loop diuretic's excreted fraction is multiplied by S 0.6 and by vNh, which falls 0.73 → 0.49 as the diuresis proceeds (H1; model.ts:104). Timing: onset 30 s and peak at 2.5 min (label: onset ≤ 5 min, peak ≈ 30 min) — the 7g fallback curve (n 0.47 rises with an infinite slope): FU-7 Task 2 already owns it | **TW** | H1, FU-7 · 7d renal/model.ts + 7g furosemide row |
| RH-07b | P2 | X-A GA vent · normovolaemic, GA → furosemide 40 mg: plasma K⁺ at 3 h | dK3h -0.004; dNa3h 0.02; dHco3 0.15 | TW: dK3h = -0.004 (sign -1, beyond 0.1) [Miller 10e ch. 17: loop diuretics cause kaliuresis (K ↓ ≈ 0.3–0.5 after a single dose; Brater 1998) — direction]<br>HAND TW (automatic TW): K⁺ −0.004 at 3 h: the renal seam excretes a fixed 50 mmol/L of the urine above basal and 7c refills plasma K from an unlimited cellular store — research/22 F6, owned by FU-9 A6 | **TW** (FU-9 A6 (F6) pending) | FU-9 · 7d organs/pipeline.ts renalSeam (FU-9 A6) |
| RH-07c | P2 | X-A GA vent · normovolaemic, GA → furosemide 40 mg: circulating volume and filling pressure | dBvMl2h -29.3; dCvp2h -0.25; dCvp10 -0.46; dMap2h -0.79; dHb2h 0.09 | TW: dBvMl2h = -29.3 (sign -1, beyond 100) [Miller: diuresis contracts the ECF/plasma volume (haemoconcentration)]<br>PL: dCvp10 = -0.46 (sign -1, beyond 0.3) [Dikshit 1973 NEJM 288:1087: furosemide venodilates within 5–15 min, before the diuresis (filling pressure ↓)]<br>HAND TW (automatic TW): follows RH-07a: −29 mL of blood volume at 2 h after a diuresis of +168 mL; the early venodilation (CVP −0.46 at 5–15 min, 7g `v0Frac`) is right | **TW** | H1 · 7d renal / 7c fluids / 7g furosemide v0Frac |
| RH-08a | P2 | X-A GA vent · normovolaemic, GA → mannitol 1 g/kg IV at 300 s: blood volume course | dBvPeak -2.4; dBv3h -160.6; dCvpPeak 0.15 | WR: dBvPeak = -2.4 (expected sign 1) [Miller 10e ch. 17 / neuro-anaesthesia: mannitol expands the plasma volume transiently (water drawn from cells) before the diuresis]<br>PL: dBv3h = -160.6 (sign -1, beyond 50) [then the osmotic diuresis contracts it (research/12 RH-08)]<br>HAND WR (automatic WR): H8: no volume expansion (Δ blood volume −2 mL): 7c has no mannitol solute, so mannitol never draws water from the cells; only the later diuresis (−161 mL at 3 h) shows | **WR** | H8 · 7c fluids (mannitol osmoles) / 7d renal |
| RH-08b | P2 | X-A GA vent · normovolaemic, GA → mannitol 1 g/kg: osmotic diuresis | extra1h 284.7; extra3h 623.8; peakUoMlMin 6.2; mannitolG1h 49.5 | PL: extra3h = 623.8 (sign 1, beyond 500) [Miller 10e ch. 17: mannitol is freely filtered and not reabsorbed; 1 g/kg obligates ≈ 1–1.5 L of urine over 2–3 h (≈ 14–20 mL/g) — direction, band a proposal] | **PL** | — · 7d renal/model.ts mannitol |
| RH-08c | P2 | X-A GA vent · normovolaemic, GA → mannitol 1 g/kg: plasma Na⁺ and osmolality (dilution, then concentration) | dNa15 0.1; dNa3h 0.49; dOsm15 0.2; dOsm3h 0.98 | WR: dNa15 = 0.1 (expected sign -1) [translocational hyponatraemia (Na ↓ ≈ 1.6 per 100 mg/dL mannitol; Miller / Manninen); research/12 RH-08 ("Na dilution then rise")]<br>TW: dOsm15 = 0.2 (sign 1, beyond 5) [measured osmolality rises with mannitol (≈ +20–30 mOsm/kg after 1 g/kg; osmolal gap)]<br>TW: dNa3h = 0.49 (sign 1, beyond 0.5) [later Na ↑ as free water is lost in excess of Na (osmotic diuresis) — research/12 RH-08]<br>HAND WR (automatic WR): H8: plasma osmolality +0.2 at 15 min (expected ≈ +20–30) and no translocational fall in Na⁺ (+0.1): mannitol is a private pool in the brain (osmotherapy) and in the kidney (`mannitolG`), not a plasma osmole | **WR** | H8 · 7c solutes (mannitol as an osmole) / 7d renal |
| RH-23a | P2 | X-A GA vent · TURP absorption → glycine 1.5 % 3 L over 30 min: Na⁺ and the osmolal gap | naEnd 119.5; osmEnd 281.4; osmCalc 249.5; osmGap 31.9; osmGapCtl -0.6 | PL: naEnd = 119.5 in [115, 125] [research/12 RH-23 (Na → 120); Hahn 2006 BJA 96:8 (TURP syndrome: 3 L glycine → Na ≈ 120)]<br>PL: osmGap = 31.9 (sign 1, beyond 10) [Hahn 2006: glycine is an osmole — measured osmolality falls less than 2·Na predicts (osmolal gap)] | **PL** | — · 7c solutes (glycine) |
| RH-23b | P2 | X-A GA vent · TURP absorption → glycine 3 L: circulation (overload: hypertension, bradycardia, then hypotension) | dMapPeak 26.4; dHrMin -11.8; dCvpEnd 12.52; dMapLate 27.1; dPawp 13.8 | PL: dMapPeak = 26.4 (sign 1, beyond 5) [Barash 9e (TURP syndrome): hypertension with volume overload]<br>PL: dHrMin = -11.8 (sign -1, beyond 5) [Barash 9e: reflex bradycardia]<br>PL: dCvpEnd = 12.52 (sign 1, beyond 2) [Barash 9e: CVP ↑ (overload)] | **PL** | — · 7a baroreflex / 7c volume |
| RH-23c | P2 | X-A GA vent · TURP absorption → glycine 3 L: urine output (osmotic and volume diuresis) | extraUrine1h 30.6; uoEnd 0.93 | TW: extraUrine1h = 30.6 (sign 1, beyond 100) [Hahn 1997 (glycine absorption): glycine acts as an osmotic diuretic and the load is excreted over hours]<br>HAND TW (automatic TW): 3 L absorbed yet +31 mL of extra urine in 1 h (CVP +12.5): the kidney does not excrete an expanded volume — research/22 F1, owned by FU-9 A1 | **TW** (FU-9 A1 (F1) pending) | FU-9 · 7d renal (volume excretion: FU-9 A1) |
| RH-25a | P2 | X-A GA vent · normonatraemic → 3 % saline 250 mL: plasma Na⁺ at 30 min | dNa30 2.27; dNa2h 2.26 | PL: dNa30 = 2.27 in [2, 4] [research/12 RH-25 (Na +2–4); Adrogué–Madias: 128 mmol into ≈ 42 L total body water → +3] | **PL** | — · 7c solutes |
| RH-25b | P2 | X-A GA vent · normonatraemic → 3 % saline 250 mL: urine output (natriuresis) | extraUrine2h 12.6; dBv2h 329.6 | TW: extraUrine2h = 12.6 (sign 1, beyond 50) [research/12 RH-25 (UO ↑, natriuresis of the Na load)]<br>HAND TW (automatic TW): +13 mL of urine in 2 h while 330 mL of the expansion stays in the circulation — research/22 F1 (FU-9 A1); no Na term in the natriuresis either | **TW** (FU-9 A1 (F1) pending) | FU-9 · 7d renal (volume/Na excretion: FU-9 A1) |

### 2.7 Renal failure, sepsis and vasopressors (P2)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| RH-09a | P2 | AKI (aki 1) vs X-A, GA vent · AKI proxy, normal starting K → 4 u RBC (35 d) over 20 min: peak ΔK⁺ | dKpeakAki 0.734; dKpeakOk 0.734; gfrAki 77; uoAki 0.22; uoOk 0.35 | PL: dKpeakAki = 0.734 in [0.3, 1.5] [Miller 10e ch. 49 (transfusion): 4 u of 35-day RBC (≈ 5–7 mmol K each) raise K ≈ 0.5–1; tables §5.2 (excretion)] | **PL** | — · 7c transfusion K |
| RH-09b | P2 | AKI (aki 1) vs X-A, GA vent · AKI proxy → 4 u RBC (35 d): ΔK⁺ at 3 h (renal excretion of the load) | dK3hAki -0.015; dK3hOk -0.015; akiMinusOk 0 | WR: akiMinusOk = 0 (expected sign 1) [Miller 10e ch. 17/49: the kidney excretes ≈ 90 % of a K load over hours; in AKI the load persists (research/12 RH-09 "slower excretion")]<br>HAND WR (automatic WR): the K⁺ excess at 3 h is identical in AKI and health (−0.015 both): 7c returns K to its set point whatever the kidney does (FU-9 A6 makes the pool finite); the aki proxy also keeps GFR at 77 mL/min under GA (H6) | **WR** (FU-9 A6 (F6) pending) | H6, FU-9 · 7d renalSeam K / 7c set point (FU-9 A6) |
| RH-10a | P2 | CKD proxy (aki 1 + K 5.5, Hb 10, HCO3 20) vs X-A, GA vent · renal failure (proxy for CKD 5) → rocuronium 0.6 mg/kg: time to T1 25 % | t25Ckd 40.75; t25Ok 35.75; ratio 1.14; fCkd 0.8; gfrRelCkd 0.61 | TW: ratio = 1.14 below [1.3, 1.5] [research/12 RH-10 (×1.3–1.5); Miller 10e ch. 27 (NMB): rocuronium clearance −33–39 % in renal failure (Cooper 1993 BJA 71:222), duration prolonged]<br>HAND TW (automatic TW): H6: the "CKD 5" proxy keeps GFR at 61 % (77 mL/min under GA; tables/KDIGO G5 < 15), so rocuronium's clearance factor is 0.80 and T1 25 % comes at ×1.14 (CM-08b measured ×1.10 and graded it PL on a 1.1–1.6 band; research/12 RH-10 asks ×1.3–1.5). The CKD profile row (renal drug clearance ×0.3) is missing (research/19 C10) | **TW** | H6 · 7g clFactor (renal share 0.3 of rocuronium) / 7d aki GFR |
| RH-10b | P2 | CKD proxy vs X-A, GA vent · renal failure; rocuronium 0.6 mg/kg 25 min before → sugammadex 2 mg/kg: time to TOFR 0.9 and re-curarisation over 2 h | t90Ckd 3; t90Ok 2.67; ratio 1.12; recurCkd false; recurOk false; tofCountAtS 0; tofRend 1 | PL: ratio = 1.12 in [1, 1.5] [Panhuizen 2015 BJA 114:777 (sugammadex 2 mg/kg in severe renal impairment: TOFR 0.9 in ≈ 2.0 vs 1.6 min); Staals 2008 BJA 101:492]<br>PL: recurCkd = false (expected false) [Staals 2010 / Panhuizen 2015: no recurarisation although the complex is not cleared] | **PL** | — · 7g nmb.ts (sugammadex binding, renal clearance) |
| RH-10c | P2 | CKD 5 · renal failure → morphine 10 mg: M6G/M3G accumulation | — | no active-metabolite model: morphine is a gamma effect curve with no renal term (research/14 DI-38 NE; research/11 §3) | **NE** | FU-7 · FU-7 (active metabolites; DI-38) |
| RH-11 | P2 | AKI (aki 1, K 4.2) vs X-A, GA vent · renal failure without neuropathy, normal K → succinylcholine 1.5 mg/kg: peak ΔK⁺ | dKAki 0.469; dKOk 0.469; akiMinusOk 0; k0Aki 4.172 | PL: dKAki = 0.469 in [0.3, 0.9] [Thapa & Brull 2000 Anesth Analg 91:237: renal failure has the normal +0.5 rise (not exaggerated)]<br>PL: akiMinusOk = 0 (quiet, tol ±0.2) [as above (state-dependence: none)] | **PL** | — · 7c succinylcholine K |
| RH-17a | P2 | X-A GA vent (KDIGO windows ÷ 3) · septic shock warm (7e sepsis 1 warm at 60 s) → 2 h untreated: UO, GFR, KDIGO stage | uoH2 0; uoCtlH2 0.35; gfrPct -100; rbfPct -63.2; akiStage2h 0; akiStage 1; tStage1Min 124; firstOligMin 34; akiStageCtl 1; map 43; co 4.32; sepStage 3 | PL: akiStage = 1 in [1, 2] [research/12 RH-17 (AKI stage 1–2 develops); KDIGO 2012 UO criterion (< 0.5 mL/kg/h ≥ 6 h = stage 1; teaching time scale 3)]<br>PL: gfrPct = -100 (sign -1, beyond 20) [Langenberg 2005 Kidney Int (septic AKI: GFR falls even when RBF is preserved or high); Sepsis-3]<br>WR: akiStageCtl = 1 (quiet, tol ±0) [the healthy GA control must not reach a KDIGO stage (quiet)]<br>HAND WR (automatic WR): the septic arm is oliguric from 34 min and anuric in hour 2 at MAP 43 and reaches KDIGO stage 1 at 124 min (time scale 3) — plausible; but the healthy GA control ALSO reaches stage 1 by 3 h (UO 0.35 mL/kg/h for 9 KDIGO-hours): H1 turns every long anaesthetic into AKI | **WR** | H1 · 7d renal (sepsis term) / RH-01 GA baseline |
| RH-22a | P2 | X-A GA vent · septic shock warm (MAP < 65) → noradrenaline 0.1 µg/kg/min from 1260 s: MAP to ≥ 65 → urine output | mapC 49.3; mapN1 66.3; mapN3 75.2; uoC 0; uoN1 0.09; uoN3 0.2; dUoN1 0.09 | PL: dUoN1 = 0.09 (sign 1, beyond 0.05) [tables §5.2 "Norepinephrine in vasoplegia: UOP recovers as MAP returns to 65–75" (NE-renal, Chest); Redl-Wenzl 1993 Intensive Care Med 19:151] | **PL** | — · 7d renal (pressure natriuresis, sepsis term) / 7g noradrenaline |
| RH-22b | P2 | X-A GA vent · septic shock warm, MAP already ≥ 65 → noradrenaline 0.3 vs 0.1 µg/kg/min: MAP 65 → higher, urine output | dMapHiLo 8.9; dUoHiLo 0.11 | PL: dUoHiLo = 0.11 (quiet, tol ±0.15) [LeDoux 2000 Crit Care Med 28:2729 and Bourgoin 2005 Crit Care Med 33:780: raising MAP 65 → 85 with noradrenaline does not raise UO; SEPSISPAM (Asfar 2014 NEJM 370:1583): benefit only in chronic HTN] | **PL** | — · 7d renal natriuresis curve / NE_EXCESS |

### 2.8 Liver failure, sepsis lactate and hypothermia (P2)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| RH-12a | P2 | hepaticFailure 0.8 vs X-A, GA vent · hepatic failure (7d condition 0.8) → GA 2 h: lactate and its clearance | lactHf 2.11; lactOk 1.19; lactHf0 1.01; kLacHf 0.86; kLacOk 1.24; liverFn 0.44; coreLiver 0.36 | PL: lactHf = 2.11 in [1.5, 3.5] [tables §5.3 `kLac` (×0.3 in liver failure → steady lactate ≈ 3.3; the split row → ≈ 1.7); Miller 10e ch. 16 (liver disease: impaired lactate clearance, hyperlactataemia)] | **PL** | H11 · 7c oxygen.ts stepLactate / 7d liver |
| RH-12b | P2 | hepaticFailure 0.8 vs X-A, GA vent · hepatic failure, fasting → GA 2 h: plasma glucose | gluHf 4.91; gluOk 5.55; glucoseF 0.44 | TW: gluHf = 4.91 above [2.5, 4.5] (lower = stronger/faster) [tables §5.3 / Miller 10e ch. 16: failing gluconeogenesis and glycogen stores → fasting hypoglycaemia in fulminant/Child C failure]<br>HAND TW (automatic TW): glucose 4.91 mmol/L after 2 h fasting at liverFn 0.44 (tables: hypoglycaemia) — research/19 C11 (7e glucose from liverFn), re-measured, not new | **TW** (CM C11 pending) | CM C11 · 7e glucose (liverF) / 7d glucoseF |
| RH-12c | P2 | hepaticFailure 0.8 · hepatic failure → INR / coagulopathy | inr 2.6 | the liver INR is the placeholder 1 + 2·failure and nothing reads it (research/11 §4.9); no coagulation model — 7i (R58/R60 v1.1) | **NE** | 7i · 7i (v1.1) |
| RH-12d | P2 | hepaticFailure 0.8 vs X-A, GA vent · hepatic failure → midazolam 0.05 mg/kg: level at 60 min (low-extraction hepatic clearance) | ce60Ratio 1; ce20Ratio 1; fHf 1 | TW: ce60Ratio = 1 below [1.3, 2.5] [MacGilchrist 1986 Gut 27:190 (cirrhosis: midazolam clearance ≈ halved, t½ doubled); Miller 10e ch. 16/23]<br>HAND MI (automatic TW): H9: midazolam is a 7g gamma effect curve; the clearance factor is applied only to compartment rows (pk/pipeline.ts:346–351), so hepatic failure, hypothermia, low HBF and renal failure leave midazolam, morphine, ketamine, dexmedetomidine, etomidate, thiopental and neostigmine unchanged (ratio 1.00) → FU-7 | **MI** | H9, FU-7 · 7g gamma rows (no clearance factor) |
| RH-12e | P2 | hepaticFailure 0.8 vs X-A, GA vent · hepatic failure → fentanyl 2 µg/kg: level at 60 min (high extraction: flow-, not function-limited) | ce60Ratio 1; fHf 0.93; fOk 0.93 | PL: ce60Ratio = 1 in [0.85, 1.25] [Haberer 1982 BJA 54:1267 (fentanyl PK unchanged in cirrhosis: high extraction, flow-limited); Miller 10e ch. 16] | **PL** | — · 7g clFactor (highExtraction → hepFlow only) |
| RH-13 | P2 | hepaticFailure 0.8 vs X-A, GA vent · hepatic failure → Ringer's lactate 2 L over 30 min: lactate at the end of the infusion | dLactHf 0.92; dLactOk 0.68; dLactHf60 0.46; hfMinusOk 0.24 | PL: dLactHf = 0.92 in [0.5, 1] [research/12 RH-13 (lactate +0.5–1: the lactate load is not cleared); Miller 10e ch. 16]<br>PL: hfMinusOk = 0.24 (sign 1, beyond 0.1) [the same load is cleared by a healthy liver (Didwania 1997 CCM 25:1851: RL does not raise lactate in health)] | **PL** | — · 7c fluids (RL lactate) / oxygen.ts stepLactate |
| RH-14a | P2 | Child C proxy (hepaticFailure 0.8 + albumin 25, 55 y) vs 55 y · cirrhosis Child C → none: resting circulation (hyperdynamic, low SVR) | coPct -0.1; svrPct 0 | no cirrhosis profile: the hepaticFailure proxy leaves CO and SVR unchanged (research/19 CM-10a; research/12 §5.11 missing profiles) | **NE** | FU-8 · FU-7 profile (cirrhosis) — research/19 C10 |
| RH-14b | P2 | Child C proxy vs 55 y · cirrhosis Child C → propofol 2 mg/kg: MAP fall vs healthy | mapPctHf -23.3; mapPctOk -23.3 | no cirrhosis profile and no protein binding (free fraction) in 7g (research/19 CM-10b; research/22 F13b) | **NE** | FU-8 · FU-7 profile (cirrhosis) / 7g protein binding |
| RH-17b | P2 | X-A GA vent · septic shock warm → 2 h untreated: lactate and lactate clearance | lact60 1.44; lact120 4.02; kLacPct -39.1; hbfPct -23.3 | TW: lact60 = 1.44 below [3, 4] [tables §7 check 16 (warm septic shock lactate 3–4); Sepsis-3 (septic shock lactate > 2)]<br>PL: kLacPct = -39.1 (sign -1, beyond 10) [research/12 RH-17 (lactate clearance ↓ in sepsis: Levraut 1998 AJRCCM 157:1021)]<br>HAND TW (automatic TW): lactate 1.44 at 60 min (tables check 16: 3–4) and 4.0 at 120 min; clearance −39 % is right (PL item). The late rise is 7e sepsis → 7c production (routed to the ET run / 7e), not a hepatic term | **TW** | — · 7e sepsis → 7c lactate / hbfRel |
| RH-20a | P2 | X-A GA vent · core 33 °C (setTarget tempCore over 10 min) vs normothermic GA → fentanyl 2 µg/kg at 900 s: clearance factor and level at 60 min | dTempC -2.92; fRatio 0.75; pctPerC -8.7; ce60Ratio 1.11 | PL: pctPerC = -8.7 in [-10, -7] [research/12 RH-20 / tables §5.3 `clearTemp` (−10 %/°C; range −7 to −22 %/°C, Tortorici 2007 Crit Care Med 35:2196)] | **PL** | — · 7g clFactor temperature term (−5 %/°C) × hbfRel |
| RH-20b | P2 | X-A GA vent · core 33 °C vs normothermic GA → lactate clearance | kLacPct -23.5; tempF 0.6; dLact2h 0.48; coreLiverRatio 0.67 | PL: kLacPct = -23.5 (sign -1, beyond 15) [tables §5.3 `clearTemp` (−10 %/°C on hepatic clearance); research/12 RH-20 (lactate clearance ↓)] | **PL** | — · 7d liver tempF → 7c core.liver |
| RH-20c | P2 | X-A GA vent · core 33 °C vs normothermic GA → urine output (cold diuresis) | uoCold 0.25; uoNorm 0.34; uoPct -26.5; dMap -4.61; coPct -6.5 | WR: uoPct = -26.5 (expected sign 1) [Miller 10e ch. (thermoregulation) / Polderman 2009 Crit Care Med 37:S186: mild hypothermia causes cold diuresis (tubular dysfunction, ADH resistance, central volume shift)]<br>HAND WR (automatic WR): H10: the kidney has no temperature input (RenalInputs, model.ts:16–29): at 33 °C UO falls 27 % with the CO (−6.5 %, read by eabv) instead of the cold diuresis | **WR** | H1, H10 · new: 7d renal (no temperature input) |

### 2.9 Not expressible (P2/P3)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| RH-18 | P3 | X-A · crush / rhabdomyolysis → the state: K ↑, AKI, myoglobinuria | — | no rhabdomyolysis state (condition id rejected; no myoglobin, no creatinine) — research/12 blocker | **NE** | 7i · 7i / FU-7 |
| RH-19 | P3 | cirrhosis · hepatorenal physiology → oliguria with normal volume (renal vasoconstriction) | — | no hepatorenal state or cirrhosis profile (condition id rejected) | **NE** | — · FU-7 (cirrhosis profile) |
| RH-24a | P2 | AKI (aki 1) · AKI over 24 h → KDIGO creatinine criterion (≥ 1.5× baseline / +26.5 µmol/L in 48 h) | — | no creatinine or urea (research/11 §2.9 "absent"; B30) — 7i (R58/R60 v1.1) | **NE** | 7i · 7i (v1.1) |
| RH-24b | P2 | AKI (aki 1) · AKI over 24 h → creatinine lags the GFR fall by hours (Moran & Myers) | — | no creatinine or urea (research/11 §2.9 "absent"; B30) — 7i (R58/R60 v1.1) | **NE** | 7i · 7i (v1.1) |

## 3. New gaps no stage owns, ranked, with the smallest mechanism and the file that would fix each

All line numbers are on 7c60b2b. "Tests moved" lists the calibrated tests a fix would change (the audits' §5
pattern).

### H1 — GA's normal fall in cardiac output is read as hypovolaemia (new, P1; owner 7d)
- **Cells:** RH-01a (TS), 01b (WR), 01c (TS), 03a (TW), 03b (TW), 04a/b (MI, with H7), 07a/c (TW), 17a (WR),
  20c (WR, with H10), 26b (TS).
- **Measured** (X-A GA vent, MAP 93–94, bvRel 1.00):
  - **4 h:** CO 4.9 vs 5.7 awake; vNh 0.58 (awake 0.88); angiotensin 0.37 (awake 0.03).
  - **Urine:** 0.35–0.38 mL/kg/h.
  - **Kidney:** RBF 476 vs 873 mL/min; GFR 126 (held); filtration fraction 0.48.
  - **Flags:** OLIGURIA from 360 s. At KDIGO time scale 3, the healthy control reaches stage 1 by 3 h.
  - **MANUAL twin** (CO held): vNh 1.00, urine 0.8.
  - **Class III + 2 L Ringer's:** vNh 0.46 60 min after MAP 92 / CO 5.3 were restored; urine 0.23.
  - **Furosemide 40 mg:** vNh 0.73 → 0.49 during the diuresis; +168 mL in 2 h (7d's awake unit test: 0.92 L in 4 h).
- **Code:**
  - `renal/model.ts:59–61`: `eabv = min(bvRel, (CO/co0)^0.75)`, with `co0 = max(0.08 L/min/kg × W, CO at build)`
    (`model.ts:74`, `organs/pipeline.ts:101`).
  - `model.ts:48–54`: V = 0.5 at an "effective" −15 %.
  - `model.ts:124–125`: vNh falls with τ 2 min and recovers with τ 45 min, so a CO that swings ±5 % breath to breath
    under PPV is rectified downwards.
  - `model.ts:101–104`: the GA stress factor S 0.6 (tables: "intra-op UOP 0.5–1") is multiplied on top.
  - `kidney.ts:60–66`: the same eabv drives angiotensin, and so the efferent tone and the RBF fall.
  - The unit test `test/l2/renal/model.test.ts:14` ("UOP 0.6 under GA") holds the CO constant, so it never sees
    this.
- **Smallest mechanism:** the non-osmotic ADH/renin input should be the underfilling the receptors sense, not CO
  against a fixed number. Reference the output to demand: `eabv = min(bvRel, (CO / (co0 · demandRel))^0.75)`, with
  7c's `demandRel` (VO₂ demand ÷ rest, already computed for `o2Delivery`). GA, hypothermia and sedation lower demand
  and output together and stay "full". HFrEF (low CO at normal demand, tables check 20) and haemorrhage (bvRel) are
  unchanged.
  - Low-pass the input symmetrically (τ ≈ 60 s) before the asymmetric neurohumoral lag.
  - S 0.6 stays the only GA term.
- **Tests moved:**
  - `test/l2/renal/model.test.ts:36/47/60` (check 20, class III → fluids, furosemide);
  - `test/engine/organs-renal.test.ts:9/39/64` (the two check-20 `it.fails` need the HFrEF state as well, §4 FU-8);
  - `organs-soak` (6 h hourly UOP);
  - FU-8 A8's `fu8-oliguria` (first flag 1200 s);
  - FU-9 A1's `fu9-expansion`/`fu9-kinetics` retention numbers, which are calibrated on today's GA urine — sequencing
    note in §4.

### H2 — No filtration equilibrium: GFR is held at any renal blood flow (new, P1; owner 7d)
- **Cells:** RH-02b (WR), 01c (TS), 26b (TS).
- **Measured** (filtration fraction, from Hct = 3·Hb):
  - awake 0.26;
  - GA 0.48;
  - class II 0.82;
  - class III 0.80, at MAP 71 with GFR −1 % and RBF −43 %;
  - PEEP 15: GFR −1.6 % (Annat 1983 at PEEP 10: GFR −19 %, RPF −32 %).
- **Code:** `renal/kidney.ts:44–45`: π_gc = 32 × albumin/42, a constant. `tgfTarget` (`kidney.ts:50–58`) can
  therefore always find an afferent resistance that restores `gfrSet` until R_AFF_MIN. The efferent angiotensin tone
  keeps P_gc up while RBF halves.
- **Smallest mechanism:** make the glomerular oncotic pressure the mean of its afferent and efferent values,
  π̄ = π_a·(1 + 1/(1 − FF))/2, with FF = GFR/(RBF·(1 − Hct)) (Deen–Robertson–Brenner). Solve it with GFR in closed
  form (a quadratic) or 2–3 fixed-point steps at 1 Hz. Hct is 7c's `hb` (add it to `RenalInputs`). FF then saturates
  near 0.3–0.35: GFR falls below RPP ≈ 80 and in class III, while GA and mild hypovolaemia still hold it.
- **Tests moved:** `test/l2/renal/model.test.ts:54` ("filtration fraction rises in low flow" — it rises, but to a
  ceiling), `kidney.test.ts`, and the GFR-dependent 7g renal clearance (rocuronium, sugammadex, milrinone rows).

### H3 — Hepatic blood flow has one input, (CO/CO₀)² (new, P1/P2; owner 7c + 7d)
- **Cells:** RH-16 (TW), 06d (WR, with H5), 26a (PL for the wrong reason); RH-02c (PL: HBF/CO 0.60 because the
  exponent 2 happens to equal the tables' ×0.6 at CO 0.62).
- **Measured:**
  - sevoflurane 1 MAC: HBF +5.6 % (CO +2.8 %);
  - PEEP 15: HBF −29 % = 0.845² from CO alone;
  - IAP 20/25: 0.0 %.
- **Code:**
  - `blood/core.ts:132`: `hbfRel = (CO/co0)^HBF_EXP`, with `HBF_EXP = 2` (`blood/params.ts:70–71`).
  - 7d's `hbfFactor` (`liver/liver.ts:53–57`: volatile ×0.8/MAC, α-agonist, splanchnic sympathetic ×0.6) is used
    only when 7c is absent (`liver.ts:61`), so it is dead code in the engine.
  - Nothing represents hepatic venous or outflow pressure (PEEP, IAP, CVP).
  - The exponent also doubles CO's per-breath swing: published HBF jitters 0.86–1.09 at rest.
- **Smallest mechanism:** 7d publishes the factor it already computes, extended by an outflow term (portal perfusion
  ÷ its reference, with the outflow = max(CVP, IAP)). 7c multiplies it: `hbfRel = (CO/co0) × organs.liver.hbfFactor`,
  one factor (R51 addendum 14: 7c keeps the flow).
  - Class III stays ≈ 0.6 × CO (tables §5.3).
  - Sevoflurane: ×0.8 at most (Frink: preserved).
  - PEEP and IAP gain their own term.
- **Tests moved:**
  - `test/l2/liver/liver.test.ts`;
  - 7c's hbfRel and lactate tests;
  - 7g's flow-limited clearance (`test/l2/pk/flow-distribution.test.ts`, propofol, fentanyl, lidocaine rows);
  - FU-9 A3's citrate clearance, which reads the same `hbfRel` (§4).

### H4 — The pressure-natriuresis term reads MAP, not the renal perfusion pressure (new, P2; owner 7d)
- **Cell:** RH-06a (WR). IAP 15/20/25 → urine 0.36/0.36/0.35 (control 0.36); RBF −28 % at IAP 25; GFR 126.
- **Code:** `renal/model.ts:104`: `natriuresis(inp.map, s.p.pRef)`. Tables §5.2 writes UOP ∝ U(RPP) with
  RPP = MAP − max(CVP, IAP) (`model.ts:63–65` already computes it for the haemodynamics). CVP and IAP therefore never
  reach urine except through GFR, which TGF restores (H2).
- **Smallest mechanism:** `natriuresis(inp.map − pv(inp) + RENAL_REF_CVP, s.p.pRef)`. This is unchanged at the
  reference CVP 5, so the awake UOP–MAP curve test holds. It gives oliguria at IAP 15–20 and anuria near RPP 40
  (tables `rppZero`), and lowers urine in right heart failure and with PEEP.
- **Tests moved:** `test/l2/renal/model.test.ts:24` (UOP–MAP curve at CVP 5 — unchanged), the check-20 tests (CVP 12
  now counts), `kidney.test.ts` (IAP).

### H5 — Intra-abdominal pressure reaches only the kidney (new, P2; owner: posture/surgical-events stage — 7a, 7b, 7c)
- **Cells:** RH-06b, 06c, 06d (WR).
- **Measured:** at IAP 25, CO, SVR, CVP, MAP, Ppeak (19.6), compliance, FRC and HBF all differ by 0.0 from control.
- **Code:** IAP is a 7d `renal` event field (`organs/pipeline.ts:293, 327`) read only by `renalIn`
  (`organs/pipeline.ts:76`). research/11 D19 lists pneumoperitoneum as "IAP only".
- **Smallest mechanism:**
  - **7a:** IAP as the external pressure on the abdominal venous compartment (venous return falls once IAP > CVP) and
    a splanchnic arterial resistance term.
  - **7b:** chest-wall elastance and FRC from IAP (Ecw × (1 + k·(IAP − 5))), [ENG] k for Ali; research/12 RH-06
    expects compliance −30–50 %.
  - **7c/7d:** HBF through H3's outflow term.

  This is the natural first input of the FU-7 "surgical events and posture" stage (pneumoperitoneum is research/12
  I17). Until then the SP run's pneumoperitoneum cells stay NE.
- **Tests moved:** new 7a/7b tests; `kidney.test.ts` (IAP).

### H6 — The `aki` condition is nearly inert (new, P2; owner 7d)
- **Cells:** RH-10a (TW), RH-09b (WR, with FU-9 A6); CM-08a–c (research/19) re-read.
- **Measured** (awake, 30 min):

  | aki | GFR | UO | RBF |
  |---|---|---|---|
  | 0 | 126 | 0.95 | 877 |
  | 0.5 | 125 | 0.95 | 973 (rises) |
  | 1 | 51 (77 under GA) | 0.39 | 1024 (rises) |

  - The CKD proxy's rocuronium clearance factor is 0.80, and T1 25 % comes at ×1.14.
- **Code:** `renal/model.ts:89, 127` and `params.ts:68`: aki scales only Kf (× 0.2 at 1). TGF (`kidney.ts:50–58`)
  then dilates the afferent to R_AFF_MIN and restores GFR, which is how a single nephron behaves but not a kidney
  that has lost nephrons. Intrinsic AKI's afferent vasoconstriction is absent, so RBF rises.
- **Smallest mechanism:** treat severity as nephron loss:
  - the TGF target falls with it: `gfrSet × (1 − AKI_KF_LOSS·aki)`;
  - so does the tubular capacity (the urine of the remaining nephrons);
  - an afferent tone term (R_AFF_MIN × (1 + k·aki)) lets RBF fall.

  At aki 1 GFR ≈ 25 mL/min (KDIGO G4–5 by name, Q for Ali). Rocuronium alone then reaches ≈ ×1.2; the tables' CKD
  row (renal drug clearance ×0.3) belongs to the missing `ckd` profile (§5).
- **Tests moved:** `test/l2/renal/model.test.ts` (aki), `test/l2/organs/pipeline.test.ts`, the CM-08 cells,
  `test/l2/pk/nmb.test.ts` (renal share).

### H7 — No hypertensive shift of renal autoregulation (new, P1; owner 7d)
- **Cells:** RH-04a/b (MI; the automatic PL is right for the wrong reason).
- **Measured** (MANUAL, MAP held):
  - HTN 80 y at MAP 61.7: urine 0.09; healthy at 65.2: 0.29.
  - vNh 0.44 vs 0.99, from CO 4.65 vs 6.98 (H1).
  - The hypertensive RBF falls LESS from 80 to 65 (−2.7 vs −35.8 %).
- **Code:** `renalIn` (`organs/pipeline.ts:75–79`) reads no profile. Tables §1.5 `htn` lists
  `renalLowerLimit +10`; the brain has its `HTN_LL_SHIFT` (CM-03d PL), the kidney has nothing.
- **Smallest mechanism:** shift the kidney's lower limit with the htn severity, as the brain does: `pRef` and the
  point where R_AFF_MIN is reached, +10 × severity.
- **Tests moved:** `test/engine/organs-htn.test.ts` (gains a renal case), `test/l2/renal/model.test.ts`.

### H8 — Mannitol is not a plasma osmole (new, P2; owner 7c, with 7d)
- **Cells:** RH-08a (WR), 08c (WR); RH-08b (diuresis) PL.
- **Measured** (1 g/kg):
  - Δ blood volume −2 mL at its maximum (expected a transient expansion), −161 mL at 3 h;
  - osmolality +0.2 at 15 min (expected ≈ +20–30);
  - Na⁺ +0.1 (expected a translocational fall);
  - urine +624 mL in 3 h.
- **Code:** 7c has no mannitol solute (`blood/solutes.ts`: only `osmOther` for glycine). 7d keeps two private pools:
  `giveOsmotherapy` for the brain (`organs/pipeline.ts:181`) and `renal.mannitolG` (`:182`, `model.ts:105, 141`).
- **Smallest mechanism:** mannitol becomes an effective ECF osmole in 7c's `so` (as `osmOther`, 1 mOsm per 182 mg),
  cleared at GFR by 7d, which reads 7c's pool instead of its own. With FU-9 A8 (the brain follows plasma osmolality),
  osmotherapy then needs no private brain term.
- **Tests moved:**
  - `test/l2/blood/solutes.test.ts`;
  - `test/engine/organs-tbi-treatment.test.ts` (mannitol ICP −25 % over 15–30 min must hold);
  - `test/l2/renal/model.test.ts` (mannitol);
  - FU-9 A8's osmolality test.

### H9 — Gamma-curve drugs ignore organ function (new, P2; owner 7g → **FU-7 before execution**)
- **Cell:** RH-12d (MI). Midazolam 0.05 mg/kg at hepatic failure 0.8: level ×1.00 at 20 and 60 min (MacGilchrist
  1986: clearance halved).
- **Code:** `pk/pipeline.ts:346–351`: the gamma branch never calls `clFactor`, which runs only for compartment rows
  (`:352–354`). Affected: midazolam, morphine, ketamine, dexmedetomidine, etomidate, thiopental, neostigmine,
  atropine, glycopyrrolate, and the other gamma rows. Hepatic and renal failure, hypothermia and low flow do not
  touch them.
- **Smallest mechanism:** stretch each gamma dose's post-peak time axis by 1/clFactor(row, ctx) (the same clearance
  factor, integrated per dose), or give midazolam/dexmedetomidine/morphine their published compartment sets. FU-7
  Task 2 already rewrites these rows' shapes (zero-slope onset), so it is the place.
- **Tests moved:** `test/l2/pk/units-gamma.test.ts`, `pipeline.test.ts`, FU-7 Task 2's onset tests, DI-69/88.

### H10 — The kidney has no temperature input: no cold diuresis (new, P2; owner 7d)
- **Cell:** RH-20c (WR). At 33 °C, urine 0.25 vs 0.34 (−27 %), following the CO −6.5 % through H1.
- **Code:** `RenalInputs` (`renal/model.ts:16–29`) has no temperature. The liver has `tempF`; the kidney does not.
- **Smallest mechanism:** a cold-diuresis factor on the excreted fraction below ≈ 35 °C (tubular Na reabsorption
  and ADH responsiveness fall; Polderman 2009). Magnitude [ENG], a question for Ali.
- **Tests moved:** `test/l2/renal/model.test.ts`; ET's hypothermia cells.

### H11 — Two lactate clearances (new, small; owner 7c + 7d)
- **Cell:** RH-12a (PL on lactate). At hepatic failure 0.8, 7d publishes `organs.liver.kLacPerH` 0.86 /h (its split
  formula: liver 60 %, kidney 30 %, other 10 %; `liver.ts:64–66`). The clearance acting on 7c's pool is
  kLac × hbfRel × liver ≈ 0.45 /h (`blood/oxygen.ts:33`), with no renal share, so AKI does not slow lactate
  clearance.
- **Smallest mechanism:** 7c uses the tables' split, `k = kLac·(0.6·hbfRel·liver + 0.3·gfrRel + 0.1)`, and 7d
  publishes 7c's number.

### H12 — Autoregulation ceiling slightly weak (new, small; owner 7d)
- **Cell:** RH-27a (TS). RBF +17.6 % from MAP 88 to 151 with GFR flat; the band is ±10–15 %.
- **Code:** `renal/params.ts:25–26`, `MYOGENIC_MAX` 2. Calibration (R44), not a mechanism.

### Observed, not graded (routed)
- Untreated warm septic shock settles at MAP 43 (tables check 16: 55–60), and its lactate is 1.44 at 60 min (3–4)
  → ET run / 7e (RH-17b).
- The hepaticFailure profile starts at lactate 1.0 and climbs to 2.1 over 2 h (steady ≈ 2.8): a chronic state that
  is not settled at t = 0 — a small 7c/7d item.
- In glycine absorption MAP is still +27 at 45–60 min, so the classic late hypotension does not appear (RH-23b). This
  is not graded (no sourced time course).

## 4. Findings routed to FU-7, FU-8 and FU-9 (not re-reported as new)

| plan | item | cells | measured here | note |
|---|---|---|---|---|
| **FU-7** (before execution) | **H9** — gamma rows ignore clearance | RH-12d | midazolam ×1.00 in hepatic failure | Task 2 rewrites the same rows (zero-slope onset): add the clearance time-stretch there |
| **FU-7** (before execution) | fentanyl has no flow-dependent distribution | RH-15b | class III: clearance factor 0.40 vs 0.93, but Ce only ×1.10 at 10 min and ×1.19 at 30 min | FU-4 G10's `flowDist` is on propofol only (`rows-anaesthetic.ts:57` vs `:111`); Egan 1999: opioid levels ≈ ×2 in shock |
| **FU-7** Task 2 (owned) | furosemide's fallback curve (n 0.47) | RH-07a | onset 30 s, peak diuresis 2.5 min (label ≤ 5 min / ≈ 30 min) | already in Task 2's list; the magnitude part is H1 |
| **FU-7** (before execution) | morphine metabolites; CKD renal clearance ×0.3 | RH-10c (NE); RH-10a | — | DI-38; tables §1.5 `ckd` `clearRenal` ×0.3 comes with the profile (research/19 C10) |
| **FU-8** | HFrEF never low-output (I-52 remainder) | RH-05a/b | hfref awake: CO 6.3, MAP 87, CVP 4.5 → UO 0.65; dobutamine CO +23.5 %, UO 0.71 | A12 keeps HFrEF targets bit-identical, so `organs-renal.test.ts:39/64` (`it.fails`, check 20) stay failing; the kidney is right for the circulation it sees |
| **FU-8** | OLIGURIA flag (I-34, A8) | RH-01b | flag from 360 s, on 225 of 240 min at GA | A8 defers the first flag to a completed 10-min bin, but the hourly UO is truly 0.35, so the flag still fires until H1 is fixed; KDIGO's 6 h is W9 (Ali) |
| **FU-8** | missing CKD / cirrhosis profiles (I-57, W17) | RH-14a/b, RH-19, CM-08e | Child C proxy: CO −0.1 %, SVR 0.0 %, propofol MAP −23.3 % in both arms | Ali's v1.0/v1.1 decision |
| **FU-9 A1** | volume excretion (F1) | RH-23c, RH-25b | glycine 3 L: +31 mL urine in 1 h (CVP +12.5); 3 % saline 250 mL: +13 mL in 2 h, 330 mL retained | **sequencing:** A1's GA retention (0.36 at 30 min) is calibrated on today's GA urine 0.35 mL/kg/h, which H1 says is too low — whichever of A1 / an H1 fix lands second re-measures BF-02 and RH-01 |
| **FU-9 A6** | renal K⁺ excretion (F6) | RH-07b, RH-09b | furosemide 40 mg: K⁺ −0.004 at 3 h; 4 u stored RBC: ΔK at 3 h −0.015 in AKI and in health | A6 makes the cellular pool finite; H6 still leaves the AKI kidney excreting |
| **FU-9 A8** | brain follows plasma osmolality (F11) | (RH-08) | — | H8 hands A8 mannitol as a plasma osmole, so osmotherapy becomes one mechanism |
| **FU-9 A3** | citrate clearance reads `hbfRel` | — | — | H3 changes `hbfRel`; A3's prototype numbers move with it |
| research/19 **C11** | cirrhotic fasting glucose | RH-12b | 4.91 mmol/L at 2 h (liverFn 0.44) | 7e glucose from liverFn |
| **ET run / 7e** | septic MAP and lactate time course | RH-17a/b | MAP 43; lactate 1.44 at 60 min | tables check 16 |

## 5. Cells blocked by missing features

| blocker | cells | what is missing | probe numbers | owner |
|---|---|---|---|---|
| **7i labs** (R58; **v1.1** by R60) | RH-12c, RH-24a, RH-24b | creatinine, urea, the KDIGO creatinine criterion and its lag; a coagulation INR | the liver INR placeholder reads 2.6 at failure 0.8 and nothing reads it; KDIGO stage is the UO criterion only | 7i |
| **missing profiles** (research/19 C10; FU-8 I-57 / W17, Ali) | RH-14a, RH-14b, RH-19 (+ CM-08e) | `cirrhosis` (hyperdynamic circulation, low SVR, protein binding, hepatorenal state) and `ckd` (tables §1.5: β ×1.3, renal drug clearance ×0.3, fistula, post-dialysis volume) | Child C proxy = health in CO, SVR and the propofol fall | FU-7 profiles |
| missing state | RH-18 | rhabdomyolysis / crush (K⁺, myoglobin, AKI) — `condition rhabdomyolysis` rejected | — | 7i / FU-7 |
| missing mechanism | RH-10c | morphine active metabolites (M6G) — DI-38 | — | FU-7 |

The designed NE count was 7; one more (RH-12c, INR) is NE because the placeholder is read by nothing, as BF graded
its INR cells.

## 6. Proposed scripted suite (the owners' acceptance cells)

`13-audit-scripts/run.sh cli.ts all` re-runs every cell in ≈ 25 min of wall time; `report.ts` prints the tables.

| owner | cells to re-measure at its gate | acceptance items (bands are Ali's proposals) |
|---|---|---|
| **7d** (H1, H2, H4, H6, H7, H10, H12) | RH-01a/b/c, 02b, 03a, 04a/b, 06a, 07a, 10a, 17a, 20c, 26b, 27a | GA 4 h: hourly UO 0.5–1, no OLIGURIA flag, control never reaches a KDIGO stage; awake and GA filtration fraction ≤ 0.3; class III GFR falls (FF ≤ 0.35); class III + 2 L RL: UO ≥ 0.5 within 60 min; IAP 15 UO ↓, IAP 25 < 0.1; aki 1 GFR ≤ 25 and RBF ↓; HTN kidney loses GFR at a higher MAP with CO matched; 33 °C UO ↑; PEEP 15 UO −10–40 % with GFR ↓ |
| **7c + 7d** (H3, H8, H11) | RH-16, 26a, 06d, 02c, 08a/c, 12a | sevoflurane HBF −20–0 %; PEEP 15 HBF −10–35 % with a venous term; class III HBF/CO 0.5–0.75 (must stay PL); mannitol osmolality +20–30, transient expansion, Na ↓ then ↑; one lactate clearance published |
| **7a/7b** (H5, the posture/surgical-events stage) | RH-06b/c | IAP 25: CO ↓ ≥ 10 %, SVR ↑; compliance −30–50 % at IAP 15–20 |
| **FU-7** (H9, RH-15b, RH-07a) | RH-12d, 15b, 07a, 10a | midazolam ×1.3–2.5 in hepatic failure; fentanyl ×1.3–2 in class III; furosemide onset 2–10 min, peak 15–45 min |
| **FU-8** | RH-05a/b, 01b | HFrEF check-20 premise (MAP 65, CVP 12, UO 0.1–0.15), dobutamine → UO 0.2–0.3 |
| **FU-9** | RH-07b, 09b, 23c, 25b | K⁺ ↓ after furosemide; AKI retains a K⁺ load longer than health; glycine and hypertonic loads excreted |
| **regression** (PL today) | RH-02a, 02c, 09a, 10b, 11, 12a, 12e, 13, 15a, 20a, 20b, 22a, 22b, 23a, 23b, 25a, 27b, M1, M2 | must stay PL |

For each gate the owner runs `PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts <ids>` and puts the
`report.ts` rows in its gate note beside this run's column (research/12 §7).

## 7. Questions for Ali (with the model's numbers)

1. **Urine under GA (H1).** At MAP 93 with normal volume, the model makes 0.35 mL/kg/h under GA for 4 h, so the
   OLIGURIA flag is on almost throughout and, at KDIGO time-scale 3, a healthy patient reaches "AKI stage 1" by 3 h.
   The MANUAL twin makes 0.8. Is 0.5–1 mL/kg/h (tables §5.2 S row) what you teach for a normotensive anaesthetised
   adult? And should GA's fall in cardiac output (5.7 → 4.9) count as effective hypovolaemia for ADH/renin? The
   proposed fix says no: output is referenced to demand.
2. **Filtration fraction (H2).** Should GFR fall in class III? Today, at MAP 71, it is held at −1 % with a
   filtration fraction of 0.80; under plain GA the fraction is 0.48. The fix caps it near 0.3–0.35 (filtration
   equilibrium), so GFR falls whenever RPP is below ≈ 80 or the efferent tone saturates.
3. **The kidney in MANUAL (RH-21, Q9).** In MANUAL class III, MAP still falls 49 mmHg and the kidney's volume arm
   runs (vNh 0.16, urine −96 %). Should MANUAL keep the renal neurohumoral arm, or should urine follow the
   instructor's MAP only (research/12's design check)?
4. **What `aki` severity means (H6).** Should severity 1 be KDIGO stage 3 (GFR ≈ 15–25 mL/min, RBF falling)? Today
   it gives GFR 51 awake / 77 under GA with RBF rising, and severity 0.5 does nothing. Should the missing `ckd`
   profile carry the tables' renal drug clearance ×0.3? Rocuronium is ×1.14 on the proxy; research/12 asks ×1.3–1.5,
   and CM's band 1.1–1.6 called ×1.10 PL.
5. **IAP (H4/H5).** Which organ effects of IAP belong in v1.0: urine, venous return, compliance, HBF? Today IAP 25
   changes RBF only (−28 %). WSACS: oliguria from 15, anuria near 25–30.
6. **Hypertensive kidney (H7).** Implement tables §1.5 `renalLowerLimit` +10? Today the hypertensive difference comes
   only from the elderly profile's lower CO.
7. **Cold diuresis (H10).** What magnitude at 33 °C? The model gives −27 %; the literature direction is up.
8. **Mannitol (H8).** Confirm the teaching picture for 1 g/kg: osmolality +20–30 at 15 min, a transient plasma
   expansion, Na⁺ ↓ then ↑. Today: +0.2, no expansion, Na⁺ +0.1.
9. **Furosemide under GA.** 40 mg gives +168 mL in 2 h under GA (+0.92 L in 4 h awake in 7d's own test). Should a
   loop diuretic's natriuresis be damped by the GA ADH factor at all?
10. **Direction-only cells** (no sourced magnitude; `dirOnly`). Please confirm the directions or give bands:
    - RH-03b: 2 u RBC after class III, UO 0.08;
    - RH-04a/b;
    - RH-07a: 40 mg extra urine;
    - RH-08b: mannitol +624 mL in 3 h;
    - RH-09a: 4 u RBC ΔK⁺ +0.73;
    - RH-15b: fentanyl ×1.3–2 in shock (extrapolated from Egan's remifentanil);
    - RH-21;
    - RH-23c, RH-25b;
    - RH-M1/M2.

## 8. Files and how to re-run

All files are in `13-audit-scripts/`. Nothing in the repo was changed; the engine ran from a throwaway worktree.
- `runner.ts`: the arm runner (from BF), plus the 7d/7g sampling and a Ppeak probe. It loads the engine from
  `PME_ENGINE`.
- `spec.ts`: cell type, contexts, states, rigs, and the urine/filtration-fraction helpers.
- `grade.ts`: automatic grading (from BF). `hands.ts`: the hand confirmations. `regrade.ts` re-applies both to the
  stored values.
- Cells: `cells-a.ts` holds the P1 cells and the MANUAL twins; `cells-b.ts` holds P2/P3.
- `cli.ts`: runs the cells into `out/cells.json` (or `RH_OUT=<file>`; `merge.ts <file>` folds it back in).
- Output: `report.ts` writes `out/matrix.md` (the §2 tables; gap ids from `gaps.json`); `ledger.ts` writes
  `out/ledger.md` (the research/12 §4.7 ledger).
- `run.sh`: sets `PME_ENGINE` and the hooks.

```
git -C <repo> worktree add --detach <wt> origin/main && (cd <wt> && npx -y pnpm@9.15.9 install --frozen-lockfile)
PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts all        # or P1, RH-06, …
./run.sh regrade.ts && node --experimental-strip-types report.ts > out/matrix.md && node --experimental-strip-types ledger.ts > out/ledger.md
```
