# 20 — Coverage run DV: devices, pacing, defibrillation, CPR (R54 matrix, research/12 §5.8)

*Coverage auditor, 2026-09-29. Read-only on the repo. Engine pinned at `origin/main` **3feee6f** (its engine code is
identical to 0fd5397: FU-3, FU-4 and FU-5 merged; V.1, FU-6, FU-7, FU-8 and FU-9 not). Seed 7 unless a cell names its
seeds; stochastic shock cells run 40 seeds and also report the outcome table's exact probability. Scripts:
`research/20-audit-scripts/` (rerunnable; `out/cells.json` holds one graded record per cell and no raw rows). The clean
full run reproduced the development runs exactly. The report follows research/19 (run CM) and research/22 (run BF).*

## 0. Headline

- **65 cells**:
  - the 61 of research/12 §5.8 (DV-01…26, split a–d as designed; DV-17's three readouts are graded as one cell with
    three items);
  - one quiet cell this run added after an unexpected arrest (**DV-13d**);
  - five MANUAL twins (DV-M1…M5).

  **28 P1, 32 P2, 5 P3.** Every intervention cell has its control arm, or a reference arm at the same sim time.
- **Verdicts:**

  | verdict | cells | P1 | P2 | P3 | of which another stage's plan already owns the fix |
  |---|---|---|---|---|---|
  | plausible (PL) | **26** | 12 | 14 | — | — |
  | too weak (TW) | **10** | 4 | 6 | — | — |
  | too strong (TS) | **4** | 3 | 1 | — | 1 (DV-02a's CoPP half: FU-4 S13 `it.fails`, R45) |
  | wrong (WR) | **12** | 7 | 5 | — | 2 (DV-01c, DV-25a: FU-7 Task 12) |
  | inconsistent (IN) | **1** | — | 1 | — | — |
  | missing (MI) | **3** | 1 | 1 | 1 | 2 (DV-15b, DV-19: 7h) |
  | not expressible (NE) | **9** | 1 | 4 | 4 | all 7h (ICD, ECMO, magnet, pericardiocentesis) or the EMI coupling |

  - **30 non-plausible expressible cells.** 26 have at least one mechanism no stage owns (§3); 4 wait on planned work
    (FU-7 Task 12, 7h).
  - Run time: ≈ 20 min of engine wall time for all 65 cells (these rigs run ≈ 250× real time).
- **The matrix after this run** (research/12 §4.6): 201 (audits 08–10) + 105 (DI) + 69 (CM) + 74 (BF) + 65 (DV) =
  **514 measured cells**.
- **Ten most important findings** (ranked; §3 has the mechanism and file:line for each):
  1. **A correctly timed IABP kills a compensated HFrEF + recent-MI patient (V2; DV-13d; P1).**
     - 1:1 augmentation with textbook timing: arrest at **+8.8 min**; the control does not arrest.
     - Mechanism (a): the coronary step reads CoPP from the beat's *minimum* aortic pressure (`coronary.ts:142`,
       `b.aoDia`). Under a balloon that minimum is the post-deflation dip, so CoPP **falls** 57.7 → 46.1 when the
       augmented diastole should raise it.
     - Mechanism (b): the balloon leaks volume. When the next beat reschedules it mid-deflation (`devices.ts:48–54`
       overwrites `deflateAt`), the rest of the 40 mL stays in the aorta: 7 of 63 deflations per minute are cut short.
     - Course: LVEDV 219 → 244 mL and LVEDP 10 → 24 over 8 min, then the ischaemic spiral (kIsch 0.85 → 0.1 in 60 s).
  2. **In MANUAL, every "correct" IABP setting is late deflation (V2; DV-M5).** MANUAL is the only place a
     cardiogenic-shock state can be authored today.
     - The balloon deflates ≈ **270 ms after** the next aortic opening. In MODELED it deflates 184 ms before it.
     - Assisted EDP is therefore +8.8 above the unassisted, instead of −15.8.
  3. **A PEA produced by a shock, or set by the instructor, never regains a pulse and never decays (V1; DV-01b; P1).**
     - Only the engine's own arrest declaration creates `circ.arrest`, and `roscStep` and `peaDecayStep` return at once
       without it.
     - 11 of 40 shocks at 1 min of VF produced a PEA. None regained a pulse under 8 min of CPR at CoPP 27–28, with a
       myocardial state of 1.00.
  4. **CPR on a tamponaded heart gives an arterial pressure of 181/124 (V3; DV-04a; P1).**
     - MAP 154 (VF CPR: 46), a rectified "forward flow" of 12 L/min, CVP 60, CoPP −13.
     - No pulse returns, which is right, but the arterial line teaches the opposite of tamponade physiology.
  5. **EtCO2 under CPR cannot see the circulation (V4; DV-03, DV-04a; P1).**
     - During CPR the gas model takes its flow from an interim quality fit (`gas/coupling.ts:38–41`).
     - A bled-out patient (CoPP 3.1) therefore reads EtCO2 **17.4**, and a tamponade 15.9: the same as VF with a full
       circulation (15–19).
     - V.1 lists "CPR flow scaling" as a Request; no stage owns it.
  6. **The shock-outcome table is state-blind (V5; → FU-7 Task 12).**
     - The first biphasic shock terminates VF in **70 %** at any energy ≥ half the skin default. The biphasic literature
       gives 85–98 %.
     - The ROSC share is the same after 3 min of CPR as after none (5 %).
     - It is the same at 28.5 °C as at 37 °C (termination 60 % vs 60 %), and the same at K⁺ 9.5 as normokalaemic
       (7.5 % vs 7.5 %).
     - Cardioversion is one 0.8 for AF, flutter and VT, at 20 J as at 200 J.
     - FU-7 Task 12 adds K, pH, CoPP, drugs and the arrest clock — **not temperature, energy or rhythm class** (§4).
  7. **The physiology *around* the shock is right.**
     - An early shock sustains a rhythm. The same organised rhythm after 8 min of untreated VF re-arrests within 20 s
       (myocardial state 0.02). After 3 min of CPR first, it holds (0.87). The Weisfeldt–Becker three phases emerge.
     - Hyperkalaemia re-fibrillates a forced sinus at +80 s.
     - Asphyxial arrest regains a pulse with ventilation in 4 of 5 organised arrests, and in none without.
     - Oxygenation reverses hypoxic bradycardia in 10 s.
  8. **CPR quality, CoPP and EtCO2 are plausible; cerebral flow is not (V8).**
     - CoPP 27.2 at quality 1 (Paradis 15–25: FU-4 S13's `it.fails`), halved by poor CPR (0.52).
     - EtCO2 18.8 (10–20), halved (0.43); CO 1.5 L/min.
     - Cerebral flow under CPR is **0.71 of normal** (consensus 30–40 %).
  9. **Pacing works, including "electrical ≠ mechanical capture"; pacing pain does not exist (V6).**
     - Capture at 70 mA; MAP 80 → 96 on capture.
     - After 8 min of VF the pacer captures electrically with no pulse.
     - Loss of capture, failure to sense, oversensing and pacemaker dependence all behave.
     - An awake patient paced at 80 mA has no pain and no surge (ΔNE 0): the pacer writes only an ECG modifier.
  10. **The LVAD is a flow source without a preload (V9).**
      - A 1.5 L bleed lowers pump flow only 3.99 → 3.70 L/min and never reaches suction: no PI event, no ectopy hook.
      - Pulsatility index 6.7 (HM3 3–4); power 3.6 W (4–5).
      - The SpO2 perfusion index barely falls (×0.89), and NIBP succeeds 10 of 10 times at PP 20.
      - Acute RV failure moves pump flow only −0.06 L/min.
- **What works (26 PL):**
  - the defibrillator as a device: charge 7 s to 200 J and 10 s to 360 J on lifepak-like, auto-disarm at 60 s, a sync
    marker on every R, discharge 28 ms after R, SYNC off after the shock;
  - the unsynchronised R-on-T hazard (7.5 % VF);
  - the EtCO2 jump at ROSC (+12, peak at 60 s);
  - CoPP falling in a pause and rebuilding in 5 s;
  - adrenaline raising CoPP (+6.7); no ROSC from asystole;
  - exsanguination with CPR alone (no pulse, CoPP 3.1);
  - SpO2 "?" and PR 110 (= the compression rate) during CPR;
  - the IABP in the MODELED rig: augmentation above the unassisted systolic (+6.4), assisted EDP −15.8, late inflation
    shrinks the augmentation (−7.9), and 1:2 shows assisted and unassisted beats;
  - LVAD flow falling with afterload (−0.39 L/min for +24 mmHg).

## 1. Method and rig

- **Design source:** research/12 §5.8 (DV, 26 scenarios / 61 cells), §2 (cell record, grading), §3 (tiers) and §6
  (runner). Names follow research/11 §5:
  - CoPP = coronary perfusion pressure (aortic relaxation/diastolic pressure − RA or LV end-diastolic pressure);
  - kIsch = 7a's ischaemic contractility factor;
  - "myocardial state" = kIsch·(1 − hyp), the variable FU-4's ROSC rule reads;
  - PuI = the LVAD pulsatility index; PI = the SpO2 perfusion index.
- **Rig.** Adult 40 y, 70 kg, 175 cm, male; sensors ABP/CVP/PAP/SpO2/CO2/temp/NIBP.
  - **"Ventilated"** = ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 from 1 s.
  - **Skin:** philips-like (no defibrillator of its own → the ZOLL-like fallback, first-shock energy 120 J), unless the
    cell names lifepak-like or zoll-like.
  - **VF** is the instructor's `setRhythm vfCoarse` at 60 s (as audit 08 and FU-4 S13).
  - **Hyperkalaemic VF** is FU-4's engine-declared route (profile K⁺ 9.5 → VF at ≈ 70 s).
  - **Asphyxial arrest:** propofol + rocuronium, no ventilation, room air → FU-3's hypoxic bradycardia (HR 40 at SpO2
    45, 185 s) → engine-declared arrest at ≈ 410 s.
  - **Shocks:** charge 9 s before, shock at the named time.
    - Where the *physiology after* the shock is the question, the outcome is pre-selected (`defib preselect sinus`) so
      the draw does not decide it.
    - Where the *probability* is the question, 40 seeds run and the table's exact probability (`outcomeProbabilities`,
      a read-only import) is reported too; cardioversion cells are graded on the exact probability.
  - **IABP:** no MODELED cardiogenic-shock state exists. HFrEF is a compensated profile, and the instructor's
    `contractility` acts only in MANUAL.
    - DV-13/14/15 therefore grade the MODELED HFrEF 60 y profile (SV 77 mL).
    - The instructor's MANUAL shock rig (contractility 0.4, SBP/DBP 85/55: SV 34 mL, CO 2.6, PAWP 24) is DV-M5.
    - Beat-level readouts come from a 10 ms window of the aortic-root pressure, the aortic-valve flow and the balloon
      schedule (`fbeats`, `spec.ts`). Augmentation = the diastolic peak after an inflation; assisted EDP = the aortic
      pressure at the next valve opening.
  - **LVAD:** HFrEF 60 y profile, 5400 rpm from 300 s.
- **Sampling.** The committed state is read every 1–5 s, read-only. The runner also keeps:
  - `deviceStatus`, `marker` (shock, syncR, paceSpike with its `captured` flag, charge/ready/disarm), `tone`,
    `alarmStatus` and NIBP results;
  - the displayed numerics with their validity flags.

  No pokes. Arms yield once per simulated minute.
