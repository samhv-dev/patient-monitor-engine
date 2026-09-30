# 21 — Coverage run SP: surgical stimuli and positioning (R54 matrix, research/12 §5.9)

*Coverage auditor, 2026-09-30. Read-only on the repo. Engine pinned at `origin/main` **7954933** (engine code = ed530d5:
FU-3, FU-4, FU-5 and V.1 merged; FU-6, FU-7, FU-8, FU-9 and FU-10 not). Seed 7. Scripts: `research/21-audit-scripts/`
(rerunnable; `out/cells.json` holds one graded record per cell and no raw rows). The report follows research/14 (run ET)
and research/13 (run RH).*

## 0. Headline

- **65 cells**:
  - the 59 of research/12 §5.9 (SP-01…26), with SP-01 split into its five blunting arms plus **SP-01f** (the FU-4 G7
    laryngoscopy vagal site, which did not exist when research/12 was written);
  - two cells the brief's topics needed and §5.9 did not list: **SP-27** (blunting by depth: 0.5 vs 1.5 MAC) and
    **SP-31** (duration of laryngoscopy, 15 vs 45 s);
  - three MANUAL twins (SP-M1…M3).

  **33 P1, 29 P2, 3 P3.** Every intervention cell has its control arm at the same sim time.
- **Verdicts:**

  | verdict | cells | P1 | P2 | P3 | of which another stage's plan already owns the fix |
  |---|---|---|---|---|---|
  | plausible (PL) | **12** | 10 | 2 | — | — |
  | too weak (TW) | **9** | 6 | 3 | — | 5 (SP-01a, 01d, 02a, 03, 26: FU-7 Task 10) |
  | too strong (TS) | **3** | 1 | 2 | — | 3 (SP-01b: FU-7 Task 10; SP-14b/c: FU-6 Q-FU6-6) |
  | wrong (WR) | **6** | 4 | 1 | 1 | 2 (SP-19a/b: A08 G13, Ali Q8 open) |
  | inconsistent (IN) | **0** | — | — | — | — |
  | missing (MI) | **10** | 7 | 3 | — | 4 (SP-08a/b: FU-9 amendment H5; SP-08c: FU-6; SP-12b/22 posture: Ali W17) |
  | not expressible (NE) | **25** | 5 | 18 | 2 | posture (11), surgical events (11), 7h (2), N2O (1) |

  - **28 non-plausible expressible cells.** 16 have a mechanism no stage owns (§3); 12 wait on planned work or a ruling.
  - Run time: ≈ 6 min of engine wall time for all 65 cells (single process).
- **Posture is confirmed as a missing input:** `position` accepts only `headUpDeg` 0–90 (organs/pipeline.ts:289–291),
  and head-up acts only on the brain (brain/model.ts:99–110). Every other posture is rejected. §6 lists the 11 blocked
  posture cells and the 11 blocked surgical-event cells.
- **The matrix after this run** (research/12 §4.9): 201 (audits 08–10) + 105 (DI) + 69 (CM) + 74 (BF) + 65 (DV) +
  62 (RH) + 72 (ET) + 65 (SP) = **713 measured cells**.
- **Ten most important findings** (ranked; §3 has the mechanism and file:line for each):
  1. **After a 1 L surgical bleed under GA the patient decompensates by himself (S7 = A08 G13; SP-19a/b; P1).** MAP
     recovers to 63.5 at +10 min, then falls to 48.3 at +60 min with no further loss, lactate 1.0 → 4.9, because the
     baroreflex set point resets downward 35 % of the error every 7 min (95.3 → 56.5 mmHg; baroreflex.ts:34–36,
     135–138). A 50-min ooze of the same litre reaches the same nadir (−36 %) as the sudden loss. Class II is taught
     as a compensated state.
  2. **Laryngoscopy after propofol gives +10.4 mmHg / +8 bpm (14 %); lidocaine does nothing (ratio 1.02); fentanyl
     2 µg/kg over-blunts (0.10) (SP-01a/b/d; P1).** This is the FU-7 Task 10 finding again on today's main. It is
     already owned, and Task 10's prototype meets the bands.
  3. **Under a maintained balanced anaesthetic, surgery is almost silent (S3; SP-02a, 03, 26; P1).** At 1 MAC
     sevoflurane + fentanyl 3 µg/kg, sternotomy raises MAP by +1.2 mmHg and incision by +0.8, so the two cannot be told
     apart. Closure lowers MAP by −1.7. Incision at 1 MAC without opioid gives +8.4 % (research/12: 10–20 %). FU-7
     Task 10 has no maintenance-phase arm (→ FU-7).
  4. **Airway instrumentation is not a stimulus (S1; SP-04, SP-05; P1).** Inserting an ETT or an SGA, or extubating an
     awakening patient, changes MAP and HR by exactly 0. `airwayDevice` is a mechanics/airway flag only
     (neuro/pipeline.ts:148–150). "SGA gives a smaller pressor response than ETT" can only be taught through the
     intensity the instructor picks by hand.
  5. **The laryngoscopy vagal site makes an adult bradycardic (S2; SP-01f; P1).** `stimulus 1.5 site laryngoscopy`
     drops HR 18/min below control (to 58) in the first minute. VAGAL_STIM_MS.laryngoscopy is 300 ms, not scaled by
     age or intensity (circ/model.ts:69–71). Adults answer laryngoscopy with tachycardia; the vagal response is
     paediatric.
  6. **Pneumoperitoneum is a renal number that the kidney ignores (S4; SP-08a–c, e, SP-09; P1).** IAP 14 mmHg changes
     CO, SVR, MAP, Crs, Ppeak, FRC and urine output by 0 (UO 22.2 vs 22.2 mL/h). There is no insufflation vagal event
     and no CO2 load (SP-08d NE). This extends RH's H4/H5 to the laparoscopy rig.
  7. **Beach-chair is a brain-only posture (S6; SP-12b, SP-22; P1).** At 70° head-up the MAP at the head is right
     (arm − head 17.6 mmHg, CPP −17.8 %: PL). Systemic MAP, CO and CVP do not move: no venous pooling, no hypotension.
     The low-CVP tilt adds 0 to GTN. Trendelenburg, prone, lateral and lithotomy are rejected (11 NE).
  8. **BCIS cannot reach grade 2 or 3 (S10; SP-18a/b; P2).** In an 80-year-old, `fatEmbolism 1.0` (PVR × 2.33) gives
     MAP −7.6 %, SpO2 99 %, no collapse. The row has no shunt/low-V/Q term and no mediator vasodilatation
     (lung-pathology.ts:532–548).
  9. **Atropine's vagolytic occupancy is not per kilogram (S8; SP-06a, SP-07).** The traction reflexes themselves are
     right: peritoneal traction takes HR 62 → 40 (−37 %) and the oculocardiac reflex takes a 4-year-old from 103 to 53
     (−48 %), both recovering on release. But atropine 20 µg/kg leaves 71 % of the reflex in the child (0.32 mg) and
     39 % in the adult (1.4 mg). The muscarinic ec50 is 0.3 mg-equivalent, an absolute amount
     (rows-cardiovascular.ts:30–31).
  10. **Diathermy is counted as heart rate (S12; SP-25a; P3, DEV).** A 10 s electrosurgery burst shows HR up to 158
      (truth 71, arterial pulse rate 70), flagged `valid`.
- **What works (12 PL):**
  - remifentanil 0.5 µg/kg/min abolishes the laryngoscopy response (ratio 0.08);
  - esmolol blunts HR more than MAP (0.63 vs 0.99);
  - depth blunts it (0.5 → 1.5 MAC: +15.4 → +3.8 mmHg);
  - a 45 s laryngoscopy gives more than a 15 s one (+10.4 vs +6.7);
  - MAC as the movement threshold (moves at 0.91 MAC, not at 1.01/1.11), and remifentanil + 0.6 MAC stops movement;
  - the hydrostatic head gradient and CPP in beach-chair;
  - VAE's EtCO2 fall (−3.0 at 1 min);
  - OLV's absorption nadir at 8.7 min followed by HPV recovery (+20 mmHg to 40 min);
  - the MANUAL twins behave as the Q9 working assumption says.

## 1. Method and rig

- **Design source:** research/12 §5.9 (SP, 26 scenarios / 59 cells), §2 (cell record, grading), §3 (tiers), §6
  (runner). Names follow research/11. MAP/HR are the beat truths (6 s mean). "RVSP" is the beat-mean RV systolic
  pressure: no mean PAP is published, so PAP cells read RVSP. Crs, FRC and shunt come from 7b's `lungState`. Ppeak comes
  from RH's one-breath probe (20 ms steps over 8 s). Brain values are 7d's `organs.brain` (mapHead, ICP, CPP, CBF).
- **Command probe on 7954933 (`probe0.ts`):**
  - **Accepted:**
    - `stimulus` with `site` laryngoscopy / oculocardiac / peritoneal (FU-4 G7 added the site after research/12,
      so SP-06 and SP-07 become expressible);
    - `position {headUpDeg 0–90}`;
    - `renal {iapMmHg}`;
    - `lungCondition` olv, vae, fatEmbolism, chestWall;
    - the ECG `setModifiers` electrosurgery burst (≤ 10 s).
  - **Rejected:**
    - `stimulus site carotid` ("site must be laryngoscopy, oculocardiac, peritoneal");
    - `position headUpDeg −30`, and any Trendelenburg/lateral/prone/lithotomy field ("headUpDeg must be 0–90");
    - `tourniquet` ("command type applyEvent is not implemented until later stages");
    - `condition crossClamp` ("arrives in Stage 7").
- **Rigs.** Adult 40 y, 70 kg, 175 cm, male; sensors ABP/CVP/SpO2/CO2/temperature; ETT + VCV 12 × 600, PEEP 5,
  FiO2 0.5 from 1 s.
  - **Laryngoscopy (SP-01, 31, M1):** the FU-7 Task 10 / DI-08 rig, so the numbers compare directly. Propofol 2 mg/kg
    at 240 s, `stimulus 1.5` at 300 s for 60 s, then `stimulus 0`. The pre-treatments are:
    - fentanyl 2 µg/kg at 60 s;
    - remifentanil 0.5 µg/kg/min from 60 s;
    - lidocaine 1.5 mg/kg at 180 s;
    - esmolol 0.5 mg/kg at 240 s.
  - **Surgical GA:** propofol 2 mg/kg + rocuronium 0.6 mg/kg at 60 s, sevoflurane 2.1 % at FGF 6 (brain MAC 0.99 at
    30 min, 1.01 at 40 min; `probe2.ts`), ± fentanyl.
  - **MAC cells (SP-02):** sevoflurane alone without NMB (movement needs T1 > 0.25). The dials are 1.9 / 2.1 / 2.3 %,
    giving brain MAC 0.91 / 1.01 / 1.11 at 40 min.
  - **Child (SP-07):** 4 y, 16 kg, VCV 20 × 130, sevoflurane 2.5 %.
  - **Elderly (SP-18):** 80 y, sevoflurane 1.5 %.
- **Sampling.** The committed state is read every 1–10 s, read-only, with the `measurement`, `anaesthesia`, `endo`,
  `lungState` and `organs` events. No pokes. Arms advance in ≤ 60 s slices and yield once per simulated minute.
- **Grading** (research/12 §2.2): automatic first, then every non-PL confirmed by hand; `HAND` lines give the code
  reason.
  - Bands are proposals for Ali with their source; none was widened (R45).
  - `[VERIFY]` marks a paper figure quoted from memory, to be checked before the band becomes a test.
  - Direction-only cells carry `(direction only)` and are listed in §8.
- **MANUAL.** Q9 is open, so SP-M1…M3 are direction-only beside their MODELED twins.

## 2. Results

How to read the tables:
- Keys starting with `d` are differences against the control arm at the same sim time; `…Pct` is per cent of the
  control's value at the intervention; `…Ratio` is the blunted response over the unblunted one.
- Pressures are in mmHg, HR in /min, catecholamines in pg/mL.
- Gap ids are §3 (S1–S13) or the owning plan. The tables are generated by `report.ts` from `out/cells.json`.

Family by family:
- **2.1 Laryngoscopy:**
  - The surge is small (FU-7 Task 10), fentanyl over-blunts and lidocaine does nothing.
  - Remifentanil, esmolol, depth and duration are right.
  - The vagal site gives adults bradycardia (S2), and no airway device is a stimulus (S1).
- **2.2 Incision, sternotomy, closure:**
  - MAC-as-movement is right.
  - Under maintained balanced GA every stimulus is ≈ 1 mmHg (S3).
- **2.3 Vagal reflexes:**
  - The peritoneal and oculocardiac reflexes are right.
  - Atropine's occupancy is absolute mg (S8).
  - There is no mesenteric traction syndrome (S9) and no carotid site.
- **2.4 Pneumoperitoneum:**
  - IAP is inert outside the kidney, and inert in the kidney too (S4).
  - There is no CO2 load and no CO2 embolism (S5).
- **2.5 Positioning:**
  - Head-up is right at the head and absent in the body (S6).
  - Every other posture is NE.
  - OLV runs supine (FU-6 Q-FU6-6).
- **2.6 Bleeding:**
  - The sudden loss is right at the nadir.
  - Late decompensation and the ooze = sudden result come from the downward reset (S7).
- **2.7 Other surgical events:**
  - BCIS is too weak (S10) and VAE is weak systemically (S11).
  - Diathermy is counted as HR (S12).
  - Tourniquet, clamp, PA clamp and CPB are NE (S13, 7h).

