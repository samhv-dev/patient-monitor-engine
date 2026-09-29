# 15 — Coverage run NN: neuro, neuromuscular block, depth of anaesthesia, brain (R54 matrix, research/12 §5.3)

*Coverage auditor, 2026-09-29. Read-only on the engine. The engine is `main` **0a50ce4** (FU-3, FU-4, FU-5 and V.1
merged; FU-6, FU-7, FU-8 not), with the audit inputs of `origin/audit/coverage-nn` (b3519c6) merged beside it on the
session branch `claude/cool-brahmagupta-6bcrjv`. Those inputs touch only `docs/`. Seed 7 throughout. Scripts:
`15-audit-scripts/`, which can be re-run. `out/cells.json` holds one graded record per cell and no raw rows. The format
follows research/22 (run BF) and research/19 (run CM).*

> **Provenance.** The runner is copied from research/19 and research/22 (arm runner, grader, CLI, merge, regrade,
> report, ledger) and extended with the NN readouts:
> - the 1 Hz `anaesthesia` truth: DI, SR, MAC, consciousness, movement, awareness risk, TOF/PTC/T1, diaphragm block,
>   drive, pupils;
> - the TOF stimulator's `tof` events;
> - 7g's CNS bus: seizure flag, LAST CNS/CV effect, antagonists, dexmedetomidine Ce;
> - the 7d brain state: ICP, CPP, CBF, CMRO2, PbtO2, SjvO2, Cushing, herniation.
>
> P1 ran first, then P2, then P3, in three parallel processes. Results were committed after every ≈ 10–15 cells
> (checkpoints 8ab27af, 067ad76, ba61ec3, b4e3a0e, fc6b644).
>
> Seven measurement artefacts were fixed before grading. Each is marked "resume fix" in the scripts:
> - **Rig.** Audit 08's VCV 12 × 600 gives PaCO2 ≈ 30 on this main (FU-4's single physical dead space), so the NN rig
>   uses the 7d tests' 12 × 500 (PaCO2 38.5).
> - **NN-26a.** The first read came 18 s after RR 30, before CBF could respond. The cell now holds PaCO2 near 30 at
>   RR 16 and reads at 2 and 10 min.
> - **NN-27.** The first rig missed the check-18 premise (PaCO2 33, MAP 69.5). It now uses RR 10 and a 1500 mL bleed.
> - **NN-28b, NN-08b.** FiO2 < 0.21 is rejected by both the ventilator and spontaneous breathing, so hypoxaemia is made
>   by a shunt (ARDS) instead.
> - **NN-29b.** Untreated 5-min VF never regains a pulse on the instructor's "sinus", so the hyperaemia cell is graded
>   on a treated arm.
> - **NN-11b.** The succinylcholine ladder was extended to 3 mg/kg.
>
> Grading-direction corrections were also made before the final regrade:
> - duration bands are not inverted (a longer block is a stronger effect);
> - onset times, ICP-rise times and depth-index bands are inverted.

## 0. Headline

- **71 cells**: the 68 cells of research/12 §5.3 (NN-01 … NN-32, split a–g as designed) plus 3 MANUAL twins
  (NN-M1 … M3). By tier: **43 P1, 25 P2, 3 P3**. Every intervention cell has its control arm at the same sim time.
  Dose-ladder cells (NN-11, 12) carry their normal-patient ladder as the reference.
- **Verdicts** (after the hand confirmations in `hand.ts`):

  | verdict | all | P1 | P2 | P3 | of which an in-flight plan already owns the fix |
  |---|---|---|---|---|---|
  | plausible (PL) | **37** | 22 | 13 | 2 | 1 (NN-08a: FU-6 T5 must keep it) |
  | too weak (TW) | **6** | 5 | 1 | — | 1 (NN-19b: FU-7 → FU-4 request 1) |
  | too strong (TS) | **12** | 11 | 1 | — | 3 (NN-09 FU-7 T14; NN-23a, NN-24 FU-7 T2) |
  | wrong (WR) | **11** | 5 | 6 | — | 2 (NN-10 FU-7 T14; NN-19a FU-7 T17) |
  | missing (MI) | **3** | — | 3 | — | 1 (NN-08b: FU-6 T10) |
  | inconsistent (IN) | **0** | — | — | — | — |
  | not expressible (NE) | **2** | — | 1 | 1 | — (NN-31 seizure state, NN-32 opioid rigidity) |

  - 32 cells are graded non-PL and non-NE. **24 of them carry at least one new mechanism that no plan owns.** Eight
    wait only on FU-6/FU-7 tasks.
  - Six of the 12 TS/TW verdicts are marginal: within ≈ 10 % of a band edge or inside a second source's range (NN-03b,
    05b, 26a, 26c, 26d, 27b). Each is marked "minor" in §2.
  - Engine wall time was ≈ 76 min over all cells (summed per cell), run as three to four parallel processes.
- **New findings, ranked** (§3 has each gap with the file that would change):
  1. **Propofol alone abolishes movement at Ce 3 µg/mL (N1; P1).** 7f counts propofol as MAC-equivalents by its BIS
     Ce50 (2.98 µg/mL at 40 y). So TIVA without opioid never moves to incision. The immobility C50 is ≈ 15 µg/mL
     (Smith 1994). The same term feeds 7e's antinociception and thermoregulatory depth.
  2. **Herniation never happens (N9; P1).** An untreated 1 mL/min haematoma runs 45 min with:
     - ICP climbing to **140 mmHg**;
     - MAP 145 from the Cushing surge;
     - CPP ≤ 10 for at most 20 s at a time (herniation needs 60 s continuous);
     - pupils fixed at 4 mm, and no apnoea or terminal bradycardia.
  3. **Volatile CBF is over-coupled, so sevoflurane 2 MAC *lowers* ICP (N10; P1).** At 2 MAC vs 1 MAC in TBI, ICP is
     −3.8 mmHg and CBF −0.16. The brain takes 7f's CMRO2 (0.45 once DI < 30) but 7g's direct vasodilation, which was
     derived against 7g's own gentler CMRO2. A healthy patient's CBF is 0.48 of awake at 0.9 MAC.
  4. **Ketamine raises ICP +4.6 mmHg in a ventilated TBI patient (N11; P1).** This teaches the dogma the evidence
     overturned.
  5. **Neostigmine from TOF 4 takes 30 min to TOFR 0.9 (N4; P1; band 5–15).** At full recovery it *improves* TOFR
     instead of the possible small fade (MI).
  6. **NMB kinetics (N5; P1).** The roc 0.6 anchors are right (max block 120 s, T1 25 % at 35.5 min). But:
     - roc 1.2 lasts **94.6 min** (label 67);
     - sugammadex 16 mg/kg reaches T1 10 % at 1.9 min (label 1.2);
     - heterozygous cholinesterase gives 1.5 × the normal succinylcholine block (tables ×2).
  7. **The propofol depth index runs deep (N7; P1).** DI 37 at Ce 4 (band 40–60), and burst suppression from Ce 5.0
     (band 6–8). This is the tables' Eleveld form with Emax = E0 — a question for Ali.
  8. **Opioid breathing (N6; P1).**
     - Fentanyl 5 µg/kg sets the apnoea flag while VE stays 2.3 L/min (38 %).
     - Naloxone restores breathing in 12 s (FU-7 T2).
     - There is **no renarcotisation** in 100 min.
  9. **A spurious "recurarisation" mark fires 19 s after the first dose of every NMB (N13; P1, event/DEV).** It spends
     the one-shot flag, so the real recurarisation after an under-dosed sugammadex (TOFR 1.0 → 0.58) raises **no**
     mark.
  10. **Dexmedetomidine sedates nobody (N3).** DI changes by 0: 7g publishes `dexmedCe` and 7f never reads it. The
      elderly midazolam + fentanyl sedation on air gives SpO2 94 %, with no obstruction and no apnoea (N2).
  11. **LAST (N12).**
      - The seizure is a bus flag with no physiology: CMRO2, lactate and breathing are unchanged.
      - Bupivacaine 2 mg/kg IV (peak 8 µg/mL) gives MAP −18 % and a 40/min bradycardia, with no collapse and no VF
        (VF needs a CV effect ≥ 0.9).
  12. Smaller gaps:
      - end-tidal MAC at eye opening is 0.18 (brain 0.33; N8);
      - the MODELED Cushing bradycardia fades to −19 % by 40 min (N14);
      - hypoxic gas mixtures are not expressible (N15).
- **What works** (37 PL cells, among them):
  - **Rocuronium 0.6 mg/kg.**
    - Maximum block at 120 s (label 1.8 min), T1 25 % at 35.5 min.
    - The diaphragm recovers first (block < 0.1 at 37 min, when T1 is 25 %).
    - The TOF stimulator trails the truth by one train (6 s).
  - **Rocuronium 1.2 mg/kg:** laryngeal/diaphragm block 100 % at 60 s, maximum block at 52 s.
  - **Succinylcholine 1 mg/kg.**
    - Fasciculation at 25 s, before the block.
    - Onset 50 s, no fade (phase I), K⁺ +0.50.
    - Homozygous cholinesterase: T1 90 % at 6.0 h.
    - Burns: K⁺ +6.5 → VF at K⁺ 10.7.
  - **Reversal and the neuromuscular diseases.**
    - Sugammadex 2 mg/kg at T2 reaches TOFR 0.9 in 1.9 min.
    - Sugammadex under-dosing re-paralyses (TOFR 1.0 → 0.58).
    - The neostigmine ceiling holds from TOF 1 (TOFR 0.62 at 15 min).
    - Myasthenia: rocuronium ED95 × 0.36, succinylcholine × 2.55.
    - Lambert–Eaton is sensitive to both.
    - Burns: rocuronium duration × 0.49.
    - Residual-block obstruction when extubated awake at TOFR 0.61: 0.47.
  - **Depth and consciousness.**
    - Loss of consciousness at propofol Ce 2.02.
    - DI 43 at sevoflurane 0.97 MAC.
    - Movement at 0.5 MAC and none at 1.5 MAC; SR > 0 at 1.50 MAC.
    - Remifentanil: MAC reduction 65 % with the DI unchanged (−2).
    - Ketamine: DI stays 95, MAP +8 %, HR +10 %, no apnoea.
    - Emergence 7.7 min after 1 h of sevoflurane.
    - Awareness under NMB at 0.29 MAC: DI 83, awareness flag, MAP +13, HR +10, no movement.
  - **Brain.**
    - Check 19: ICP 20 at 10.7 min and 40 at 23 min; Cushing MAP +36 with HR −26 % in the surge.
    - Mannitol 0.5 g/kg: ICP −28.9 %.
    - Propofol: ICP −8 with CPP −11 (the CPP risk).
    - CO2 reactivity 3.1 %/mmHg, flattened at the clamps.
    - Hypoxaemia (PaO2 51): CBF +41 %.
    - Check 18: pressure alone 0.76 (CO2-corrected); after hypocapnia PbtO2 10.8.
    - VF: CBF 0, PbtO2 → 0, SjvO2 25 %.
    - Post-ROSC hyperaemia: CBF × 2.1.
  - **LAST:** the seizure precedes the CV effect, and lipid lowers the CV effect by 0.2.
  - **MANUAL twins:** propofol lowers MAP −33, the Cushing twin gives +32 / −40 %, and VF gives CBF 0.

## 1. Method and rig

- **Design source.**
  - research/12 §5.3: NN, 32 scenarios, 68 cells.
  - §2: cell record and grading.
  - §3: tiers.
  - §6: runner pattern.
  - Bands and sources are the design's. Where the design gives only a point or a name, the band is the tables' source
    row (docs/physiology/stage-7-parameter-tables.md §5d, §5.1, §7 checks 18/19/25) at the tables' own tolerance: ±15 %
    of a stated value (§7 preamble). Where the design and the tables disagree, both are quoted and the design grades;
    each such case is a question in §8.
  - Names follow the research/11 glossary: TOF count/ratio, PTC, T1, DI (depth index), SR, MAC (end-tidal) and brain
    MAC, ICP, CPP, CBF, CMRO2, PbtO2, SjvO2.