- **Grading** (research/12 §2.2): automatic first, then every non-PL confirmed by hand. `HAND` lines give the code
  reason.
  - Bands are proposals for Ali with their source; none was widened (R45).
  - `[VERIFY]` marks a vendor or trial figure quoted from memory of the source, to be checked before the band becomes a
    test.
  - Direction-only cells are listed in §8.
- **MANUAL.** Q9 is open, so DV-M1…M5 are direction-only beside their MODELED twins.

## 2. Results

How to read the tables:
- Keys starting with `d` are control-subtracted.
- `…Pct` are percentages (of seeds, or against the control).
- `exact…` is the shock table's own probability.
- `…S` / `…Min` are seconds / minutes from the intervention.
- Gap ids are §3. The tables are generated by `report.ts` from `out/cells.json`.

Family by family:
- **2.1 Defibrillation:** the three-phase physiology is right; termination is too low and a shock-made PEA is inert (V1,
  V5).
- **2.2 CPR and arrest states:** CoPP, EtCO2 and the quality effect are right. Cerebral flow is high (V8), tamponade CPR
  gives hypertension (V3), and EtCO2 is blind to the volume state (V4).
- **2.3 Cardioversion:** one probability for every rhythm and energy (V5); R-on-T right.
- **2.4 Pacing:** capture, faults and "electrical ≠ mechanical" are right. There is no pain (V6) and no EMI coupling
  (NE).
- **2.5 Device and artefacts:** charge, sync and tones are right; the CPR event does not reach the ECG (V7, IN).
- **2.6 IABP:** augmentation and EDP are right in MODELED; it kills the MI patient (V2); the timing errors are half
  right.
- **2.7 LVAD/ICD/ECMO:** the LVAD has no preload physiology (V9); ICD and ECMO are NE (7h).
- **2.8 Special circumstances:** hypothermia and K⁺ are invisible to the shock (V5); asphyxia is right.
- **2.9 MANUAL:** CPR and pacing plausible; the post-ROSC pressure ramp (V12) and the IABP timing (V2) are not.