### 2.1 Laryngoscopy and intubation, and its blunting (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-01a | P1 | X-A ventilated (ETT, VCV 12 × 600, PEEP 5, FiO2 0.5) · propofol 2 mg/kg at 240 s, no opioid → laryngoscopy + intubation (7e stimulus 1.5, no site) at 300 s for 60 s vs the same rig without it | nDMap 10.41; nDMapPct 14; nTPeakS 55; nDHr 8; nDHrMin 0; nDHrPct 10.5; nKeep90 0.7; nDNe 125.76; nDEpi 35.36; nMap0 74.57; nHr0 76; nAntinoc 0.42; nDi 66; fMapRatio 0.1; fHrRatio 0.13; fDMap 1.04; fDHr 1; fAntinoc 0.97; rMapRatio 0.08; rHrRatio 0.13; rDMap 0.86; rDHr 1; rMap0 65.98; rHr0 53; lMapRatio 1.02; lHrRatio 1; lDMap 10.6; eMapRatio 0.99; eHrRatio 0.63; eHrBlunt 0.37; eHrLessThanMap true; eHr0 73; sDMap 11.48; sDHr 7; sDHrMin 18; sHrMin 58; sVagMs 287.8 | TW: nDMapPct = 14 below [20, 30] [research/12 SP-01 (MAP +20–30 %); Miller 9e ch. 44 (airway management: laryngoscopy and intubation raise MAP 20–30 % and HR ≈ 20/min within 30–60 s, lasting 5–10 min); Kovac AL, J Clin Anesth 1996;8:63–79 (review: controlling the haemodynamic response to laryngoscopy and intubation)]<br>TW: nDMap = 10.41 below [20, 30] [Shribman AJ et al., Br J Anaesth 1987;59:295–9 (laryngoscopy alone and with intubation after thiopentone: MAP +20–30 mmHg, noradrenaline ↑ within 1 min); FU-7 Task 10 Step 5 (M10 ch. 44; tables §5.3) (ΔMAP 20–30 mmHg after propofol)]<br>TW: nDHr = 8 below [12, 30] [FU-7 Task 10 Step 5 (M10 ch. 44; tables §5.3) (ΔHR 12–30); research/12 SP-01 (HR +20)]<br>PL: nKeep90 = 0.7 in [0.5, 1.2] [FU-7 Task 10 Step 5 (M10 ch. 44; tables §5.3) (≥ 50 % of the peak still present at +90 s: the reflex must not cancel the surge within its course)]<br>PL: nDNe = 125.76 (sign 1, beyond 20) [Shribman AJ et al., Br J Anaesth 1987;59:295–9 (laryngoscopy alone and with intubation after thiopentone: MAP +20–30 mmHg, noradrenaline ↑ within 1 min) (plasma noradrenaline rises within 1 min of laryngoscopy)] | **TW** (FU-7 Task 10 pending) | FU-7 T10 · 7e hormones.ts / effects.ts → 7a set point (FU-7 Task 10: surge state + circulating release) |
| SP-01b | P1 | X-A ventilated · fentanyl 2 µg/kg at 60 s, propofol 2 mg/kg at 240 s → laryngoscopy 1.5 at 300 s for 60 s: blunting ratio vs no opioid | nDMap 10.41; nDMapPct 14; nTPeakS 55; nDHr 8; nDHrMin 0; nDHrPct 10.5; nKeep90 0.7; nDNe 125.76; nDEpi 35.36; nMap0 74.57; nHr0 76; nAntinoc 0.42; nDi 66; fMapRatio 0.1; fHrRatio 0.13; fDMap 1.04; fDHr 1; fAntinoc 0.97; rMapRatio 0.08; rHrRatio 0.13; rDMap 0.86; rDHr 1; rMap0 65.98; rHr0 53; lMapRatio 1.02; lHrRatio 1; lDMap 10.6; eMapRatio 0.99; eHrRatio 0.63; eHrBlunt 0.37; eHrLessThanMap true; eHr0 73; sDMap 11.48; sDHr 7; sDHrMin 18; sHrMin 58; sVagMs 287.8 | TS: fMapRatio = 0.1 below [0.2, 0.7] (lower = stronger/faster) [FU-7 Task 10 Step 5 (M10 ch. 44; tables §5.3) case 2 (fentanyl 3 µg/kg: ratio 0.2–0.7; M10 ch. 22; Shribman 1987); Kovac 1996 (fentanyl 2–6 µg/kg attenuates but does not abolish)] | **TS** (FU-7 Task 10 pending) | FU-7 T10 · 7f depth.ts antinoc (opioid) → 7e surge (FU-7 Task 10 Step 1c: opioid-only release blunting) |
| SP-01c | P1 | X-A ventilated · remifentanil 0.5 µg/kg/min from 60 s, propofol 2 mg/kg at 240 s → laryngoscopy 1.5 at 300 s: blunting ratio vs no opioid | nDMap 10.41; nDMapPct 14; nTPeakS 55; nDHr 8; nDHrMin 0; nDHrPct 10.5; nKeep90 0.7; nDNe 125.76; nDEpi 35.36; nMap0 74.57; nHr0 76; nAntinoc 0.42; nDi 66; fMapRatio 0.1; fHrRatio 0.13; fDMap 1.04; fDHr 1; fAntinoc 0.97; rMapRatio 0.08; rHrRatio 0.13; rDMap 0.86; rDHr 1; rMap0 65.98; rHr0 53; lMapRatio 1.02; lHrRatio 1; lDMap 10.6; eMapRatio 0.99; eHrRatio 0.63; eHrBlunt 0.37; eHrLessThanMap true; eHr0 73; sDMap 11.48; sDHr 7; sDHrMin 18; sHrMin 58; sVagMs 287.8 | PL: rMapRatio = 0.08 in [-1, 0.3] [Thompson JP et al., Anaesthesia 1998;53:652–6 [VERIFY] and Kovac 1996: remifentanil 0.5–1 µg/kg/min (or 1 µg/kg + infusion) abolishes the pressor response to laryngoscopy (MAP and HR at or below baseline); research/12 SP-01 (dose-dependent blunting)] | **PL** | — · 7f depth.ts antinoc (remifentanil fentanyl-equivalent) → 7e surge |
| SP-01d | P1 | X-A ventilated · lidocaine 1.5 mg/kg IV at 180 s, propofol 2 mg/kg at 240 s → laryngoscopy 1.5 at 300 s: blunting ratio vs none | nDMap 10.41; nDMapPct 14; nTPeakS 55; nDHr 8; nDHrMin 0; nDHrPct 10.5; nKeep90 0.7; nDNe 125.76; nDEpi 35.36; nMap0 74.57; nHr0 76; nAntinoc 0.42; nDi 66; fMapRatio 0.1; fHrRatio 0.13; fDMap 1.04; fDHr 1; fAntinoc 0.97; rMapRatio 0.08; rHrRatio 0.13; rDMap 0.86; rDHr 1; rMap0 65.98; rHr0 53; lMapRatio 1.02; lHrRatio 1; lDMap 10.6; eMapRatio 0.99; eHrRatio 0.63; eHrBlunt 0.37; eHrLessThanMap true; eHr0 73; sDMap 11.48; sDHr 7; sDHrMin 18; sHrMin 58; sVagMs 287.8 | TW: lMapRatio = 1.02 above [0.4, 0.9] (lower = stronger/faster) [Lin 2016 meta-analysis via FU-7 Task 10 Step 5 (M10 ch. 44; tables §5.3) case 5 (IV lidocaine 1.5 mg/kg: ratio 0.4–0.9); Stoelting RK, Anesthesiology 1977;47:381–4] | **TW** (FU-7 Task 10 pending) | FU-7 T10 · 7g lidocaine row → 7f antinocAdd (FU-7 Task 10 Step 3) |
| SP-01e | P1 | X-A ventilated · esmolol 0.5 mg/kg at 240 s (with propofol) → laryngoscopy 1.5 at 300 s: HR and MAP blunting vs none | nDMap 10.41; nDMapPct 14; nTPeakS 55; nDHr 8; nDHrMin 0; nDHrPct 10.5; nKeep90 0.7; nDNe 125.76; nDEpi 35.36; nMap0 74.57; nHr0 76; nAntinoc 0.42; nDi 66; fMapRatio 0.1; fHrRatio 0.13; fDMap 1.04; fDHr 1; fAntinoc 0.97; rMapRatio 0.08; rHrRatio 0.13; rDMap 0.86; rDHr 1; rMap0 65.98; rHr0 53; lMapRatio 1.02; lHrRatio 1; lDMap 10.6; eMapRatio 0.99; eHrRatio 0.63; eHrBlunt 0.37; eHrLessThanMap true; eHr0 73; sDMap 11.48; sDHr 7; sDHrMin 18; sHrMin 58; sVagMs 287.8 | PL: eHrBlunt = 0.37 (sign 1, beyond 0.2) [Kovac 1996; Miller 9e ch. 44 (esmolol blunts the tachycardia of laryngoscopy dose-dependently; 1.5–2 mg/kg reliably)]<br>PL: eHrLessThanMap = true (expected true) [FU-7 Task 10 Step 5 (M10 ch. 44; tables §5.3) case 4 (esmolol blunts the HR component more than the MAP component; T6.2)] | **PL** | FU-7 T10 · 7g esmolol β-occupancy → 7a HR (FU-7 Task 10 case 4 re-measures) |
| SP-01f | P1 | X-A ventilated (adult 40 y) · propofol 2 mg/kg at 240 s, no opioid → laryngoscopy with the FU-4 G7 vagal site (`stimulus 1.5 site laryngoscopy`) at 300 s for 60 s: HR vs no stimulus | nDMap 10.41; nDMapPct 14; nTPeakS 55; nDHr 8; nDHrMin 0; nDHrPct 10.5; nKeep90 0.7; nDNe 125.76; nDEpi 35.36; nMap0 74.57; nHr0 76; nAntinoc 0.42; nDi 66; fMapRatio 0.1; fHrRatio 0.13; fDMap 1.04; fDHr 1; fAntinoc 0.97; rMapRatio 0.08; rHrRatio 0.13; rDMap 0.86; rDHr 1; rMap0 65.98; rHr0 53; lMapRatio 1.02; lHrRatio 1; lDMap 10.6; eMapRatio 0.99; eHrRatio 0.63; eHrBlunt 0.37; eHrLessThanMap true; eHr0 73; sDMap 11.48; sDHr 7; sDHrMin 18; sHrMin 58; sVagMs 287.8 | WR: sDHrMin = 18 (quiet, tol ±5) [Miller 9e ch. 44 (airway management: laryngoscopy and intubation raise MAP 20–30 % and HR ≈ 20/min within 30–60 s, lasting 5–10 min); Kovac AL, J Clin Anesth 1996;8:63–79 (review: controlling the haemodynamic response to laryngoscopy and intubation) (adults: tachycardia, no bradycardia; reflex bradycardia at laryngoscopy is a feature of infants and small children, or of a second succinylcholine dose)]<br>TW: sDHr = 7 below [12, 30] [Miller 9e ch. 44 (airway management: laryngoscopy and intubation raise MAP 20–30 % and HR ≈ 20/min within 30–60 s, lasting 5–10 min); Kovac AL, J Clin Anesth 1996;8:63–79 (review: controlling the haemodynamic response to laryngoscopy and intubation); FU-7 Task 10 Step 5 (M10 ch. 44; tables §5.3)]<br>HAND WR (automatic WR): The laryngoscopy vagal site drops the adult HR 18/min below the no-stimulus control (to 58) in the first minute — VAGAL_STIM_MS.laryngoscopy 300 ms at the SA node (circ/model.ts VAGAL_STIM_*), not scaled by intensity or age — before the sympathetic surge wins (+7 after the fatigue τ 120 s). Adults answer laryngoscopy with tachycardia. | **WR** | S2 · 7a circ/model.ts VAGAL_STIM_MS.laryngoscopy (FU-4 G7: 300 ms, not age- or intensity-scaled) |
| SP-27 | P1 | X-A ventilated · propofol 2 mg/kg at 60 s, sevoflurane 1.05 % (≈ 0.5 MAC) vs 3.2 % (≈ 1.5 MAC) FGF 6 → laryngoscopy 1.5 at 20 min for 60 s: the deeper arm blunts the response | loDMap 15.43; loDMapPct 18.1; loTPeakS 65; loDHr 9; loDHrMin -1; loDHrPct 12.7; loKeep90 0.83; loDNe 157.98; loDEpi 44.52; loMap0 85.07; loHr0 71; loAntinoc 0.3; loDi 70; hiDMap 3.83; hiDMapPct 5.2; hiTPeakS 65; hiDHr 3; hiDHrMin 0; hiDHrPct 4.2; hiKeep90 0.83; hiDNe 37; hiDEpi 10.43; hiMap0 73.44; hiHr0 71; hiAntinoc 0.83; hiDi 41; macLo 0.47; macHi 1.44; depthBlunt 0.75 | PL: depthBlunt = 0.75 (sign 1, beyond 0.2) [Roizen MF et al., Anesthesiology 1981;54:390–8 (MAC-BAR ≈ 1.5 MAC blocks the adrenergic response in 50 %); Katoh T et al., Br J Anaesth 1999;82:561–5 (sevoflurane MAC-BAR ≈ 2.2 MAC without opioid) [VERIFY]: deeper volatile anaesthesia blunts the pressor response] | **PL** (direction only) | — · 7f depth.ts bHyp (MAC-BAR scale) → 7e surge |
| SP-31 | P1 | X-A ventilated · propofol 2 mg/kg at 240 s → laryngoscopy 1.5 for 15 s vs 45 s (a difficult laryngoscopy): the longer one gives the larger response | d15Map 6.7; d45Map 10.4; d15Hr 4; d45Hr 7; longMinusShort 3.7 | PL: longMinusShort = 3.7 (sign 1, beyond 2) [Stoelting RK, Anesthesiology 1977;47:381–4 (the pressor response grows with the duration of laryngoscopy; ≤ 15 s minimises it) [VERIFY]] | **PL** (direction only) | — · 7e hormones.ts (nociceptive onset τ) / FU-7 Task 10 |
| SP-04 | P1 | X-A ventilated · propofol 2 mg/kg at 240 s → airway-device insertion event at 300 s (`airwayDevice ett` vs `sga`) with no instructor stimulus: pressor response | ettDMap 0; ettDHr 0; sgaDMap 0; sgaDHr 0; ettMinusSga 0 | WR: ettDMap = 0 (expected sign 1) [Miller 9e ch. 44 (airway management: laryngoscopy and intubation raise MAP 20–30 % and HR ≈ 20/min within 30–60 s, lasting 5–10 min); Kovac AL, J Clin Anesth 1996;8:63–79 (review: controlling the haemodynamic response to laryngoscopy and intubation) (intubation itself is the stimulus)]<br>WR: ettMinusSga = 0 (expected sign 1) [Braude N et al., Anaesthesia 1989;44:551–4; Wilkins CJ et al., Anaesthesia 1992;47:445–6 [VERIFY]: LMA insertion gives a smaller pressor response than laryngoscopy and intubation]<br>HAND MI (automatic WR): The airway-device event carries no nociception: `airwayDevice` is consumed by 7f (neuro/pipeline.ts:148–150, airway flag only) and Stage 3 (mechanics); nothing reaches 7e's `noxious`. The pressor response exists only when the instructor also sends `stimulus` — so ETT vs SGA differ only by the intensity the instructor chooses. | **MI** | S1 · new: engine.ts airwayDevice → 7e noxious impulse by device (ETT > SGA) — FU-7 Task 10 adds no event (D8) |
| SP-05 | P1 | X-A, GA propofol + sevoflurane 2.1 % (no NMB), sevoflurane off and spontaneous at 40 min · emergence → extubation at 50 min vs the tube left in: MAP/HR over the next 5 min | dMapPct 0; dHrPct 0; dMap 0; dHr 0; map0 95.34; hr0 68; mapGA 81.73; mapPreExt 95.8; di0 84; conscious true; mac0 0.22 | WR: dMapPct = 0 below [15, 25] [research/12 SP-05 (MAP/HR +15–25 %); Miller 9e ch. 44 (extubation: HR and BP rise 10–30 %, lasting 5–15 min; coughing on the tube)]<br>WR: dHrPct = 0 below [15, 25] [research/12 SP-05; Miller 9e ch. 44]<br>HAND MI (automatic WR): Extubation is only an airway flag: `airwayDevice none` changes the mechanics and 7f's natural-airway flag; no nociceptive/tracheal stimulus, no cough, no emergence straining reaches 7e. The pressor response of extubation (and of a tube in a lightly anaesthetised patient) is absent. | **MI** | S1 · new: airway event → 7e noxious (extubation, tube tolerance by depth/opioid) — same seam as SP-04 |