- **Rig.** Adult 40 y, 70 kg, 175 cm, male. Sensors ABP/CVP/PAP/SpO2/CO2/temp/ICP/PbtO2 on.
  - **"TIVA vent":** ETT + VCV 12 × 500 mL, PEEP 5, FiO2 0.5 from 1 s, plus propofol effect-site TCI 3 µg/mL. The NMB
    dose is at 300 s, and the TOF stimulator runs 15 s trains from 290 s.
  - **Sevoflurane:** dial at FGF 6 L/min, calibrated by probe (brain MAC at 25 min: 1.08 % → 0.49, 2.16 % → 0.97,
    3.35 % → 1.50, 4.3 % → 1.9).
  - **Awake:** no airway device, the engine's own spontaneous breathing on air. FiO2 0.5 is used in the opioid and
    benzodiazepine reversal cells.
  - **TBI** (the 7d tests' check-19 rig):
    - profile `tbi` severity 1: PVI 20, ICP0 12, autoregulation index 0.3, CSF reserve 10 mL;
    - VCV 12 × 500, FiO2 0.4, no sedation;
    - "ICP 25" is a 17.5 mL mass set at 60 s; the treatment is at 1200 s.
  - **Check 18:** 75 y + HTN (lower limit 75), TIVA, VCV 10 × 500, FiO2 0.25. A 1500 mL bleed over 5 min stands in for
    the MAP fall, then RR 40.
  - **Timed reversal doses** are given at the sim time the control arm first showed the named TOF state (calibration
    probe). Each cell re-reads the state at the dose.
    - After rocuronium 0.6 at 300 s: T2 at 2075 s, PTC 1 at 1525 s, TOF 1 at 1755 s, TOF 4 at 2455 s, TOFR 0.6 at
      4950 s, TOFR 0.9 at 7325 s.
- **Arms.**
  - Every intervention cell has its control: the same timeline without the intervention, at the same sim time.
  - Potency cells use dose ladders. ED95 is the log-linear interpolation of the peak thumb block, in the profile vs
    the normal patient.
- **Sampling.**
  - The committed state is read-only every 2–60 s.
  - The 1 Hz `anaesthesia` event, `measurement` HR/DI, the stimulator's `tof` events and the `neuroMark` events are
    kept.
  - No pokes.
- **Grading** (research/12 §2.2): automatic first, then every non-PL is confirmed by hand. `HAND` in the tables gives
  the reason and the code location.
  - band → PL / TW / TS by direction; WR if opposite. `invert` is used where lower is stronger or faster (onset times,
    reversal times, ICP-rise times, DI).
  - direction-only → PL when the sign matches beyond a tolerance.
  - quiet → PL within tolerance.
  - event → PL when it matches.
  - rejected command → NE; absent quantity → MI.

  Bands are **proposals for Ali** with their source; none was widened (R45). Cells without a sourced magnitude are
  flagged `dirOnly` and listed in §8.
- **MANUAL.** Q9 is open, so the three MANUAL twins are graded direction-only.

## 2. Results

How to read the tables:
- **Measured** values are control-subtracted unless the key names an arm or an absolute. Keys:
  - `…S`: seconds from the intervention;
  - `…Min` / `…H`: minutes / hours from the intervention;
  - `d…`: absolute difference;
  - `…Pct`: % against the control.
- **Graded items** give value vs band [source]. `HAND` gives the confirmation and the code location.
- Gap ids refer to §3. `owned` marks a cell whose fix an in-flight plan already owns (§4, §5).
- Every table is regenerated by `report.ts` from `out/cells.json`.

Family by family:
- **2.1 NMB.**
  - Rocuronium 0.6, succinylcholine, the cholinesterase variants and the phase-I picture are right.
  - Rocuronium 1.2 lasts too long (N5).
  - The heterozygote is too short (N5).
  - Sevoflurane potentiation is too strong (FU-7 T14).
- **2.2 Reversal.**
  - Sugammadex at T2 and the neostigmine ceiling are right.
  - Sugammadex 16 mg/kg is slow (N5).
  - Neostigmine from TOF 4 is far too slow (N4).
- **2.3 Depth.**
  - Loss of consciousness, volatile DI, movement vs MAC, the remifentanil MAC reduction and ketamine are right.
  - The propofol DI curve and SR run deep (N7).
  - Propofol immobility is wrong (N1).
  - MAC-awake reads low on the gas monitor (N8).
- **2.4 Opioid reversal.** Naloxone acts instantly (FU-7 T2); there is no renarcotisation (N6).
- **2.5 Brain.**
  - Check 19, mannitol, propofol, CO2 reactivity and check 18 (CO2-corrected) are right.
  - Herniation is missing (N9).
  - Sevoflurane > 1 MAC and ketamine move ICP the wrong way (N10, N11).
  - HTS, head-up and hyperventilation are marginal.
- **2.6 NMB P2/P3.**
  - Myasthenia, Lambert–Eaton, burns and the under-dose recurarisation are right.
  - Magnesium does nothing (FU-7 T14).
  - Neostigmine at full recovery shows no weakness (N4).
  - Residual block does not blunt the hypoxic response (FU-6 T10).
- **2.7 Sedation and awareness.**
  - Awareness under NMB is right.
  - Dexmedetomidine does not sedate and has no early pressor (N3, FU-7 T17).
  - Elderly midazolam + fentanyl sedation is benign (N2).
  - Flumazenil acts instantly (FU-7 T2).
- **2.8 Brain P2/P3.**
  - CO2 and O2 reactivity, the arrest brain and post-ROSC hyperaemia are right.
  - LAST: the seizure has no physiology and the CV toxicity is weak (N12).
  - Seizure state and rigidity are NE.
- **2.9 MANUAL:** all three twins move in the expected direction.

### 2.1 Neuromuscular block: onset, duration, succinylcholine (P1)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| NN-01a | P1 | X-A TIVA vent · anaesthetised (propofol Ce 3) → rocuronium 0.6 mg/kg: onset (TOF count 0) | tTof0S 74; tMaxBlockS 120; devTof0S 80; devLagS 6; diaAt60 0.9; thumbAt60 0.94 | TS: tTof0S = 74 below [90, 120] (lower = stronger/faster) [research/12 NN-01: TOF 0 at 1.5–2 min (Naguib)]<br>PL: tMaxBlockS = 120 in [92, 124] [tables §5d / §7 check 25: rocuronium 0.6 max block 1.8 min (Roc-label; ±15 %)]<br>PL: devLagS = 6 in [0, 15] [DEV: the TOF stimulator (15 s trains) reports count 0 within one train of the truth (research/12 §2.2)]<br>HAND TS (automatic TS): Confirmed against the design wording only: TOF count 0 (T1 < 3 %) comes at 74 s, but the labelled quantity — time to MAXIMUM block — is 120 s against 1.8 min ± 15 % (PL). The design reads "TOF 0" as maximum block; TOF 0 necessarily precedes it. Definition, not a mechanism (Q1). | **TS** | — · 7f nmb.ts / 7g roc PK |
| NN-01b | P1 | X-A TIVA vent · anaesthetised (propofol Ce 3) → rocuronium 0.6 mg/kg: clinical duration (T1 25 %) and spontaneous TOFR 0.9 | t1_25Min 35.5; tofr09Min 116.1; diaRecMin 37.1 | PL: t1_25Min = 35.5 in [30, 40] [research/12 NN-01 (T1 25 % at 30–40 min); tables §5d / §7 check 25: 31 min (Roc-label); Naguib] | **PL** | — · 7f nmb.ts / 7g roc PK |
| NN-02 | P1 | X-A TIVA vent · anaesthetised → rocuronium 1.2 mg/kg (RSI): intubating conditions at 60 s; duration | diaAt60 1; thumbAt60 1; tTof0S 34; tMaxBlockS 52; t1_25Min 94.6 | PL: diaAt60 = 1 in [0.9, 1] [research/12 NN-02: intubating conditions at 60 s (Miller NMB) — laryngeal/diaphragm block ≥ 90 % (tables §5d: larynx/diaphragm drive the airway)]<br>PL: tMaxBlockS = 52 in [51, 69] [tables §5d roc 1.2 mg/kg max block 1.0 min (Roc-label; ±15 % tables §7 convention)]<br>TS: t1_25Min = 94.6 above [57, 77] [tables §5d roc 1.2 mg/kg clinical duration 67 min (Roc-label; ±15 %)]<br>HAND TS (automatic TS): Onset right (max block 52 s; diaphragm 100 % at 60 s); clinical duration 94.6 min against the label 67 min — the dose–duration relation is too steep: roc 0.6 gives 35.5 min (label 31), roc 1.2 gives 94.6 (label 67). N5. | **TS** | N5 · 7f nmb.ts / 7g roc PK |
| NN-03a | P1 | X-A TIVA vent · anaesthetised → succinylcholine 1 mg/kg: fasciculation before the block | fascS 25; fascBeforeTof0 true; marks 325s fasciculation, 328s recurarisation | PL: fascBeforeTof0 = true (expected true) [research/12 NN-03 (fasciculation; Miller NMB): fasciculations precede the block] | **PL** | N13 · 7f pipeline.ts (marks) |
| NN-03b | P1 | X-A TIVA vent · anaesthetised → succinylcholine 1 mg/kg: onset, recovery T1 90 %, no fade (phase I) | tTof0S 50; t1_10Min 7; t1_90Min 12; minTofrOnset 1 | PL: tTof0S = 50 in [45, 75] [research/12 NN-03 onset 60 s (Miller NMB); tables §5d block ~1 min (Sux-label)]<br>TS: t1_90Min = 12 above [8, 10] [research/12 NN-03 T1 90 % at 8–10 min (Miller NMB); the tables §5d label value is 10.9 min (Sux-label) — both quoted]<br>PL: minTofrOnset = 1 in [0.9, 1] [tables §5d: succinylcholine phase I, no fade, TOFR ≈ 1 at any T1]<br>HAND TS (automatic TS): T1 90 % at 12.0 min: TS (block too long) against the design 8–10 min (Miller), inside the label 10.9 min ± 15 % (9.3–12.5) that FU-3 fitted (7f nmb.ts NMB_PD succinylcholine comment: 11.98 min). A source conflict for Ali (Q2), not a mechanism. | **TS** | — · 7f nmb.ts / 7g sux PK |
| NN-03c | P1 | X-A TIVA vent · anaesthetised → succinylcholine 1 mg/kg: plasma K⁺ rise vs control | dKPeak 0.5; tPeakMin 4 | PL: dKPeak = 0.5 in [0.43, 0.58] [research/12 NN-03 (K +0.5, Miller NMB); tables §5c "Succinylcholine K rise +0.5" (B §4.9) — ±15 %] | **PL** | — · 7c treatments.ts |
| NN-04a | P1 | X-A TIVA vent · plasma cholinesterase heterozygous (`neuro.cholinesterase`) · heterozygous atypical cholinesterase → succinylcholine 1 mg/kg: block duration (T1 90 %) | t1_90Min 18.1; t1_90NormalMin 12; ratio 1.5 | TW: t1_90Min = 18.1 below [20, 30] [research/12 NN-04 (heterozygous 20–30 min; Miller); tables §5d "heterozygous ×2" (Lee 2009)]<br>HAND TW (automatic TW): Heterozygous block 18.1 min = 1.5 × normal (12.0); the tables say ×2 (≈ 24 min) and Miller 20–30 min. 7g PCHE_CL_MULT het 0.5 halves clearance but duration scales less than clearance on a steep Hill. N5. | **TW** | N5 · 7g PK (PCHE_CL_MULT) |
| NN-04b | P1 | X-A TIVA vent · cholinesterase homozygous atypical · homozygous atypical cholinesterase → succinylcholine 1 mg/kg: block duration (T1 90 %) | t1_90H 6; t1_10H 4.8; phase2Fade 1 | PL: t1_90H = 6 in [4, 8] [research/12 NN-04 (homozygous 4–8 h; Miller); tables §5d "homozygous 4–8 h" (Sux-label; Lee 2009)] | **PL** | — · 7g PK (PCHE_CL_MULT) |
| NN-09 | P1 | X-A vent · sevoflurane ≈ 1 MAC (15 min) vs TIVA → rocuronium 0.6 mg/kg: clinical duration under sevoflurane vs TIVA | macBrainAtDose 0.79; t1_25SevoMin 59; t1_25TivaMin 36.7; prolongPct 60.8 | TS: prolongPct = 60.8 above [20, 30] [research/12 NN-09: duration +20–30 % under a volatile (Miller NMB; tables §5d interactions [TXT direction])]<br>HAND TS (automatic TS): Sevoflurane 0.8 MAC prolongs rocuronium +60.8 % against the design +20–30 % (Miller); FU-7 Task 14 (DI-51) re-sizes the `1 + 0.5·MAC` divisor against 25–80 % — 60.8 would pass FU-7 and fail this design (Q3). | **TS** (FU-7 T14 pending) | owned · 7f interactions.ts |

### 2.2 Reversal: sugammadex and neostigmine (P1)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| NN-05a | P1 | X-A TIVA vent · roc 0.6, TOF count 2 reappearing → sugammadex 2 mg/kg at T2: time to TOFR 0.9 | tofCAtDose 2; tofr09Min 1.9; recur null | PL: tofr09Min = 1.9 in [1.9, 2.5] [research/12 NN-05 (≈ 2 min; Naguib); tables §5d / §7 check 25: TOFR 0.9 median 2.2 min after sugammadex 2 mg/kg at T2 (Sgx-label; ±15 %)] | **PL** | — · 7g sugammadex binding / 7f |
| NN-05b | P1 | X-A TIVA vent · roc 0.6, deep block PTC 1–2 → sugammadex 4 mg/kg at PTC 1–2: time to TOFR 0.9 | ptcAtDose 1; tofCAtDose 0; tofr09Min 2 | TS: tofr09Min = 2 below [2.1, 4.3] (lower = stronger/faster) [research/12 NN-05 (≈ 3 min; Naguib); tables §5d: sugammadex 4 mg/kg at 1–2 PTC, TOFR 0.9 median 2.7 min, IQR 2.1–4.3 (Sgx-label)]<br>HAND TS (automatic TS): TOFR 0.9 in 2.0 min against the label IQR 2.1–4.3 (median 2.7): marginally fast; sugammadex binding is instantaneous in plasma and the recovery is roc ke0-limited (N5). | **TS** | N5 · 7g sugammadex binding / 7f |
| NN-05c | P1 | X-A TIVA vent · roc 1.2 (RSI), 3 min → sugammadex 16 mg/kg 3 min after roc 1.2 (immediate reversal) | t1_10Min 1.9; tofr09Min 2.2; diaAt5 0 | TW: t1_10Min = 1.9 above [1, 1.4] (lower = stronger/faster) [tables §5d: sugammadex 16 mg/kg 3 min after roc 1.2, T1 10 % ≈ 1.2 min (Sgx-label; ±15 %)]<br>TW: tofr09Min = 2.2 above [1.3, 1.7] (lower = stronger/faster) [research/12 NN-05 (TOFR 0.9 at ≈ 1.5 min; Naguib; ±15 %)]<br>HAND TW (automatic TW): Sugammadex 16 mg/kg 3 min after roc 1.2: T1 10 % at 1.9 min (label 1.2), TOFR 0.9 at 2.2 min (Naguib ≈ 1.5). The effect-site washout after instant plasma binding runs at the thumb ke0 0.16/min (t½ 4.4 min): too slow for the immediate-reversal label. N5. | **TW** | N5 · 7g sugammadex binding / 7f |
| NN-06a | P1 | X-A TIVA vent · roc 0.6, TOF count 4 (fade) → neostigmine 50 µg/kg + glycopyrrolate 10 µg/kg at TOF 4: TOFR 0.9 | tofCAtDose 4; tofRAtDose 0.03; tofr09Min 30.3; tofr09CtlMin null; dHrMax 13 | TW: tofr09Min = 30.3 above [5, 15] (lower = stronger/faster) [research/12 NN-06 (TOFR 0.9 in 10–15 min from TOF 4; Fuchs-Buder; Kopman); tables §5d neostigmine onset 1–3 min, peak ~10 min]<br>HAND TW (automatic TW): Confirmed: from TOF-count-4 reappearance (TOFR 0.03, T1 0.25) neostigmine 50 µg/kg reaches TOFR 0.9 at 30.3 min (spontaneous: > 40 min). Two terms stack: the ceiling multiplier NEO_SMAX 0.7 (EC50 × ≤ 1.7, neuro/neostigmine.ts:12) and TOFR = T1^2.5 (neuro/nmb.ts TOFR_EXP), which needs T1 0.96 for TOFR 0.9. N4. | **TW** | N4 · 7f neostigmine.ts / 7g gamma row |
| NN-06b | P1 | X-A TIVA vent · roc 0.6, TOF count 1 → neostigmine 50 µg/kg + glycopyrrolate at TOF 1: ceiling (no TOFR 0.9 in 15 min) | tofCAtDose 1; tofRAt15 0.62; tofRAt15Ctl 0.07; recovered15 false; tofr09Min null | PL: recovered15 = false (expected false) [research/12 NN-06: from TOF 1 neostigmine cannot reach TOFR 0.9 in 10–15 min (ceiling; Fuchs-Buder; Kopman); tables §5d "cannot reverse from TOF count < 2"] | **PL** | — · 7f neostigmine.ts |

### 2.3 Depth, consciousness and movement (P1)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| NN-15a | P1 | X-A intubated, ventilated · awake → propofol effect-site TCI 2 → 4 → 6 → 8 µg/mL (10 min each): Ce at loss of consciousness | locS 194; ceAtLoc 2.02; consciousEndCe2 true; marks 194s lossOfConsciousness, 340s emergence, 666s lossOfConsciousness, 707s apnoea | PL: ceAtLoc = 2.02 in [2, 3] [research/12 NN-15: loss of consciousness at Ce 2–3 µg/mL (Eleveld; tables §6.1 Schnider LOC C50 2.35/1.8 µg/mL at 25/50 y)] | **PL** | — · 7f depth.ts |
| NN-15b | P1 | X-A intubated, ventilated · awake → propofol TCI staircase: DI at Ce 4 (steady) and MAP fall with Ce vs control | diCe2 63; diCe4 37; diCe6 24.7; diCe8 18; dMapCe2 -12.1; dMapCe4 -16.2; dMapCe6 -18.9; dMapCe8 -21.5; mapFallCe8vsCe2 -9.4 | TS: diCe4 = 37 below [40, 60] (lower = stronger/faster) [research/12 NN-15: depth index 40–60 at Ce 3–5 µg/mL (Eleveld BIS 2024 Ce50 3.08·e^(−0.00635(age−35)); BIS manual general-anaesthesia range 40–60)]<br>PL: mapFallCe8vsCe2 = -9.4 (sign -1, beyond 3) [research/12 NN-15: MAP falls with Ce (Eleveld; Miller IV anaesthetics) — direction]<br>HAND TS (automatic TS): DI 37 at Ce 4 (band 40–60) and 24.7 at Ce 6: the tables' Eleveld form DI = 93·(1 − U^γ/(U^γ + 1)) has Emax = E0, so the index crosses 40 at Ce ≈ 3.6 and 30 at Ce ≈ 5.0 (neuro/depth.ts:67–75). N7. | **TS** | N7 · 7f depth.ts / 7g circulation PD |
| NN-15c | P1 | X-A intubated, ventilated · awake → propofol TCI staircase: burst suppression (SR > 0) from Ce ≈ 6–8 | ceAtSr 5.03; srCe6 22; srCe8 49; cmro2Ce8 0.413 | TS: ceAtSr = 5.03 below [6, 8] (lower = stronger/faster) [research/12 NN-15: burst suppression from Ce ≈ 6–8 µg/mL (Eleveld; BIS manual; tables §5d "burst suppression DI < 20–30")]<br>HAND TS (automatic TS): SR > 0 from Ce 5.03 (band 6–8): SR is derived from the same index (SR = (30 − DI)/25, neuro/depth.ts:76), so it inherits NN-15b's curve. N7. | **TS** | N7 · 7f depth.ts |
| NN-16a | P1 | X-A intubated, ventilated, unparalysed · sevoflurane 0.5 / 1.0 / 1.5 MAC (brain, 25 min) → incision (stimulus 1): movement | mac05 0.489; mac10 0.97; mac15 1.5; move05 true; move10 true; move15 false | PL: move05 = true (expected true) [research/12 NN-16: at 0.5 MAC most patients move to incision (MAC definition: 50 % move at 1.0 MAC; Eger 1965; Miller inhaled agents)]<br>PL: move15 = false (expected false) [research/12 NN-16: at 1.5 MAC (≈ MAC95 1.3) no movement to incision (Miller)] | **PL** | — · 7f depth.ts (movement) |
| NN-16b | P1 | X-A intubated, ventilated · sevoflurane 0.5 / 1.0 / 1.5 MAC → depth index before incision by MAC | di05 70; di10 43; di15 29; mac10 0.97; diAfterInc10 53; diShownAfterInc10 null | PL: di10 = 43 in [40, 45] [tables §5d: DI ≈ 40–45 at 1.0 MAC (range 35–50) [ENG calibration]; research/12 NN-16 "DoA ↓"] | **PL** | — · 7f depth.ts |
| NN-16c | P1 | X-A intubated, ventilated · sevoflurane 1.5 MAC → burst suppression at ≥ 1.5 MAC | mac15 1.5; sr15 4; mac20 1.925; sr20 31; sr15pos true | PL: sr15pos = true (expected true) [research/12 NN-16: suppression ratio > 0 at ≥ 1.5 MAC (Miller, inhaled agents: burst suppression at 1.5–2 MAC)] | **PL** | — · 7f depth.ts |
| NN-17a | P1 | X-A intubated, ventilated · propofol Ce 3; sevoflurane 1 MAC → remifentanil 0.2–0.3 µg/kg/min: MAC reduction and movement to incision | macReductionPct 65.4; ceRemi 6.8; moveProp false; movePropRemi false | PL: macReductionPct = 65.4 in [60, 70] [research/12 NN-17: remifentanil reduces MAC up to 60–70 % (Lang 1996 Anesthesiology 85:721); tables §5d macOpioid −30 to −70 %]<br>WR: moveProp = false (expected true) [control arm: propofol alone at Ce 3 µg/mL does not prevent movement to incision (Smith 1994 Anesthesiology 81:820: propofol Cp50 for skin incision 15.2 µg/mL without opioid; Miller IV anaesthetics)]<br>PL: movePropRemi = false (expected false) [research/12 NN-17: movement to incision suppressed by remifentanil + propofol (Lang 1996; Miller)]<br>HAND WR (automatic WR): MAC reduction 65 % (PL) but the CONTROL fails: propofol Ce 3 alone abolishes movement to incision. neuro/depth.ts:83,87 counts propofol as MAC-equivalents by its BIS Ce50 (2.98 µg/mL at 40 y), while the immobility C50 is ≈ 15 µg/mL (Smith 1994). N1. | **WR** | N1 · 7f depth.ts |
| NN-17b | P1 | X-A intubated, ventilated · propofol Ce 3 → remifentanil 0.2 µg/kg/min: depth index barely changed (before stimulation) | dDi -2; diProp 46; dDiAfterInc -2.2 | PL: dDi = -2 (quiet, tol ±10) [research/12 NN-17: DoA barely changed by the opioid (Lang 1996); tables §5d "opioids alone barely move the index" — quiet ±10 (direction-only tolerance)] | **PL** | — · 7f depth.ts |
| NN-18a | P1 | X-A awake, spontaneous, air · awake → ketamine 1 mg/kg: depth index stays high (dissociation) | diMin 95; loc true; marks 309s lossOfConsciousness, 497s emergence | PL: diMin = 95 in [60, 100] [research/12 NN-18: the DoA index stays high under ketamine (paradox) (Miller IV anaesthetics; tables §5d "ketamine ↑ DI")] | **PL** | — · 7f depth.ts |
| NN-18b | P1 | X-A awake, spontaneous, air · awake → ketamine 1 mg/kg: HR and MAP rise vs control | dMapPct 8.2; dHrPct 10.1; dMapMinPct 0.8 | PL: dMapPct = 8.2 (sign 1, beyond 5) [research/12 NN-18: MAP ↑ (sympathomimetic; Miller IV anaesthetics: arterial pressure and HR rise ≈ 20–30 %) — direction, beyond 5 %]<br>PL: dHrPct = 10.1 (sign 1, beyond 5) [research/12 NN-18: HR ↑ (Miller) — direction, beyond 5 %] | **PL** | — · 7g circulation PD (ketamine) / FU-7 T9 |
| NN-18c | P1 | X-A awake, spontaneous, air · awake → ketamine 1 mg/kg: ventilatory drive preserved | apnoea false; veMinPct -18.3; paco2Max 1 | PL: apnoea = false (expected false) [research/12 NN-18: drive preserved; no apnoea at 1 mg/kg (Miller IV anaesthetics)]<br>PL: veMinPct = -18.3 (quiet, tol ±25) [research/12 NN-18: minimal respiratory depression (Miller) — quiet ±25 % (direction-only tolerance)] | **PL** | — · 7f drive.ts |
| NN-21a | P1 | X-A intubated, ventilated · sevoflurane 1 MAC for 1 h → vaporiser off (FGF 6): end-tidal MAC at emergence | macEtAtEmergence 0.18; macBrainAtEmergence 0.33; macBrainAtOff 1.05 | TW: macEtAtEmergence = 0.18 below [0.3, 0.4] [research/12 NN-21: eyes open at end-tidal 0.3–0.4 MAC (MAC-awake; Katoh 1993; tables §5d macAwake 0.33, 0.22–0.34)]<br>HAND TW (automatic TW): End-tidal MAC at eye opening 0.18 (brain 0.33 = MAC-awake): 7f applies MAC-awake to the BRAIN fraction and the brain lags Et by minutes at FGF 6, so the gas monitor reads ≈ half the taught value at emergence. N8. | **TW** | N8 · 7f depth.ts / 7g volatile.ts |
| NN-21b | P1 | X-A intubated, ventilated · sevoflurane 1 MAC for 1 h → vaporiser off: time to emergence (washout) | emergenceMin 7.7; emerged true; diAtEmergence 80 | PL: emerged = true (expected true) [research/12 NN-21: emergence follows washout (Miller inhaled agents: sevoflurane eye opening ≈ 5–15 min after 1 MAC at high FGF) — direction/event; time reported for Ali] | **PL** | — · 7g volatile.ts |

### 2.4 Opioid reversal (P1)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| NN-23a | P1 | X-A awake, spontaneous, FiO2 0.5 · fentanyl 5 µg/kg: apnoea → naloxone 0.1 mg × 2 (2 min apart): time to breathing | ve0 6.1; apnoeicBeforeNal true; veMinBeforeNal 2.3; veAtNal 2.3; breathMin 0.2; breathMark 0; ctlBreathMin 4.5 | PL: apnoeicBeforeNal = true (expected true) [research/12 NN-23 premise: fentanyl 5 µg/kg makes an awake adult apnoeic (Miller, opioids)]<br>TS: breathMin = 0.2 below [1, 2] (lower = stronger/faster) [research/12 NN-23: naloxone reverses opioid apnoea in 1–2 min (Miller, opioids)]<br>HAND TS (automatic TS): Naloxone restores VE ≥ 50 % in 12 s (band 1–2 min): 7g gamma rows have zero-slope onset. FU-7 Task 2 moves naloxone to ≈ 40 s — still faster than this design's 1–2 min (Q6). Premise: the 7f apnoea flag is set, but VE stays 2.3 L/min (38 %) — fentanyl 5 µg/kg is not apnoeic in the flow (D-7f-3, FENT_VENT_POT 0.55; FU-7 Task 7 owns the one apnoea truth). | **TS** (FU-7 T2 pending) | N6, owned · 7g naloxone row / 7f drive.ts |
| NN-23b | P1 | X-A awake, spontaneous, FiO2 0.5 · fentanyl 5 µg/kg reversed by naloxone → renarcotisation after naloxone wears off | renarcMin null; renarc false; veMinAfter 5; ve0 6.1; antOpAt30 2.44 | WR: renarc = false (expected true) [research/12 NN-23: renarcotisation — fentanyl 5 µg/kg outlasts naloxone (Miller, opioids)]<br>MI: renarcMin: not a finite number (null) [research/12 NN-23: renarcotisation at 30–60 min (naloxone duration 30–45 min; Miller)]<br>HAND WR (automatic MI): No renarcotisation in 100 min: VE ≥ 5.0 L/min throughout; naloxone's gamma row keeps an antagonist multiplier of 2.44 at 30 min (rows-other.ts:45, 3600 s tail) while fentanyl 5 µg/kg's ventilatory Ce has fallen below its (0.55×-weakened, D-7f-3) C50. N6 (Q6/Q7). | **WR** | N6 · 7g naloxone row |

### 2.5 Brain: TBI, ICP treatment, CBF regulation (P1)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| NN-25a | P1 | TBI (severity 1) intubated, VCV 12 × 500 · expanding haematoma 1 mL/min → time course of ICP | icp0 12; paco2 38.5; t20Min 10.7; t40Min 23; icpAtCpp60 35.9 | PL: t20Min = 10.7 in [10, 15] [research/12 NN-25 / tables §7 check 19: ICP 12 → 20 by ~10–15 min]<br>PL: t40Min = 23 in [20, 25] [research/12 NN-25 / tables §7 check 19: → 40 by ~20–25 min] | **PL** | — · 7d brain |
| NN-25b | P1 | TBI intubated · expanding haematoma 1 mL/min → Cushing response at CPP < 40: MAP ↑, HR ↓ | cushOnMin 29.2; dMap 36.3; hr0 73; hrSurge 54; hrDropPct -26; hrNadir5Pct -27.4; hrAt40Pct -19.4 | PL: dMap = 36.3 in [30, 50] [research/12 NN-25 / tables §7 check 19 and §5.1: Cushing MAP +30–50 over 30–60 s]<br>PL: hrDropPct = -26 in [-40, -20] [tables §5.1 Cushing: HR −20–40 % with the surge (check 19: HR 80 → 45–55) — read over the same 50–70 s window as the MAP]<br>HAND PL (automatic PL): PL after the surge-window read (HR −26 %); the 40-min value is −19.4 % because in MODELED the bradycardia is left to the baroreflex (organs/effects.ts:41 "no hrF"). | **PL** | N14 · 7d cushing.ts / 7a |
| NN-25c | P1 | TBI intubated · expanding haematoma 1 mL/min, untreated 45 min → herniation | herniated false; herniationMin null; cppMin 4.6; icpMax 140.5; lowCppLongestS 20; pupil 4; mapEnd 145.5; hrEnd 65; rhythms 5s sinus | WR: herniated = false (expected true) [research/12 NN-25: untreated expanding haematoma → herniation (tables §5.1; BTF)]<br>HAND WR (automatic WR): No herniation in 45 min: ICP rises to 140 mmHg while the Cushing surge (MAP 145) keeps CPP above 10 except for ≤ 20 s at a time; herniation needs CPP ≤ 10 for 60 s CONTINUOUSLY (brain/model.ts:144–145). Pupils stay 4 mm (no unilateral dilatation), no apnoea, no terminal bradycardia/asystole. N9. | **WR** | N9 · 7d brain |
| NN-26a | P1 | TBI, ICP 25 · raised ICP (mass) → hyperventilation to a sustained PaCO2 ≈ 30 (RR 12 → 16) | icpPre 25.3; paco2At2 34.6; paco2At10 31.6; dIcpPctAt2 -9.3; dIcpPctAt10 -16.9; dCbfPctAt10 -17.4; rr30Paco2At10 19; rr30DIcpPctAt10 -46.8 | TW: dIcpPctAt2 = -9.3 above [-30, -25] [research/12 NN-26 (ICP −25 %); tables §7 check 19: hyperventilation to PaCO2 30, ICP −25–30 % in 1–2 min (BTF; Miller neuro)]<br>HAND TW (automatic TW): The ICP response per mmHg is close: −16.9 % at PaCO2 31.6 (10 min, −6.9 mmHg) = 2.4 %/mmHg against 2.5–3.0 implied by check 19; the 2-min read (−9.3 %) was taken at PaCO2 34.6, because RR 16 lowers PaCO2 over minutes (at RR 30 PaCO2 reaches 19 and ICP −47 %). Minor (TW by a small margin). | **TW** | — · 7d brain |
| NN-26b | P1 | TBI, ICP 25 · raised ICP → mannitol 0.5 g/kg: ICP at 20–40 min | icpPre 25.3; dIcpPctMin20_40 -28.9; dIcpPctAt30 -28.1; tNadirMin 40.7 | PL: dIcpPctMin20_40 = -28.9 in [-30, -25] [research/12 NN-26: mannitol 0.5 g/kg ICP −25–30 % at 20–40 min (BTF; Miller neuro; tables §5.1 mannitol row)] | **PL** | — · 7d brain (osmotherapy) |
| NN-26c | P1 | TBI, ICP 25 · raised ICP → 3 % saline 250 mL: ICP (similar to mannitol) | dIcpPctMin20_40 -31.3; dIcpPctAt10 -26; dNaMax 3.2 | TS: dIcpPctMin20_40 = -31.3 below [-30, -25] [research/12 NN-26: HTS similar to mannitol (BTF; Miller neuro) — the mannitol band −25–30 %]<br>HAND TS (automatic TS): −31.3 % against the mannitol band −25–30 %: marginal; inside the 7d test's own HTS band (−20–40 % at 10 min). | **TS** | — · 7d brain (osmotherapy) |
| NN-26d | P1 | TBI, ICP 25 · raised ICP → head-up 30°: ICP and CPP | dIcp -7.5; dCpp -1.8; dMap 0 | TS: dIcp = -7.5 below [-7, -5] [research/12 NN-26: head-up 30° ICP −5–7 mmHg (BTF); tables §5.1 −5.6 (−3 to −8; HeadUp-meta 2024)]<br>HAND TS (automatic TS): −7.5 mmHg against the design −5–7: marginal; inside the tables' range −3 to −8 (meta-analysis mean −5.6). | **TS** | — · 7d brain |
| NN-26e | P1 | TBI, ICP 25 · raised ICP → propofol 1.5 mg/kg bolus: ICP ↓ with CPP risk | dIcpMin -7.95; dCppMin -11.39; dMapMin -18.45; cppNadir 58.88 | PL: dIcpMin = -7.95 (sign -1, beyond 1) [research/12 NN-26: propofol lowers ICP (CMRO2–CBF coupling; Miller neuro) — direction]<br>PL: dCppMin = -11.39 (sign -1, beyond 5) [research/12 NN-26: with CPP risk (MAP falls more than ICP; BTF CPP 60–70) — direction] | **PL** | — · 7d brain / 7g |
| NN-26f | P1 | TBI, ICP 25 · raised ICP → sevoflurane 1 vs 2 MAC: CBF and ICP | mac1 0.961; mac2 1.9040000000000001; icp1 16.1; icp2 12.2; icpCtl 25.3; dIcp2vs1 -3.8; dCbf2vs1 -0.161; map1 83.8; map2 70.7 | WR: dIcp2vs1 = -3.8 (expected sign 1) [research/12 NN-26: sevoflurane above 1 MAC raises ICP (direct vasodilation; Matta 1999 Anesthesiology 91:677; Miller neuro) — direction]<br>WR: dCbf2vs1 = -0.161 (expected sign 1) [research/12 NN-26: … and CBF (Matta 1999: MCA velocity +4 % at 0.5, +17 % at 1.5 MAC) — direction]<br>HAND WR (automatic WR): Sevoflurane 2 MAC LOWERS ICP (−3.8) and CBF (−0.16) against 1 MAC. Two causes: (1) organs/inputs.ts:98–99 takes 7f's CMRO2 (outputs.ts:26: 1 − 0.4·anaes, 0.45 once DI < 30) but 7g's direct vasodilation, which pk/combine.ts:97–98 derived against 7g's own gentler per-MAC CMRO2 — so volatile CBF is over-coupled (healthy CBF 0.48 of awake at 0.9 MAC); (2) TBI's pressure-passive CBF follows the MAP fall (84 → 71). N10. | **WR** | N10 · 7d flow.ts / 7g cbfVaso |
| NN-26g | P1 | TBI, ICP 25, ventilated · raised ICP → ketamine 1 mg/kg: no ICP rise under controlled ventilation | dIcpMax 4.59; dCbfMax 0.16; dMapMax 6.17 | WR: dIcpMax = 4.59 (quiet, tol ±2) [research/12 NN-26: ketamine does not raise ICP when ventilated (BTF; Himmelseher & Durieux 2005 A&A 101:524; Miller neuro) — quiet ±2 mmHg]<br>HAND WR (automatic WR): Ketamine raises ICP +4.6 mmHg (CBF +16 %) under controlled ventilation: the direct vasodilation +40 % at full effect (brain/flow.ts vasoDirect; 7g cbfVaso) acts with no hypnotic CMRO2 fall (7f's DI stays high, so cmro2Mult ≈ 1). N11. | **WR** | N11 · 7d flow.ts / 7g cbfVaso |
| NN-27a | P1 | X-E 75 y + HTN (cbfLL 75), TIVA, VCV 13 × 500 · GA at MAP ≈ 65 (haemorrhage as the pure pressure change) → CBF from pressure alone | mapBase 105.9; paco2Base 39.1; mapLow 66.9; cppLow 60.8; paco2Low 45.3; icpLow 6.1; cvpLow 3.5; cbfLowRel 0.898 | TW: cbfLowRel = 0.898 above [0.6, 0.8] (lower = stronger/faster) [research/12 NN-27 / tables §7 check 18: CBF ≈ 70 % (±15 %) of the anaesthetised baseline from pressure alone]<br>HAND PL (automatic TW): CBF 0.898 includes a PaCO2 rise 39.1 → 45.3 (low-flow dead space at fixed ventilation; CO2 factor 1 + 0.03·6.2 = 1.186); pressure alone gives 0.898/1.186 = 0.76, inside 0.6–0.8 — and equal to the autoregulation curve (CPP 60.8 on the HTN lower limit 75: 0.78). The MODELED rig cannot hold PaCO2 constant through a bleed; the 7d MANUAL test measures 0.62. | **PL** | — · 7d brain |
| NN-27b | P1 | X-E 75 y + HTN, TIVA · GA at MAP ≈ 65 → hyperventilation PaCO2 40 → 25: CBF and PbtO2 | tPaco2_25Min 3.5; cbfHypoRel 0.33799999999999997; pbto2 10.8; pbto2Base 25.6; mapAt 53.9 | TS: cbfHypoRel = 0.33799999999999997 below [0.35, 0.4] (lower = stronger/faster) [research/12 NN-27 / tables §7 check 18: ≈ 35–40 % after hypocapnia]<br>PL: pbto2 = 10.8 in [10, 15] [tables §7 check 18: PbtO2 25 → 10–15 (below the 20 threshold)]<br>HAND TS (automatic TS): CBF 0.338 against 0.35–0.40 (marginal) at PaCO2 25 with MAP falling to 54 during the hyperventilation; PbtO2 10.8 in band. | **TS** | — · 7d brain |

### 2.6 NMB P2/P3: residual block, interactions, neuromuscular disease

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| NN-07 | P2 | X-A TIVA vent · roc 0.6 fully recovered (TOFR ≥ 0.9) → neostigmine 50 µg/kg + glycopyrrolate at full recovery | tofRAtDose 0.9; dTofrMin 0.07; dT1Min 0.03 | WR: dTofrMin = 0.07 (expected sign -1) [research/12 NN-07: neostigmine given after full recovery can cause a small fade/weakness (Miller NMB; Caldwell 1995; Herbstreit 2010 genioglossus) — direction only]<br>HAND MI (automatic WR): No paradoxical weakness: neostigmine only raises the non-depolariser EC50 (neuro/neostigmine.ts:16), so at full recovery TOFR rises +0.07. The excess-acetylcholine (desensitisation/depolarising) block has no term. N4 (P2). | **MI** | N4 · 7f neostigmine.ts |
| NN-08a | P2 | X-A · extubated awake at TOFR ≈ 0.6 (roc 0.6, no reversal) → extubation with residual block: upper-airway obstruction | tofRAtExt 0.61; consciousAtExt null; obstr 0.465; obstrCtl 0; dSpo2 -1.7 | PL: obstr = 0.465 in [0.05, 1] [research/12 NN-08: residual block (TOFR < 0.9) impairs pharyngeal function and upper-airway patency (Eriksson 1997 Anesthesiology 87:1035; Eikermann 2003) — obstruction present]<br>HAND PL (automatic PL): Obstruction 0.47 at TOFR 0.61 awake: present (PL). FU-6 Task 5 Step 5 adds the arousal factor that lowers the awake share (Eikermann 2003) — re-measure there. | **PL** (FU-6 T5 Step 5 pending) | owned · 7f drive.ts (obstruction) → FU-6 airway |
| NN-08b | P2 | X-A · extubated awake at TOFR ≈ 0.6 → hypoxic challenge (shunt; FiO2 < 0.21 is not expressible): hypoxic ventilatory response vs no block | dVeBlock 2.5; dVeNoBlock 2.4; hvrRatio 1.05; spo2Block 90.8; spo2NoBlock 91; pao2Block 61; pao2NoBlock 60.4; paco2Block 42.6; paco2NoBlock 40.9 | TW: hvrRatio = 1.05 above [0.6, 0.8] (lower = stronger/faster) [research/12 NN-08: partial block (TOFR 0.7) blunts the hypoxic ventilatory response by ≈ 30 % (Eriksson 1993 Anesthesiology 78:693; carotid-body nicotinic receptors) — ratio 0.7 ± 15 %]<br>HAND MI (automatic TW): The hypoxic ventilatory response is identical with and without residual block (ΔVE 2.5 vs 2.4 L/min, ratio 1.05): the carotid-body term has no NMB input (lung/drive.ts:27–35). FU-6 Task 10 adds HVR_NMB_EMAX / HVR_NMB_TOFR_LO. Also: a hypoxic GAS (FiO2 < 0.21) is not expressible — the challenge used a shunt (N15). | **MI** (FU-6 T10 pending) | N15, owned · 7b drive.ts (carotid body) / FU-6 |
| NN-10 | P2 | X-A TIVA vent · MgSO4 4 g IV over 10 min → rocuronium 0.6 mg/kg after magnesium: onset and duration vs no magnesium | mgPlasma 1.92; dOnsetS 0; dDurMin 0.2 | WR: dOnsetS = 0 (expected sign -1) [research/12 NN-10: magnesium shortens onset (tables §5d; 7f interactions; Fuchs-Buder 1995 BJA 74:405 [vecuronium])]<br>TW: dDurMin = 0.2 (sign 1, beyond 1) [research/12 NN-10: magnesium prolongs duration (tables §5d; Kussman 1997 BJA 79:122 [rocuronium])]<br>HAND WR (automatic WR): MgSO4 4 g raises plasma Mg to 1.92 mmol/L but changes neither onset (0 s) nor duration (+0.2 min): 7f reads only the profile field (neuro/pipeline.ts:186). FU-7 Task 14 Step 1 (DI-90) owns it. | **WR** (FU-7 T14 pending) | owned · 7f interactions.ts ← 7c plasma Mg |
| NN-11a | P2 | X-A TIVA vent · neuro.nm myasthenia · myasthenia gravis → rocuronium dose ladder 0.05/0.1/0.15/0.2/0.3/0.45 mg/kg: ED95 vs normal | ed95 0.0831; ed95Normal 0.2289; ratio 0.363 | PL: ratio = 0.363 in [0.1, 0.5] [research/12 NN-11: rocuronium ED95 ×0.1–0.5 in myasthenia (Miller NMB; tables §1.5/§5d)] | **PL** | — · 7f interactions.ts |
| NN-11b | P2 | X-A TIVA vent · neuro.nm myasthenia · myasthenia gravis → succinylcholine dose ladder 0.1/0.2/0.3/0.5/0.8/1.2/2/3 mg/kg: ED95 vs normal | ed95 1.8971; ed95Normal 0.7455; ratio 2.545 | PL: ratio = 2.545 in [2.2, 3] [research/12 NN-11: succinylcholine ED95 ×2.6 in myasthenia (Eisenkraft 1988 Anesthesiology 69:760; Miller NMB; ±15 %)] | **PL** | — · 7f interactions.ts |
| NN-12 | P3 | X-A TIVA vent · neuro.nm lambertEaton · Lambert–Eaton → rocuronium and succinylcholine dose ladders: ED95 vs normal | rocRatio 0.363; suxRatio 0.505; rocRatioM1 -0.637; suxRatioM1 -0.495 | PL: rocRatioM1 = -0.637 (sign -1, beyond 0.1) [research/12 NN-12: Lambert–Eaton is sensitive to non-depolarisers (Miller NMB) — direction only]<br>PL: suxRatioM1 = -0.495 (sign -1, beyond 0.1) [research/12 NN-12: Lambert–Eaton is sensitive to succinylcholine (Miller NMB) — direction only] | **PL** | — · 7f interactions.ts |
| NN-13a | P2 | X-A TIVA vent · burns > 48 h (`neuro.nm burn` + `blood.burns 1`) · major burn → rocuronium 0.6 mg/kg: resistance (peak block, duration) vs normal | peakBlock 0.97; peakBlockNormal 1; durRatio 0.49; shortening 0.51; tTof0S null; tTof0NormalS 74 | PL: shortening = 0.51 (sign 1, beyond 0.1) [research/12 NN-13: burns > 48 h → resistance to non-depolarisers: higher dose needed, shorter duration (Martyn 1992 Anesthesiology 76:822; tables §5d EC50 ×2.5 [TXT]) — direction only (1 − duration ratio > 0)] | **PL** | — · 7f interactions.ts |
| NN-13b | P2 | X-A TIVA vent · burns > 48 h · major burn → succinylcholine 1 mg/kg: K⁺ rise vs control | dKPeak 6.5; kPeak 10.688; rhythms 5s sinus,525s vfCoarse,1115s asystole | PL: dKPeak = 6.5 in [5, 7] [research/12 NN-13 / tables §5c "Succinylcholine K rise: burns, denervation > 72 h +5–7" (B §4.9) — the upper end of the literature (Gronert 1975: up to +5–10)] | **PL** | — · 7c treatments.ts |
| NN-14 | P3 | X-A TIVA vent · roc 0.9 mg/kg, deep block at 42 min → sugammadex 0.5 mg/kg (under-dose): recurarisation | tofrPeak 1; peakMin 8.4; tofrLowAfter 0.58; fall 0.42; recurMark null | PL: fall = 0.42 in [0.1, 1] [research/12 NN-14: after an under-dose TOFR falls again within 10–30 min (Naguib; Eleveld 2005 A&A 101:758: TOFR 0.7 → 0.3)]<br>HAND PL (automatic PL): TOFR 1.0 → 0.58 after the under-dose (PL), but NO recurarisation mark: the one-shot flag was already spent at the ROCURONIUM ONSET, 19 s after the first dose (neuro/pipeline.ts:224–226: `recovered` is true at baseline TOF 4/1.0, so the onset fade fires the mark). Seen in every first NMB dose of this run (NN-03a 328 s, NN-22a 617 s). N13 (DEV/event). | **PL** | N13 · 7g sugammadex binding / 7f |

### 2.7 Sedation, awareness and benzodiazepine reversal (P2)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| NN-19a | P2 | X-A awake, spontaneous, air · awake → dexmedetomidine 1 µg/kg over 10 min: biphasic MAP (↑ then ↓) | dMapEarlyPct -1.2; dMapLatePct -5.3 | WR: dMapEarlyPct = -1.2 (expected sign 1) [research/12 NN-19: early MAP rise (peripheral α2B vasoconstriction) (Miller; Ebert 2000 Anesthesiology 93:382) — direction]<br>PL: dMapLatePct = -5.3 (sign -1, beyond 3) [research/12 NN-19: later MAP fall (central sympatholysis) (Miller; Ebert 2000) — direction]<br>HAND WR (automatic WR): No early pressor (−1.2 %): the row has no α2B arm (rows-anaesthetic.ts:104–106 "not modelled in v1"); FU-7 Task 17 Step 3 adds it (DI-60). | **WR** (FU-7 T17 Step 3 pending) | owned · 7g circulation PD (α2) |
| NN-19b | P2 | X-A awake, spontaneous, air · awake → dexmedetomidine: bradycardia | dHrMinPct -4.3 | TW: dHrMinPct = -4.3 (sign -1, beyond 5) [research/12 NN-19: bradycardia (Miller; Ebert 2000: HR −10–20 %) — direction, beyond 5 %]<br>HAND TW (automatic TW): HR −4.3 % against −10–20 %: the row's HR/SVR emax −0.3 at EC50 1 reaches ≈ −15 % open-loop but the baroreflex restores most of it; the central sympatholysis is FU-4's `symp` field (FU-7 "Requests → FU-4" item 1). | **TW** (FU-7 → FU-4 request 1 pending) | owned · 7g circulation PD (α2) |
| NN-19c | P2 | X-A awake, spontaneous, air · awake → dexmedetomidine: rousable sedation (DI falls, consciousness kept) and drive preserved | dexCe 1; dDiMin 0; consciousAll true; apnoea false; veMinPct -5.4 | WR: dDiMin = 0 (expected sign -1) [research/12 NN-19: sedation — the processed-EEG index falls (Miller; Ebert 2000: BIS ≈ 70 at Cp 0.7–1.2 ng/mL) — direction, beyond 10 points]<br>PL: apnoea = false (expected false) [research/12 NN-19: drive preserved (Miller; Belleville 1992)]<br>HAND WR (automatic WR): No sedation at all: DI unchanged (Δ 0), consciousness kept. 7g publishes bus.cns.dexmedCe (pk/combine.ts:94) but 7f reads it nowhere (neuro/bus.ts readBus; neuro/depth.ts DepthInputs), and FU-7 Task 3's hypPropEq lists no dexmedetomidine hypC50. N3. | **WR** | N3 · 7f depth.ts ← 7g bus.cns.dexmedCe |
| NN-20a | P2 | X-E 80 y awake, spontaneous, air · procedural sedation → midazolam 0.05 mg/kg + fentanyl 1 µg/kg: desaturation on air | spo2Min 94; spo2Ctl 96; hypox false; apnoea false | WR: hypox = false (expected true) [research/12 NN-20: the combination causes hypoxaemia (SpO2 < 90 %) on air (Bailey 1990 Anesthesiology 73:826: 92 % hypoxaemic, 50 % apnoeic with midazolam 0.05 + fentanyl 2 µg/kg)]<br>HAND WR (automatic WR): Midazolam 0.05 mg/kg + fentanyl 1 µg/kg in an 80 y on air: SpO2 nadir 94 %, no apnoea, no obstruction. N2. | **WR** | N2 · 7f drive.ts (synergy) / FU-6 |
| NN-20b | P2 | X-E 80 y awake, spontaneous, air · procedural sedation → midazolam + fentanyl: synergistic drive depression and airway obstruction | veDropCombo 35.4; veDropMid 20.8; veDropFent 30.4; synergy -15.8; obstrMax 0 | WR: synergy = -15.8 (expected sign 1) [research/12 NN-20: synergistic (more than additive) drive depression (Bailey 1990) — direction]<br>WR: obstrMax = 0 below [0.05, 1] [research/12 NN-20: upper-airway obstruction under sedation (Bailey 1990; tables §4.6 uaCollapse)]<br>HAND WR (automatic WR): Obstruction 0 (confirmed WR): the sedation share needs DI < 60 or an opioid drive depression > 0.3 (neuro/drive.ts:68), neither reached. The "synergy" item is not a valid test in a closed loop (the CO2 rise re-drives breathing, so VE falls do not add); the drive formula itself is supra-multiplicative (neuro/drive.ts:57–61). N2. | **WR** | N2 · 7f drive.ts |
| NN-22a | P2 | X-A intubated, ventilated, paralysed (roc 0.6) · sevoflurane 0.3 MAC (light) → incision (stimulus 1): awareness flags, DI, no movement | mac 0.29; diMax 83; awareRisk true; conscious true; moved false; awarenessMark 617s recurarisation, 647s awareness, 663s apnoea, 1592s breathing | PL: awareRisk = true (expected true) [research/12 NN-22: paralysed + light anaesthesia + stimulus = awareness risk (NAP5 2014)]<br>PL: diMax = 83 in [60, 100] [research/12 NN-22: DoA > 60 (NAP5)]<br>PL: moved = false (expected false) [research/12 NN-22: no movement — paralysed (NAP5)] | **PL** | — · 7f depth.ts |
| NN-22b | P2 | X-A intubated, ventilated, paralysed · sevoflurane 0.3 MAC → incision: HR and MAP rise vs no stimulus | dMap 12.67; dHr 10 | PL: dMap = 12.67 (sign 1, beyond 5) [research/12 NN-22: MAP ↑ with the stimulus under light anaesthesia (NAP5: tachycardia/hypertension are the signs of awareness) — direction, beyond 5 mmHg]<br>PL: dHr = 10 (sign 1, beyond 5) [research/12 NN-22: HR ↑ (NAP5) — direction, beyond 5 /min] | **PL** | — · 7e stress / 7a |
| NN-24 | P2 | X-A awake, spontaneous, FiO2 0.5 · midazolam 0.1 mg/kg (unconscious) → flumazenil 0.5 mg: time to consciousness; resedation | unconsciousAtFlu true; wakeMin 0.1; ctlWakeMin 8.6; resedationMin null; dDi 24 | TS: wakeMin = 0.1 below [1, 2] (lower = stronger/faster) [research/12 NN-24: flumazenil reverses benzodiazepine sedation in 1–2 min (Miller)]<br>HAND TS (automatic TS): Flumazenil wakes the patient in 6 s (band 1–2 min): zero-slope onset (FU-7 Task 2). No resedation in 80 min after midazolam 0.1 mg/kg. | **TS** (FU-7 T2 pending) | owned · 7g flumazenil row / 7f depth.ts |

### 2.8 Brain P2/P3: gases, arrest, LAST, seizures, rigidity

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| NN-28a | P2 | X-A TIVA, VCV × 500 · GA → PaCO2 ≈ 20 → 80 by respiratory rate (RR 30 / 20 / 12 / 8 / 5) | paco2 15.7/23.2/36.7/49.8/65.8; cbf 0.272/0.327/0.565/0.795/1.078; icp 4.2/4.7/6.5/8.3/10.5; slopePctPerMmHg 3.1100000000000003 | PL: slopePctPerMmHg = 3.1100000000000003 in [2, 4] [research/12 NN-28: CBF 2–4 %/mmHg PaCO2 in the 20–80 range (Miller, neurophysiology); tables §5.1 kCO2 0.02–0.04] | **PL** | — · 7d flow.ts |
| NN-28b | P2 | X-A TIVA, VCV 12 × 500 · GA → hypoxaemia (FiO2 0.1): CBF rises below PaO2 50 | pao2Ctl 96.9; pao2Ards07 56.4; pao2Ards10 50.6; paco2Hyp 39.4; paco2Ctl 36.8; dCbfPct 41.5; dIcp 1.9; sjvo2 64 | PL: dCbfPct = 41.5 (sign 1, beyond 10) [research/12 NN-28: CBF rises steeply below PaO2 50 (Miller neurophysiology; tables §5.1 O(): ×2 at PaO2 30) — direction, beyond 10 %] | **PL** | N15 · 7d flow.ts |
| NN-29a | P2 | X-A TIVA, ventilated · VF untreated 5 min → brain in no-flow: CBF, PbtO2, SjvO2 | cbfMin 0; pbto2Pre 47.7; pbto2End 0; dPbto2 -47.7; sjvo2Pre 70.2; sjvo2Min 25; cbf0 true | PL: cbf0 = true (expected true) [research/12 NN-29: CBF 0 in untreated VF (FU-4 G4)]<br>PL: dPbto2 = -47.7 (sign -1, beyond 10) [research/12 NN-29: PbtO2 falling in arrest — direction, beyond 10 mmHg]<br>PL: sjvo2Min = 25 in [0, 30] [research/12 NN-29: SjvO2 → 0 in no-flow (stagnant venous blood desaturates) — ≤ 30 % direction-only bound] | **PL** | — · 7d brain (flow.ts brainOxygen) |
| NN-29b | P2 | X-A TIVA, ventilated · VF 5 min → ROSC (instructor sinus) → post-ROSC cerebral hyperaemia | roscUntreated false; cbfCprMean 0.639; rosc true; mapPost 147.1; cbfPeakRel 2.089; hyperaemia 1.089 | PL: hyperaemia = 1.089 (sign 1, beyond 0.1) [research/12 NN-29: reactive hyperaemia after ROSC (then delayed hypoperfusion) (Miller neurophysiology; Sterz 1990) — direction, beyond +10 %] | **PL** | — · 7d brain (post-ischaemic flow) |
| NN-30a | P2 | X-A awake, spontaneous, air · accidental IV bupivacaine 2 mg/kg (LAST) → CNS toxicity: seizure first, and its physiology | seizureS 30; cvS 46; seizureFirst true; cPeak 7.959999999999999; dCmro2Seizure 0; dLactate 0.22000000000000003 | PL: seizureFirst = true (expected true) [research/12 NN-30: CNS toxicity (seizure) precedes cardiovascular collapse (ASRA 2020 LAST advisory; AAGBI 2010)]<br>WR: dCmro2Seizure = 0 (expected sign 1) [research/12 NN-31 context: a seizure raises CMRO2 (Miller neurophysiology: +200–300 % in status) — direction]<br>HAND MI (automatic WR): The seizure flag rises at 30 s, before the CV effect (46 s): order right. But the seizure has no physiology — CMRO2 unchanged, lactate +0.2, no apnoea/hypoxaemia: bus.cns.seizure is read by no system (pk/pipeline.ts:413,442). N12. | **MI** | N12 · 7g LAST_THRESHOLDS; seizure physiology: FU-7 (research/12 blocker "no seizure state") |
| NN-30b | P2 | X-A awake, spontaneous, air · IV bupivacaine 2 mg/kg → cardiovascular toxicity: collapse / ventricular arrhythmia | mapMin 77.784; dMapMinPct -18.4; cvEMax 0.748; qrsNote no QRS readout in this runner; arrest false; collapse false; rhythms 2s sinus,360s sinusBrady | WR: collapse = false (expected true) [research/12 NN-30: CV collapse / VF after a large IV bupivacaine dose (ASRA 2020; AAGBI 2010; tables LAST_THRESHOLDS cv 4 µg/mL)]<br>HAND WR (automatic WR): Bupivacaine 2 mg/kg peaks at 8.0 µg/mL but the CV effect reaches 0.75: MAP −18 %, a 40/min sinus bradycardia, no VF — VF needs cvE ≥ 0.9 (pk/hooks.ts:93); there is no Na-channel conduction slowing (QRS widening) and the Ees −70 % arm is at EC50 4 on a Hill of 2. N12. | **WR** | N12 · 7g LAST / 7a |
| NN-30c | P2 | X-A awake, spontaneous, air · IV bupivacaine 2 mg/kg → lipid emulsion 20 % 1.5 mL/kg at +1 min vs no lipid | dMapMin -0.21; dMapMax 6.49; dMapAt5 1.7; dCvE -0.2; dPlasma 0 | PL: dCvE = -0.2 (sign -1, beyond 0.05) [research/12 NN-30: lipid rescue lowers the cardiotoxic effect (lipid sink; ASRA 2020; AAGBI 2010) — direction] | **PL** | — · 7g lipid row |
| NN-31 | P3 | X-A · status epilepticus → condition probe (seizure state) | rejected 2 | no seizure state: the only seizure is 7g's LAST bus flag (`bus.cns.seizure`), read by nothing (research/11 §2.8; research/12 §5.3 blockers). Expected: CMRO2 ↑ 200–300 %, SpO2 ↓, lactate ↑, ICP ↑ (Miller neurophysiology). Owner: FU-7 (missing mechanisms) | **NE** | N12, N16 · FU-7 (seizure state) |
| NN-32 | P2 | X-A awake → bag-mask · awake → remifentanil 2 µg/kg rapid bolus: chest-wall rigidity probe | dCrs 0; apnoea true | no opioid chest-wall rigidity mechanism (research/12 §5.3 blockers); the probe measures Crs unchanged. Expected: Crs ↓, VT ↓ on bag-mask, ventilation difficult until NMB (Miller, opioids). Owner: FU-7 | **NE** | N16 · FU-7 (opioid rigidity) |

### 2.9 MANUAL twins (direction-only; Q9 open)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| NN-M1 | P1 | X-A intubated, ventilated, MANUAL · awake → propofol TCI 2 → 4 → 6 → 8 µg/mL: MAP falls with Ce (twin of NN-15b) | dMapCe2 -17.6; dMapCe8 -32.8; diCe4 37 | PL: dMapCe8 = -32.8 (sign -1, beyond 3) [research/12 NN-15 in MANUAL: the drug still lowers MAP (Q9 open: direction only)] | **PL** | — · 7g PD in MANUAL (Q9) |
| NN-M2 | P1 | TBI intubated, VCV 13 × 500, MANUAL · expanding haematoma 1 mL/min → Cushing: MAP ↑, HR ↓ (twin of NN-25b) | t20Min 9.2; cushOnMin 30.2; dMap 32.4; hrDropPct -39.9 | PL: dMap = 32.4 (sign 1, beyond 10) [tables §7 check 19 in MANUAL (the 7d MANUAL test measured +41.7) — direction]<br>PL: hrDropPct = -39.9 (sign -1, beyond 10) [tables §7 check 19 in MANUAL — direction] | **PL** | — · 7d cushing.ts in MANUAL |
| NN-M3 | P2 | X-A TIVA, ventilated, MANUAL · VF untreated 5 min → brain in no-flow (twin of NN-29a) | cbfMin 0; cbf0 true; dPbto2 -49.1; cbfAfter 0.895 | PL: cbf0 = true (expected true) [research/12 NN-29 in MANUAL: no flow in VF (arrest cell; FU-4 G4)] | **PL** | — · 7d brain in MANUAL |

## 3. New gaps no stage owns, ranked, with the smallest mechanism and the file that would fix each

Gap ids **N1–N16** (research/12 §2.1 "gap"). Engine paths are under `packages/engine-core/src/` on 0a50ce4.
Following R45, each fix is a mechanism, never a widened band.

### N1 — Propofol immobility is its BIS potency: TIVA at Ce 3 never moves (new, P1; owner 7f)
- **Cells:**
  - NN-17a: its control arm, propofol Ce 3 alone, shows **no movement** to incision (WR).
  - Also drives NN-16/22 behaviour under propofol, and 7e's stress blunting.
- **Code.** `l2/neuro/depth.ts:83` computes `hypEq = macEff + Ce_prop / ce50Propofol(age) / (1 − red)`. It divides by
  the **BIS** Ce50 (2.98 µg/mL at 40 y). `depth.ts:87` makes `movement` true only below `hypEq` 1, so Ce 3 alone
  counts as 1.0 MAC of immobility. The same `hypEq` sets `antinoc` (the 7e stress blunting, `depth.ts:84–86`) and
  `thermoDepth` (`neuro/outputs.ts:30`).
- **Expected.** Propofol alone needs Cp50 ≈ 15 µg/mL to prevent movement at skin incision (Smith 1994 Anesthesiology
  81:820). Opioids lower that steeply, which is why TIVA always carries remifentanil.
- **Smallest mechanism.** Give propofol a separate **immobility C50** (≈ 15 µg/mL, with the opioid shift) for
  `movement` and the MAC-BAR/antinociception term, and keep the BIS Ce50 for the index only. One constant, no band
  moved.
- **Owner.** FU-7 Task 5 already edits `depth.ts` under E-FU7-1 (§4).

### N2 — Elderly procedural sedation is benign: no obstruction, no desaturation (new, P2; owner 7f)
- **Cells:** NN-20a, NN-20b (WR). 80 y on air, midazolam 0.05 mg/kg + fentanyl 1 µg/kg:
  - SpO2 nadir 94 % (control 96);
  - no apnoea;
  - obstruction 0;
  - VE −35 % (midazolam alone −21 %, fentanyl alone −30 %).
- **Code.**
  - `l2/neuro/drive.ts:68`: the sedation share of upper-airway obstruction needs DI < 60 or an opioid drive depression
    > 0.3; midazolam 0.05 mg/kg does not reach either.
  - The drive's age sensitivity: there is no age term on the benzodiazepine or opioid ventilatory C50.
- **Expected.** Bailey 1990 (Anesthesiology 73:826): the combination is hypoxaemic in 92 % and apnoeic in 50 % of
  healthy young volunteers (fentanyl 2 µg/kg); the elderly are more sensitive.
- **Smallest mechanism.**
  - An obstruction term from the hypnotic (benzodiazepine) level itself, not only from DI < 60. Midazolam relaxes the
    genioglossus before the index falls.
  - An age factor on the midazolam ventilatory C50, as 7g already applies to its hypnotic C50 (FU-7 Task 3 F5/D19a
    `hypC50AgeK`).
- **Owner.** FU-7 Task 6 (the per-class response surface) and FU-6 Tasks 4–5 (wakefulness drive, obstruction as a
  load). NN-20a is the acceptance cell.

### N3 — Dexmedetomidine sedates nobody (new, P2; owner 7f ← 7g)
- **Cells:**
  - NN-19c (WR): Ce 1.0 ng/mL, DI change 0, consciousness kept, VE −5 %.
  - NN-19a/b are owned elsewhere (FU-7 T17; FU-4 `symp`).
- **Code.** `l2/pk/combine.ts:94` publishes `bus.cns.dexmedCe`. `l2/neuro/bus.ts` (`readBus`) and
  `l2/neuro/depth.ts` (`DepthInputs.ce`) never read it. FU-7 Task 3's `hypPropEq` sums the rows that carry a
  `hypC50`, and the dexmedetomidine row (`pk/data/rows-anaesthetic.ts:102–106`) has none.
- **Expected:** rousable sedation, BIS ≈ 70 at plasma 0.7–1.2 ng/mL, drive preserved (Ebert 2000 Anesthesiology
  93:382).
- **Smallest mechanism.** A `hypC50` on the dexmedetomidine row, entering FU-7's ONE hypnotic equivalent with a
  ceiling, so it never reaches LOC alone. Its `ventShare` stays ≈ 0 (drive preserved).
- **Owner:** FU-7 Task 3 (row) and Task 5 (depth reads it).

### N4 — Neostigmine: far too slow from TOF 4; no weakness at full recovery (new, P1; owner 7f)
- **Cells:**
  - NN-06a (TW): from TOF-4 reappearance (TOFR 0.03, T1 0.25), TOFR 0.9 at **30.3 min** (band 5–15).
  - NN-07 (MI): at full recovery TOFR rises +0.07.
  - NN-06b (the ceiling from TOF 1) is right.
- **Code.**
  - `l2/neuro/neostigmine.ts:12–16`: the EC50 multiplier is capped at 1 + NEO_SMAX (0.7).
  - `l2/neuro/nmb.ts` TOFR = T1^2.5 (`TOFR_EXP`): TOFR 0.9 needs T1 0.96, so a ×1.7 EC50 shift from T1 0.25 cannot
    get there before spontaneous recovery helps.
  - There is no excess-acetylcholine term.
- **Expected.** From TOF 4, TOFR 0.9 in ≈ 10 min, range 5–17 (Kirkegaard 2002 Anesthesiology 96:45; Fuchs-Buder;
  Kopman). After full recovery a small fade or genioglossus weakness is possible (Caldwell 1995; Herbstreit 2010).
- **Smallest mechanism.**
  - Re-fit NEO_SMAX/NEO_G50 against the TOF-4 cell as well as the TOF-2 cell it was fitted on. The TOF-1 ceiling cell
    NN-06b is the guard.
  - Add a small depolarising/desensitisation block when the acetylcholine gain acts with no non-depolariser present.
- **Owner:** 7f. No plan owns it; FU-7 Task 14 (7f under E-FU7-1) is the nearest host (§4).

### N5 — NMB and reversal kinetics away from the roc 0.6 anchor (new, P1; owner 7g PK / 7f)
- **Cells:**
  - NN-02 (TS): roc 1.2 T1 25 % at 94.6 min vs label 67.
  - NN-04a (TW): heterozygous succinylcholine 18.1 min = 1.5 × normal vs tables ×2 / Miller 20–30.
  - NN-05c (TW): sugammadex 16 mg/kg T1 10 % at 1.9 min vs 1.2; TOFR 0.9 at 2.2 vs ≈ 1.5.
  - NN-05b (TS, minor): 4 mg/kg at 2.0 min vs IQR 2.1–4.3.
- **Code.**
  - Rocuronium: the 7g PK/ke0 with the γ 4.8 Hill (`neuro/nmb.ts` NMB_PD). Doubling the dose adds 59 min instead of
    ≈ 36 (the label's 31 → 67).
  - `neuro/bus.ts` `pcheOf` → 7g `PCHE_CL_MULT` het 0.5.
  - Sugammadex binds free plasma rocuronium instantly, so the thumb effect site empties at ke0 0.16/min (t½ 4.4 min).
- **Smallest mechanism.**
  - Re-fit the rocuronium PK to the label's **two** dose–duration points (0.6 and 1.2) together, not 0.6 alone.
  - Set the heterozygous clearance multiplier from the duration target (×2), not a clearance guess.
  - For sugammadex, the effect-site concentration after binding should follow the free plasma gradient. The published
    reversal times need a faster effective washout at high sugammadex excess (a binding-driven ke0).
- **Owner:** 7g/7f. No plan owns it; FU-7 is the drug-layer stage (§4).

### N6 — Opioid ventilatory depression and naloxone kinetics (new in part, P1; owner 7f/7g)
- **Cells:**
  - NN-23a (TS; the onset is FU-7 T2's). Fentanyl 5 µg/kg: the 7f apnoea flag is set but VE is 2.3 L/min (38 %).
    Naloxone restores VE ≥ 50 % in 12 s.
  - NN-23b (WR). **No renarcotisation**: VE ≥ 5.0 L/min through 100 min, with the naloxone multiplier still 2.44 at
    30 min.
- **Code.**
  - `l2/neuro/bus.ts:34` `FENT_VENT_POT` 0.55 (D-7f-3, Q54 open).
  - `pk/data/rows-other.ts:45`: naloxone is a gamma row with a 3600 s tail.
  - The apnoea flag and the chemoreflex disagree; that is FU-7 Task 7's one-truth item.
- **Expected.** Fentanyl 3–5 µg/kg makes an awake adult apnoeic. Naloxone acts in 1–2 min and lasts 30–45 min, so a
  large opioid dose can outlast it (Miller, opioids).
- **Smallest mechanism.** None new: Q54 (fentanyl's ventilatory potency) and FU-7 Tasks 2, 4, 6 and 7 decide it. Add
  NN-23a/b as their acceptance cells (§4). If renarcotisation after a single fentanyl bolus is taught, naloxone's
  offset must fall below fentanyl's ventilatory tail (Q7).

### N7 — The propofol depth index and burst suppression run deep (new, P1; owner 7f; Ali first)
- **Cells:** NN-15b (TS: DI 63 / **37** / 24.7 / 18 at Ce 2/4/6/8), NN-15c (TS: SR > 0 from Ce **5.03**).
- **Code.** `l2/neuro/depth.ts:67–75` implements the tables §5d form `DI = 93·(1 − U^γ/(U^γ + 1))`: Emax = E0 = 93,
  Ce50 2.98 µg/mL at 40 y. `depth.ts:76` derives SR from DI < 30 [ENG].
- **Expected:** DI 40–60 at Ce 3–5 and burst suppression from Ce 6–8 (Eleveld; BIS manual; research/12 NN-15).
- **Smallest mechanism** (after Ali's choice, Q4):
  - a residual floor, i.e. Emax < E0 as in the published BIS PD models (BIS does not reach 0 at clinical Ce); or
  - an SR driven by the hypnotic level itself (propofol Ce/CMRO2) rather than by the index.
  - The volatile arm is right (DI 43 at 0.97 MAC; SR > 0 at 1.5 MAC), so the fix must not move it.

### N8 — MAC-awake is applied to the brain; the gas monitor reads 0.18 MAC at eye opening (new, P1; owner 7f/7g)
- **Cell:** NN-21a (TW). Et 0.18 MAC at the emergence mark (brain 0.33) after 1 h at 1 MAC, FGF 6.
- **Code.**
  - `l2/neuro/depth.ts:20,65`: `MAC_AWAKE` 0.33 on the brain MAC fraction.
  - The Et → brain lag is 7g's volatile model (tables §5d: τ 2–4 min).
- **Expected.** Eyes open at end-tidal 0.3–0.4 MAC (Katoh 1993; research/12 NN-21).
- **Smallest mechanism.** None until Ali rules (Q8). If the taught number is the end-tidal one at emergence, the
  brain–Et lag is too long at FGF 6, and 7g's VRG time constant is the lever.

### N9 — Herniation never happens; ICP climbs to 140; no pupillary signs (new, P1; owner 7d/7f)
- **Cell:** NN-25c (WR). A 1 mL/min haematoma for 45 min: ICP 140.5, MAP 145.5, CPP ≤ 10 for ≤ 20 s at a time,
  pupils 4 mm, sinus throughout.
- **Code.**
  - `l2/brain/model.ts:144–145`: herniation only after CPP ≤ 10 for **60 s continuously**. The Cushing surge
    (`organs/effects.ts`) lifts MAP each time CPP dips, so the timer resets.
  - ICP is capped only at `mapHead + 5` (`model.ts:116`).
  - `neuro/outputs.ts:27`: `pupilMm` is opioid miosis only.
- **Expected.** An expanding mass → Cushing's triad → transtentorial herniation: a unilateral fixed dilated pupil,
  apnoea/ataxic breathing, then brainstem failure (BTF; Miller neuro; tables §5.1 Cushing row "ataxic breathing").
- **Smallest mechanism.**
  - Trigger herniation on the cumulative time at CPP ≤ 10 (a leaky integrator, not a reset timer), OR on ICP within
    5 mmHg of MAP_head for 60 s. That second trigger is the tables' own Cushing criterion.
  - Once herniated: a pupil state (unilateral dilated, then bilateral), apnoea through the respiratory driver, and a
    terminal bradycardia/asystole.
- **Owner:** new. FU-8 Part A is the engine-defect stage (§5).

### N10 — Volatile CBF is over-coupled: sevoflurane > 1 MAC lowers ICP (new, P1; owner 7d ↔ 7f/7g seam)
- **Cells:**
  - NN-26f (WR): 2 vs 1 MAC in TBI, ICP −3.8 mmHg, CBF −0.16, MAP 84 → 71.
  - Healthy probe: CBF 0.69 / 0.48 / 0.36 of awake at 0.5 / 0.9 / 1.8 MAC.
- **Code.**
  - `l2/organs/inputs.ts:98–99`: CMRO2 comes from 7f (`neuro/outputs.ts:26`: 1 − 0.4·anaes, **0.45** once DI < 30).
  - The direct vasodilation comes from 7g (`pk/combine.ts:97–98`), which divides the Matta net-CBF curve by **7g's**
    metabolic share (1 − 0.25·MAC, floor 0.5).
  - The two metabolic terms disagree, so the "direct" dilation never offsets the coupled fall. TBI's pressure-passive
    CBF adds the MAP fall.
- **Expected.** Sevoflurane decreases CMRO2 while CBF is roughly preserved (flow–metabolism uncoupling). Above 1–1.5
  MAC it raises CBF and ICP (Matta 1999 Anesthesiology 91:677: MCA velocity +4 % at 0.5, +17 % at 1.5 MAC; Miller
  neuro).
- **Smallest mechanism.** One CMRO2 per state: 7d takes the anaesthetic CMRO2 from the same source that sized the
  direct vasodilation. Either 7g publishes a volatile CMRO2 that 7f's DI-based value does not override for volatiles,
  or the vasodilation is computed against 7f's CMRO2.
- **Owner:** new. FU-7 Task 3 rewrites `bus.cns` and already lists a 7d behaviour change (§4).

### N11 — Ketamine raises ICP under controlled ventilation (new, P1; owner 7g/7d)
- **Cell:** NN-26g (WR). ICP +4.6 mmHg and CBF +16 % after 1 mg/kg in the ventilated TBI patient at ICP 25.
- **Code.**
  - The ketamine direct vasodilation +40 % at full effect (`brain/flow.ts` vasoDirect; 7g `cbfVaso`).
  - Nothing lowers CMRO2, because 7f's DI stays high under ketamine and `cmro2Mult` ≈ 1.
- **Expected.** No ICP rise in ventilated, sedated TBI patients; ICP often falls (Himmelseher & Durieux 2005 A&A
  101:524; Zeiler 2014; BTF).
- **Smallest mechanism.** Size the ketamine CBF term against controlled normocapnia, with its CMRO2 from the hypnotic
  level, not the DI (the dissociative flag FU-7 Task 3 adds is the natural switch). The spontaneous-breathing rise
  then comes from the PaCO2.
- **Owner:** FU-7 Task 3 (§4).

### N12 — LAST: a seizure without physiology, and cardiotoxicity only at extreme levels (new, P2; owner 7g + missing seizure state)
- **Cells:**
  - NN-30a (MI). Seizure flag at 30 s, before the CV effect at 46 s (order right), but CMRO2 +0, lactate +0.2, no
    apnoea.
  - NN-30b (WR). Peak 8.0 µg/mL, CV effect 0.75: MAP −18 %, a 40/min sinus bradycardia, no VF.
  - NN-31 (NE): no seizure state.
- **Code.**
  - `l2/pk/pipeline.ts:413,442`: `bus.cns.seizure` is read by no system.
  - `l2/pk/hooks.ts:93`: VF only at cvE ≥ 0.9.
  - Bupivacaine's PD (`rows-other.ts:55–57`) is Ees −70 % / SVR −30 % at EC50 4, Hill 2, with no conduction (QRS)
    effect.
- **Expected** (ASRA 2020; AAGBI 2010): CNS signs, then seizures (CMRO2 ↑, hypoxaemia, lactate ↑). At levels above
  4 µg/mL: conduction delay (QRS widening), bradyarrhythmia, ventricular arrhythmia and collapse.
- **Smallest mechanism.**
  - A seizure state that 7d (CMRO2 × 2–3), 7b/Stage 3 (apnoea/ataxic breathing) and 7c (lactate) read.
  - A bupivacaine conduction term (QRS) with the VF hazard on it, instead of a single cvE threshold.
- **Owner:** FU-7 Task 13 (LAST) for the CV part; the seizure state is research/12's FU-7 "missing mechanisms" item
  (§4, §6).

### N13 — A spurious "recurarisation" mark at every first NMB dose hides the real one (new, P1 event/DEV; owner 7f)
- **Cells:**
  - NN-14: a real recurarisation (TOFR 1.0 → 0.58) raises **no** mark.
  - Seen at the onset of every first dose: NN-03a (328 s, 3 s after fasciculation), NN-22a (617 s), and the
    calibration probe (19 s after rocuronium).
- **Code.** `l2/neuro/pipeline.ts:224–226`: `recovered` becomes true at baseline (TOF 4, ratio 1.0, no drug given).
  The onset fade then satisfies "recovered and now TOF < 4 or ratio < 0.8", and the one-shot `recurarised` flag is
  spent.
- **Smallest mechanism.** Arm `recovered` only after a block has been present (count < 4 or ratio < 0.9 seen after a
  non-depolariser dose). Re-arm the one-shot after each new NMB dose.
- **Owner:** new, small. FU-8 Part A (engine defects) or FU-7 Task 14 (7f under E-FU7-1) (§4, §5).

### N14 — MODELED Cushing bradycardia fades (new, P2; owner 7d)
- **Cell:** NN-25b. HR −26 % in the surge window (PL), −19.4 % at 40 min.
- **Code:** `l2/organs/effects.ts:41` ("the bradycardia is the baroreflex's own answer … no hrF"). MANUAL applies
  `CUSH_HR_DROP` directly and holds −40 % (NN-M2).
- **Smallest mechanism.** The central vagal limb of Cushing's reflex as a MODELED `hrF` term, driven by the same
  Cushing drive, so it does not decay as the baroreflex resets.

### N15 — Hypoxic gas mixtures are not expressible (new, P2 input; owner Stage 3 validator)
- **Cells:** NN-08b, NN-28b (first rigs rejected: "fio2 must be a finite number in 0.21–1", ventilator and
  spontaneous).
- **Why it matters.** The hypoxic ventilatory response and the hypoxic CBF curve are taught with hypoxic gas. A shunt
  (used here) confounds them with dead space and PaCO2.
- **Smallest mechanism.** Allow FiO2 down to 0.10 behind an instructor flag. FU-6 Task 10's HVR acceptance needs it
  too (§5).

### N16 — Missing mechanisms (NE; research/12 §5.3 blockers)
- NN-31: status epilepticus / seizure state.
- NN-32: opioid chest-wall rigidity. Probe: remifentanil 2 µg/kg leaves Crs unchanged (Δ 0).

### Owned elsewhere (measured, not re-reported as new)
- **FU-7 T14:**
  - NN-09: sevoflurane prolongs rocuronium +60.8 % vs design +20–30 % (FU-7's band 25–80 would pass it; Q3).
  - NN-10: MgSO4 4 g raises plasma Mg to 1.92 mmol/L, with onset and duration unchanged.
- **FU-7 T17 Step 3:** NN-19a (no early dexmedetomidine pressor).
- **FU-7 → FU-4 request 1:** NN-19b (dexmedetomidine HR −4.3 %).
- **FU-7 T2:** NN-23a (naloxone 12 s), NN-24 (flumazenil 6 s).
- **FU-6:**
  - T5 Step 5: NN-08a (awake residual-block obstruction 0.47; T5 lowers the awake share, Eikermann 2003);
  - T10: NN-08b (HVR ratio 1.05 with and without residual block).

### Minor (marginal against one source, inside another; no mechanism proposed)
- **NN-01a:** TOF 0 at 74 s vs "1.5–2 min". Maximum block 120 s is inside the label's 1.8 min. Definition (Q1).
- **NN-03b:** succinylcholine T1 90 % at 12.0 min vs Miller 8–10. Inside the label 10.9 ± 15 % (Q2).
- **NN-26a:** hyperventilation −2.4 %/mmHg vs 2.5–3.0 implied by check 19.
- **NN-26c:** HTS −31.3 % vs −25–30.
- **NN-26d:** head-up −7.5 vs −5–7 (tables range −3 to −8).
- **NN-27b:** CBF 0.338 vs 0.35–0.40 with MAP 54 during the hyperventilation.

## 4. Findings for FU-7 (READY, not executed) → FU-7 before execution

1. **Task 2 (zero-slope onset).** NN-23a (naloxone 12 s) and NN-24 (flumazenil 6 s) are its acceptance cells.
   - Task 2's targets (naloxone ≈ 40 s, band 30–180 s) would still be TS against this design's 1–2 min (Miller).
   - Settle the band once (Q6) and assert both cells.
2. **Task 3 (the ONE hypnotic output) + Task 5 (depth reads it).**
   - (a) Add a dexmedetomidine `hypC50` with a ceiling and `ventShare` ≈ 0 (N3; NN-19c: DI 0 → expected ≈ 70,
     consciousness kept, no apnoea).
   - (b) In Task 5's `depth.ts` edit, separate propofol's **immobility** C50 from its BIS Ce50 in `hypEq` (N1;
     NN-17a's control must move at Ce 3).
     - This moves `antinoc` and `thermoDepth` too, so FU-7's 7e surge cases (Task 10) must be re-measured after it.
     - Guard: NN-16a (movement vs MAC) and NN-17a (remifentanil still suppresses).
   - (c) Task 3 rewrites `bus.cns` and already declares a 7d behaviour change (`uHyp`). Make the anaesthetic CMRO2 7d
     reads consistent with `cbfVaso` (N10; NN-26f).
   - (d) Size ketamine's CBF term against its dissociative flag (N11; NN-26g).
   - Guards for (c)/(d): NN-26e (propofol ICP ↓), NN-28a (CO2 slope 3.1 %/mmHg), NN-29a.
3. **Tasks 4, 6, 7 (opioid output, drive response surface, one apnoea truth).**
   - NN-23a's premise: fentanyl 5 µg/kg sets the 7f apnoea flag with VE 2.3 L/min (38 %) — Task 7's exact case.
   - NN-23b: no renarcotisation.
   - NN-20a/b: elderly midazolam + fentanyl gives SpO2 94 % and no obstruction. Task 6's per-class surface should make
     NN-20a hypoxaemic on air, and the age factor on the midazolam ventilatory C50 belongs there.
   - Use all four as Task 6/7 acceptance cells, after Ali's Q54/Q7 answer.
4. **Task 9 (ketamine through 7e's central drive).** NN-18b (MAP +8.2 %, HR +10.1 %) and NN-18c (no apnoea, VE
   −18 %) are PL today. Keep them as guards so the move to 7e does not lose them.
5. **Task 13 (LAST additive).**
   - Add NN-30b as a single-agent acceptance arm: bupivacaine 2 mg/kg IV peaks at 8.0 µg/mL but reaches cvE 0.75 —
     no VF, MAP −18 %.
   - The existing "225 mg → VF" test is the only VF path.
   - Consider a conduction (QRS) term (N12).
   - NN-30c (lipid lowers cvE 0.2) is the guard.
6. **Task 14 (Mg, Ca, burn/denervation).**
   - NN-10 is DI-90 in this run's terms (MgSO4 4 g → Mg 1.92, onset/duration unchanged): add it as Task 14's
     engine-level acceptance.
   - NN-09 (+60.8 % at 0.8 MAC) will be re-sized by Step 1's volatile divisor. The design band (+20–30 %) and FU-7's
     (25–80 %) disagree (Q3).
   - Guards: NN-13a/b (burn resistance ×0.49, sux K⁺ +6.5 → VF at 10.7), NN-11/12.
   - Task 14 edits 7f under E-FU7-1, so it is the natural host for N4 (neostigmine re-fit + excess-ACh block;
     NN-06a/07) and N13 (the recurarisation-mark arming, `neuro/pipeline.ts:224–226`) if FU-8 does not take N13.
7. **Task 17 Step 3 (dexmedetomidine α2B arm).**
   - NN-19a (early MAP −1.2 %) is its acceptance cell.
   - NN-19b (HR −4.3 % vs −10–20 %) waits on the `symp` row requested of FU-4 ("Requests → FU-4" item 1). FU-4 has
     merged without it, so the request needs a new owner.
8. **N5 (NMB and sugammadex kinetics) has no owner.** FU-7 is the drug-layer stage. Its 7g rows are the lever:
   - rocuronium PK re-fitted to the label's 0.6 **and** 1.2 mg/kg durations (NN-02);
   - `PCHE_CL_MULT` het from the ×2 duration target (NN-04a);
   - sugammadex's effect-site washout (NN-05c).

   Either add a Task 14-adjacent step or record it for a follow-up (Q-list).
9. **Task 19 (flipped matrix cells as engine tests).** List NN-10, NN-19a, NN-23a, NN-24 (and NN-09 once Q3 is ruled)
   among the cells FU-7 must flip, re-measured with `./run.sh cli.ts <ids>`.

## 5. Findings for FU-6, FU-8 and other stages

- **FU-6** (READY, after V.1):
  - **Task 5 Step 5 (arousal factor on residual-block obstruction)** owns NN-08a. Today the obstruction is 0.47 at
    TOFR 0.61 awake, and SpO2 is 1.7 lower than without block. The step's own R45 measurement is this cell. Keep
    "obstruction present" and expect the awake share to fall towards the plan's 0.15.
  - **Task 10 (HVR depressed; `HVR_NMB_EMAX`)** owns NN-08b. Today ΔVE is 2.5 vs 2.4 L/min with and without block
    (ratio 1.05; expected ≈ 0.7, Eriksson 1993).
    - A hypoxic GAS challenge is not expressible: FiO2 < 0.21 is rejected by the ventilator and by spontaneous
      breathing (N15). The run used a shunt.
    - Task 10's acceptance needs either the validator change or a documented shunt rig.
  - **Task 4 (wakefulness drive)** and **Task 5 (obstruction as a load)** bear on NN-20a/b (N2): the elderly sedation
    cell should obstruct and desaturate.
  - **Task 18 (RS suite):** add NN-08a/b and NN-20a as respiratory scenario rows.
- **FU-8** (Part A executing; Part B after FU-7):
  - **Part A, new small tasks** (independent of FU-6/FU-7, the same kind of engine defect as A10/A11/A14):
    - (a) N13: the recurarisation mark armed at baseline (`l2/neuro/pipeline.ts:224–226`; NN-14 acceptance: a mark
      after the under-dose, none at onset in NN-03a/22a).
    - (b) N9: herniation on cumulative low-CPP time or ICP ≈ MAP_head, plus pupil and apnoea states
      (`l2/brain/model.ts:144–145`, `neuro/outputs.ts:27`; NN-25c acceptance).
    - (c) N14: the MODELED Cushing vagal `hrF` (`l2/organs/effects.ts:41`; NN-25b at 40 min).
  - **A24 (CPR cerebral blood flow):** NN-29b gives a new data point — CBF 0.64 of the anaesthetised pre-arrest
    value under CPR quality 1 with adrenaline 1 mg (A24 records 0.45 against the 0.30–0.40 consensus).
  - **A21 (every pulseless rhythm carries the arrest state):** NN-29b's untreated arm is consistent. After 5 min of
    untreated VF, the instructor's sinus gives no pulse (MAP 12) and decays to agonal at +90 s and asystole at +240 s.
- **7d (brain), no plan:** N9 and N14 if FU-8 does not take them; N10/N11 if FU-7 Task 3 does not.
- **Stage 9 / glossary:**
  - The NMT tile's event list will show the spurious "recurarisation" (N13).
  - `pupilMm` is exposed but carries opioid miosis only.
  - The glossary needs labels for SR, brain MAC vs end-tidal MAC, PbtO2 and SjvO2 as used here.

## 6. Cells blocked by missing features

| blocker | cells | expected response kept for the owner |
|---|---|---|
| no seizure state (bus flag only; FU-7 "missing mechanisms") | NN-31 (NE); NN-30a (MI part) | status epilepticus: CMRO2 × 2–3, SpO2 ↓, lactate ↑, ICP ↑ (Miller neurophysiology); LAST seizure the same |
| no opioid chest-wall rigidity (FU-7) | NN-32 (NE) | remifentanil 2 µg/kg rapid bolus: Crs ↓, VT ↓ on bag-mask until NMB (Miller, opioids); probe Crs Δ 0 |
| hypoxic gas mixtures (Stage 3 validator; N15) | NN-08b, NN-28b (re-rigged with a shunt) | FiO2 0.12: HVR, blunted ≈ 30 % by residual block (Eriksson 1993); CBF ↑ below PaO2 50 |
| rig limits (not model defects) | NN-27a (MODELED cannot hold PaCO2 through a bleed at fixed ventilation: +6.2 mmHg); NN-29b (untreated 5-min VF gives no ROSC) | graded CO2-corrected (NN-27a) and on a treated arm (NN-29b) |

Unblocked since research/12: every NMB profile (`neuro.nm`, `neuro.cholinesterase`), the TOF stimulator
(`{type:'device', action:{device:'tof', …}}`), TCI, the brain events and the arrest pathway (FU-4 G4).

## 7. Proposed scripted suite (the owners' acceptance cells)

| owner | cells to re-measure at its gate | acceptance items |
|---|---|---|
| **FU-7 T2** | NN-23a, NN-24 | reversal 1–2 min (or Ali's band, Q6) |
| **FU-7 T3/T5** | NN-19c, NN-17a, NN-26f, NN-26g + guards NN-15a, 16a–c, 17b, 18a, 26e, 28a | dexmedetomidine DI ≈ 70 conscious; propofol Ce 3 alone moves, + remifentanil does not; sevoflurane 2 MAC ICP ≥ 1 MAC; ketamine ICP within ±2 |
| **FU-7 T4/T6/T7** | NN-23a premise, NN-23b, NN-20a, NN-20b | fentanyl 5 µg/kg apnoeic in the flow; renarcotisation per Q7; elderly sedation SpO2 < 90 % on air, obstruction > 0 |
| **FU-7 T13** | NN-30a, 30b, 30c | CV collapse or VF after 2 mg/kg IV (Q12); lipid lowers the CV effect |
| **FU-7 T14** | NN-09, NN-10, NN-13a/b, NN-06a, NN-07 (if hosted) | Mg shortens onset and prolongs duration; volatile +20–30 % (or Q3's band); neostigmine from TOF 4 → TOFR 0.9 in 5–15 min |
| **FU-7 T17** | NN-19a, NN-19b | early MAP ↑, HR −10–20 % |
| **7g NMB kinetics (N5)** | NN-01a/b, NN-02, NN-04a/b, NN-05a–c, NN-14 | roc 1.2 T1 25 % 57–77 min; het sux 20–30 min; sugammadex 16 T1 10 % 1.0–1.4 min; the roc 0.6 anchors unchanged |
| **FU-6 T5/T10** | NN-08a, NN-08b | obstruction present when awake at TOFR 0.6; HVR ratio 0.6–0.8 |
| **FU-8 Part A (N9, N13, N14)** | NN-25a–c, NN-14, NN-03a, NN-22a, NN-M2 | herniation before 45 min with pupil signs; one recurarisation mark, only when real; Cushing HR −20–40 % held |
| **Ali first (N7, N8)** | NN-15b/c, NN-21a | DI 40–60 at Ce 3–5, SR from Ce 6–8; Et MAC at eye opening 0.3–0.4 |

Each owner runs `./run.sh cli.ts <ids>` against its branch (`PME_ENGINE=<worktree>/packages/engine-core/src/index.ts`)
and pastes `report.ts` rows next to this run's column in its gate note (research/12 §7).

## 8. Questions for Ali (with the model's numbers)

1. **Rocuronium onset (NN-01a).** After 0.6 mg/kg, TOF count 0 comes at 74 s and maximum block at 120 s (label
   1.8 min). Is the teaching number "TOF 0" or "maximum block"?
2. **Succinylcholine recovery (NN-03b).** T1 90 % at 12.0 min. Miller says 8–10, the label 10.9. Which do you teach?
3. **Volatile potentiation of rocuronium (NN-09).** Sevoflurane 0.8 MAC prolongs it +61 %. research/12 says +20–30 %,
   FU-7 Task 14 says 25–80 %. Which band?
4. **Propofol depth (NN-15b/c, N7).** The implemented Eleveld curve gives BIS 37 at Ce 4 and burst suppression from
   Ce 5.0. Should the trainee see 40–60 across Ce 3–5 and suppression only from Ce 6–8?
5. **Propofol and movement (NN-17a, N1).** At Ce 3 with no opioid the model patient never moves at incision. Should
   TIVA without remifentanil show movement (Smith 1994: Cp50 ≈ 15 µg/mL)?
6. **Antagonist onset (NN-23a, NN-24).** Naloxone acts in 12 s and flumazenil in 6 s. FU-7 Task 2 moves them to
   30–180 s; research/12 says 1–2 min. One band for both?
7. **Fentanyl 5 µg/kg awake (NN-23a/b).** The apnoea flag is set but VE stays 2.3 L/min (38 %), and nothing returns
   after naloxone wears off (VE ≥ 5.0 L/min for 100 min). Should 5 µg/kg be frankly apnoeic (Q54: fentanyl
   ventilatory potency 0.55× remifentanil), and do you teach renarcotisation after a single fentanyl bolus or only
   after long-acting opioids and infusions?
8. **Emergence (NN-21a).** The gas monitor shows 0.18 MAC when the eyes open (brain 0.33 = MAC-awake), 7.7 min after
   the vaporiser is off. Which number should the trainee see at eye opening?
9. **Herniation (NN-25c).** The untreated haematoma reaches ICP 140 with MAP 145 and never herniates. Should herniation
   follow ICP approaching MAP (or cumulative low CPP)? Do you want pupil signs (unilateral dilatation) and apnoea as
   its presentation?
10. **Sevoflurane and ICP (NN-26f).** The model lowers ICP and CBF from 1 to 2 MAC in TBI (healthy CBF 0.48 of awake
    at 0.9 MAC). Do you teach "CBF preserved, ICP rises above 1–1.5 MAC" (Matta 1999)?
11. **Ketamine in TBI (NN-26g).** ICP +4.6 mmHg under controlled ventilation. Is "no ICP rise when ventilated and
    sedated" your teaching?
12. **LAST (NN-30b).** Bupivacaine 2 mg/kg IV gives peak 8 µg/mL, MAP −18 % and a 40/min bradycardia, but no
    arrhythmia or collapse. Should this dose produce VF/asystole, or is the teaching dose larger (the engine's existing
    test uses 225 mg → VF)?
13. **Dexmedetomidine (NN-19c).** What DI and state should 1 µg/kg over 10 min produce (BIS ≈ 70, rousable)?
14. **v1.0 or v1.1:** seizure/status epilepticus (NN-31), opioid chest-wall rigidity (NN-32) and hypoxic gas mixtures
    below FiO2 0.21 (N15)?

## 9. Files and how to re-run

All files are in `docs/review-inputs/15-audit-scripts/`. Nothing outside `docs/review-inputs/` was changed by this
run. The FU-6/7/8 plans and research files on this branch arrived with the merged `audit/coverage-nn` inputs.
- `runner.ts`: the arm runner (research/19/22) plus the NN readouts.
- `spec.ts`: cell type, contexts, rigs and helpers.
- `cells-a.ts`: NMB (NN-01…14).
- `cells-b.ts`: depth, drive and antagonists (NN-15…24).
- `cells-c.ts`: brain, LAST and NE probes (NN-25…32).
- `cells-m.ts`: MANUAL twins.
- `hand.ts`: the hand confirmations and owned flags.
- `grade.ts`, `regrade.ts`, `cli.ts` (store `out/cells.json`; `NN_OUT` for a partial store), `merge.ts`.
- `report.ts` → `out/matrix.md` (the §2 tables); `ledger.ts` → `out/ledger.md` (the research/12 §4 rows).
- `hooks.mjs`, `run.sh`.

```
npx -y pnpm@9.15.9 install --frozen-lockfile                 # at the repo root
cd docs/review-inputs/15-audit-scripts
./run.sh cli.ts P1 && ./run.sh cli.ts P2 && ./run.sh cli.ts P3   # ≈ 76 min single-process; split with NN_OUT + merge.ts
node --experimental-strip-types report.ts > out/matrix.md && node --experimental-strip-types ledger.ts > out/ledger.md
```

`PME_ENGINE=<worktree>/packages/engine-core/src/index.ts ./run.sh cli.ts NN-26f` re-measures one cell on another
branch.