### 2.1 Defibrillation of VF (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DV-01a | P1 | X-A ventilated, MODELED · VF 60 s (instructor), no CPR → first shock 150 J and 200 J biphasic, 40 seeds each (the skin's first-shock energy: philips-like → ZOLL-like fallback 120 J) | term150Pct 65; term200Pct 65; roscPct150 7.5; exactTermPct 70; exactRoscPct 10; exactTerm50JPct 35; dist150 unchanged 35 / asystole 30 / pea 27.5 / rosc 7.5 % | TW: term150Pct = 65 below [85, 99] [first biphasic shock terminates VF (removes it ≥ 5 s) in 85–98 %: Schneider T et al., Circulation 2000;102:1780 (ORBIT, 150 J: 96 %); van Alem AP et al., Resuscitation 2003;58:17 (biphasic 98 %) [VERIFY exact figures]]<br>TW: term200Pct = 65 below [85, 99] [as above (ERC 2021 ALS: first biphasic shock ≥ 150 J)]<br>HAND TW (automatic TW): VF_TABLE persistent 0.3 (l3/defib-pacer/outcome.ts:10) gives 70 % termination at every energy ≥ 50 % of the skin default — the monophasic-era figure; biphasic first-shock termination is ≈ 90–98 %. The share that does terminate is split as the table says (asystole 30 / PEA 30 / ROSC 10 %) | **TW** | V5 · L3 outcome.ts VF_TABLE (calibration R44; the same file FU-7 Task 12 edits under E-FU7-6) |
| DV-01b | P1 | X-A ventilated, MODELED · VF 60 s (instructor) → shock 200 J, then CPR q 0.8 from +20 s for 8 min, 40 seeds: the post-shock rhythm and what CPR does to each | nTerm 26; asystoleOfTermPct 46.2; peaOfTermPct 42.3; roscOfTermPct 11.5; nPea 11; peaRegainPct 0; peaRegains false; peaCppMean 27.6; peaMyoEnd 1; peaArrestDeclared false; nAsy 12; asyLeavesPct 0 | WR: peaRegains = false (expected true) [ERC 2021 ALS: compressions resume at once after the shock because the post-shock heart is stunned; an organised post-shock rhythm on a heart that fibrillated for only 1 min and is perfused at CoPP > 15 regains a pulse under CPR (Weisfeldt & Becker 2002 electrical/circulatory phase; the engine's own roscStep rule, CPP ≥ 15 and myocardial state ≥ 0.4 for 60 s)]<br>PL: roscOfTermPct = 11.5 in [5, 40] [post-shock rhythm after termination: asystole or an organised non-perfusing rhythm in most, immediate ROSC in a minority (research/12 DV-01; van Alem 2003) — direction proposal]<br>HAND WR (automatic WR): a PEA produced by a SHOCK is a pulseless sinus with no declared arrest (c.arrest stays null: only arrestStep/hypoxicArrestRequest set it, hemo/pipeline.ts:401–404), so roscStep (arrest.ts:136–139) and peaDecayStep (arrest.ts:112–113) both return at `if (!a)`: under 8 min of CPR at CoPP 27–28 with a fully recovered myocardium (state 1.00) not one shock-PEA regained a pulse, and none decayed. The same holds for any instructor-set PEA. Asystole after a shock stays asystole for ever (Q3 ruling), even on a myocardium at 1.00 | **WR** | V1 · FU-4 arrest machine (hemo/pipeline.ts:397–417; device-layer.ts:199–226) — new: a shock/instructor PEA must enter the arrest state |
| DV-01c | P1 | X-A ventilated, MODELED · VF 1 min vs 8 min (no CPR) vs 8 min with the last 3 min under CPR q 0.8 → shock 200 J pre-selected to an organised rhythm (sinus) — does the circulation sustain it? — plus the table's ROSC probability for each state | sustEarly true; sustLate false; sustLateCpr true; myoPreEarly 0.63; myoPreLate 0.02; myoPreLateCpr 0.87; cppCpr 28.7; pRoscEarlyPct 10; pRoscLatePct 5; pRoscLateCprPct 5; cprRaisesProbability false; lateRhythms late: 5 sinus, 65 vfCoarse, 545 agonal(pulseless), 695 asystole | PL: sustEarly = true (expected true) [Weisfeldt & Becker, JAMA 2002;288:3035 (electrical phase 0–4 min: an early shock restores a perfusing rhythm)]<br>PL: sustLate = false (expected false) [Weisfeldt & Becker 2002 (circulatory phase 4–10 min: a shock without prior CPR yields a non-perfusing rhythm)]<br>PL: sustLateCpr = true (expected true) [Weisfeldt & Becker 2002; Wik 2003 JAMA 289:1389 (CPR before the shock in the circulatory phase improves ROSC)]<br>WR: cprRaisesProbability = false (expected true) [research/12 DV-01: ROSC probability rises with CoPP (Paradis 1990; Niemann) — the shock table has no CoPP input]<br>HAND WR (automatic WR): the physiology is right (1 min sustains; 8 min no-CPR re-arrests through the low-flow rule within 20 s; 8 min with 3 min of CPR sustains, myocardial state 0.02 vs 0.9 at the shock). The shock TABLE ignores it: ROSC 5 % at 8 min whether or not CPR ran (outcome.ts ShockContext has no CoPP or myocardial input). FU-7 Task 12 adds `cppMmHg` | **WR** (FU-7 Task 12 pending) | V5 · L3 outcome.ts ShockContext (FU-7 Task 12, E-FU7-6) |

### 2.2 CPR quality and the arrest states under CPR (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DV-02a | P1 | X-A ventilated, MODELED · VF (instructor) at 60 s → CPR quality 1.0 (and the default 0.8) from 120 s: CoPP and cerebral flow over minutes 2–8 | cppQ1 27.2; cppQ1Max 28.8; cppQ08 27.2; cbfQ1 0.71; coQ1 1.5; mapQ1 55.1; myoQ1End 0.8; myoQ08Max 0.9 | TS: cppQ1 = 27.2 above [15, 25] [Paradis NA et al., JAMA 1990;263:1106 (human CPR: no ROSC below CoPP 15; ROSC group max CoPP 25.8 ± 7.4); research/12 DV-02 (15–25)]<br>TS: cbfQ1 = 0.71 above [0.2, 0.45] [Meaney PA et al., Circulation 2013;128:417 (CPR quality consensus: high-quality CPR delivers ≈ 10–30 % of normal coronary and 30–40 % of cerebral flow) [VERIFY]]<br>PL: coQ1 = 1.5 in [1, 1.9] [CPR cardiac output 20–33 % of normal (AHA 2020 ALS physiology; Meaney 2013)]<br>HAND TS (automatic TS): CoPP 27 at quality 1 and 26 at the default 0.8 (FU-4 S13 already pins 25.1–28.8 as `it.fails` under R45); new here: cerebral flow 0.71 of normal under CPR, about twice the 30–40 % of the consensus — organs/brain reads cbfRel from a CPR MAP of 55 that sits on the autoregulation plateau; and the myocardial state recovers to 0.8–0.9 in VF (FU-4 `it.fails` "kIsch < 0.9 throughout", max 0.91) | **TS** (FU-4 S13 it.fails (CoPP) + new (CBF) pending) | V8 · FU-4 CPR model (circ/params.ts:109–125) for CoPP; 7d brain (CBF under CPR) — new |
| DV-02b | P1 | X-A ventilated VCV 12 × 600, MODELED · VF + CPR quality 1 → EtCO2 during minutes 2–8 of CPR (truth and displayed) | etco2Q1 18.8; etco2Q1Disp 20.3; etco2Early 15.6 | PL: etco2Q1 = 18.8 in [10, 20] [research/12 DV-02 (10–20; > 20 at ROSC); Sanders AB et al., JAMA 1989;262:1347 (EtCO2 during CPR 15 ± 4 in survivors vs 7 ± 5); AHA 2020 (EtCO2 < 10 = poor CPR)] | **PL** | — · 3 / FU-4 (CO2 low-flow coupling, gas/coupling.ts CPR_FLOW_EXP) |
| DV-02c | P1 | X-A ventilated, MODELED · VF → CPR quality 0.4 vs 1.0 (poor vs good compressions) | cppQ04 14; cppRatio 0.52; etco2Q04 8; etco2Ratio 0.43; coRatio 0.43; cbfQ04 0.11 | PL: cppRatio = 0.52 in [0.3, 0.7] [research/12 DV-02: poor CPR roughly halves CoPP (compression depth → flow, Edelson 2006 / Stiell 2014 depth–outcome) — proposal]<br>PL: etco2Ratio = 0.43 in [0.3, 0.7] [research/12 DV-02: poor CPR roughly halves EtCO2 (EtCO2 tracks CPR cardiac output; Sheak 2015 Resuscitation 89:149: EtCO2 rises with depth)] | **PL** | — · FU-4 CPR model / 3 (CO2 coupling) |
| DV-03 | P1 | X-A ventilated, MODELED · complete exsanguination (3 L over 10 min) → PEA → CPR q 0.8 alone from 720 s for 10 min (no volume, no adrenaline) | arrestAtS 555; arrestCause lowFlow; pulseUnderCpr false; cppCpr 3.1; etco2Cpr 17.4; rhythms 5 sinus, 555 sinus(pulseless), 660 agonal(pulseless), 815 asystole | PL: pulseUnderCpr = false (expected false) [FU-4 ruling 3 / G-FU4-1: an empty heart cannot be pumped — no pulse returns without volume (ERC 2021 traumatic arrest: address hypovolaemia first)]<br>PL: cppCpr = 3.1 in [0, 12] [FU-4 gate: CoPP 2.9–3.5 under CPR after a 3 L bleed-out; below Paradis's 15]<br>TS: etco2Cpr = 17.4 above [0, 10] [EtCO2 during CPR tracks pulmonary blood flow (Weil 1985; AHA 2020: EtCO2 < 10 = no effective output) — compressions on an empty heart move no blood through the lungs]<br>HAND WR (automatic TS): the circulation is right (no pulse, CoPP 3.1), but EtCO2 reads 17.4 — as in VF with a full circulation (18.8): during CPR the gas model takes its flow from the interim quality fit `cardiacOutput` = SV_REF·CPR_SV_FRAC·quality^1.9·rate (gas/coupling.ts:38–41), not from the circulation, so EtCO2 cannot see an empty heart (or a tamponade, DV-04a). V.1 lists "CPR flow scaling" among its Requests; no stage owns it | **WR** | V4 · FU-4 (arrest) — PL; new: gas/coupling.ts cardiacOutput during CPR (CO2 from the circulation's CPR flow) |
| DV-04a | P1 | X-A ventilated, MODELED · severe tamponade + propofol 2 mg/kg → PEA at 470 s (FU-4 S4a) → CPR q 0.8 from PEA + 60 s for 10 min (no drainage); reference: the same CPR in VF | arrestAtS 470; mapPea 15.8; cppTamp -12.9; cppVf 27.2; etco2Tamp 15.9; etco2Vf 15.2; mapCprTamp 153.8; artCprTamp 180.8/124; mapCprVf 46.2; cvpCprTamp 60.4; fwdFlowTampLpm 11.91; fwdFlowVfLpm 1.13; pulseUnderCpr false; rhythms 5s sinus, 470s sinus(pulseless), 580s agonal(pulseless), 730s asystole; rhythmsNoCpr 5s sinus, 470s sinus(pulseless), 580s agonal(pulseless), 730s asystole | PL: pulseUnderCpr = false (expected false) [ERC 2021 ALS special circumstances (tamponade: closed-chest compressions are unlikely to be effective until the pericardium is decompressed)]<br>TS: mapCprTamp = 153.8 above [0, 40] [the tamponaded heart cannot fill, so compressions move little blood: arterial pressure under CPR no higher than in VF CPR (≈ 40–55 mean here) — direction proposal]<br>PL: cppTamp = -12.9 in [-30, 15] [the compressed heart cannot fill: CoPP below Paradis's 15 (direction proposal; a negative value, RA above aortic relaxation pressure, is consistent)]<br>TS: etco2Tamp = 15.9 above [0, 10] [AHA 2020: EtCO2 < 10 mmHg = ineffective CPR output (direction proposal for the tamponaded heart)]<br>HAND WR (automatic TS): no pulse returns (right), but compressions on the tamponaded heart drive the arterial line to ≈ 174/118 (MAP 140–165, higher than CPR in VF), a rectified forward aortic flow of ≈ 12 L/min and a CVP of 55–65, while CoPP is −13 (RA above aortic relaxation pressure): the CPR chamber pressure is added on top of a tense pericardium (circ/params.ts CPR_CARDIAC_MMHG, pericardial pressure in circuit.ts) and qFwd rectifies the to-and-fro flow (model.ts:402). EtCO2 16 — the interim CPR gas flow (gas/coupling.ts:38–41), blind to the circulation | **WR** | V3, V4 · FU-4 (tamponade dynamics + CPR on volume); gas/coupling.ts for EtCO2 |
| DV-04b | P1 | X-A ventilated, MODELED · tamponade PEA under CPR → pericardiocentesis / surgical drainage | proxyPulseAfterS 295; proxyCppAfter 19; rhythms 5s sinus, 470s sinus(pulseless), 580s agonal(pulseless), 945s sinus, 1130s sinus(pulseless), 1215s sinus; rejected {"kind":"pericardiocentesis","volumeMl":150}: command type applyEvent is not implemented until later stages | no pericardiocentesis/drainage action (research/12 §5.8 blocker; 7h). PROBE: the instructor resetting the tamponade condition to 0 under CPR is recorded as what a drainage would do | **NE** | 7h · 7h (pericardiocentesis) / FU-7 |
| DV-05a | P1 | X-A ventilated, MODELED · asystole (instructor at 60 s) + CPR q 0.8 from 120 s → adrenaline 1 mg at 240, 480, 720 s vs no drug (same CPR) | cppCtrl 25.4; dCpp1 6.7; dCpp3 4.6; dMapCpr 8.4; dEtco2 0 | PL: dCpp1 = 6.7 (sign 1, beyond 3) [Paradis NA et al., JAMA 1991;265:1139 (adrenaline raises CPR CoPP; standard dose by a few mmHg, high dose more); Michael 1984 (α-agonism raises aortic diastolic pressure) — direction] | **PL** | — · 7g (adrenaline α) / FU-4 CPR |
| DV-05b | P1 | X-A ventilated, MODELED · asystole + CPR q 0.8 → adrenaline 1 mg ×3 over 10 min: rhythm course | leavesAsystole false; rosc false; myoEnd 1 | PL: rosc = false (expected false) [ERC 2021 ALS: ROSC from asystole is uncommon (non-shockable arrest, survival a few %) — in one 10-min run, none] | **PL** | — · FU-4 (asystole stays, Q3) |

### 2.3 Synchronised cardioversion and R-on-T (P1/P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DV-06a | P1 | X-A ventilated, MODELED · AF 110/min (instructor, 40 s before the shock) → synchronised 120 J and 200 J biphasic, and 20 J, 40 seeds each | conv120Pct 85; conv200Pct 85; conv20JPct 85; vfPct 0; exact120 80; exact20 80; energyDependence 0 | PL: conv200Pct = 85 in [75, 95] [biphasic AF cardioversion, first shock 120–200 J: ≈ 75–90 % (Mittal S et al., Circulation 2000;101:1282; Page RL et al., JACC 2002;39:1956; ERC 2021 ALS: start at 120–150 J) [VERIFY]]<br>WR: energyDependence = 0 (expected sign 1) [success rises with energy; a 20 J biphasic shock rarely converts AF (Page 2002: low-energy first shocks ≈ 20–30 %) — direction] | **WR** | V5 · L3 outcome.ts CARDIOVERSION_SINUS (FU-7 Task 12 E-FU7-6: energy and rhythm class) |
| DV-06b | P1 | X-A ventilated, MODELED · atrial flutter 2:1 (instructor) → synchronised 50 J and 100 J biphasic, 40 seeds each | conv50Pct 85; conv100Pct 85; exactPct 80 | TW: exactPct = 80 below [90, 100] [ERC 2021 ALS: flutter usually converts at lower energy (biphasic 70–120 J); success ≥ 90–95 % (ACC/AHA AF–flutter guideline)]<br>PL: conv50Pct = 85 in [85, 100] [as above: 50 J biphasic converts most flutter (Neumar 2010 ACLS: 50–100 J); the seeded sample (40 seeds) beside the table's exact 80 %] | **TW** | V5 · L3 outcome.ts (one 0.8 for every organised rhythm and energy) |
| DV-06c | P1 | X-A ventilated, MODELED · monomorphic VT 150 with a pulse (instructor) → synchronised 100 J biphasic, 40 seeds | convPct 85; exactPct 80; vfPct 0; mapVt 99.6; mapSinus 95.7 | TW: exactPct = 80 below [85, 100] [ERC 2021 ALS (VT with a pulse: synchronised 120–150 J, escalate); cardioversion of stable monomorphic VT succeeds in > 90 % (Neumar 2010 ACLS)] | **TW** | V5 · L3 outcome.ts |
| DV-07 | P2 | X-A ventilated, MODELED · AF 110 → UNsynchronised 150 J at 40 phases of the cardiac cycle (vs the synchronised arms of DV-06a) | vfPct 7.5; convPct 70; expectedVfPct 4.4 | PL: vfPct = 7.5 (sign 1, beyond 0) [research/12 DV-07: an unsynchronised shock on the T wave (vulnerable period) can induce VF — the reason for SYNC (ERC 2021) — direction] | **PL** | — · L3 outcome.ts R_ON_T_VF |

### 2.4 Transcutaneous and implanted pacing (P1/P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DV-08a | P1 | X-A ventilated, MODELED (default capture threshold 70 mA, R39-4) · complete heart block, escape 30 → TCP fixed 70 ppm, output 0 → 140 mA in 10 mA steps every 20 s | captureMa 70; spikes 374; hrAfter 70 | PL: captureMa = 70 in [40, 80] [ERC 2021 ALS / Resuscitation Council UK: capture usually at 50–100 mA; research/12 DV-08 (40–80); R39-4 adult default 70 (patients 40–120)] | **PL** | — · 4b pacer / Stage 5 tcp.ts |
| DV-08b | P1 | X-A ventilated, MODELED · CHB 30 (healthy myocardium) vs asystole after 8 min of untreated VF (myocardial state ≈ 0) → TCP fixed 70 ppm 100 mA: electrical capture and the pulse | mapChb 80.2; mapPaced 96; coChb 3.02; coPaced 4.8; dMap 15.7; deadRhythmAtPacing asystole; deadCaptured true; deadPulse false; deadMyo 0; dispHrDead 70; dispPrDead null | PL: dMap = 15.7 (sign 1, beyond 5) [ERC 2021: mechanical capture of a healthy ventricle restores output (check the pulse / arterial line)]<br>PL: deadCaptured = true (expected true) [electrical capture of a dying myocardium is possible (the paced complexes appear) …]<br>PL: deadPulse = false (expected false) [… without mechanical capture: "electrical ≠ mechanical capture — check the pulse" (research/12 DV-08; ERC 2021 ALS pacing)] | **PL** | — · Stage 5 tcp.ts / 7a (paced beats eject by contractility) |
| DV-08c | P1 | X-A awake, spontaneous (no sedation), MODELED · CHB 30 → TCP 80 mA (discomfort): sympathetic/pain response vs the same capture in the ventilated GA rig | dEpiAwake -0.1; dNeAwake 0; mapAwake 98.5; mapGa 95.7; dMapAwakeVsGa 2.8 | WR: dNeAwake = 0 (expected sign 1) [ERC 2021 ALS: transcutaneous pacing is painful — analgesia/sedation; the awake patient's pain raises catecholamines (research/12 DV-08)]<br>HAND MI (automatic WR): the pacer writes only Modifiers.tcp (l3/device-layer.ts:285–291); nothing reaches 7e's stimulus or 7f's consciousness — an awake patient paced at 80 mA has no pain, no surge, no movement (any catecholamine change is the baroreflex answering the paced MAP) | **MI** | V6 · new: 4b pacer → 7e stimulus (pain as a nociceptive input scaled by mA and depth) |
| DV-09a | P2 | X-A ventilated, MODELED · CHB 30 → TCP 100 mA with the instructor fault failureToCapture | spikes 234; captured 0; hr 30; map 80.4 | PL: captured = 0 in [0, 0] [research/12 DV-09: spikes without capture, no mechanical beats]<br>PL: hr = 30 in [25, 35] [the escape rhythm (30) continues underneath] | **PL** | — · 4b pacer |
| DV-09b | P2 | X-A ventilated, MODELED · sinus bradycardia 50 (intrinsic beats present) → TCP DEMAND 70 ppm 80 mA with failureToSense (pacer fires asynchronously) vs demand without the fault | spikesPerMin 70.2; capturedShare 0.74; spikesPerMinOk 50.1; hr 67.5; vf false | PL: spikesPerMin = 70.2 in [65, 75] [research/12 DV-09: failure to sense = asynchronous pacing at the set rate, competing with the intrinsic rhythm]<br>PL: capturedShare = 0.74 in [0.2, 0.95] [competition: spikes that fall in the refractory period do not capture] | **PL** | — · 4b pacer / Stage 5 tcp.ts |
| DV-10a | P2 | X-A ventilated, pacemaker-dependent (VVI 70 over CHB, `opts.pacer.intrinsic none`), MODELED · VVI 70 → loss of capture (failureToCapture, faultRate 1) at 300 s | hrBefore 70; hrAfter 25; mapAfter 75.6; arrest false; rhythms 5s sinus, 65s pacedVVI | PL: hrAfter = 25 in [0, 40] [tables §8.4 pacemaker-dependent failure: underlying CHB escape 30–35 or asystole (research/12 DV-10)] | **PL** | — · Stage 5 pacing.ts |
| DV-10b | P2 | X-A ventilated, MODELED · DDD 60 with conducted sinus 75 (sensing) / VVI-dependent → failure to sense (DDD) → competition; oversensing (VVI, faultRate 1) → inhibition | ftsSpikesPerMin 120; ftsHr 60; ovsHrAfter 25; ovsMapAfter 75.6; ovsSpikes 0 | PL: ftsSpikesPerMin = 120 (sign 1, beyond 20) [failure to sense: spikes continue on top of the intrinsic rhythm (competition)]<br>PL: ovsSpikes = 0 in [0, 2] [oversensing inhibits the output: no spikes]<br>PL: ovsHrAfter = 25 in [0, 40] [the dependent patient falls to the escape or asystole] | **PL** | — · Stage 5 pacing.ts |
| DV-10c | P2 | X-A ventilated, pacemaker-dependent VVI 70, MODELED · VVI 70 → electrosurgery (diathermy) bursts near the generator: EMI oversensing | spikesDuringBurst 22; hrDuring 127.8; rejected  | no coupling from the ECG electrosurgery artefact to the pacemaker's sensing (the EMI arm of research/12 DV-10 is NE); PROBE: what the burst does to the VVI output — the instructor must use the `oversensing` fault instead | **NE** | V12, 7h · Stage 5 pacing.ts / FU-7 (EMI → oversensing) |
| DV-11 | P2 | X-A, VVI 70 · pacemaker → magnet over the generator | rejected {"device":"pacemaker","action":"magnet"}: device pacemaker is not implemented until later stages | no magnet (research/12 §5.8 blocker; tables §8.4: asynchronous VOO/DOO at the vendor magnet rate 85–100) | **NE** | 7h · 7h |

### 2.5 The defibrillator as a device; CPR pauses, ROSC and artefacts (P1/P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DV-21a | P1 | X-A, skins lifepak-like, zoll-like and philips-like (no defibrillator of its own) · sinus → charge 200 J, charge 360 J, disarm, charge and leave it armed | lp200 7; lp360 10; zo200 7; zo360 12.6; ph200 7; lpAutoDisarmS 60; zoAutoDisarmS 60; tones qrs,charge,chargeReady; defaultJ lifepak 200 / zoll 120 / philips 120 | PL: lp200 = 7 in [3, 10] [LIFEPAK 15 operating instructions: charge to 200 J in < 10 s (typically ≈ 5–7), 360 J < 10 s; IEC 60601-2-4: ≤ 15 s to maximum energy [VERIFY vendor figure]]<br>PL: lp360 = 10 in [5, 15] [as above]<br>PL: zo200 = 7 in [3, 10] [ZOLL R Series: charge to 200 J in < 7 s [VERIFY]]<br>PL: lpAutoDisarmS = 60 in [30, 90] [LIFEPAK 15: an unused charge is removed after 60 s (auto-disarm) [VERIFY]] | **PL** | V12 · 4b defib.ts / skins |
| DV-21b | P1 | X-A, lifepak-like · AF 110 → SYNC on, charge 150 J, shock (outcome pre-selected unchanged so the rhythm stays): sync markers, delay from R, the shock tone and SYNC after the shock | syncMarkersPerMinBeforeShock 108; delayFromRms 28; shockTone true; syncAfterShock false | PL: delayFromRms = 28 in [0, 60] [IEC 60601-2-4 (synchronised discharge within 60 ms of the R-wave peak); research/05 §2.6]<br>PL: syncMarkersPerMinBeforeShock = 108 in [90, 130] [a sync marker on every detected R (AF 110)] | **PL** | — · 4b sync.ts / device-layer.ts |
| DV-22a | P2 | X-A ventilated, MODELED · VF + CPR q 0.8 for 4 min → shock 200 J pre-selected to sinus at 360 s (compressions stop 2 s before): EtCO2 at ROSC | etco2PreDisp 16; etco2PeakDisp 28; jump 12; tPeakS 60; sustained true | PL: jump = 12 in [10, 40] [Pokorná M et al., J Emerg Med 2010;38:614 (an abrupt EtCO2 rise ≥ 10 mmHg marks ROSC); AHA 2020 ALS] | **PL** | — · 3 / FU-4 |
| DV-22b | P2 | X-A ventilated, MODELED · VF + CPR q 0.8 for 4 min → 10-s pause for a rhythm check at 360 s: CoPP during the pause and its rebuild | cppPre 26.1; cppPauseMin 10.1; rebuildS 5 | PL: cppPauseMin = 10.1 in [0, 12] [Berg RA et al., Circulation 2001;104:2465 (CoPP falls at once when compressions stop)]<br>PL: rebuildS = 5 in [5, 40] [Berg 2001 / Kern 2002: after a pause CoPP needs several compressions (≈ 10–20 s) to return — direction proposal] | **PL** | — · FU-4 CPR model |
| DV-23a | P2 | X-A ventilated, MODELED · VF → CPR q 0.8 at 110/min: does the ECG carry the compression artefact, and the arterial line the compression pulses? | ecgCprArtefact false; artPr 110; artSys 75.1; artDia 38.8; artFlag valid | WR: ecgCprArtefact = false (expected true) [research/12 DV-23; audit 10: compressions make a large ECG artefact at the compression rate (the reason rhythm checks need pauses)]<br>PL: artPr = 110 in [100, 120] [the arterial line shows each compression]<br>HAND IN (automatic WR): the `cpr` clinical event drives the circulation, pleth, NIBP and capnogram (hemo/pipeline.ts planCompressions) but NOT the ECG: the compression artefact is a separate ECG modifier `artefact.cpr` (l2/ecg/api-types.ts:106–108) that nothing couples to the event (engine.ts and the controller never set it) — one act, two commands; a scenario that starts CPR shows a clean VF trace unless the author also sets the artefact (`ecgCprArtefact` is set from this code reading, not measured) | **IN** | V7 · new: engine.ts (couple `cpr` → `artefact.cpr` at the same rate, depth from quality) |
| DV-23b | P2 | X-A ventilated, MODELED · VF → CPR q 0.8 at 110/min: the SpO2 tile and its pulse rate | spo2QuestionablePct 100; spo2Shown 99; pr 110; prFlag valid | PL: spo2QuestionablePct = 100 in [80, 100] [audit 10 A10-A4c (FU-5): the SpO2 tile shows "?" during CPR]<br>PL: pr = 110 in [100, 120] [research/12 DV-23: PR = compression rate] | **PL** | — · FU-5 (pleth quality) |

### 2.6 IABP (P1/P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DV-13a | P1 | HFrEF 60 y 80 kg ventilated, MODELED (compensated profile; no MODELED cardiogenic-shock state exists) · HFrEF (Ees ×0.45) → IABP 1:1, 40 mL, correct timing (inflation at the notch, deflation before the R) | unassistedSbp 104.5; augmentation 110.9; augMinusSbp 6.4; consoleAug 112.1; inflLeadMs -14.2 | PL: augMinusSbp = 6.4 in [0, 40] [tables §8.1 (IABP-PMC4972967; EMCrit-IABP): diastolic augmentation > unassisted systolic pressure with correct timing] | **PL** | — · 7a devices.ts (IABP) / hemo pipeline |
| DV-13b | P1 | as DV-13a · HFrEF → IABP 1:1 correct timing: assisted end-diastolic and systolic pressures vs unassisted; the same in the MANUAL cardiogenic-shock rig | edpUnassisted 68.8; edpAssisted 53; dEdp -15.8; sysAssisted 89.6; dSys -14.8; deflLagMs -184; manDEdp 8.8; manDSys 5; manDeflLagMs 271.7 | PL: dEdp = -15.8 in [-25, -10] [tables §8.1: assisted end-diastolic pressure 15–20 mmHg below the unassisted (afterload reduction)]<br>TS: dSys = -14.8 below [-12, 0] [tables §8.1: assisted systolic ≈ 5 mmHg below the unassisted] | **TS** | V2 · 7a devices.ts (IABP) |
| DV-13c | P1 | as DV-13a · HFrEF → IABP 1:1 correct timing: cardiac output and PAWP after 3–5 min | coBase 5.46; dCo 0.32; pawpBase 12.8; pawpPct -5.3; dMap -2.2 | TW: dCo = 0.32 below [0.4, 1] [tables §8.1: CO +0.5–1 L/min (≈ 20 %) (IABP-PMC4972967; EMCrit-IABP)]<br>TW: pawpPct = -5.3 above [-30, -10] [tables §8.1: PCWP −20 %] | **TW** | V2 · 7a devices.ts (IABP) |
| DV-13d | P1 | HFrEF + recent MI 65 y, MODELED (compensated) · compensated HFrEF with a recent infarct → IABP 1:1 correct timing for 18 min vs no IABP: the quiet check (a correctly timed balloon must not harm) and coronary perfusion | arrestWithIabp true; arrestAtMin 8.8; arrestCtrl false; cppCtrl 57.7; cppIabp 46.1; dCpp -11.6; dLvedp 2.7; dCvp 1; kIschMinBeforeArrest 0.1; displayedAbpAfterArrest 21.767787644572973/18.98300601056091 (valid); rhythms 5s sinus, 930s sinus(pulseless), 1055s agonal(pulseless), 1210s asystole | WR: arrestWithIabp = true (expected false) [FU-4 quiet rule (a compensated patient must not arrest on a standard intervention); tables §8.1: coronary supply ↑ with IABP (CPP from the augmented diastolic pressure)]<br>WR: dCpp = -11.6 (expected sign 1) [tables §8.1 / §3: the augmented diastole raises coronary perfusion (direction: CoPP with IABP ≥ without)]<br>HAND WR (automatic WR): a correctly timed 1:1 balloon arrests a compensated HFrEF + recent-MI patient at +8.8 min (control: no arrest). Two mechanisms: (1) the coronary step reads CoPP from the beat's MINIMUM aortic pressure (coronary.ts:142, b.aoDia) — with a balloon that is the post-deflation dip, so CoPP FALLS 57.7 → 46.1 when the augmented diastole should raise it; (2) the balloon leaks volume: when the next beat reschedules the balloon mid-deflation (devices.ts:48–54 iabpOnBeat overwrites deflateAt) the rest of that 40 mL stays in the aorta — 7 of 63 deflations cut short per minute here — so LVEDV 219 → 244 mL and LVEDP 10 → 24 over 8 min, CoPP 46 → 33, and the ischaemic spiral closes (kIsch 0.85 → 0.1 in 60 s) | **WR** | V2 · new: 7a coronary.ts:142 (CoPP from the beat's minimum aortic pressure) — FU-8 Part A (same defect family as C3) |
| DV-14a | P2 | as DV-13a (MODELED HFrEF), IABP 1:2 · HFrEF → EARLY inflation (−120 ms: inflates in systole) vs correct | inflLeadOk -14.5; inflLeadEarly -44.6; svInterruptedPct -1.6; augEarly 120.2; augOk 119.8 | PL: inflLeadEarly = -44.6 in [-200, -20] [tables §8.1 (Deranged-IABP): early inflation starts before the dicrotic notch]<br>TW: svInterruptedPct = -1.6 (sign -1, beyond 2) [tables §8.1: early inflation closes the aortic valve early — SV ↓, afterload ↑] | **TW** | V2 · 7a devices.ts |
| DV-14b | P2 | as DV-14a · HFrEF → LATE inflation (+120 ms) vs correct | augLate 111.8; augOk 119.8; dAug -7.9; inflLeadLate 107.8 | PL: dAug = -7.9 (sign -1, beyond 2) [tables §8.1: late inflation — the notch is visible and the augmentation smaller] | **PL** | — · 7a devices.ts |
| DV-14c | P2 | as DV-14a · HFrEF → EARLY deflation (−200 ms) vs correct | dEdpOk -5; dEdpEarly -2.7; dSysEarly -1.5; dSysOk -3.2; afterloadBenefitLost 2.2 | TW: afterloadBenefitLost = 2.2 (sign 1, beyond 3) [tables §8.1 (Deranged-IABP; LITFL-IABP): early deflation — U-shaped dip, assisted EDP ≈ unassisted, no afterload reduction] | **TW** | V2 · 7a devices.ts |
| DV-14d | P2 | as DV-14a · HFrEF → LATE deflation (+150 ms: the balloon is still full when the LV ejects) vs correct | dEdpLate 4.1; dEdpOk -5; svAfterAssistedPct 1.5 | PL: dEdpLate = 4.1 in [0, 30] [tables §8.1: late deflation — assisted EDP ≥ unassisted (LV ejects against the balloon)]<br>WR: svAfterAssistedPct = 1.5 (expected sign -1) [tables §8.1: afterload ↑, SV ↓ on the assisted systole] | **WR** | V2 · 7a devices.ts |
| DV-15a | P2 | as DV-13a · HFrEF → IABP 1:2: assisted and unassisted beats side by side | nAssisted 7; nUnassisted 8; aug 119.8; unassistedDiastolicPeak 88.2; sysA 93.8; sysU 97 | PL: nUnassisted = 8 in [3, 30] [tables §8.1: 1:2 shows assisted and unassisted beats side by side (the teaching view)]<br>PL: nAssisted = 7 in [3, 30] [as above] | **PL** | — · 7a devices.ts |
| DV-15b | P2 | HFrEF, MODELED, IABP 1:1 running · AF 110 at 300 s, then VF at 480 s → trigger in AF and in arrest (tables: internal/asynchronous trigger in arrest; trigger-loss alarms) | inflationsInAfWindow 18; inflationsInArrest10s 1; iabpAlarms none; consoleAugInArrest null | TW: inflationsInArrest10s = 1 below [5, 20] [tables §8.1 (LITFL-IABP): in arrest the pump runs on an internal/asynchronous trigger (or is triggered from CPR pressure)]<br>HAND MI (automatic TW): the IABP triggers only from the last ejected beat (hemo/pipeline.ts:285–288, iabpOnBeat): with no beat it simply stops — no internal trigger, no CPR-pressure trigger, no "trigger lost" alarm; the console keeps showing the last augmentation | **MI** | V10 · new: 7h (IABP trigger modes and alarms) |

### 2.7 LVAD, ICD, ECMO (P2/P3)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DV-16a | P2 | HFrEF 60 y ventilated, MODELED · LVAD 5400 rpm (HeartMate-3-like) → baseline arterial pulse pressure | ppTruth 20.4; ppDisplayed 21.1; ppBefore 38.1; map 91.5; svNative 25.3 | TS: ppTruth = 20.4 above [5, 20] [tables §8.2 (HM3-Abbott; EMCrit-HM3): arterial pulse pressure 10–20 or less; MAP the reliable value]<br>HAND PL (automatic TS): PP 38 → 20.4 at the band edge with the native HFrEF ventricle still ejecting 25 mL (aortic valve opening, as the tables allow); MAP 91.5 | **PL** | — · 7a devices.ts (LVAD) |
| DV-16b | P2 | as DV-16a · LVAD 5400 → NIBP cycles (3 stat measurements) | results 98/83 (valid); 102/76 (valid); 106/77 (valid); 103/80 (valid); 109/83 (valid); 101/84 (valid); 103/81 (valid); 96/82 (valid); 105/85 (valid); 96/77 (valid); nValid 10; nFailed 0 | WR: nFailed = 0 below [1, 3] [tables §8.2 (EMCrit-HM3): NIBP often fails at a pulse pressure ≤ 15–20 (Doppler "return to flow" is used instead); oscillometric success ≈ 50–60 % in continuous-flow LVADs (Bennett 2010) [VERIFY]]<br>HAND TW (automatic WR): 10 of 10 cycles (the auto cycle plus 3 stat) return a valid reading at PP ≈ 20; since FU-5 fixed A10-C8 the oscillometric model reads down to PP 10 (G-FU5: "NIBP at PP 10 → 80/56"), so the LVAD patient's frequent NIBP failure never appears. A pulsatility-dependent failure probability is the smallest mechanism | **TW** | V9 · Stage 2 NIBP (hemo/nibp) — FU-8 list (FU-5 follow-ups) |
| DV-16c | P2 | as DV-16a · LVAD 5400 → pulse oximetry | piBefore 1.59; piLvad 1.41; piRatio 0.89; spo2Shown 99; validPct 100 | TW: piRatio = 0.89 above [0.1, 0.6] (lower = stronger/faster) [tables §8.2 (HM3-Abbott; EMCrit-HM3): the pleth is small or absent on continuous flow — perfusion index falls, SpO2 may be unobtainable (proposal: PI at least halves)] | **TW** | V9 · Stage 3 pleth (pulsatility → PI) |
| DV-16d | P2 | as DV-16a · LVAD 5400 → console numerics: flow, power, pulsatility index | flow 4.05; powerW 3.64; puI 6.74; co 5.83 | PL: flow = 4.05 in [4, 6] [tables §8.2 (HM3-Abbott): flow 4–6 L/min at 5400 rpm]<br>TW: powerW = 3.64 below [4, 5] [tables §8.2: power 4–5 W]<br>TS: puI = 6.74 above [2.5, 5] [tables §8.2: pulsatility index 3–4 (clinical 1–10)] | **TS** | V9 · 7a devices.ts (LVAD HQ/power/PI) |
| DV-17 | P2 | as DV-16a · LVAD 5400 → hypovolaemia: bleed 1500 mL over 5 min from 600 s → suction | flowBefore 3.99; flowMin 3.7; puIBefore 6.84; puIMax 7.1; puIEnd 5.76; suctionAtS null; ectopy false; rhythms 5s sinus | TS: flowMin = 3.7 above [0, 3] [tables §8.2: flow falls in hypovolaemia (low-flow alarm < 2.5)]<br>MI: suctionAtS: not a finite number (NaN) [tables §8.2: suction event when LV volume < ~40 mL]<br>WR: ectopy = false (expected true) [tables §8.2: suction → ventricular ectopy/VT (Stage 5 hook)]<br>HAND WR (automatic MI): a 1.5 L bleed (21 % of the blood volume) lowers pump flow only 3.99 → 3.70 L/min and never reaches suction: the dilated HFrEF ventricle (EDV ×1.5, profile.ts:121) keeps far above LVAD_SUCTION_ML 40 mL, and the HQ term (flow ∝ ΔP) RISES as MAP falls; the suction flag has no consumer (grep: only the circ event reads it) — no ectopy, no PI event, no speed drop | **WR** | V9 · 7a devices.ts (preload dependence, suction) + new Stage 5 hook |
| DV-18a | P2 | as DV-16a · LVAD 5400 → hypertension: phenylephrine 1 µg/kg/min from 600 s | dMap 23.9; dFlow -0.39; slopeLpmPerMmHg -0.02 | PL: dFlow = -0.39 (sign -1, beyond 0.1) [tables §8.2: pump flow falls as afterload rises (HQ curve; MAP target < 90 in LVAD patients)] | **PL** (direction only) | — · 7a devices.ts LVAD_KH |
| DV-18b | P2 | as DV-16a · LVAD 5400 → acute RV failure (circ condition rvInfarct 1 at 600 s) | dFlow -0.06; dCvp 1.1; suction false; dMap -5.3 | TW: dFlow = -0.06 (sign -1, beyond 0.3) [tables §8.2 / research/12 DV-18: RV failure limits LVAD preload — flow falls]<br>TW: dCvp = 1.1 (sign 1, beyond 2) [RV failure: CVP rises] | **TW** (direction only) | V9 · 7a devices.ts / circ conditions |
| DV-19 | P3 | as DV-16a · LVAD pump thrombosis → thrombus in the pump | powerW 3.62; flow 4.02; note power = 0.8 + 0.7·flow (devices.ts:101): power cannot rise without flow | TW: powerW = 3.62 below [10, 20] [tables §8.2 (HM3-Abbott): pump thrombosis → sustained power ≥ 10 W with a spuriously high flow estimate]<br>HAND MI (automatic TW): no thrombosis state and no command for it; the console power is a fixed function of flow (lvadNumerics, l2/circ/devices.ts:98–103), so the "power up, flow estimate spuriously high" signature cannot be produced | **MI** | V10 · 7h (LVAD failure modes) |
| DV-12a | P2 | ICD patient · VF → ICD detection and internal shock | rejected {"device":"icd","action":"enable"}: device icd is not implemented until later stages | no ICD (research/11 D15; tables §8.3) | **NE** | 7h · 7h |
| DV-12b | P2 | ICD patient · monomorphic VT 190 → anti-tachycardia pacing (8 pulses at 88 % of the cycle), then shock | — | no ICD (tables §8.3) | **NE** | 7h · 7h |
| DV-20a | P3 | VA-ECMO · cardiogenic shock / arrest → VA-ECMO 4 L/min: pulsatility and PP fall with flow fraction; EtCO2 low | rejected {"device":"vaEcmo","action":"start","flowLpm":4}: device vaEcmo is not implemented until later stages | no ECMO (research/11 D14; devices.ts bypassFlow throws "VA-ECMO/CPB arrive in Stage 7h") | **NE** | 7h · 7h |
| DV-20b | P3 | VV-ECMO · severe ARDS → VV-ECMO 5 L/min, sweep 2–4 L/min: SaO2 as the weighted mix; PaCO2 set by sweep | rejected {"device":"vvEcmo","action":"start","flowLpm":5}: device vvEcmo is not implemented until later stages | no ECMO (tables §8.5) | **NE** | 7h · 7h |
| DV-20c | P3 | VA-ECMO femoral · recovering LV, poor lungs → differential hypoxaemia (right radial SpO2 low, legs normal) | — | no ECMO; also needs site-dependent SpO2 mixing (tables §8.5) | **NE** | 7h · 7h |
| DV-20d | P3 | VV-ECMO · severe ARDS → recirculation 0.1–0.3: SaO2 falls without a flow change | — | no ECMO (tables §8.5) | **NE** | 7h · 7h |

### 2.8 Special-circumstance arrests (P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DV-24a | P2 | X-A ventilated, core 28.5 °C (profile baseline), MODELED · VF (instructor) + CPR → shock 200 J at 4 min, 40 seeds: termination vs normothermia | core 28.5; term28Pct 60; term37Pct 60; rosc28Pct 7.5; rosc37Pct 7.5; diff 0 | WR: diff = 0 (expected sign 1) [ERC 2021 special circumstances (hypothermia): below 30 °C VF is often refractory to shocks; if 3 shocks fail, delay further attempts until > 30 °C]<br>HAND WR (automatic WR): the shock table has no temperature input (outcome.ts ShockContext): at 28.5 °C the termination rate equals normothermia. FU-7 Task 12 adds K, pH, CPP, drugs and the arrest clock — not temperature | **WR** | V5 · L3 outcome.ts (FU-7 Task 12 must add a temperature factor — new item for it) |
| DV-24b | P2 | X-A, 28.5 °C → rewarmed to 33 °C (instructor placement) under CPR · VF + CPR → shock 200 J after rewarming vs at 28.5 °C, 40 seeds | coreWarm 33; termWarmPct 60; termColdPct 60; gain 0 | WR: gain = 0 (expected sign 1) [ERC 2021 (hypothermic arrest: shocks succeed once the core is rewarmed above 30 °C)]<br>HAND WR (automatic WR): no temperature term in the shock outcome: rewarming changes nothing | **WR** | V5 · L3 outcome.ts (FU-7 Task 12 + temperature) |
| DV-25a | P2 | X-A ventilated, K 9.5 (profile), MODELED · hyperkalaemic VF (engine-declared at ≈ 70 s) + CPR → shock 200 J at 300 s untreated vs normokalaemic VF, 40 seeds; and a pre-selected organised rhythm: does it hold? | kEcg 9.47; termHkPct 30; termNormoPct 60; roscHkPct 7.5; roscNormoPct 7.5; forcedSinusHolds false; forcedSinusRefibS 80; rhythmsForced 5s sinus, 65s vfCoarse, 305s sinus, 380s sinus(pulseless) | PL: forcedSinusHolds = false (expected false) [ERC 2021 special circumstances (hyperkalaemia): shocks fail / VF recurs until K⁺ is lowered and the membrane stabilised]<br>TS: roscHkPct = 7.5 above [0, 5] [ERC 2021 (hyperkalaemia): ROSC from a shock alone is unlikely before calcium/insulin — proposal (the table's normokalaemic ROSC share is 10 %)]<br>HAND WR (automatic TS): the physiology half is right (a forced organised rhythm re-fibrillates through the K hazard, arrest.ts K_HAZARD); the shock table is K-blind — ROSC share the same as normokalaemia. FU-7 Task 12 adds `kEcg` | **WR** (FU-7 Task 12 pending) | V5 · L3 outcome.ts (FU-7 Task 12 kEcg factor) |
| DV-25b | P2 | X-A ventilated, K 9.5 (profile), MODELED · hyperkalaemic VF + CPR → CaCl2 1 g + insulin–dextrose + NaHCO3 50 mmol at 100 s, then a shock pre-selected to sinus at 300 s (vs untreated) | kEcgTreated 7.41; kEcgUntreated 9.47; kTreated 9.35; treatedHolds false; untreatedHolds false; treatedPulseEnd true; untreatedPulseEnd false; rhythmsTreated 5s sinus, 65s vfCoarse, 305s sinus, 400s sinus(pulseless), 485s sinus; rhythmsUntreated 5s sinus, 65s vfCoarse, 305s sinus, 380s sinus(pulseless) | WR: treatedHolds = false (expected true) [ERC 2021 (hyperkalaemic arrest: calcium, insulin–glucose, bicarbonate, then shocks succeed)]<br>PL: untreatedHolds = false (expected false) [as DV-25a]<br>HAND TW (automatic WR): the direction is right — treated, the membrane-effective K falls 9.47 → 7.41 (below K_HAZARD 8.5), the forced rhythm dips into a PEA at +100 s and regains a pulse under CPR at +185 s and holds; untreated, it becomes pulseless at +80 s and never returns. Weak because plasma K is still 9.35 at 200 s (insulin–dextrose acts over 30–60 min, 7c) and the K-driven contractility depression is read from plasma K, not the calcium-stabilised value | **TW** | V11 · 7c (K treatments; kChem from plasma K vs kEcg) / FU-4 K hazard |
| DV-26a | P2 | X-A, induced apnoea on air (no airway device), MODELED · hypoxic bradycardia (HR 40, SpO2 ≈ 45 at 185 s), not yet arrested → BVM/ventilation FiO2 1.0 at 190 s (no CPR, no drug) vs continued apnoea | hrAt190 40; spo2At190 45.2; hr60AfterS 10; arrestTreated false; arrestCtrl true | PL: hr60AfterS = 10 in [10, 120] [ERC 2021 (hypoxic bradycardia/peri-arrest: oxygenation restores the rate within 1–2 min)]<br>PL: arrestTreated = false (expected false) [ERC 2021 (ventilation first in asphyxia)]<br>PL: arrestCtrl = true (expected true) [FU-3 hypoxic arrest (control)] | **PL** | — · FU-3 hypoxic path / 3 |
| DV-26b | P2 | X-A, induced apnoea on air, MODELED, 6 seeds · asphyxial arrest (engine-declared at ≈ 410 s) → CPR q 0.8 + ETT/VCV FiO2 1.0 from 450 s vs CPR without ventilation | onsetRhythms asystole,sinus,sinus,sinus,sinus,sinus; nOrganised 5; roscVentPct 80; roscNoVentPct 0; ventBetter true | PL: ventBetter = true (expected true) [ERC 2021 (asphyxial arrest: ventilation with oxygen is the priority; compressions alone do not correct the cause)] | **PL** | — · FU-3/FU-4 arrest machine |

### 2.9 MANUAL twins (direction-only; Q9 open)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DV-M1 | P1 | X-A ventilated, MANUAL (MODELED twin DV-02a/b) · VF (instructor) → CPR q 0.8 from 120 s | cpp 23; etco2 16; map 38.7 | PL: cpp = 23 (sign 1, beyond 15) [Q9 open: CPR physiology is instructor-independent — CoPP ≥ 15 as in MODELED (direction only)] | **PL** (direction only) | — · Q9 (MANUAL physiology) |
| DV-M2 | P1 | X-A ventilated, MANUAL (MODELED twin DV-03) · bleed 3 L / 10 min → CPR q 0.8 alone from 720 s | arrestAtS 555; mapMin 1.1; pulseUnderCpr false; rhythms 5s sinus, 555s sinus(pulseless) | PL: pulseUnderCpr = false (expected false) [Q9 / FU-4 D6: MANUAL reaches arrest only through the no-flow rule; an empty heart still cannot be pumped (direction only)] | **PL** (direction only) | — · Q9 / FU-4 D6 |
| DV-M3 | P1 | X-A ventilated, MANUAL (MODELED twin DV-01c early arm) · VF 60 s → shock 200 J pre-selected to sinus: the post-ROSC pressure ramp (brief §6.5: 50 % → 100 % of the targets over 30–120 s) | sbpBase 134.7; sbpAt10s 121.5; fracAt10s 0.9; sbpAt3min 122.4; sustained true | TS: fracAt10s = 0.9 above [0.4, 0.8] [brief §6.5 (after successful termination: pressures ramp from 50 % to 100 % of the targets over 30–120 s) — the device layer's own design (direction)] | **TS** (direction only) | V12 · 4b device-layer.ts ROSC ramp |
| DV-M4 | P1 | X-A ventilated, MANUAL (MODELED twin DV-08b) · CHB 30 → TCP fixed 70 ppm 100 mA | mapChb 69.5; mapPaced 95.8; dMap 26.2; hrPaced 70 | PL: hrPaced = 70 in [65, 75] [capture at the set rate (direction; MANUAL pressure is the instructor's)] | **PL** (direction only) | — · Q9 |
| DV-M5 | P1 | HFrEF 60 y ventilated, MANUAL cardiogenic-shock rig (contractility 0.4, SBP/DBP 85/55; MODELED twin DV-13b) · cardiogenic shock (instructor): SV 34 mL, CO ≈ 2.6, PAWP 24 → IABP 1:1, correct timing: when does the balloon deflate? | deflLagMs 271.7; co 2.9; pawp 23.2 | WR: deflLagMs = 271.7 above [-150, -20] [tables §8.1: deflation just before systole (the balloon is empty at aortic opening) — the MODELED rig gives −184 ms]<br>HAND WR (automatic WR): in MANUAL the balloon deflates ≈ 270 ms AFTER the next aortic opening: every correctly set balloon is late deflation (assisted EDP +8.8 instead of −15.8), because the schedule comes from the MANUAL beat record (hemo/pipeline.ts:285–288 → devices.ts:48–54) whose timing differs from the MODELED one; the instructor's cardiogenic-shock rig — the only shock rig there is — cannot teach a correctly timed IABP | **WR** | V2 · new: hemo/pipeline.ts onCircBeat → devices.ts iabpOnBeat (schedule from the R wave / the next beat, not the completed beat record) |

## 3. New gaps no stage owns, ranked, with the smallest mechanism and the file that would fix each

Gap ids **V1–V12**. Engine paths are under `packages/engine-core/src/` on 3feee6f. "New" = no plan owns it today.

### V1 — A PEA made by a shock or by the instructor is inert: no ROSC, no decay (new, P1)
- **Cells:** DV-01b. 11 of 40 post-shock PEAs; none regains a pulse in 8 min of CPR at CoPP 27–28 with a myocardial
  state of 1.00; `peaArrestDeclared` is false. The same holds for any instructor `setRhythm … pulseless`.
- **Code:**
  - `circ.arrest` is set only by the engine's own declaration (`hemo/pipeline.ts:401–404`: `hypoxicArrestRequest` /
    `arrestStep`).
  - `roscStep` (`circ/arrest.ts:136–139`) and `peaDecayStep` (`arrest.ts:112–113`) both begin `if (!a) return null`.
  - The device layer's post-shock PEA (`l3/device-layer.ts:207–209`, sinus `pulseless: true`) and the instructor's PEA
    never enter the arrest state.
  - Asystole after a shock stays asystole for ever on a myocardium at 1.00 (the Q3 ruling; a question in §8).
- **Smallest mechanism:** any pulseless organised rhythm that is not engine-declared enters the arrest state when it
  starts (`arrest = { cause: 'shock' | 'instructor', t, from: 'sinus', … }`), through the same single `requestRhythm`
  path (E-FU3-8). ROSC, the PEA decay and the humoral withdrawal (G-FU4-1) then apply to every PEA. An instructor who
  wants a PEA to hold can still pin it (a MANUAL choice).
- **Owner:** new — FU-8 Part A (arrest machine). Acceptance: DV-01b.

### V2 — The IABP harms: CoPP from the post-deflation dip, a leaking balloon, late deflation in MANUAL (new, P1)
- **Cells:**
  - DV-13d: arrest at +8.8 min; the control does not arrest.
  - DV-M5: MANUAL deflation +272 ms after the valve opens.
  - DV-13c: CO +0.32, PAWP −5 % (TW).
  - DV-13b: assisted systolic −14.8 (TS).
  - DV-14a/c (TW); DV-14d (WR: late deflation does not lower SV).
- **Code:**
  - (a) `circ/coronary.ts:142`: CoPP = `b.aoDia − b.lvedp`. `aoDia` is the beat's minimum aortic pressure
    (`circ/model.ts:348`), which a balloon lowers by design.
  - (b) `circ/devices.ts:48–54`: `iabpOnBeat` overwrites `inflateAt/deflateAt` whenever the next beat completes. A
    deflation still in progress is cut short, and its volume stays in the arterial capacitor (`circuit.ts:176–177`,
    `qSrc`) — 7 of 63 cycles per minute.
  - (c) the schedule is built from the completed beat record (`hemo/pipeline.ts:285–288`: `cb.t + cb.dur`, `cb.dur`,
    `cb.avClose`). In MANUAL that timing puts the deflation ≈ 270 ms into the next systole.
- **Smallest mechanism:**
  - CoPP as the time-average of (aortic − LV) pressure over diastole — the same fix C3 needs for AF (FU-8 I-49) — so
    augmentation raises it;
  - the balloon keeps its own inflate/deflate queue, so a new schedule never truncates an owed deflation (volume
    conservation);
  - deflation scheduled from the predicted next R (last R + current R–R), in both modes.
- **Owner:** new. (a) goes with FU-8 Part A's C3 task (same line); (b) and (c) are 7a devices / the hemo pipeline.
  Acceptance: DV-13b–d, DV-14a–d, DV-M5, and FU-4's quiet rule (no arrest in 20 min of a correctly timed IABP in HFrEF +
  MI).

### V3 — CPR on a tamponaded heart makes an arterial pressure of 181/124 (new, P1)
- **Cells:** DV-04a: MAP 154 under CPR (VF CPR: 46); forward flow 11.9 L/min; CVP 60; CoPP −12.9; no pulse.
- **Code:**
  - The CPR cardiac pressure (`hemo/pipeline.ts:262–266`, `CPR_CARDIAC_MMHG` 24 × quality on the chambers) is added on
    top of a tense pericardium (the tamponade's pericardial pressure), so each compression raises every chamber and the
    aorta together.
  - `circ/model.ts:402` then low-pass-filters the rectified `max(0, qAv)` of a to-and-fro valve flow into a "forward
    flow" of 12 L/min.
- **Smallest mechanism:** a compression acts on *volume* in the pericardial space (FU-4's CPR-on-volume principle). With
  the pericardium already full, a compression cannot raise chamber pressure beyond the volume it can displace. qFwd
  should be the net forward flow over a cycle, not the rectified flow.
- **Owner:** new (7a pericardium × FU-4 CPR). Acceptance: DV-04a (MAP ≤ VF CPR's; forward flow < 1 L/min).

### V4 — EtCO2 during CPR comes from an interim quality fit, not the circulation (needs an owner, P1)
- **Cells:** DV-03 (bled-out: EtCO2 17.4 with CoPP 3.1); DV-04a (tamponade: 15.9); VF CPR 15.2–18.8.
- **Code:** `gas/coupling.ts:38–41` `cardiacOutput` returns `SV_REF·CPR_SV_FRAC·quality^1.9·rate` while CPR is active.
  The code documents it as INTERIM "until 3.1 re-measures CPR EtCO2 against the emergent circulation CO (R45 request)".
  V.1 lists "CPR flow scaling" among its Requests; no plan executes it.
- **Smallest mechanism:** the gas model reads the circulation's CPR pulmonary flow, which 7a already computes (FU-4 made
  compressions act on volume). Re-fit only if the EtCO2 bands (12/20/25/29 at quality 0.5–1.2) move.
- **Owner:** new (Stage 3 gas coupling; natural home FU-6 or V.1's follow-up). Acceptance: DV-02b/c unchanged; DV-03 and
  DV-04a EtCO2 < 10.

### V5 — The shock outcome ignores the state it lands in (→ FU-7 Task 12, with three additions)
- **Cells:**
  - DV-01a: termination 70 %;
  - DV-01c: ROSC 5 % with or without 3 min of CPR;
  - DV-24a/b: 28.5 °C gives the same outcome as 37 °C;
  - DV-25a: K⁺ 9.5 gives the same ROSC share as normokalaemia;
  - DV-06a: AF at 20 J = 200 J = 80 %; DV-06b: flutter 80 %; DV-06c: VT 80 %.
- **Code:** `l3/defib-pacer/outcome.ts:10` `VF_TABLE` (persistent 0.3); `:25` `CARDIOVERSION_SINUS` 0.8 for every
  organised class and energy; `ShockContext` (`:41–51`) carries no state.
- **Owner:** FU-7 Task 12 for CoPP, K, pH and drugs. §4 lists what it must add.

### V6 — Transcutaneous pacing is painless (new, P1)
- **Cells:** DV-08c (awake, 80 mA: ΔNE 0; MAP vs the GA rig +2.8).
- **Code:** the pacer writes only `Modifiers.tcp` (`l3/device-layer.ts:285–291`).
- **Smallest mechanism:** a TCP output above ≈ 40 mA is a nociceptive input to 7e's `stimulus`, scaled by mA and by 7f's
  depth. The awake patient's catecholamines, HR and movement then respond, and sedation/analgesia remove the response.
- **Owner:** new (a 4b → 7e seam; a small E-exception). Acceptance: DV-08c.

### V7 — Starting CPR does not put the compression artefact on the ECG (new, P2, IN)
- **Cells:** DV-23a. The `cpr` event drives the circulation, pleth, NIBP and capnogram; the ECG stays clean.
- **Code:** the artefact is a separate modifier, `artefact.cpr` (`l2/ecg/api-types.ts:106–108`, validated in
  `modifier-schema.ts:65`). Neither `engine.ts` nor the controller couples it to the event.
- **Smallest mechanism:** the engine sets `artefact.cpr { rateCpm: rate, depth: f(quality) }` while `hemo.cpr.active`
  and clears it when CPR stops, so one clinical act has one command.
- **Owner:** engine.ts (an FU-8 candidate).

### V8 — Cerebral blood flow under CPR is twice the consensus (new, P1)
- **Cells:** DV-02a: 0.71 of normal at quality 1. The CoPP half (27.2) is already FU-4 S13's `it.fails`.
- **Code:** 7d's brain reads `cbfRel` from the CPR arterial pressure. A MAP of ≈ 55 during compressions sits on the
  autoregulation plateau; the ischaemic, non-autoregulating brain of arrest is not modelled.
- **Smallest mechanism:** in the declared arrest (and in any pulseless state), cerebral autoregulation is lost and CBF
  follows cerebral perfusion pressure passively (the brain's own low-flow branch). That puts CPR CBF near 0.3–0.4.
- **Owner:** new (7d brain). Acceptance: DV-02a CBF 0.2–0.45; research/12 NN-29 is its neighbour.

### V9 — The LVAD has no preload physiology (new, P2)
- **Cells:**
  - DV-17: a 1.5 L bleed moves flow 3.99 → 3.70; no suction, no ectopy;
  - DV-16d: PuI 6.7 (3–4), power 3.6 W (4–5);
  - DV-16c: SpO2 PI ×0.89;
  - DV-16b: NIBP 10/10 valid at PP 20;
  - DV-18b: RV infarct moves flow −0.06.
- **Code:**
  - `circ/devices.ts:80–91` `lvadFlow` = the HQ line minus a ×0.3 suction below 40 mL. Flow depends on ΔP only, so a
    falling MAP *raises* flow as the ventricle empties.
  - The dilated HFrEF LV (EDV ×1.5, `profile.ts:121`) never reaches 40 mL.
  - `suction` has no consumer: only the `circ` event reads it.
  - PuI is (max − min)/mean × 10 of the 2 ms flow, not the HM3 definition; power = 0.8 + 0.7·flow.
- **Smallest mechanism:**
  - inflow limited by LV volume (a smooth collapse term as LV volume approaches the cannula threshold);
  - a consumer for the suction event (Stage 5 PVC hook, PI spike, the speed-drop algorithm);
  - the HM3 PI definition (flow pulse amplitude over mean);
  - pulsatility-dependent NIBP failure and pleth amplitude.
- **Owner:** new (7a devices / 7h).

### V10 — Device states and alarms that do not exist (P2/P3; 7h)
- The IABP has no internal or pressure trigger in arrest and no trigger-loss alarm (DV-15b: 1 inflation in 10 s of VF,
  no alarms; the console keeps showing the last augmentation).
- LVAD thrombosis has no state, and power is a function of flow only (DV-19).
- Owner: 7h.

### V11 — Hyperkalaemic arrest treatment works late (P2)
- DV-25b: CaCl2 + insulin–dextrose + bicarbonate lower the membrane-effective K⁺ 9.47 → 7.41, but plasma K⁺ is still
  9.35 at 200 s. The forced rhythm dips into PEA at +100 s and regains a pulse only at +185 s.
- The contractility depression reads plasma K⁺ (7c `kChem`), not the calcium-stabilised value FU-4 gives the ECG and the
  hazard.
- Owner: 7c. FU-9 is the natural home, beside its F2 (profile K⁺).

### V12 — Smaller items
- **The MANUAL post-ROSC pressure ramp is invisible** (DV-M3). SBP is 90 % of baseline 10 s after the shock. The device
  layer's 50 % → 100 % ramp (`device-layer.ts:270–276`) is written to L1 targets that the set-and-hold tracker does not
  follow. Owner: 4b / the 7a MANUAL tracker.
- **zoll-like accepts 360 J** (DV-21a: a 12.6 s charge). The ZOLL R Series biphasic maximum is 200 J [VERIFY]; the skin
  should carry its own energy range (`defib.ts` has ENERGY_RANGE_J 1–360 for every skin). Owner: skins/4b.
- **Hypothermic ROSC re-arrests** (DV-24a, seeds 18/27 at 28.5 °C: pulseless at +55 s, while the same seeds sustain at
  37 °C). This is the cold heart's arrest hazard acting after ROSC — plausible, reported for Ali.
- **Diathermy bursts read as HR 128** on a paced patient (DV-10c probe) — plausible monitor behaviour, recorded.

## 4. Findings for FU-7 (READY, not executed) — → FU-7 before execution

1. **Task 12 — add temperature.**
   - The task's `ShockContext` gains K, pH, CoPP, antiarrhythmic occupancy and the arrest clock, but not core
     temperature.
   - At 28.5 °C the termination rate is 60 %, as at 37 °C (DV-24a), and rewarming to 33 °C changes nothing (DV-24b).
   - ERC 2021: VF below 30 °C is often shock-refractory; withhold further shocks after three until the core is > 30 °C.
   - Add `tempC` (7e/Stage 3 core) with a factor on termination and ROSC below 30 °C, and DV-24a/b as its acceptance
     arms.
2. **Task 12 — the base termination rate.**
   - `VF_TABLE.persistent 0.3` makes the first biphasic shock terminate VF in 70 % (DV-01a: 65 % of 40 seeds).
   - Biphasic first-shock termination is 85–98 % (Schneider 2000; van Alem 2003 [VERIFY]).
   - Task 12 multiplies only the ROSC share. Re-source the persistent share in the same edit (E-FU7-6 covers the file),
     or DV-01a stays TW.
3. **Task 12 — cardioversion by rhythm and energy.**
   - `CARDIOVERSION_SINUS` 0.8 applies to AF, flutter and VT at any energy (DV-06a: 20 J = 120 J = 200 J = 85 % of
     seeds; exact 80 %). Task 12's factors act on the VF ROSC share only.
   - Add a class × energy term: flutter ≥ 90 % at 50–100 J; VT ≥ 90 % at 100 J; AF ≈ 75–90 % at 120–200 J and ≈ 20–30 %
     at ≤ 20–50 J. DV-06a/b/c become its cases.
   - Keep them on the ≤ 40 s AF window (the C3 guard, Task 0 Step 6b), as this run did.
4. **Task 12 — which CoPP.**
   - `cppMmHg` from `cor.cpp` is right in VF CPR (27).
   - It reads −13 in tamponade CPR (DV-04a) and the post-deflation dip under an IABP (DV-13d).
   - Take the continuous CPR value, and note V2/V3 so the factor is not fitted on those rigs.
5. **Task 12 — the physiology already does half the work.**
   - A pre-selected organised rhythm after 8 min of untreated VF re-arrests in 20 s; after 3 min of CPR it holds
     (DV-01c).
   - Hyperkalaemia re-fibrillates a forced sinus at +80 s (DV-25a).
   - The table's new factors add to this, so the effective ROSC (the draw × the survival of the rhythm) must be measured
     end to end, not only as `outcomeProbabilities`. Otherwise the K and CoPP effects double-count. DV-01c and DV-25a
     are the end-to-end guards.
6. **Task 11 — amiodarone in VF.** `λ_amio_vf = 0` is right, and Task 12 carries the drug (ARREST/ALPS). No DV cell
   contradicts it; DI-13a (MI) remains the acceptance cell.
7. **Task 12 — shock-made PEA (V1).** Task 12's new `arrestS` for a shocked non-VF arrest reads FU-4's arrest clock. That
   clock does not exist for an instructor- or shock-made PEA (V1). Either V1 lands first (FU-8 Part A), or Task 12 must
   define `arrestS` for undeclared arrests.

## 5. Findings for FU-8, FU-9 and other in-flight stages

- **FU-8 Part A** (loose ends; `docs/plans/fu-8-followups.md`):
  - **C3 / I-49** (AF LVEDP sampled mid-relaxation) is the same line as V2(a), `coronary.ts:142`. One CoPP definition
    (the diastolic time-average) fixes AF and the IABP. Add DV-13d as an I-49 acceptance cell.
  - **I-31** (VT 170 keeps a pulse): here VT 150 gives MAP 99.6 vs sinus 95.7 (DV-06c). Recorded, not re-reported.
  - **I-32** (agonal rate) and **I-33** (12-lead in arrest): not re-measured. DV-03/04a show the agonal phases at the
    expected times.
  - **I-53** (`RhythmOpts` validation): DV-10 used `opts.pacer` correctly; nothing new.
  - **Candidates for Part A:** V1 (shock/instructor PEA inert), V7 (CPR → ECG artefact), V12 (zoll-like energy range).
- **FU-8 Part B / FU-5 follow-ups:** V9's NIBP half (DV-16b: 10 of 10 valid at PP 20 since FU-5 fixed A10-C8) belongs
  with the pleth/NIBP pulsatility items such as I-12.
- **FU-9** (blood, fluids and acid–base): V11 (hyperkalaemic contractility from plasma K⁺ rather than `kEcg`) sits beside
  its F2 (a profile K⁺ never reaches the ECG).
- **FU-4 follow-on / R45:** DV-02a's CoPP 27 (S13 `it.fails`) and the VF myocardial state recovering to 0.8–0.9 under
  CPR (the "kIsch < 0.9 throughout" `it.fails`) are re-confirmed, not new.
- **V.1:** its "CPR flow scaling" Request is V4 — it needs an owner.
- **7h (devices, v1.1):** V10 and every NE cell of §6 are its acceptance list.
- **Stage 9:** label "PuI (LVAD)" vs "PI" (research/11 already asks); the IABP console has no alarms to show.

## 6. Cells blocked by missing features

| blocker | cells | expected response kept for the owner |
|---|---|---|
| pericardiocentesis (7h) | DV-04b | drainage under CPR restores output. PROBE: the instructor resetting the tamponade to 0 gives a pulse at +295 s with CoPP 19 (rejected: "command type applyEvent is not implemented until later stages") |
| pacemaker magnet (7h) | DV-11 | asynchronous VOO/DOO at 85–100/min (rejected: "device pacemaker is not implemented until later stages") |
| ICD (7h) | DV-12a, DV-12b | detection 6–12 s, charge 5–15 s, internal shock; ATP of 8 pulses at 88 % of the VT cycle |
| ECMO (7h) | DV-20a–d | tables §8.5 rows: VA flow fraction and PP, sweep → PaCO2, differential hypoxaemia, recirculation (rejected: "device vaEcmo is not implemented until later stages") |
| EMI → pacemaker sensing | DV-10c | diathermy inhibits a susceptible pacemaker. PROBE: the bursts leave the VVI output untouched (22 spikes in 19 s); the displayed HR reads the artefact (128) |
| cardiogenic-shock state (MODELED) | DV-13…15 graded on compensated HFrEF | no MODELED cardiogenic shock; the MANUAL instructor rig (DV-M5) is the only shock rig |

Changed since research/12: DV-19 was listed "Y" but has no thrombosis input (graded MI); DV-17's ectopy hook is missing
(graded within DV-17).

## 7. Proposed scripted suite (the owners' acceptance cells)

| owner | cells to re-measure at its gate | acceptance items |
|---|---|---|
| **FU-7 Task 12** | DV-01a, 01c, 06a–c, 24a–b, 25a (+ DI-13a) | termination ≥ 85 %; ROSC share rises with CoPP; < 30 °C refractory; K⁺ 9.5 ROSC ≤ 5 %; flutter/VT ≥ 90 %; AF energy-dependent |
| **FU-8 Part A** (V1, C3 + V2a, V7) | DV-01b, 13d, 23a | a shock-PEA regains a pulse under CPR; IABP CoPP ≥ control and no arrest in 20 min; CPR puts the artefact on the ECG |
| **7a devices** (V2b–c, V9) | DV-13b–c, 14a–d, 16b–d, 17, 18b, M5 | EDP −15…−20, assisted SBP −5, CO +0.5–1, PAWP −20 %; deflation before the opening in both modes; LVAD suction on a 1.5 L bleed, PuI 3–4 |
| **7a pericardium × CPR** (V3) | DV-04a | CPR MAP in tamponade ≤ VF CPR's; forward flow < 1 L/min |
| **gas coupling** (V4) | DV-02b, 02c, 03, 04a | VF CPR EtCO2 10–20; bled-out and tamponade < 10 |
| **7d brain** (V8) | DV-02a | CBF 0.2–0.45 under CPR |
| **4b → 7e** (V6) | DV-08c | awake TCP raises NE and HR |
| **7c / FU-9** (V11) | DV-25b | treated hyperkalaemia holds the rhythm |
| **7h** | DV-04b, 10c, 11, 12a–b, 15b, 19, 20a–d | §6 rows |

Each owner runs `./run.sh cli.ts <ids>` against its branch's worktree (`PME_ENGINE`) and pastes the `report.ts` rows
next to this run's column in its gate note (research/12 §7).

## 8. Questions for Ali (with the model's numbers)

1. **Asystole after a shock (the Q3 ruling).** A shock at 1 min of VF produces asystole in 30 % of seeds (46 % of the
   terminations). Under 8 min of good CPR, on a myocardium at 1.00, it never becomes anything else. Should a fresh
   post-shock asystole on a recoverable heart be able to return to an organised rhythm (and then ROSC), or stay asystole
   for teaching?
2. **Shock termination.** The model terminates VF with 70 % of first biphasic shocks (the monophasic-era figure); the
   biphasic trials give 85–98 %. Which do you teach? And of the terminations, should more land in asystole/PEA (model:
   46 % asystole, 42 % PEA, 12 % ROSC)?
3. **Cerebral flow in CPR.** The model gives 0.71 of normal under good CPR; the consensus is 30–40 %. Confirm the band.
4. **Tamponade CPR.** The arterial line reads 181/124 under compressions of a tamponaded heart. What should the learner
   see — a small pressure (≈ 20–30 systolic) that teaches "compressions do not work: drain it"?
5. **IABP rigs.** There is no MODELED cardiogenic shock: HFrEF is compensated, and the instructor's `contractility` acts
   only in MANUAL, where the IABP timing is wrong (V2). Do you want a MODELED "decompensated HFrEF / cardiogenic shock"
   state (CI < 2.2, PAWP > 18) as the IABP and inotrope teaching patient?
6. **IABP assisted systole.** In the MODELED rig the assisted SBP falls −14.8 (tables: ≈ −5), while the assisted EDP
   (−15.8) is in band. Is −5 your teaching number?
7. **Direction-only cells** (no sourced magnitude): DV-18a (LVAD flow vs afterload: −0.02 L/min per mmHg; the HM3 HQ
   slope is [VERIFY]), DV-18b (RV failure on an LVAD) and DV-M1…M5 (Q9).
8. **TCP pain.** Should the awake paced patient move or grimace (a movement flag) and surge? And should the capture
   threshold rise with thoracic impedance (obesity, emphysema) as a profile term?
9. **Vendor and trial figures marked [VERIFY]:** the LIFEPAK 15 charge times and auto-disarm, the ZOLL R Series 200 J
   maximum, and the biphasic termination and cardioversion rates. Please confirm them from the IFUs and papers you use
   before they become tests.

## 9. Files and how to re-run

All files are in `research/20-audit-scripts/`. Nothing in the repo was changed; the worktree was removed.
- `runner.ts`: the arm runner. DV readouts: `cor.cpp`, the arrest state, CPR, device/marker/tone/alarm events, the
  displayed numerics with their flags, the IABP/LVAD console and a 10 ms `fine` window. It also imports the shock-outcome
  table read-only.
- `spec.ts`: the cell type, contexts, rigs (`V`, `shock`, `cpr`, `seeds`) and helpers (`fbeats` beat analysis,
  `pulseAt`, `sustained`, `outcome`).
- `cells-a.ts` (defibrillation, CPR, arrest states, special circumstances), `cells-b.ts` (cardioversion, pacing, the
  defibrillator device, artefacts, NE devices), `cells-c.ts` (IABP, LVAD, ECMO), `cells-m.ts` (MANUAL twins).
- `grade.ts`, `regrade.ts`, `cli.ts` (stores `out/cells.json`; `DV_OUT` for a partial store), `merge.ts`, `report.ts`
  (→ `out/matrix.md`, the §2 tables), `ledger.ts` (→ `out/ledger.md`, research/12 §4.6), `hooks.mjs`, `run.sh`.
- `probe*.ts`: the exploration probes quoted in §3 (IABP timing and truncated deflations; tamponade CPR flow).

```
git -C <repo> worktree add --detach <wt> origin/main && (cd <wt> && npx -y pnpm@9.15.9 install --frozen-lockfile)
cd research/20-audit-scripts
PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts all      # ≈ 20 min
node --experimental-strip-types report.ts > out/matrix.md && node --experimental-strip-types ledger.ts > out/ledger.md
```