### 2.2 Incision, sternotomy, closure and MAC (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-02a | P1 | X-A ventilated, no NMB · sevoflurane alone at 1.9 / 2.1 / 2.3 % (≈ 0.9 / 1.0 / 1.1 MAC at 40 min) → skin incision (stimulus 1.0, held) at 40 min: movement and the pressor response at 1.0 MAC | mac09 0.91; mac10 1.01; mac11 1.11; moves09 true; moves10 false; moves11 false; dMapPct10 8.4; dHrPct10 11.3; dMap10 7; dHr10 8; di10 52; diCtrl 42 | PL: moves09 = true (expected true) [Eger EI et al., Anesthesiology 1965;26:756–63 (MAC: 50 % move to incision; the quantal curve is steep, most move at 0.9 MAC)]<br>PL: moves11 = false (expected false) [Eger 1965; de Jong RH, Eger EI, Anesthesiology 1975;42:384–9 (MAC95 ≈ 1.1–1.3 MAC)]<br>TW: dMapPct10 = 8.4 below [10, 20] [research/12 SP-02 (HR/MAP ↑ 10–20 % at 1 MAC); Zbinden AM et al., Anesthesiology 1994;80:253–60 (isoflurane: the haemodynamic response to incision persists above 1 MAC) [VERIFY]]<br>PL: dHrPct10 = 11.3 in [10, 20] [research/12 SP-02 (HR/MAP ↑ 10–20 %)] | **TW** (FU-7 Task 10 pending) | S3 (FU-7 T10) · 7f depth.ts movement (hypEq < 1) / 7e surge (FU-7 Task 10: no incision arm yet) |
| SP-02b | P1 | X-A ventilated, no NMB · sevoflurane 1.3 % (≈ 0.6 MAC) + remifentanil 0.15 µg/kg/min → incision (stimulus 1.0) at 40 min: no movement; pressor response blunted vs 1.0 MAC alone | macR 0.63; macEffR 1.69; movesR false; dMapPctR 1.7; dHrPctR 1.8; dMapPct10 8.4; bluntVs1MAC 0.8; map0R 83.16; hr0R 55 | PL: movesR = false (expected false) [Lang E et al., Anesthesiology 1996;85:721–8 (remifentanil 1.4 ng/mL halves isoflurane MAC; the curve plateaus at ≈ 0.6–0.8 reduction) — 0.6 MAC + remifentanil ≥ 1 MAC-equivalent]<br>PL: bluntVs1MAC = 0.8 (sign 1, beyond 0.3) [research/12 SP-02; Desborough 2000 (opioids blunt the haemodynamic arm of the stress response)] | **PL** | — · 7f depth.ts (opioid MAC reduction, antinoc) → 7e surge |
| SP-03 | P1 | X-A ventilated, GA (propofol + rocuronium, sevoflurane 2.1 %) + fentanyl 3 µg/kg at 60 s · at 30 min → sternotomy / sternal spread (stimulus 1.5, held) vs skin incision (1.0): peak ΔMAP | sDMap 1.21; sDMapPct 1.6; sDHr 1; iDMap 0.82; iDMapPct 1.1; sMinusI 0.39; sDNe 16.73; map0 73.64 | TW: sMinusI = 0.39 (sign 1, beyond 2) [Miller 9e ch. 54 (cardiac anaesthesia: sternotomy and sternal spread are the most intense stimuli; hypertension despite fentanyl-based anaesthesia) [direction]]<br>TW: sDMapPct = 1.6 (sign 1, beyond 10) [research/12 SP-03 (intense pressor response, stimulus 1.5); Kaplan cardiac anesthesia (sternotomy hypertension in 30–60 % of fentanyl anaesthetics) [VERIFY]]<br>HAND TW (automatic TW): Under a maintained balanced anaesthetic (sevoflurane 1.0 MAC + fentanyl 3 µg/kg 29 min earlier) sternotomy raises MAP +1.2 mmHg and incision +0.8: 7f's antinociception multiplies the hypnotic blunting (bHyp 50 % at 1 MAC-eq, depth.ts:84–86) with the opioid's, and 7e's surge is small even unblunted (SP-01a). The two stimuli are indistinguishable. | **TW** (FU-7 Task 10 pending) (direction only) | S3 (FU-7 T10) · 7f depth.ts antinoc × 7e surge (FU-7 Task 10: no sternotomy/maintenance arm) |
| SP-26 | P1 | X-A ventilated, GA (sevoflurane 2.1 % + fentanyl 2 µg/kg) · surgery (stimulus 1.0) from 20 to 60 min → the stimulus ends at closure at unchanged depth: MAP over the next 10 min vs surgery continuing | dMap10 -1.68; dHr10 -2; incisionRise 1.35; residual10 -0.09; dMap10Pct -2.1 | TW: dMap10 = -1.68 (sign -1, beyond 2) [research/12 SP-26 (MAP falls when the stimulus stops at unchanged depth); Miller 9e (emergence/closure hypotension when surgical stimulation ends)] | **TW** (FU-7 Task 10 pending) (direction only) | S3 (FU-7 T10) · 7e hormones.ts (SYMP_OFF_TAU_S 180 s); size of the maintained-GA surge (FU-7 Task 10) |

### 2.3 Vagal reflexes and mesenteric traction (P1/P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-06a | P1 | X-A ventilated, GA (sevoflurane 2.1 % + fentanyl 2 µg/kg), incision (1.0) held from 30 min · laparotomy → peritoneal traction (`stimulus 1 site peritoneal`) at 40 min for 2 min; atropine 20 µg/kg (and 0.5 mg ≈ 7 µg/kg) 2 min before in further arms | hr0 62; hrMin 40; dHrMin -23; dHrMinPct -37.1; tMinS 20; hrAt110 50; atro20DHrMin -9; atroRatio 0.39; atro7DHrMin -13; atro7Ratio 0.57; hrAtro20 95; rhythms 5s sinus; dMap5to20Pct 0.4; dSvr10 1.82; dHr10 0 | PL: dHrMinPct = -37.1 in [-100, -20] [Miller 9e ch. 16/ch. 57 (vagal reflexes on peritoneal/visceral traction: sinus bradycardia, junctional rhythm or asystole); Doyle DJ, Mark PWS, Can J Anaesth 1989;36:708–12 (reflex bradycardia during surgery) [VERIFY] — a reflex bradycardia is conventionally a ≥ 20 % fall (as for the oculocardiac reflex)]<br>TW: atroRatio = 0.39 above [-0.5, 0.3] (lower = stronger/faster) [Miller 9e (the reflex is abolished by atropine/glycopyrrolate given first; 20 µg/kg is the prophylactic dose used for the oculocardiac reflex)] | **TW** | S8 · 7a circ/model.ts VAGAL_STIM_MS.peritoneal (FU-4 G7) PL; atropine: 7g rows-cardiovascular.ts muscarinic ec50 0.3 mg-equivalent |
| SP-06b | P1 | X-A ventilated, GA as SP-06a · laparotomy → mesenteric traction (the same traction event): the mesenteric traction syndrome 5–20 min later — MAP, SVR, HR vs no traction | hr0 62; hrMin 40; dHrMin -23; dHrMinPct -37.1; tMinS 20; hrAt110 50; atro20DHrMin -9; atroRatio 0.39; atro7DHrMin -13; atro7Ratio 0.57; hrAtro20 95; rhythms 5s sinus; dMap5to20Pct 0.4; dSvr10 1.82; dHr10 0 | WR: dMap5to20Pct = 0.4 above [-40, -10] [Seltzer JL et al., Anesth Analg 1985;64:848–52; Brinkmann A et al., Anesth Analg 1998;86:1063–7; Olsen KS et al. 2016 [VERIFY]: mesenteric traction releases prostacyclin within minutes — flushing, SVR ↓, MAP ↓ 10–40 %, HR ↑, CO ↑, lasting 20–30 min]<br>HAND MI (automatic WR): No mediator release on traction: the peritoneal site adds a vagal RR increment only (circ/model.ts VAGAL_STIM_MS), and the held stimulus is nociception (pressor). No prostacyclin/vasodilator term, no flushing; MAP 5–20 min after traction equals the control. | **MI** | S9 · new: 7e/7a mesenteric traction mediator (prostacyclin → SVR ↓, HR ↑; ondansetron/NSAID-sensitive) — FU-7+ surgical events |
| SP-07 | P2 | X-C (4 y, 16 kg) ventilated VCV 20 × 130, sevoflurane 2.5 % (no opioid) · strabismus surgery → traction on the medial rectus (`stimulus 1 site oculocardiac`) at 20 min for 60 s; atropine 20 µg/kg 2 min before in a second arm | hr0 103; hrMin 53; dHrMinPct -47.6; tMinS 22; hrEnd60 63; hrAfter30 109; atroDHrMinPct -27.8; atroRatio 0.71; rhythms 2s sinus | PL: dHrMinPct = -47.6 in [-100, -20] [Miller 9e ch. 74 (ophthalmic anaesthesia: the oculocardiac reflex — HR fall > 20 % on traction of the extra-ocular muscles, in 30–90 % of strabismus surgery; asystole possible; fatigues with repeated traction)]<br>TW: atroRatio = 0.71 above [-0.5, 0.3] (lower = stronger/faster) [Miller 9e ch. 74; APA guidance (atropine 20 µg/kg IV before traction prevents the reflex)]<br>HAND TW (automatic TW): The reflex itself is right (HR 103 → 53, −48 %, at 22 s; recovers on release). Atropine 20 µg/kg (0.32 mg) leaves 71 % of it (adult 1.4 mg: 39 %, SP-06a): 7g's atropine `muscarinic` ec50 is 0.3 mg-equivalent Ce (rows-cardiovascular.ts:30–31), an ABSOLUTE amount, so a weight-based paediatric dose buys ≈ half the occupancy of an adult dose. | **TW** | S8 · 7g rows-cardiovascular.ts atropine muscarinic ec50 (absolute mg: no per-kg/volume scaling) — FU-4 G7 event PL |
| SP-09 | P2 | X-A ventilated, GA (sevoflurane 2.1 %) · laparoscopy → rapid insufflation to IAP 14 (the `renal iapMmHg` step): HR over the first 60 s | dHrMin 0; dHrMinPct 0; vagMs 0 | WR: dHrMinPct = 0 above [-100, -20] [research/12 SP-09; Barash 9e (laparoscopy: bradycardia, AV dissociation or asystole on rapid peritoneal distension — vagal; stop insufflation, atropine); Valentin MD et al., Anesth Analg 1990 [VERIFY]]<br>HAND MI (automatic WR): The IAP step is a renal pressure only: it sets no vagal event (the FU-4 G7 vagal event is reachable only through `stimulus site peritoneal`, SP-06a, which the instructor must add by hand). HR is unchanged. | **MI** | S4 · new: surgical event "insufflation" → FU-4 G7 peritoneal vagal event (rate-of-stretch) |
| SP-21 | P2 | X-E GA · — → carotid sinus manipulation (endarterectomy): bradycardia and hypotension | — | rejected: `stimulus site carotid` → "site must be laryngoscopy, oculocardiac, peritoneal" | **NE** | S13 · new: FU-4 G7 vagal site "carotid" (+ vasodepressor limb) |

### 2.4 Pneumoperitoneum, CO2 embolism, emphysema (P1/P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-08a | P1 | X-A ventilated, GA (propofol + rocuronium, sevoflurane 2.1 %) · supine → pneumoperitoneum IAP 14 mmHg (`renal iapMmHg 14`, the only IAP input) at 20 min: cardiac output at +15 min vs no IAP | iap 14; dCoPct 0; dSvrPct 0; dMapPct 0; dHr 0; dCvp 0; crs0 55; crs15 55; dCrsPct 0; ppeak0 19.58; ppeak10 19.58; dPpeak 0; dFrc 0; dEtco2At25 0; dPaco2At25 0; uop0 21.6; uop20 22.2; uopC20 22.2; dUopPct 0; dHbf 0; dPao2 0 | WR: dCoPct = 0 above [-30, -10] [Barash 9e, anaesthesia for laparoscopic surgery; research/12 SP-08 (IAP 12–15 → SVR ↑, CO −10–30 %); Joris JL et al., Anesth Analg 1993;76:1067–71 (laparoscopic cholecystectomy, IAP 14: SVR +65 %, MAP +35 %, CI −20 % within 5 min, partial recovery by 10–15 min)]<br>HAND MI (automatic WR): IAP reaches only the kidney (renal/model.ts:64, 90, 128; RH H5): the circulation does not read `organs.iap` — no IVC compression/venous-return change, no afterload term. CO, SVR and MAP equal the control. | **MI** | S4 · new: 7a (IAP → venous return / abdominal venous compliance, SVR) — RH H5 |
| SP-08b | P1 | X-A ventilated, GA · supine → IAP 14: SVR and MAP at +15 min | iap 14; dCoPct 0; dSvrPct 0; dMapPct 0; dHr 0; dCvp 0; crs0 55; crs15 55; dCrsPct 0; ppeak0 19.58; ppeak10 19.58; dPpeak 0; dFrc 0; dEtco2At25 0; dPaco2At25 0; uop0 21.6; uop20 22.2; uopC20 22.2; dUopPct 0; dHbf 0; dPao2 0 | WR: dSvrPct = 0 below [20, 70] [Joris JL et al., Anesth Analg 1993;76:1067–71 (laparoscopic cholecystectomy, IAP 14: SVR +65 %, MAP +35 %, CI −20 % within 5 min, partial recovery by 10–15 min); Barash 9e, anaesthesia for laparoscopic surgery; research/12 SP-08 (IAP 12–15 → SVR ↑, CO −10–30 %)]<br>WR: dMapPct = 0 below [10, 35] [Joris JL et al., Anesth Analg 1993;76:1067–71 (laparoscopic cholecystectomy, IAP 14: SVR +65 %, MAP +35 %, CI −20 % within 5 min, partial recovery by 10–15 min)]<br>HAND MI (automatic WR): as SP-08a: no IAP → circulation seam (RH H5). | **MI** | S4 · new: 7a (IAP → SVR: aortic/splanchnic compression, vasopressin/renin release) — RH H5 |
| SP-08c | P1 | X-A ventilated VCV 12 × 600, GA · supine → IAP 14: respiratory-system compliance and peak airway pressure | iap 14; dCoPct 0; dSvrPct 0; dMapPct 0; dHr 0; dCvp 0; crs0 55; crs15 55; dCrsPct 0; ppeak0 19.58; ppeak10 19.58; dPpeak 0; dFrc 0; dEtco2At25 0; dPaco2At25 0; uop0 21.6; uop20 22.2; uopC20 22.2; dUopPct 0; dHbf 0; dPao2 0 | WR: dCrsPct = 0 above [-50, -30] [research/12 SP-08 (Crs −30–50 %, Ppeak ↑); Obeid F et al., Arch Surg 1995;130:544–7; Rauh R et al., Clin Physiol 2001;21:533–9 [VERIFY]]<br>WR: dPpeak = 0 (expected sign 1) [research/12 SP-08; Barash 9e (Ppeak rises with the pneumoperitoneum)]<br>HAND MI (automatic WR): IAP does not reach 7b: chest-wall elastance, FRC and Crs are unchanged (Crs 55 → 55). The instructor can only add `lungCondition chestWall` by hand, which the IAP event does not do. | **MI** | S4 · new: 7b (IAP → chest-wall elastance, cephalad diaphragm, FRC ↓) — RH-06c |
| SP-08d | P1 | X-A ventilated at a fixed minute ventilation, GA · CO2 pneumoperitoneum → EtCO2/PaCO2 rise from CO2 absorption over 15–30 min | iap 14; dCoPct 0; dSvrPct 0; dMapPct 0; dHr 0; dCvp 0; crs0 55; crs15 55; dCrsPct 0; ppeak0 19.58; ppeak10 19.58; dPpeak 0; dFrc 0; dEtco2At25 0; dPaco2At25 0; uop0 21.6; uop20 22.2; uopC20 22.2; dUopPct 0; dHbf 0; dPao2 0 | no CO2-insufflation input: the IAP event is a pressure only (organs.iap); there is no exogenous CO2 load (VCO2 +20–30 %, EtCO2 +5–10 at fixed MV) — research/12 marks it NE | **NE** | S5 · new: surgical event "CO2 pneumoperitoneum" → Stage 3 exogenous VCO2 |
| SP-08e | P1 | X-A ventilated, GA · supine → IAP 14: urine output over +15–25 min vs no IAP | iap 14; dCoPct 0; dSvrPct 0; dMapPct 0; dHr 0; dCvp 0; crs0 55; crs15 55; dCrsPct 0; ppeak0 19.58; ppeak10 19.58; dPpeak 0; dFrc 0; dEtco2At25 0; dPaco2At25 0; uop0 21.6; uop20 22.2; uopC20 22.2; dUopPct 0; dHbf 0; dPao2 0 | WR: dUopPct = 0 above [-100, -30] [research/12 SP-08 (UO ↓); WSACS 2013 (IAH ≥ 12 mmHg: oliguria); Chiu AW et al., J Endourol 1995 [VERIFY] (pneumoperitoneum 15 mmHg: UO −60 %)] | **WR** | S4 · 7d renal/model.ts (IAP → renal vein and Bowman pressure, RH H4) |
| SP-10a | P2 | X-A ventilated, GA, IAP 14 · laparoscopy → gas embolism (`lungCondition vae 1`, the only embolism row) at 20 min: EtCO2 in the first minute and at 5 min; SpO2, PAP, MAP | dEtco2Max1 -1.16; dEtco2At1 -3.01; dEtco2At5 -2.17; dSpo2At10 0; dPap5 2.2; dMapPct10 -0.8; dCoPct10 9.2; etco2Rises false | PL: dEtco2At5 = -2.17 in [-10, -2] [tables §20 (EtCO2 falls 2–10 mmHg within 1–3 breaths, normal capnogram shape); research/12 SP-10]<br>WR: etco2Rises = false (expected true) [research/12 SP-10 (CO2 embolism: EtCO2 ↑ then ↓ — the CO2 gas is absorbed and exhaled before the dead-space fall; Shulman D, Aronson HB, Can Anaesth Soc J 1984;31:455–9 [VERIFY]); Barash 9e (laparoscopy: CO2 embolism)]<br>HAND MI (automatic WR): Only an AIR embolism row exists (lung vae: PVR × 1.375, alveolar dead space +0.14): the EtCO2 falls (PL on the dead-space part) but a CO2 embolus cannot raise it first — no gas type, no CO2 load. The "mill-wheel" murmur and the paradoxical embolism are out of scope. | **MI** | S5 · 7b lung-pathology.ts vae row (air only) → new: gas type / CO2 load (surgical-event stage) |
| SP-10b | P2 | X-A ventilated, GA · laparoscopy, extraperitoneal insufflation → subcutaneous emphysema: EtCO2/PaCO2 rise over 30–60 min at a fixed MV | — | no CO2-absorption input (the same missing exogenous-VCO2 load as SP-08d); no subcutaneous-gas state | **NE** | S5 · new: surgical event "CO2 pneumoperitoneum / emphysema" → Stage 3 exogenous VCO2 |

### 2.5 Positioning (P1/P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-11a | P1 | X-A ventilated, GA · supine → head-down → steep Trendelenburg 30° (robotic prostatectomy): CVP ↑, venous return ↑ (MAP/CO ~) | — | rejected: `position` accepts only `headUpDeg` 0–90 ("headUpDeg must be 0–90" for −30, and for a `trendelenburgDeg` field); no head-down posture exists (research/11 D17; FU-8 W17: posture → Ali) | **NE** | S6 · new: patient `position` (posture) state — FU-7+ "surgical events and posture" / Ali (FU-8 W17) |
| SP-11b | P1 | X-A ventilated, GA · supine → head-down → Trendelenburg 30°: ICP ↑, IOP ↑, cerebral venous congestion | — | rejected: `position` accepts only `headUpDeg` 0–90 ("headUpDeg must be 0–90" for −30, and for a `trendelenburgDeg` field); no head-down posture exists (research/11 D17; FU-8 W17: posture → Ali) | **NE** | S6 · new: patient `position` (posture) state — FU-7+ "surgical events and posture" / Ali (FU-8 W17) |
| SP-11c | P1 | X-A ventilated, GA · supine → head-down → Trendelenburg 30° (+ pneumoperitoneum): FRC ↓, Crs ↓ 30–50 %, Ppeak ↑ | — | rejected: `position` accepts only `headUpDeg` 0–90 ("headUpDeg must be 0–90" for −30, and for a `trendelenburgDeg` field); no head-down posture exists (research/11 D17; FU-8 W17: posture → Ali) | **NE** | S6 · new: patient `position` (posture) state — FU-7+ "surgical events and posture" / Ali (FU-8 W17) |
| SP-11d | P1 | X-A ventilated, GA · supine → head-down → Trendelenburg: ETT migration toward endobronchial (carina moves cephalad) | — | rejected: `position` accepts only `headUpDeg` 0–90 ("headUpDeg must be 0–90" for −30, and for a `trendelenburgDeg` field); no head-down posture exists (research/11 D17; FU-8 W17: posture → Ali) | **NE** | S6 · new: patient `position` (posture) state — FU-7+ "surgical events and posture" / Ali (FU-8 W17) |
| SP-12a | P1 | X-A ventilated, GA (sevoflurane 2.1 %) · supine → beach-chair (head-up 70°) at 20 min: arm MAP minus MAP at the head (hydrostatic gradient) | map70 81.44; mapHead70 63.89; grad70 17.55; grad30 9.43; dMapPct70 0; dCoPct70 0.2; dCvp70 0.03; dHr70 0; cpp0 73.27; cpp70 60.57; dCppPct70 -17.8; icp70 3.32; icp0 5.49; cbf70 0.43; sjvo2_70 0.63; pbto2_70 41.29; dispMap70 81.45; cbf0 0.43; sjvo2_0 0.63; pbto2_0 41.37 | PL: grad70 = 17.55 in [15, 25] [research/12 SP-12 (MAP at head = arm MAP − 0.77 mmHg/cm); Pohl A, Cullen DJ, J Clin Anesth 2005;17:463–9 (beach-chair: 20–30 cm heart-to-brain, ≈ 15–22 mmHg) [VERIFY]] | **PL** | — · 7d brain/model.ts headUp() (HEAD_HEIGHT_CM 25 × sin θ, 0.74 mmHg/cm) |
| SP-12b | P1 | X-A ventilated, GA · supine → beach-chair 70°: systemic MAP and CO (venous pooling) at +10 min vs supine | map70 81.44; mapHead70 63.89; grad70 17.55; grad30 9.43; dMapPct70 0; dCoPct70 0.2; dCvp70 0.03; dHr70 0; cpp0 73.27; cpp70 60.57; dCppPct70 -17.8; icp70 3.32; icp0 5.49; cbf70 0.43; sjvo2_70 0.63; pbto2_70 41.29; dispMap70 81.45; cbf0 0.43; sjvo2_0 0.63; pbto2_0 41.37 | WR: dMapPct70 = 0 above [-40, -10] [Buhre W et al., J Cardiothorac Vasc Anesth 2002 / Br J Anaesth 2003 [VERIFY] and Lee JH et al., Korean J Anesthesiol 2011: sitting/beach-chair under GA lowers CO 15–20 % and MAP 15–30 % (venous pooling; hypotension in up to 40 %); research/12 SP-12 (cerebral desaturation risk)]<br>WR: dCoPct70 = 0.2 above [-30, -10] [Buhre 2003 [VERIFY]]<br>HAND MI (automatic WR): Head-up is a brain-only input (brain/model.ts:99–110: MAP/CVP at the head, 2.9 mL cerebral venous volume at 30°): 7a has no posture term, so sitting a GA patient up at 70° moves arm MAP, CO and CVP by 0. | **MI** | S6 · new: 7a posture term (gravitational venous pooling: unstressed volume / Pmsf by tilt angle, lower-limb capacitance) |
| SP-12c | P1 | X-A ventilated, GA · supine → beach-chair 70°: cerebral perfusion pressure (and ICP, CBF) at head level vs supine | map70 81.44; mapHead70 63.89; grad70 17.55; grad30 9.43; dMapPct70 0; dCoPct70 0.2; dCvp70 0.03; dHr70 0; cpp0 73.27; cpp70 60.57; dCppPct70 -17.8; icp70 3.32; icp0 5.49; cbf70 0.43; sjvo2_70 0.63; pbto2_70 41.29; dispMap70 81.45; cbf0 0.43; sjvo2_0 0.63; pbto2_0 41.37 | PL: dCppPct70 = -17.8 (sign -1, beyond 10) [research/12 SP-12; Murphy GS et al., Anesth Analg 2010;111:496–505 (beach-chair: cerebral desaturation events in 80 % vs 0 % lateral) [VERIFY]] | **PL** (direction only) | — · 7d brain/model.ts (CPP at head; autoregulation keeps CBF) / DEV: the monitor shows arm MAP only |
| SP-22 | P2 | X-A ventilated, GA · liver resection → low-CVP technique: GTN 1 µg/kg/min + 15° head-up vs GTN alone: CVP at 15 min | cvpTilt 6.08; cvpGtn 6.17; cvp0 8.18; dCvpTilt -0.09; dMapTilt -0.27 | TW: dCvpTilt = -0.09 above [-6, -1] [research/12 SP-22 (CVP < 5); Melendez JA et al., J Am Coll Surg 1998;187:620–5; Jones RM et al., Br J Surg 1998 [VERIFY]: 15° head-up tilt lowers CVP by a few mmHg on top of the vasodilator]<br>HAND MI (automatic TW): Head-up is brain-only (SP-12b): the tilt adds nothing to the GTN (ΔCVP 0). The blood-loss half of the cell (bleeding ↓ at low CVP) has no surgical-bleeding-vs-CVP coupling either. | **MI** | S6 · new: 7a posture term (same as SP-12b) |
| SP-13a | P2 | ARDS (moderate) ventilated · — → prone position: PaO2 ↑ (V/Q, dorsal recruitment; PROSEVA physiology) | — | rejected: `position` accepts only `headUpDeg` 0–90; no prone/lateral/lithotomy posture exists (research/11 D17; FU-8 W17: posture → Ali; FU-6 Q-FU6-6 for the lateral) | **NE** | S6 · new: posture state → 7b regional V/Q (FU-7+ / Ali) |
| SP-13b | P2 | ARDS (moderate) ventilated · — → prone: Crs ~ (chest-wall compliance ↓, lung ↑) | — | rejected: `position` accepts only `headUpDeg` 0–90; no prone/lateral/lithotomy posture exists (research/11 D17; FU-8 W17: posture → Ali; FU-6 Q-FU6-6 for the lateral) | **NE** | S6 · new: posture state → 7b |
| SP-13c | P2 | ARDS (moderate) ventilated · — → prone with the abdomen compressed: IAP ↑, venous return ↓ | — | rejected: `position` accepts only `headUpDeg` 0–90; no prone/lateral/lithotomy posture exists (research/11 D17; FU-8 W17: posture → Ali; FU-6 Q-FU6-6 for the lateral) | **NE** | S6 · new: posture state → 7a/7d |
| SP-14a | P2 | X-A ventilated · — → lateral decubitus (two-lung): non-dependent ventilation, dependent perfusion (V/Q mismatch) | — | rejected: `position` accepts only `headUpDeg` 0–90; no prone/lateral/lithotomy posture exists (research/11 D17; FU-8 W17: posture → Ali; FU-6 Q-FU6-6 for the lateral) | **NE** | S6 · new: posture state → 7b perfusion split (FU-6 Q-FU6-6) |
| SP-14b | P2 | X-A ventilated, GA, FiO2 1, VT 350 × 16 (supine: no lateral posture exists) · thoracotomy → one-lung ventilation (left lung isolated) for 40 min: PaO2 at 30 min | pao2Pre 299.7; pao2At5 282.67; pao2At30 111.12; pao2Min 91.11; spo2Min 96; shuntAt30 0.13; shuntAt5 0.05; hpvGain 19.94; tNadirMin 8.7; flowLAt30 0.27; flowLAt0 0.42; effShuntAt30 0.12; dPap30 3.76; crsOlv 34 | TS: pao2At30 = 111.12 below [150, 250] (lower = stronger/faster) [tables §22 / catalogue §22 (OLV in the lateral position at FiO2 1: PaO2 150–250); Miller 10e ch. 49; research/12 SP-14] | **TS** (FU-6 Q-FU6-6 pending) | S6 (FU-6 Q-FU6-6) · 7b perfusion split (posture: FU-6 Q-FU6-6; A09-F3 R13) |
| SP-14c | P2 | X-A ventilated, GA, FiO2 1 · thoracotomy → OLV: shunt and the non-ventilated lung's flow share at 30 min (HPV) | pao2Pre 299.7; pao2At5 282.67; pao2At30 111.12; pao2Min 91.11; spo2Min 96; shuntAt30 0.13; shuntAt5 0.05; hpvGain 19.94; tNadirMin 8.7; flowLAt30 0.27; flowLAt0 0.42; effShuntAt30 0.12; dPap30 3.76; crsOlv 34 | TW: effShuntAt30 = 0.12 below [0.2, 0.3] [catalogue §22 (shunt 20–30 %); Miller 10e ch. 49 p. 1538]<br>TS: flowLAt30 = 0.27 above [0.2, 0.25] [catalogue §22 (non-ventilated lung flow: gravity 40 % in the lateral, HPV → 20–25 %); Miller 10e ch. 49] | **TS** (FU-6 Q-FU6-6 pending) | S6 (FU-6 Q-FU6-6) · 7b perfusion / HPV (posture: FU-6 Q-FU6-6); note `shunt` = true shunt only, the PaO2 111 is low-V/Q admixture of the absorbing lung |
| SP-15a | P2 | X-A GA · — → lithotomy, legs up: autotransfusion ≈ 300 mL (CVP ↑, CO ↑) | — | rejected: `position` accepts only `headUpDeg` 0–90; no prone/lateral/lithotomy posture exists (research/11 D17; FU-8 W17: posture → Ali; FU-6 Q-FU6-6 for the lateral) | **NE** | S6 · new: posture state → 7a unstressed volume |
| SP-15b | P2 | X-A GA · — → legs down at the end: hypotension (−10–20 %) | — | rejected: `position` accepts only `headUpDeg` 0–90; no prone/lateral/lithotomy posture exists (research/11 D17; FU-8 W17: posture → Ali; FU-6 Q-FU6-6 for the lateral) | **NE** | S6 · new: posture state → 7a |

### 2.6 Surgical bleeding (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-19a | P1 | X-A ventilated, GA (sevoflurane 2.1 %) · normovolaemic → sudden surgical haemorrhage 1 L in 1 min at 20 min (no fluids): MAP nadir and HR over 10 min vs no bleed | sDMapMinPct -35.9; sTMinS 70; sDHr5 6; sDHrMax 8; oDMapMinPct -36.2; oDHr50 6; sHb1 14.95; sHb60 14.34; oHb60 14.5; hb0 15; sBv60 0.83; oBv60 0.82; suddenDeeper false; sDLact30 1.64; sDMap60Pct -42.4; sRefillMl 170.3; sMap10 63.48; sMap60 48.35; sLact60 4.87; sBaroSet60 56.5; oBaroSet60 62.25; oMap60 53.62; cBaroSet60 95.28; sRecovery -15.13 | PL: sDMapMinPct = -35.9 (sign -1, beyond 15) [ATLS 10e (class II, 15–30 % of blood volume: tachycardia, narrowed pulse pressure; the reflex response is blunted under GA, so hypotension appears earlier); research/12 SP-19]<br>PL: sDHrMax = 8 (sign 1, beyond 5) [ATLS 10e (HR 100–120 in class II, awake); direction under GA]<br>WR: sRecovery = -15.13 (expected sign 1) [ATLS 10e (class II is a compensated state); Guyton, ch. 24 (after a 20 % loss the baroreflex, humoral arm and transcapillary refill restore MAP toward normal over 30–60 min — no late decompensation without further loss)]<br>HAND WR (automatic WR): After the 1 L loss (20 % of blood volume) the MAP recovers to 63.5 at +10 min and then FALLS for 50 min without further bleeding — 63.5 → 48.3 mmHg at +60 min, lactate 1.0 → 4.9 — because the baroreflex set point resets downward 35 % of the error every 7 min (baroreflex.ts:34–36, 135–138: 95.3 → 56.5 mmHg), withdrawing the compensation. Audit 08 G13, FU-4 D18 left unchanged, Ali Q8 open. | **WR** (direction only) | S7 (A08 G13) · 7a circ/baroreflex.ts RESET_HOLD_S/RESET_GAIN (A08 G13; FU-4 D18; Ali Q8) |
| SP-19b | P1 | X-A ventilated, GA · normovolaemic → the same 1 L as a 20 mL/min ooze over 50 min vs the sudden loss: MAP course and Hb at 60 min (transcapillary refill) | sDMapMinPct -35.9; sTMinS 70; sDHr5 6; sDHrMax 8; oDMapMinPct -36.2; oDHr50 6; sHb1 14.95; sHb60 14.34; oHb60 14.5; hb0 15; sBv60 0.83; oBv60 0.82; suddenDeeper false; sDLact30 1.64; sDMap60Pct -42.4; sRefillMl 170.3; sMap10 63.48; sMap60 48.35; sLact60 4.87; sBaroSet60 56.5; oBaroSet60 62.25; oMap60 53.62; cBaroSet60 95.28; sRecovery -15.13 | WR: suddenDeeper = false (expected true) [research/12 SP-19 (different reflex/fluid-shift time courses): a slow loss is compensated (MAP drop smaller) while the sudden one is not; ATLS 10e]<br>PL: sRefillMl = 170.3 (sign 1, beyond 100) [Drucker WR et al. 1981 / Hahn 2010 (transcapillary refill after haemorrhage restores ≈ 0.25–0.5 L/h early) [VERIFY]]<br>HAND WR (automatic WR): The slow ooze reaches the same MAP nadir as the sudden loss (−36 % in both): 50 min of transcapillary refill (≈ 170 mL) and humoral compensation buy nothing, because the same downward baroreflex resetting (A08 G13) erodes the compensation during the ooze as it does after the sudden loss. | **WR** (direction only) | S7 (A08 G13) · 7a circ/baroreflex.ts resetting (A08 G13) / 7c transcapillary refill |

### 2.7 Tourniquet, cross-clamp, cement, VAE, thoracic, CPB, diathermy (P2/P3)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-16a | P2 | X-A GA · — → lower-limb tourniquet 60 min: late tourniquet hypertension | — | rejected: `tourniquet` → "command type applyEvent is not implemented until later stages"; no tourniquet event | **NE** | S13 · new: surgical event "tourniquet" (FU-7+) |
| SP-16b | P2 | X-A GA · — → tourniquet release: EtCO2 +5–10 at fixed MV, PaCO2 ↑ | — | rejected (no tourniquet event) | **NE** | S13 · new: tourniquet release → Stage 3 CO2 washout |
| SP-16c | P2 | X-A GA · — → release: K⁺ ↑ 0.2–0.5, lactate ↑, pH ↓ | — | rejected (no tourniquet event) | **NE** | S13 · new: tourniquet release → 7c ischaemic-limb washout |
| SP-16d | P2 | X-A GA · — → release: MAP ↓ 10–20 %, core T ↓ 0.3–0.7 °C | — | rejected (no tourniquet event) | **NE** | S13 · new: tourniquet release → 7a vasodilatation / 7e heat redistribution |
| SP-17a | P2 | X-E + CAD · — → infrarenal aortic cross-clamp: afterload ↑, MAP ↑ 7–10 %, LV strain | — | rejected: `condition crossClamp` → "arrives in Stage 7"; no clamp event | **NE** | S13 · new: surgical event "aortic cross-clamp" (FU-7+) |
| SP-17b | P2 | X-E + CAD · — → suprarenal / supracoeliac clamp: MAP ↑ 50 %, ischaemia (ST), renal/splanchnic flow 0 | — | rejected (no clamp event) | **NE** | S13 · new: clamp level → 7a/7d |
| SP-17c | P2 | X-E + CAD · — → unclamping: hypotension (declamping shock), SVR ↓ | — | rejected (no clamp event) | **NE** | S13 · new: declamping → 7a |
| SP-17d | P2 | X-E + CAD · — → unclamping: acidosis, K⁺ ↑, lactate washout, EtCO2 ↑ | — | rejected (no clamp event) | **NE** | S13 · new: declamping → 7c washout |
| SP-18a | P2 | X-E (80 y) ventilated FiO2 0.5, GA (sevoflurane 1.5 %) · hemiarthroplasty → cementing: BCIS grade 1 (`lungCondition fatEmbolism 0.33`) at 20 min: EtCO2, SpO2, MAP, PAP | g1dEtco2 -1.14; g1dSpo2Min 0; g1spo2Min 99; g1dMapMinPct -1.4; g1sbpMinPct -1.5; g1dPap 1.52; g1dCvp 0.28; g1mapMin 91.22; g1arrest false; g1collapse false; g2dEtco2 -3.07; g2dSpo2Min 0; g2spo2Min 99; g2dMapMinPct -3.9; g2sbpMinPct -4.3; g2dPap 3.62; g2dCvp 0.01; g2mapMin 89.33; g2arrest false; g2collapse false; g3dEtco2 -5.26; g3dSpo2Min 0; g3spo2Min 99; g3dMapMinPct -7.6; g3sbpMinPct -8.2; g3dPap 6.96; g3dCvp 0.78; g3mapMin 86.3; g3arrest false; g3collapse false | TW: g1dEtco2 = -1.14 above [-15, -5] [tables §19 (monitor signature at cementing: EtCO2 −5–15, SpO2 −3–10 %, MAP −20–40 %, CVP/PAP ↑)]<br>TW: g1dMapMinPct = -1.4 above [-40, -20] [tables §19; Donaldson AJ et al., Br J Anaesth 2009;102:12–22 (BCIS grade 1: SpO2 < 94 % or SBP fall > 20 %)]<br>TW: g1dPap = 1.52 (sign 1, beyond 2) [tables §19 (PAP ↑); Donaldson 2009]<br>HAND TW (automatic TW): Grade 1 (severity 0.33): EtCO2 −1.1, MAP −1.4 %, RVSP +1.5, SpO2 unchanged (99 %) in an 80-year-old. The fatEmbolism row carries PVR × 1.22 and alveolar dead space +0.07 only (lung-pathology.ts §19) — no shunt/V/Q term (BCIS hypoxaemia), no mediator (histamine/complement) vasodilatation. | **TW** | S10 · 7b lung-pathology.ts fatEmbolism (add shunt/low-V/Q and a systemic vasodilator term) → 7a RV |
| SP-18b | P2 | X-E ventilated, GA · hemiarthroplasty → BCIS grade 2 and 3 (`fatEmbolism 0.67 / 1.0`): SpO2 < 88 % or SBP fall > 40 % (grade 2); cardiovascular collapse needing CPR (grade 3) | g1dEtco2 -1.14; g1dSpo2Min 0; g1spo2Min 99; g1dMapMinPct -1.4; g1sbpMinPct -1.5; g1dPap 1.52; g1dCvp 0.28; g1mapMin 91.22; g1arrest false; g1collapse false; g2dEtco2 -3.07; g2dSpo2Min 0; g2spo2Min 99; g2dMapMinPct -3.9; g2sbpMinPct -4.3; g2dPap 3.62; g2dCvp 0.01; g2mapMin 89.33; g2arrest false; g2collapse false; g3dEtco2 -5.26; g3dSpo2Min 0; g3spo2Min 99; g3dMapMinPct -7.6; g3sbpMinPct -8.2; g3dPap 6.96; g3dCvp 0.78; g3mapMin 86.3; g3arrest false; g3collapse false | TW: g2sbpMinPct = -4.3 above [-100, -40] [Donaldson 2009 (grade 2: SpO2 < 88 % or SBP fall > 40 %); Olsen F et al., Br J Anaesth 2014;113:800–6]<br>WR: g3collapse = false (expected true) [Donaldson 2009 (grade 3: cardiovascular collapse requiring CPR); Olsen 2014 (grade 3 mortality ≈ 90 % at 30 days)]<br>HAND WR (automatic WR): Grade 3 (severity 1: PVR × 2.33) in an 80-year-old under GA: MAP −7.6 %, SBP −8.2 %, RVSP +7, SpO2 99 %, no collapse, no arrest; grade 2 SBP −4.3 %. The BCIS grade-3 teaching case (cardiovascular collapse needing CPR) cannot happen from the row. | **WR** | S10 · 7b fatEmbolism → 7a RV failure / FU-4 arrest (the elderly RV and the mediator arm) |
| SP-20a | P2 | X-A ventilated, GA, sitting (head-up 60°) · posterior-fossa craniotomy → venous air entry (`lungCondition vae 1`) at 20 min: EtCO2 within 1–3 breaths and at 5 min | dEtco2At15s -3.19; dEtco2At1 -3; dEtco2At5 -2.17; dPap5 2.36; dSpo2At10 0; dMapPct10 -0.8; dCoPct10 5.7; n2oDEtco2At5 -2.26; n2oDMapPct10 -0.5; n2oWorse 0.17 | PL: dEtco2At1 = -3 in [-10, -2] [tables §20 (EtCO2 falls 2–10 mmHg within 1–3 breaths); Miller 9e ch. 57 (neuroanaesthesia: VAE in the sitting position)] | **PL** | — · 7b lung-pathology.ts vae (dead space) |
| SP-20b | P2 | X-A ventilated, GA, sitting · posterior-fossa craniotomy → VAE: PAP, SpO2 and MAP/CO over 10 min | dEtco2At15s -3.19; dEtco2At1 -3; dEtco2At5 -2.17; dPap5 2.36; dSpo2At10 0; dMapPct10 -0.8; dCoPct10 5.7; n2oDEtco2At5 -2.26; n2oDMapPct10 -0.5; n2oWorse 0.17 | PL: dPap5 = 2.36 (sign 1, beyond 2) [Miller 9e ch. 57 (PAP ↑, then SpO2 ↓ and CO/MAP ↓ as entry continues)]<br>TW: dMapPct10 = -0.8 (sign -1, beyond 5) [tables §20 pitfall (the blood pressure falls later); Miller 9e ch. 57]<br>HAND TW (automatic TW): RVSP +2.4 and EtCO2 −3 are right in direction, but at 10 min MAP is −0.8 % and CO is +5.7 % (higher than the control), SpO2 unchanged: continuous entry at the row's maximum (4 mL/kg/min) never compromises the circulation; the RV air lock is not encoded (tables §20). | **TW** (direction only) | S11 · 7b vae (PVR × 1.375 only) → 7a RV afterload |
| SP-20c | P2 | X-A ventilated, GA with N2O 50 %, sitting · VAE → N2O worsens VAE (diffusion into the bubbles: larger emboli, PAP ↑ more) | dEtco2At15s -3.19; dEtco2At1 -3; dEtco2At5 -2.17; dPap5 2.36; dSpo2At10 0; dMapPct10 -0.8; dCoPct10 5.7; n2oDEtco2At5 -2.26; n2oDMapPct10 -0.5; n2oWorse 0.17 | no N2O diffusion into gas spaces (research/12 §5.11 FU-7 list; DI-20 NE): the N2O arm is measured for the record only | **NE** | FU-7 (N2O) · FU-7+ (N2O space expansion; research/12 §5.11) |
| SP-23a | P2 | X-A ventilated, GA, FiO2 1 · thoracotomy → OLV onset: PaO2 nadir (absorption of the isolated lung's O2) then recovery by HPV to 40 min | pao2Pre 299.7; pao2At5 282.67; pao2At30 111.12; pao2Min 91.11; spo2Min 96; shuntAt30 0.13; shuntAt5 0.05; hpvGain 19.94; tNadirMin 8.7; flowLAt30 0.27; flowLAt0 0.42; effShuntAt30 0.12; dPap30 3.76; crsOlv 34 | PL: hpvGain = 19.94 (sign 1, beyond 5) [Miller 10e ch. 49 (PaO2 falls over the first 10–20 min as the isolated lung's O2 is absorbed, then HPV halves its flow over 15–30 min and PaO2 improves) [direction]] | **PL** (direction only) | — · 7b lung/perfusion.ts HPV (τ 5 min, phase 2 at 40 min) |
| SP-23b | P2 | X-A OLV · — → pulmonary-artery clamp (pneumonectomy): shunt falls, RV afterload ↑ | — | no unilateral PA occlusion: `lungCondition pe` is not sided (lung-pathology.ts `pe` sided: false; its PVR is 7a's whole-lung φ mapping) | **NE** | S13 · new: sided PA occlusion in 7b perfusion split |
| SP-24 | P3 | cardiac surgery · — → cardiopulmonary bypass on/off | — | no CPB device (research/12: 7h) | **NE** | 7h · 7h devices |
| SP-25a | P3 | X-A ventilated, GA · surgery → diathermy burst 10 s (ECG `artefact.electrosurgery`): the displayed HR and its flag vs the arterial pulse rate | hrTrue 71; dispHrMin 78; dispHrMax 158; prAbp 70; hrFlags valid; flagged false; dispHrDev 87 | WR: flagged = false (expected true) [IEC 60601-2-27 / monitor manuals: electrosurgical interference is shown on the ECG and the ECG-derived HR is flagged/held (or the pulse-rate source takes over) rather than counted; research/12 SP-25]<br>HAND WR (automatic WR): During the 10 s burst the displayed HR reads up to 158/min (truth 71; arterial pulse rate 70) and stays flagged `valid`: the electrosurgery artefact is counted as QRS complexes and nothing falls back to the pulse-rate source or holds the value. | **WR** (direction only) | S12 · L3 monitor HR source/validity (FU-5 fidelity; audit 10 M-cells) |
| SP-25b | P3 | X-A with an implanted pacemaker · — → diathermy: pacemaker inhibition (oversensing) → pauses/asystole in the pacemaker-dependent | — | no electromagnetic-interference coupling from the electrosurgery artefact to the implanted pacemaker; pacemaker-dependent profile absent (research/12 §5.11) | **NE** | 7h · 7h / FU-7+ (EMI → pacer sensing) |

### 2.8 MANUAL twins (direction-only; Q9 open)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| SP-M1 | P1 | X-A ventilated, MANUAL · propofol 2 mg/kg at 240 s → laryngoscopy 1.5 at 300 s for 60 s (MODELED twin SP-01a) | dMap 1.37; dHr 12; dNe 128.48; map0 89.34 | PL: dNe = 128.48 (sign 1, beyond 20) [Q9 (MANUAL: the instructor owns the pressures; the humoral arm still answers the stimulus) — direction only] | **PL** (direction only) | — · Q9 (MANUAL physiology) / 7e hormones |
| SP-M2 | P1 | X-A ventilated, GA, MANUAL · laparotomy, incision held → peritoneal traction (MODELED twin SP-06a) | dHrMin 0; dHrMinPct 0; hr0 76 | PL: dHrMinPct = 0 (quiet, tol ±5) [Q9 working assumption (audit 08: MANUAL = the instructor's targets + the NON-reflex physiology): a vagal reflex is off — the FU-4 G7 event is MODELED-only by design (circ/model.ts: `env.modeled ? vagalEventMs(m) : 0`); direction only until Q9 is ruled] | **PL** (direction only) | — · Q9 / 7a circ/model.ts (vagal event MODELED-only) |
| SP-M3 | P1 | X-A ventilated, GA, MANUAL · normovolaemic → sudden 1 L haemorrhage (MODELED twin SP-19a): MAP and HR at 10 and 30 min | dMapPct10 -37; dMapPct30 -34.6; dHr10 5; dLact30 2.31 | PL: dMapPct10 = -37 (sign -1, beyond 5) [Q9 (audit 08: MANUAL keeps the non-reflex physiology — a volume loss lowers the pressure) — direction only] | **PL** (direction only) | — · Q9 / 7a MANUAL volume path |

## 3. New gaps no stage owns, ranked, with the smallest mechanism and the file that would fix each

The line numbers are on 7954933 (engine code ed530d5; `packages/engine-core/src/`).

### S7 — Downward baroreflex resetting turns a class II bleed into late decompensation (A08 G13, P1; owner 7a — Ali Q8)
- **Cells:** SP-19a (WR), SP-19b (WR); twin SP-M3 (MANUAL: −37 % at 10 min, −35 % at 30 min, lactate +2.3).
- **Measured:** 1 L in 60 s under sevoflurane 1 MAC:
  - MAP falls −35.9 % at 70 s, with HR only +8;
  - MAP recovers to 63.5 at +10 min, then falls to 55 (+30 min) and 48.3 (+60 min), with lactate 4.9;
  - `baro.set` 95.3 → 56.5 mmHg;
  - transcapillary refill ≈ 170 mL in the hour;
  - the 20 mL/min ooze ends at the same −36 % with `baro.set` 62.3.
- **Code:** `l2/circ/baroreflex.ts:34–36` (`RESET_FRAC 0.05`, `RESET_HOLD_S 420`, `RESET_GAIN 0.35`, [ENG-Pulse] N-P16)
  and `:135–138`. FU-4 D18 left it unchanged; Ali Q8 ("hours instead?") is open.
- **Smallest mechanism:** keep acute resetting, but make it slow and partial:
  - τ of hours, capped at ≈ 30–50 % of the step (Chapleau/Krieger);
  - freeze it while the error is a volume loss (cardiopulmonary limb unloaded / `bvRel` < 0.9), so the reflex keeps
    defending the pre-loss pressure. The humoral arm (AVP/angiotensin) then holds MAP as in the textbook.
- **Tests moved:** A08 C4 (class IV HR 183 → 116) and the tamponade set-point test named in G13; SP-19a/b become the
  acceptance arms. The arrest tests of FU-4 (class IV) must be re-checked.

### S3 — Surgical stimuli under a maintained balanced anaesthetic are almost silent (P1; owner FU-7 Task 10 — routed)
- **Cells:** SP-02a (TW), SP-03 (TW), SP-26 (TW).
- **Measured:**
  - incision at 1.01 MAC without opioid: ΔMAP +7.0 (+8.4 %), ΔHR +8 (+11 %);
  - at 1 MAC + fentanyl 3 µg/kg (given 29 min before): sternotomy (1.5) +1.2 mmHg, incision (1.0) +0.8, closure −1.7;
  - noradrenaline +17 pg/mL at sternotomy.
- **Code:** `l2/neuro/depth.ts:82–86`: `antinoc = 1 − (1 − bOp)(1 − bHyp)`, with bHyp 50 % at 1 MAC-eq (cube). Both 7e's
  hormones and the surge read `noxious·(1 − antinoc)` (`endo/core.ts:171`). FU-7 Task 10 Step 1c (addendum 25) moves
  the catecholamine RELEASE to the opioid/lidocaine share, which should restore most of it.
- **Smallest mechanism:** Task 10's own. What is missing is acceptance arms in the maintenance phase (§4 item 2).
- **Tests moved:** none today; Task 10's `stimulus-surge.test.ts` gains the arms.

### S1 — Airway instrumentation carries no nociception (new, P1; owner engine airway event → 7e)
- **Cells:** SP-04 (MI), SP-05 (MI).
- **Measured:**
  - `airwayDevice ett` or `sga` at 300 s after propofol: ΔMAP 0, ΔHR 0;
  - extubation of an awake patient (DI 84, MAC 0.22) at 50 min: ΔMAP 0, ΔHR 0 against the tube left in;
  - no cough or straining.
- **Code:** `l2/neuro/pipeline.ts:148–150` (the airway flag), Stage 3 mechanics. The only nociceptive input is
  `stimulus` (`engine.ts:776–778` → `endo/pipeline.ts:119–121`).
- **Smallest mechanism:** the engine turns an airway-device change into a timed noxious impulse through the ONE
  stimulus path, so 7f's antinociception blunts it as it blunts laryngoscopy:
  - ETT insertion 1.5 for 60 s;
  - SGA ≈ 1.0 for 30 s;
  - extubation 1.0 for 60 s.

  An instructor `stimulus` still overrides it. This does not add a second shape (R51 addendum 12): it is a sender of
  the existing event.
- **Tests moved:** 7f airway-flag tests (unchanged numbers); new SP-04/SP-05 arms.

### S2 — The laryngoscopy vagal site gives adults a bradycardia (new, P1; owner 7a — FU-4 G7 constants)
- **Cell:** SP-01f (WR).
- **Measured:** `stimulus 1.5 site laryngoscopy` after propofol: HR 76 → 58 (−18 vs control) in the first 60 s. The
  surge wins only after the 120 s fatigue τ (+7). Without the site the adult gives +8.
- **Code:** `l2/circ/model.ts:69–71` (`VAGAL_STIM_MS.laryngoscopy 300`, `PER_INTENSITY false`), `:253–259`, `:337`.
- **Smallest mechanism:** scale the laryngoscopy vagal increment by an age factor. The vagal predominance of infancy
  makes it ≈ 1 under 1 y and ≈ 0 in adults unless a second succinylcholine dose is on board, and it is scaled by
  intensity like the traction sites. The paediatric size stays with PD.
- **Tests moved:** `test/engine/vagal-events.test.ts:105` (the adult laryngoscopy arm must stop slowing the node, or
  move to a child profile).

### S4 — Pneumoperitoneum is inert, even in the kidney (P1; owners FU-9 amendment (H4/H5), FU-6 (lung), new vagal coupling)
- **Cells:** SP-08a, 08b, 08c (MI), SP-08e (WR), SP-09 (MI).
- **Measured:** IAP 14 under GA:
  - CO, SVR, MAP, CVP, HR, Crs (55 → 55), Ppeak (19.6 → 19.6), FRC and PaO2 all Δ 0;
  - UO 22.2 vs 22.2 mL/h;
  - hepatic flow Δ 0;
  - the insufflation step triggers no vagal event.
- **Code:** IAP is read only in `l2/renal/model.ts:64, 90, 128` (Bowman/venous back-pressure). RH found that
  natriuresis reads MAP, not MAP − IAP (H4), and that nothing else reads IAP (H5).
- **Smallest mechanism:**
  - (a) 7a: an abdominal venous compartment whose outflow resistance rises with IAP (venous return ↓ at normal volume,
    ↑ transiently at high volume), plus an afterload term (aortic/splanchnic compression; SVR +).
  - (b) 7b: chest-wall elastance + k·IAP and FRC ↓ (cephalad diaphragm). The `chestWall` row already exists as the
    shape.
  - (c) 7d: renal perfusion pressure = MAP − max(IAP, CVP) into natriuresis.
  - (d) An IAP rise faster than a threshold rate starts the FU-4 G7 peritoneal vagal event.
- **Tests moved:** RH-06a–d, SP-08a–c/e, SP-09; organs-renal IAP tests.

### S6 — Posture: head-up is brain-only; every other posture is missing (P1/P2; owner a posture stage — Ali W17)
- **Cells:** SP-12b (MI), SP-22 (MI); NE SP-11a–d, 13a–c, 14a, 15a/b.
- **Measured:**
  - head-up 70° under GA: MAP Δ 0.0 %, CO +0.2 %, CVP +0.03 (expected MAP/CO −15–30 %);
  - head-up 15° on GTN: CVP Δ −0.09 (expected −1 to −6);
  - at the head it is right: arm − head 17.6 mmHg at 70° (9.4 at 30°); CPP 73.3 → 60.6.
- **Code:** `l2/organs/pipeline.ts:289–291, 320–321` (the validator: headUpDeg 0–90), `l2/brain/model.ts:99–110`
  (`HEAD_HEIGHT_CM` 25 × sin θ, 0.74 mmHg/cm, 2.9 mL at 30°). 7a has no posture input.
- **Smallest mechanism:** one patient `posture {tiltDeg −40…+90, lateral: L/R/none, prone, legsUpDeg}` state:
  - 7a: gravitational shift of unstressed volume between the leg/splanchnic and thoracic compartments by tilt;
    lithotomy legs-up ≈ +300 mL to the thorax;
  - 7b: the perfusion split by gravity (lateral), FRC by tilt and prone;
  - 7d: head height (today's `headUpDeg`, generalised to negative tilt for ICP/IOP ↑).
  - ETT migration (SP-11d) needs 7b's `endobronchial` driven by tilt.
- **Tests moved:** brain head-up tests (unchanged), A09-F3, FU-6 RS12's `it.fails`, SP-11–15/22.

### S8 — Atropine's vagolytic occupancy is an absolute amount (new, P2; owner 7g row)
- **Cells:** SP-06a (TW), SP-07 (TW).
- **Measured:** the reflexes themselves are right:
  - peritoneal traction: HR 62 → 40 at 20 s, 50 at 110 s (fatigue);
  - oculocardiac in the 4-year-old: 103 → 53 at 22 s, 109 at 30 s after release.

  Atropine 20 µg/kg leaves 71 % of the reflex in the child (0.32 mg) and 39 % in the adult (1.4 mg); 0.5 mg leaves 57 %
  in the adult.
- **Code:** `l2/pk/data/rows-cardiovascular.ts:30–31` (`muscarinic` ec50 0.3 mg-equivalent; `gammaPk(0.5, …)`) →
  `l2/pk/combine.ts:114–115`.
- **Smallest mechanism:** express the anticholinergic occupancy per kg of body weight, i.e. per volume of distribution
  (ec50 ≈ 5 µg/kg-equivalent). Then 20 µg/kg blocks ≥ 80 % in both. Glycopyrrolate the same.
- **Tests moved:** FU-4 G7 `vagal-events.test.ts` (the atropine arms), PD's anticholinergic cells.

### S9 — No mediator release on mesenteric traction (new, P1; owner a surgical-events stage)
- **Cell:** SP-06b (MI).
- **Measured:** MAP 5–20 min after traction +0.4 % vs control; SVR +1.8; HR 0.
- **Smallest mechanism:** a traction event (the peritoneal site held ≥ 30 s) releases a prostacyclin-like vasodilator
  in 7a: SVR × (1 − 0.3·e), HR +, CO +, t½ ≈ 10 min. Flushing is a DEV/visual cue. A COX inhibitor blunts it
  (Brinkmann 1998).

### S10 — BCIS cannot reach grade 2 or 3 (new, P2; owner 7b row → 7a)
- **Cells:** SP-18a (TW), SP-18b (WR).
- **Measured:** 80 y under GA:
  - grade 1 (0.33): EtCO2 −1.1, MAP −1.4 %, RVSP +1.5;
  - grade 2 (0.67): SBP −4.3 %;
  - grade 3 (1.0): EtCO2 −5.3, MAP −7.6 %, RVSP +7, SpO2 99 %, no collapse.
- **Code:** `data/lung-pathology.ts:532–548`: PVR × 1.22/1.67/2.33 and alveolar dead space only.
- **Smallest mechanism:** add the row's missing keys: `extraShunt`/low-V/Q (0.05/0.1/0.2) for the hypoxaemia, and a
  systemic mediator term (SVR ↓, histamine/complement). Let the elderly RV fail under PVR × 2.33 (7a's RV ischaemia,
  FU-4 G5/G6).

### S11 — Continuous venous air entry never compromises the circulation (P2; owner 7b row → 7a)
- **Cell:** SP-20b (TW). SP-20a is PL (EtCO2 −3.0 at 1 min).
- **Measured:** at 10 min MAP −0.8 %, CO **+5.7 %**, SpO2 0, RVSP +2.4. The same numbers appear in the laparoscopy
  CO2-embolism proxy (CO +9.2 %).
- **Smallest mechanism:** the row's PVR × 1.375 is the only circulatory key. Scale PVR with the accumulated volume, not
  a fixed severity, and encode the RV air lock (bolus ≥ 3–5 mL/kg: RV outflow obstruction) that tables §20 leaves out.

### S12 — Diathermy counted as HR (P3, DEV; owner L3 monitor — FU-8/FU-5 follow-up)
- **Cell:** SP-25a (WR).
- **Measured:** the displayed HR is 78–158 during a 10 s burst (truth 71, arterial PR 70), flag `valid` throughout.
- **Smallest mechanism:** the QRS detector marks samples inside an `electrosurgery` burst as noise. The HR holds its
  last valid value (flag `questionable`) or falls back to the pulse-rate source, as monitors do (audit 10 pattern).

### S5 — No CO2 load: pneumoperitoneum absorption, CO2 embolism, emphysema (P1/P2; owner a surgical-events stage → Stage 3)
- **Cells:** SP-08d (NE), SP-10a (MI), SP-10b (NE).
- **Measured:** CO2 embolism through the only embolism row (`vae`): EtCO2 −1.2 in the first minute, −3.0 at 1 min,
  −2.2 at 5 min. It falls from the start and never rises first.
- **Smallest mechanism:** an exogenous VCO2 input to Stage 3's gas model (insufflation: +20–30 % VCO2 at IAP 12–15;
  emphysema: more), and a gas type on `vae` (CO2 dissolves: a transient EtCO2 rise, a smaller dead-space effect).

### S13 — Surgical events that do not exist (P2; owner a FU-7+ "surgical events and posture" stage)
- **Cells (NE):**
  - tourniquet on/off (SP-16a–d);
  - aortic cross-clamp/unclamp (SP-17a–d);
  - carotid sinus (SP-21; the vagal site list has no `carotid`);
  - unilateral PA clamp (SP-23b; `pe` is not sided).
- Their expected responses are kept in §6 as the owner's acceptance list.

### Smaller items (recorded, not graded)
- **Emergence with the tube in.** SP-05's control arm woke (DI 84) with the ETT in place and no reaction; MAP rose
  81.7 → 95.8 only through hypnotic washout.
- **OLV readouts.** `lungState.shunt` is TRUE shunt only (0.13 at 30 min; perfusion-weighted 0.12); the PaO2 of 111 at
  FiO2 1 comes from the low-V/Q admixture of the absorbing lung (perfusion.ts:55–60). A monitor/teaching "shunt" should
  be the venous admixture (FU-6 dead-space/shunt bookkeeping).
- **Catecholamines outlast the stimulus.** In SP-01a, adrenaline and noradrenaline keep rising for 2 min after
  `stimulus 0` (NE 344 → 400 pg/mL by +120 s). This is the 7e offset τ 180 s: plausible, recorded for Task 10.
- **MANUAL laryngoscopy (SP-M1).** MAP +1.4 but HR +12: the humoral HR factor acts in MANUAL while the pressure is the
  instructor's (Q9).
- **The vagal event is MODELED-only (SP-M2).** Consistent with the Q9 working assumption; Ali to confirm.

## 4. Findings for FU-7 (READY, not executed) — → FU-7 before execution

1. **Task 10 — the laryngoscopy surge (SP-01a/b/d/e; P1).** Measured again on 7954933, with the same rig as Task 10
   case 1:
   - ΔMAP +10.4 (+14 %), ΔHR +8, 70 % of the peak at +90 s, noradrenaline +126 pg/mL;
   - fentanyl 2 µg/kg ratio **0.10** (Task 10's band 0.2–0.7, measured at 3 µg/kg);
   - lidocaine **1.02**;
   - esmolol 0.5 mg/kg HR 0.63 vs MAP 0.99 (direction right);
   - remifentanil 0.5 µg/kg/min **0.08**, which Task 10 does not test.

   **Add** a remifentanil arm (ratio ≤ 0.3; Thompson 1998 [VERIFY]) and a fentanyl 2 µg/kg arm beside the 3 µg/kg one:
   research/12's SP-01 dose. Use them as guards that the opioid-only release (Step 1c) does not make the remifentanil
   response reappear.
2. **Task 10 — maintenance-phase arms (S3; SP-02a, 03, 26).** Task 10's rigs are all propofol-bolus laryngoscopy. Add:
   - (a) incision (1.0) at 1.0 MAC sevoflurane without opioid: ΔMAP/ΔHR +10–20 % (research/12 SP-02); measured
     +8.4 % / +11.3 %;
   - (b) sternotomy (1.5) vs incision (1.0) under 1 MAC + fentanyl 3 µg/kg: sternotomy > incision; measured +1.2 vs
     +0.8 mmHg;
   - (c) the closure fall at unchanged depth; measured −1.7.

   All three are the same `noxious·(1 − antinoc)` path that Step 1c changes. Without them, Task 10 can pass while
   surgery stays silent.
3. **Task 10 — the laryngoscopy vagal site (S2; SP-01f).** Task 10 owns laryngoscopy (D8) but its rigs send no `site`.
   With the site, the adult gets HR −18 in the first minute. Either Task 10 states that the adult laryngoscopy command
   carries no site (and the console follows), or FU-4 G7's constant gets the age scaling of S2. Add one guard arm
   (adult, `site laryngoscopy`): no HR fall below the no-stimulus control.
4. **Task 10 / D8 — airway devices as senders of the stimulus (S1; SP-04/05).** Task 10 "adds no event". S1 does not
   need one: the airway-device change sends the existing stimulus. If FU-7 prefers not to own it, it goes to the
   surgical-events stage with the posture work.
5. **7g atropine row (S8; SP-06a, SP-07).** The muscarinic ec50 is absolute (0.3 mg-equivalent), so 20 µg/kg in a
   16 kg child leaves 71 % of the oculocardiac reflex. FU-7 Tasks 2/17 already re-fit 7g rows; this belongs beside them
   (or FU-8 Part B, the drug-library items after FU-7).
6. **N2O space expansion (SP-20c NE)** stays on research/12's FU-7 missing-mechanism list (DI-20). No FU-7 task owns it.

## 5. Findings for FU-6, FU-8, FU-9, FU-10 and other in-flight stages

- **FU-6 (positioning effects on the lungs; Q-FU6-6):**
  - SP-14b: OLV supine at FiO2 1, VT 350 × 16, PaO2 **111** at 30 min (lateral band 150–250; A09-F3 was 80).
  - SP-14c: the non-ventilated lung's flow share is 0.42 at onset and 0.27 at 30 min (catalogue: 0.40 from gravity in
    the lateral, then 20–25 %).
  - SP-23a: the absorption nadir at 8.7 min and HPV recovery +20 mmHg by 40 min (PL).
  - These are the before-numbers for Q-FU6-6's lateral posture.
  - Also for FU-6: IAP → chest-wall elastance/FRC (S4b: Crs 55 → 55 at IAP 14; research/12 −30–50 %) and the
    Trendelenburg FRC/Crs cells (SP-11c NE) belong to the same posture/chest-wall seam.
  - The OLV "shunt" readout is true shunt only (smaller items).
- **FU-9 amendment (RH H4/H5 are routed there):** SP-08a/b/e are the laparoscopy acceptance arms:
  - IAP 14: CO −10–30 %, SVR +20–70 %, MAP +10–35 % (Joris 1993), UO −30 % or more;
  - measured 0 / 0 / 0 / 0.
  - SP-19's MAP course depends on S7, not on 7c's refill (170 mL/h is in range).
- **FU-8:**
  - Part A — posture remains an Ali item (W17). This run confirms it and adds the counts: 11 posture NE cells plus
    SP-12b/22 MI.
  - The FU-5 follow-up list gains S12 (diathermy counted as HR, flagged valid).
  - Part B — the atropine per-kg occupancy (S8) if FU-7 does not take it.
  - Ali Q8 (baroreflex resetting, W-list) gains SP-19's numbers (S7).
- **FU-10 (endocrine/thermal, being written now; stress response):**
  - (a) 7e's catecholamine and cortisol drives read `noxious·(1 − antinoc)` with the hypnotic share: SP-03's
    sternotomy under 1 MAC + fentanyl releases only +17 pg/mL noradrenaline. When Task 10 moves the RELEASE to the
    opioid share (addendum 25), FU-10 should state whether cortisol/glucose follow the same rule (Desborough 2000:
    hypnotics do not abolish the humoral arm).
  - (b) Tourniquet release cools the core 0.3–0.7 °C (SP-16d NE). That is a 7e heat-redistribution term for the
    surgical-events stage.
  - (c) Extubation/emergence stress (S1) enters through the same `noxious` input.
- **Audit 08 G13 / FU-4 D18:** S7 is G13 measured on a P1 surgical bleed; Ali Q8 is the gate.

## 6. Cells blocked by missing features

| blocker | cells | expected response kept for the owner |
|---|---|---|
| **posture** (only `headUpDeg` 0–90; confirmed) | SP-11a–d, 13a–c, 14a, 15a/b (10 NE) + SP-12b, 22 (MI: accepted but systemically inert) | Trendelenburg 30°: CVP ↑, ICP/IOP ↑, FRC ↓, Crs −30–50 % with pneumoperitoneum, ETT toward endobronchial; prone ARDS: PaO2 ↑ (PROSEVA), Crs ~, IAP ↑ if the abdomen is compressed; lateral: non-dependent ventilation, dependent perfusion; lithotomy: ≈ 300 mL autotransfusion, hypotension on leg-down; beach-chair: MAP/CO −15–30 % |
| tourniquet event | SP-16a–d | late hypertension at 45–60 min; release: EtCO2 +5–10, K⁺ +0.2–0.5, lactate ↑, MAP −10–20 %, core −0.3–0.7 °C |
| aortic cross-clamp event | SP-17a–d | infrarenal: MAP +7–10 %, afterload ↑; supracoeliac: MAP +50 %, ST changes, renal/splanchnic flow 0; unclamp: hypotension, acidosis, K⁺ ↑, EtCO2 ↑ (Barash, vascular) |
| carotid vagal site | SP-21 | bradycardia and hypotension on carotid sinus manipulation; abolished by local infiltration/atropine |
| sided PA occlusion | SP-23b | PA clamp: shunt falls, RV afterload ↑ (pneumonectomy) |
| CO2 load (surgical event) | SP-08d, SP-10b | EtCO2 +5–10 at fixed MV over 15–30 min (VCO2 +20–30 %); emphysema: more, late |
| N2O space expansion | SP-20c | N2O 50 % enlarges venous air emboli (PAP ↑ more; stop N2O) — measured for the record: RVSP +0.17 over the no-N2O arm |
| 7h (devices) | SP-24, SP-25b | CPB on/off; pacemaker inhibition by diathermy in the pacemaker-dependent |

Changed since research/12:
- SP-06a/b and SP-07 are expressible through FU-4 G7's vagal `site`.
- SP-09 is MI (the IAP step is accepted but carries no vagal event).
- SP-12 is measured in full, and SP-22 is MI rather than NE (head-up is accepted and inert).
- SP-14b/c and SP-23a run OLV supine.
- SP-18 is measured through the `fatEmbolism` row.
- The design's NE count of 35 is 25 on this main.

## 7. Proposed scripted suite (the owners' acceptance cells)

| owner | cells to re-measure at its gate | acceptance items (bands are Ali's proposals) |
|---|---|---|
| **7a baroreflex** (S7; Ali Q8) | SP-19a/b, M3 | 1 L in 1 min under GA: MAP recovers after the nadir (no late fall without loss); the ooze's nadir is smaller than the sudden loss's |
| **FU-7 Task 10** (+ §4 items 1–3) | SP-01a–f, 02a, 03, 26, 27, 31, M1 | laryngoscopy ΔMAP 20–30 / HR 12–30 after propofol; fentanyl 2 µg/kg ratio 0.2–0.7; lidocaine 0.4–0.9; remifentanil ≤ 0.3; incision at 1 MAC +10–20 %; sternotomy > incision under 1 MAC + fentanyl; closure fall; adult laryngoscopy site: no HR fall |
| **airway → stimulus** (S1) | SP-04, 05 | ETT insertion pressor > SGA > 0; extubation MAP/HR +15–25 % |
| **FU-4 G7 constants** (S2) | SP-01f | adult: no bradycardia; child: vagal laryngoscopy kept (PD) |
| **FU-9 amendment** (S4 a, c) + **FU-6** (S4 b) + vagal coupling (S4 d) | SP-08a–c, e, 09 | IAP 14: CO −10–30 %, SVR +20–70 %, MAP +10–35 %, Crs −30–50 %, Ppeak ↑, UO ≤ −30 %; rapid insufflation → peritoneal vagal event |
| **posture stage** (S6) | SP-11a–d, 12b, 13a–c, 14a, 15a/b, 22 | as §6 |
| **7g atropine** (S8) | SP-06a, 07 | atropine 20 µg/kg leaves ≤ 30 % of the reflex (adult and child) |
| **surgical events** (S5, S9, S13) | SP-06b, 08d, 10a/b, 16a–d, 17a–d, 21, 23b | as §6; mesenteric traction MAP −10–40 % at 5–20 min |
| **7b rows** (S10, S11) | SP-18a/b, 20b | BCIS grade 1 EtCO2 −5–15, MAP −20–40 %; grade 3 collapse; VAE: MAP/CO fall as entry continues |
| **L3 monitor** (S12) | SP-25a | the HR during diathermy is held/flagged, or it follows the pulse rate |
| **regression** (PL today) | SP-01c, 01e, 02b, 06a (reflex arm), 07 (reflex arm), 12a, 12c, 20a, 23a, 27, 31, M1–M3 | must stay PL |

Each owner runs `./run.sh cli.ts <ids>` against its branch's worktree (`PME_ENGINE`) and pastes the `report.ts` rows
beside this run's column in its gate note (research/12 §7).

## 8. Questions for Ali (with the model's numbers)

1. **Baroreflex resetting in haemorrhage (Q8, with SP-19's numbers).** After 1 L in 1 min under 1 MAC sevoflurane:
   - MAP 63.5 at +10 min, then 55 at +30 and 48.3 at +60, lactate 4.9;
   - `baro.set` 95 → 57;
   - the 50-min ooze of the same litre ends at the same −36 %.

   Should acute resetting be slow (hours) and partial, and frozen while the error is a volume loss?
2. **Laryngoscopy: % or mmHg?** research/12 says MAP +20–30 %; Task 10 and Shribman say +20–30 mmHg. After propofol
   (MAP 75), 20–30 % is 15–22 mmHg. Measured +10.4 fails both. Which band is the acceptance band?
3. **The laryngoscopy vagal site in adults.** Today `site laryngoscopy` drops an adult's HR by 18. Remove the site from
   the adult command, or keep it with an age factor (≈ 0 in adults)?
4. **Airway devices as stimuli.** Should ETT insertion, SGA insertion and extubation send the stimulus themselves (ETT
   1.5 / 60 s, SGA 1.0 / 30 s, extubation 1.0 / 60 s), or stay instructor-only?
5. **Incision at 1 MAC.** Measured +8.4 % MAP / +11.3 % HR without opioid (research/12 10–20 %). Movement is a
   deterministic threshold at 1 MAC-eq (moves at 0.91, not at 1.01). Keep it deterministic, or draw per patient
   (MAC's quantal spread)?
6. **Posture.** This run confirms 11 NE posture cells plus 2 inert ones (beach-chair MAP/CO Δ 0; tilt adds 0 to GTN).
   Is posture v1.0 or v1.1 (FU-8 W17)? If v1.0: tilt (−40…+90), lateral, prone, lithotomy as one state?
7. **Atropine per kg.** 20 µg/kg leaves 71 % of the oculocardiac reflex in a 16 kg child and 39 % in an adult. Should
   anticholinergic occupancy be per kg (≥ 80 % block at 20 µg/kg)?
8. **BCIS.** `fatEmbolism 1.0` in an 80-year-old gives MAP −7.6 %, SpO2 99 %, no collapse. Should the row carry a shunt
   and a mediator term so that grade 3 can collapse?
9. **Direction-only cells** (no sourced magnitude):
   - SP-01e (esmolol);
   - SP-03 (sternotomy vs incision);
   - SP-12c (CPP);
   - SP-19a/b;
   - SP-20b;
   - SP-23a;
   - SP-25a;
   - SP-26;
   - SP-27;
   - SP-31;
   - SP-M1…M3 (Q9).
10. **[VERIFY] figures:** Thompson 1998 (remifentanil), Katoh 1999 (sevoflurane MAC-BAR), Stoelting 1977 (duration),
    Zbinden 1994, Braude 1989 / Wilkins 1992 (LMA), Doyle & Mark 1989, Joris 1993, Obeid 1995 / Rauh 2001, Chiu 1995,
    Pohl & Cullen 2005, Buhre 2003 / Lee 2011, Murphy 2010, Seltzer 1985 / Brinkmann 1998, Shulman 1984, Valentin 1990,
    Melendez 1998. Please confirm them from the sources you use before they become tests.

## 9. Files and how to re-run

All files are in `research/21-audit-scripts/`. Nothing in the repo was changed; the worktree was removed.
- `runner.ts`: the arm runner (ET's + RH's Ppeak probe). SP readouts:
  - the baroreflex set point, efferents and the vagal-stimulus event;
  - 7e noxious, catecholamines and stress index; 7f antinociception, movement and DI;
  - the brain at head level; IAP, urine output, hepatic flow;
  - 7b Crs/FRC/shunt/dead space, the per-side perfusion share and the effective shunt;
  - RVSP (the PAP proxy);
  - the displayed HR with its flag and the arterial pulse rate.
- `spec.ts`: cell type, contexts, rigs, and the arm − control helpers (`dPeak`, `dAt`, `pct`, `ratio`).
- The cells:
  - `cells-a.ts`: P1;
  - `cells-b.ts`: P2/P3;
  - `cells-m.ts`: the MANUAL twins;
  - `gaps.json`: cell → gap id.
- The tools:
  - `grade.ts`, `regrade.ts`;
  - `cli.ts` (`SP_OUT` for a partial store), `merge.ts`;
  - `report.ts` (→ `out/matrix.md`), `ledger.ts` (→ `out/ledger.md`);
  - `hooks.mjs`, `run.sh`.
- The exploration probes (`probe0–6.ts`):
  - command acceptance and state paths;
  - the laryngoscopy course;
  - sevoflurane dial → MAC;
  - the bleed time course;
  - the OLV course and perfusion split;
  - the PAP path.

```
git -C <repo> worktree add --detach <wt> origin/main && (cd <wt> && npx -y pnpm@9.15.9 install --frozen-lockfile)
cd research/21-audit-scripts
PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts all      # ≈ 6 min single process
node --experimental-strip-types report.ts > out/matrix.md && node --experimental-strip-types ledger.ts > out/ledger.md
```
