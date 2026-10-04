# 14 — Coverage run ET: endocrine and thermal (R54 matrix, research/12 §5.2)

*Coverage auditor, 2026-09-29. Read-only on the repo. Engine pinned at `origin/main` **7c60b2b** (engine code = ed530d5:
FU-3, FU-4, FU-5 and V.1 merged; FU-6, FU-7, FU-8 and FU-9 not). Seed 7. Scripts: `research/14-coverage-et-scripts/`
(rerunnable; `out/cells.json` holds one graded record per cell and no raw rows). The report follows research/20 (run DV)
and research/22 (run BF). Not to be confused with `research/14-audit-drug-interactions.md` (run DI, an earlier file with
the same prefix): research/12 §5.2 assigns this name.*

## 0. Headline

- **72 cells**:
  - the 66 of research/12 §5.2 (ET-01…28), split into the designed readouts a–g;
  - seven cells the brief's topics needed and §5.2 did not list: ET-29 (exposure and skin prep), ET-30 (overwarming),
    ET-31 (insulin–dextrose glucose), ET-32 (epidural blunting of the stress response), ET-33 (opioids and the shivering
    threshold), ET-34 (etomidate and cortisol), ET-35 (drug GA vs the hidden GA flag);
  - three MANUAL twins (ET-M1…M3).

  **41 P1, 28 P2, 3 P3.** Every intervention cell has its control arm, or a reference arm at the same sim time.
- **Verdicts:**

  | verdict | cells | P1 | P2 | P3 | of which another stage's plan already owns the fix |
  |---|---|---|---|---|---|
  | plausible (PL) | **36** | 26 | 10 | — | — |
  | too weak (TW) | **12** | 5 | 7 | — | 1 (ET-16a: FU-7 Task 10) |
  | too strong (TS) | **1** | 1 | — | — | — |
  | wrong (WR) | **6** | 3 | 2 | 1 | — |
  | inconsistent (IN) | **2** | 1 | 1 | — | 1 (ET-35: FU-6 R4) |
  | missing (MI) | **7** | 3 | 4 | — | 2 (ET-19: FU-7 Task 18; ET-09b: A08-G4b) |
  | not expressible (NE) | **8** | 2 | 4 | 2 | 7i, FU-7 (states, drugs), neuraxial, the type 1 insulin omission |

  - **28 non-plausible expressible cells.** 24 have at least one mechanism no stage owns (§3); 4 wait on planned work.
  - Run time: ≈ 25 min of engine wall time for all 72 cells (the 5–8 h thermal and glucose arms run ≈ 300× real time).
- **The matrix after this run** (research/12 §4.8): 201 (audits 08–10) + 105 (DI) + 69 (CM) + 74 (BF) + 65 (DV) +
  62 (RH) + 72 (ET) = **648 measured cells**.
- **Ten most important findings** (ranked; §3 has the mechanism and file:line for each):
  1. **An MH-susceptible patient given sevoflurane and succinylcholine never develops MH (E1; ET-10a; P1).** 7f writes an
     `mhTrigger` mark (neuro/pipeline.ts:170–180, 206–210) that nothing reads; MH exists only as the instructor's
     `condition mh`. EtCO2 stays 29–30 for 90 min. The "trigger-agent" teaching case cannot run by itself.
  2. **After an MH arrest the dead patient keeps heating to 47.8 °C (E2; ET-10g, ET-M2).** Muscle MH heat
     (heat.ts:146) is not limited by the oxygen delivered, so the core climbs 42 → 47.8 °C in asystole. Before the arrest
     the instructor MH is textbook (below).
  3. **A neuraxial block gets the full GA thermoregulation (E3; ET-04; P1).** heat.ts:161 gives any non-`none`
     anaesthesia depth 1. An awake spinal patient redistributes 0.9 of GA (expected ≈ ½), cools to 34.4 °C in 3 h and
     never shivers (expected at ≈ 35.5 °C).
  4. **Cold drives nothing but shivering (E4; ET-05b/c; P1).** At emergence at 34.5 °C, shivering raises VO2 +59 %, but
     noradrenaline, HR, MAP and CO are identical to the normothermic twin (Frank 1995: noradrenaline ×4, MAP ↑). Core
     temperature is not an input of 7e's sympathetic drive, and CO does not follow VO2.
  5. **Type 1 diabetes cannot be insulin-deficient, and insulin deficiency makes no ketones (E7; ET-18a/b; P1).** The
     type 1 profile always carries basal insulin (core.ts:101–104); DKA is only 7c's instructor condition, and when given
     it has K⁺ 3.7 (lower than healthy), glucose 9.3 mmol/L and no volume deficit (ET-23c/d).
  6. **Hypoglycaemia is unmasked by GA (E12; ET-21a).** HR rises MORE under sevoflurane (+26) than awake (+16); there is
     no hypoglycaemic sweating (ET-21b); the nadir after 10 units IV comes at 13 min (ITT 20–30, research/12 40–60) and
     only reaches 2.9 mmol/L (ET-20a TS).
  7. **Fever, thyroid storm and septic shock do not behave as states (E11).** Under GA at 21 °C, sepsis and storm raise
     the set point but produce no fever (36.9 and 36.6 °C); warm septic shock has lactate 1.0 (Sepsis-3 > 2); the cold
     phase barely lowers CO (5.1 → 4.3) or SvO2 (79 → 77); `sirs 1` leaves MAP 88.6, so vasopressin's catecholamine
     sparing cannot show (ET-12, 13a, 26a, 28).
  8. **Endocrine profiles are thin (E13, E10).** Hypothyroidism gives bradycardia and a colder core but no exaggerated
     induction hypotension or delayed emergence (ET-14 WR); adrenal insufficiency is normal at rest and after induction
     (ET-15a TW); etomidate does not suppress cortisol (ET-34 MI); no drug reaches the shivering threshold (ET-33 NE).
  9. **Drug GA and the hidden GA flag disagree on metabolism (ET-35 IN, FU-6 R4 pending).** Propofol + sevoflurane lowers
     VO2 −6.8 %, the Stage 3 flag −20.8 %; EtCO2 25.9 vs 22.2 at one ventilator setting.
  10. **The perioperative temperature course is right at the start and slow later (E5; ET-01b TW).** Redistribution
      −1.18 °C in hour 1 (PL), but the linear phase runs at 0.29 °C/h and vasoconstriction starts at 6.2 h (Sessler
      3–4 h); the 80-year-old differs only through MAC-age (E6, ET-03a MI).
- **What works (36 PL):**
  - redistribution (−1.18 °C in hour 1), the displayed T1 (within 0.03 °C of the core), forced air with an open wound
    (36.2 °C at 3 h), a child cooling faster (−1.54 vs −1.18), exposure and skin prep (−0.5 °C), ambient 24 vs 18 °C
    (+0.66), cold crystalloid (−0.27 °C mean body per litre), cold blood (−0.89 °C core for 6 units, which is the
    physics of a 4 °C unit), overwarming to 38.3 °C with sweating from 38.0 °C;
  - instructor MH until the arrest: EtCO2 doubles in 14 min, HR +47, core +0.17 °C/min, K⁺ 5.75 at 20 min, pH 6.98 at
    30 min, VF at +45 min; treatment halves the EtCO2 excess in 7 min (35 min without dantrolene, which arrests), the
    core peaks 14 min after dantrolene and falls, K⁺ −0.47; 2.5 mg/kg leaves 25 % activity and a second dose clears it;
  - the stress response: adrenaline ×2.6, noradrenaline ×1.8, blunted 96 % by fentanyl 5 µg/kg; cortisol 1542 nmol/L
    peaking at 5 h, not suppressed by ordinary opioid doses; glucose +1.3 mmol/L at 2 h; the diabetic insulin infusion
    (−2.5 mmol/L/h), insulin's K⁺ fall (−0.87) and adrenaline counter-regulation (×16, HR +18); D50 +10 mmol/L at 5 min;
  - hypothermia: MAC −5.2 %/°C, rocuronium ×2.7 longer at 32 °C, HR 40 and Osborn waves at 28 °C, spontaneous VF at
    25 °C;
  - anaphylaxis: 50 µg adrenaline restores grade II MAP at once and grade III within 15 s of the first dose;
    bronchospasm eases (lung severity 0.30 → 0.12); septic noradrenaline hyporesponsiveness (0.29 of healthy);
    dobutamine in cold sepsis (CO +0.4); DKA losing its Kussmaul compensation after intubation (pH −0.18 at normal MV,
    −0.02 at RR 28).

## 1. Method and rig

- **Design source:** research/12 §5.2 (ET, 28 scenarios / 66 cells), §2 (cell record, grading), §3 (tiers) and §6
  (runner). Names follow research/11 §5: core = `resp.temp.tc`; Tperiph = `tp`; T1 = the displayed `tempCore`;
  VO2 = 7c's O2 demand (`blood.core.o2.demand`, the metabolic rate the gas model also uses); MH activity, stress index,
  adrenaline, noradrenaline, cortisol and glucose are 7e's `endo` outputs.
- **Rig.** Adult 40 y, 70 kg, 175 cm, male; sensors ABP/CVP/SpO2/CO2/temperature.
  - **"Drug GA":** ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 from 1 s; propofol 2 mg/kg + rocuronium 0.6 mg/kg (or
    succinylcholine 1.5 mg/kg in the MH rigs) at 300 s, sevoflurane 2 % at FGF 2 L/min (≈ 0.9 MAC by 1 h). Used for
    every cell where anaesthetic depth matters (temperature, stress, MH, hypoglycaemia, anaphylaxis).
  - **"GA flag":** the same ventilation with Stage 3's `thermal anaesthesia general` and no drugs — the BF/CM rig, used
    where depth is irrelevant (cold fluids, fever, septic phases, vasopressors). ET-35 shows the two are not equivalent
    for VO2.
  - Draped, 21 °C, theatre air 0.15 m/s unless the cell says otherwise.
  - **Deep hypothermia (ET-08, ET-09)** uses the MODELED core target (`setTarget tempCore`, ramp 15 min) as the
    instructor's active-cooling device: no cooling device exists (research/12 §1.3 I18), and physical cooling in a 5 °C
    room plateaus at 32.4 °C. The target moves the set point with the core, so these patients do not shiver.
  - **MH:** the instructor's `condition mh 1` 60 s after sevoflurane + succinylcholine (ET-10b…g, ET-11), and the
    MH-susceptible profile `neuro.mhSusceptible` with the same triggers and no instructor action (ET-10a).
  - **Endocrine profiles** (`endo.diabetes`, `endo.thyroid`, `endo.adrenalInsufficiency`) go through the engine API: the
    `pme-scenario/1` schema has no `endo` block until FU-8 A16.
- **Sampling.** The committed state is read every 5–60 s, read-only, with the 1 Hz `endo` event (shivering, sweating,
  vasoconstriction, MH activity) and the `anaesthesia` event (depth, TOF, MAC). No pokes. Arms advance in ≤ 60 s slices
  and yield once per simulated minute.
- **Grading** (research/12 §2.2): automatic first, then every non-PL confirmed by hand; `HAND` lines give the code
  reason.
  - Bands are proposals for Ali with their source; none was widened (R45). `[VERIFY]` marks a paper figure quoted from
    memory, to be checked before the band becomes a test.
  - Where research/12's band and a primary paper disagree (ET-05a shivering VO2, ET-07 cold blood, ET-20a nadir time,
    ET-22 D50), both are quoted, the cell is graded on the stated one and the conflict is a question in §8.
  - Direction-only cells carry `(direction only)` in the tables and are listed in §8.
- **MANUAL.** Q9 is open, so ET-M1…M3 are direction-only beside their MODELED twins.

## 2. Results

How to read the tables:
- Keys starting with `d` are differences against the control or the reference arm; `…PerC` / `…PerL` / `…PerH` are per
  °C, litre or hour; `…S` / `…Min` / `…H` are seconds, minutes, hours after the intervention.
- Temperatures °C; glucose mmol/L unless named `…MgDl`; hormones pg/mL (catecholamines) and nmol/L (cortisol).
- Gap ids are §3 (E1–E14) or the owning plan. The tables are generated by `report.ts` from `out/cells.json`.

Family by family:
- **2.1 Perioperative hypothermia:** redistribution, forced air, children and exposure are right; the linear phase is
  slow (E5); neuraxial is GA (E3); age acts only through MAC-age (E6); drug GA has no metabolic reduction (ET-35).
- **2.2 Shivering and cold fluids:** shivering VO2 +59 % (between the two sources), with no sympathetic response (E4);
  cold crystalloid and blood are physical.
- **2.3 MH:** instructor MH and its treatment are textbook; the triggers do nothing (E1); heat continues after death (E2);
  no rigidity (NE).
- **2.4 Stress response:** catecholamines, cortisol, glucose and opioid blunting are right; the incision pressor response
  is small (FU-7 Task 10).
- **2.5 Glucose:** insulin, K⁺ and counter-regulation right; nadir too early (E12); no ketones, no insulin omission (E7);
  dexamethasone inert (FU-7 Task 18).
- **2.6 Anaphylaxis:** adrenaline works; the treated grade III arrests (asystole) 18 min after the last bolus with no
  infusion — plausible teaching, recorded.
- **2.7 Deep hypothermia and fever:** MAC, NMB, HR, Osborn and VF right; propofol PK weak (E14); no AF (E9); no fever
  under GA (E11).
- **2.8 Thyroid and adrenal:** storm HR and β-blockade right; the rest thin (E9, E11, E13, E10); hydrocortisone and
  neuraxial NE.
- **2.9 Glucose emergencies and DKA:** D50 right on the primary paper; GA does not mask hypoglycaemia (E12); the
  insulin–dextrose row is invisible to glucose (E8); DKA acid–base right, its K⁺ wrong (E7).
- **2.10 Septic phases:** hyporesponsiveness and dobutamine right; the cold phase and SIRS weak (E11).
- **2.11 MANUAL:** anaphylaxis, MH (arrest at the same +45 min) and the metabolic stress response run in MANUAL.

### 2.1 Perioperative hypothermia: redistribution, warming, age, neuraxial (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| ET-01a | P1 | X-A ventilated, MODELED · GA (propofol 2 mg/kg + rocuronium + sevoflurane 2 %), draped, 21 °C, no warming → hour 1 after induction: redistribution hypothermia; the displayed T1 against the core | tc0 36.8; dT30 -0.89; dT1h -1.18; tp0 32.5; tp1h 34.05; kcpPre 16.65; kcp1h 48.81; dispMinusCore1h -0.03 | PL: dT1h = -1.18 in [-1.5, -1] [Sessler DI, Anesthesiology 2000;92:578–596 (perioperative heat balance: core falls 1–1.5 °C in the first hour of GA by redistribution, then 0.3–0.5 °C/h, then a plateau at 3–4 h once vasoconstriction is triggered); Matsukawa T et al., Anesthesiology 1995;82:662 (−1.6 ± 0.3 °C in hour 1, 81 % redistribution) [VERIFY]]<br>PL: dispMinusCore1h = -0.03 (quiet, tol ±0.15) [the oesophageal/T1 display follows the core within its probe lag and 0.1 °C rounding (research/03 §6.1; A10-E1)] | **PL** | — · 7e thermal/heat.ts (Stage 3 constants) |
| ET-01b | P1 | X-A ventilated, MODELED · GA, draped, 21 °C, no warming → hours 2–5: the linear phase, the vasoconstriction threshold and the plateau | rateH2to3 -0.292; rateH4to5 -0.153; rateH6to7 -0.072; tc3h 35.04; tc5h 34.67; tc7h 34.5; vasoOnsetC 34.554; vasoOnsetH 6.17; depth4h 1.06; mac4h 0.93; shiverAny false | TW: rateH2to3 = -0.292 above [-0.5, -0.3] [Sessler DI, Anesthesiology 2000;92:578–596 (perioperative heat balance: core falls 1–1.5 °C in the first hour of GA by redistribution, then 0.3–0.5 °C/h, then a plateau at 3–4 h once vasoconstriction is triggered); Matsukawa T et al., Anesthesiology 1995;82:662 (−1.6 ± 0.3 °C in hour 1, 81 % redistribution) [VERIFY] (linear phase)]<br>PL: vasoOnsetC = 34.554 in [34.3, 34.7] [Sessler 2000 / Kurz A 1993: GA vasoconstriction threshold ≈ 34.5 ± 0.2 °C (tables §5c; the engine param VASOCONSTRICT_C 34.8 is tagged [ENG] "plateau 34.6–34.8")]<br>TW: vasoOnsetH = 6.17 above [3, 4] (lower = stronger/faster) [Sessler DI, Anesthesiology 2000;92:578–596 (perioperative heat balance: core falls 1–1.5 °C in the first hour of GA by redistribution, then 0.3–0.5 °C/h, then a plateau at 3–4 h once vasoconstriction is triggered); Matsukawa T et al., Anesthesiology 1995;82:662 (−1.6 ± 0.3 °C in hour 1, 81 % redistribution) [VERIFY] (the plateau begins at 3–4 h)]<br>WR: rateH4to5 = -0.153 (quiet, tol ±0.1) [Sessler DI, Anesthesiology 2000;92:578–596 (perioperative heat balance: core falls 1–1.5 °C in the first hour of GA by redistribution, then 0.3–0.5 °C/h, then a plateau at 3–4 h once vasoconstriction is triggered); Matsukawa T et al., Anesthesiology 1995;82:662 (−1.6 ± 0.3 °C in hour 1, 81 % redistribution) [VERIFY] (plateau: core stable once vasoconstricted)]<br>HAND TW (automatic WR): the direction and redistribution are right, but the linear phase runs at 0.29 °C/h (−0.30 to −0.50) so vasoconstriction starts only at 6.2 h (34.55 °C; Sessler 3–4 h): the core at 3 h is 35.04 against ≈ 34.5–35 expected. The plateau itself exists (−0.07 °C/h in hour 7). The depth-extrapolated threshold (thresholds.ts:31–37, depth 1.06 at MAC 0.93 → 34.55) and the draped insulation calibrated to the AWAKE balance (heat.ts:108, environment.ts calibrateInsulation) set the rate; no incision/wound loss in a draped rig (ET-02's open-wound arm reaches 34.53 at 3 h) | **TW** | E5 · 7e thermal/params.ts VASOCONSTRICT_C |
| ET-02 | P1 | X-A ventilated, MODELED · GA, draped, 21 °C, RL 2 L over 3 h → forced air (43 °C, upper body) + fluid warmer from induction vs neither | tc3hWarmWound 36.18; tc3hColdWound 34.53; dT1hWarm -0.77; dT1hCold -1.37; tc3hWarm 37.21; tc3hCold 34.78; rateWarmH2to3 0.608; warmW1h 43.87; warmW3h 41.73 | PL: dT1hWarm = -0.77 in [-1, -0.5] [research/12 ET-02; Sessler DI, Lancet 2008;371:1791 (forced air does not prevent the first-hour redistribution; it then holds or rewarms the core)]<br>PL: tc3hWarmWound = 36.18 in [35.5, 36.5] [research/12 ET-02 (plateau near 36 °C with forced air); Kurz A, NEJM 1996;334:1209 (warmed group 36.6 ± 0.5 vs 34.7 °C at the end of colorectal surgery) [VERIFY]] | **PL** | — · 7e thermal/environment.ts FORCED_AIR_* (fitted to R39-7) |
| ET-03a | P1 | X-E 80 y vs X-A 40 y, ventilated · GA, draped, 21 °C, no warming → as ET-01: the vasoconstriction threshold and the core at 4 h | vasoOnsetElderly null; vasoOnsetAdult 34.554; dVasoOnset null; tc4hElderly 34.73; tc7hElderly 34.07; mac4hElderly 1.2; depth4hElderly 1.37; depth4hAdult 1.06; tc4hAdult 34.82; d4h -0.09; dT1hElderly -1.19 | MI: dVasoOnset: not a finite number (null) [Kurz A, Plattner O, Sessler DI et al., Anesthesiology 1993;79:465 (the vasoconstriction threshold under isoflurane/N2O is ≈ 1 °C lower in patients 60–80 y than 30–50 y) [VERIFY]; research/12 ET-03 / tables §1.1]<br>TW: d4h = -0.09 (sign -1, beyond 0.2) [the lower threshold lets the elderly core fall further before the plateau (Kurz 1993; Frank SM 1992 Anesthesiology 77:252)]<br>HAND MI (automatic MI): no age term in the thermoregulatory thresholds (thresholds.ts:30–38 depend on depth and set point only): the 80-year-old's core runs 0.09 °C below the adult's at 4 h, and only because the same 2 % sevoflurane is a deeper MAC at 80 y (MAC-age → 7f thermoDepth → the depth-extrapolated threshold). Kurz 1993: ≈ 1 °C lower vasoconstriction threshold in the elderly | **MI** | E5, E6 · 7e thermal/thresholds.ts (no age term) |
| ET-03b | P1 | X-C 4 y 16 kg vs X-A, ventilated · GA, draped, 21 °C, no warming → as ET-01: hour-1 fall (surface/mass) | dT1hChild -1.54; dT1hAdult -1.18; childMinusAdult -0.36; tc3hChild 34.67; tc3hAdult 35.04; bsaPerKgRatio 1.58 | PL: childMinusAdult = -0.36 (sign -1, beyond 0.1) [research/12 ET-03 / tables §1.1: a child cools faster (surface area per kg ≈ 1.6× the adult's; Bissonnette B, Paediatr Anaesth 1991 [VERIFY]); Sessler 2000] | **PL** (direction only) | — · 7e thermal/heat.ts (sized by weight and BSA) |
| ET-04 | P1 | X-A awake, spontaneous room air · neuraxial thermal state (`thermal anaesthesia neuraxial`) at T, draped, 21 °C → hour-1 redistribution vs GA; shivering once the core falls | dT1hNeur -1.07; dT1hGa -1.19; ratioNeurGa 0.9; tc3hNeur 34.41; tcMinNeur 34.41; shivers false; shiverOnsetC null; depthNeur 1 | TS: ratioNeurGa = 0.9 above [0.4, 0.6] [research/12 ET-04 (redistribution about half of GA); Matsukawa T et al., Anesthesiology 1995;83:961 (epidural: −0.8 ± 0.3 °C in hour 1) [VERIFY]]<br>WR: shivers = false (expected true) [Kurz A, Sessler DI et al., Anesthesiology 1993;79:1193 (spinal/epidural lower the shivering threshold only ≈ 0.5 °C, to ≈ 35.5 °C: the patient shivers once the core passes it); Sessler 2008]<br>HAND WR (automatic WR): the neuraxial state takes the FULL GA thermoregulatory depth: heat.ts:161 `target = … anaesthesia === 'none' ? 0 : 1`, so an awake spinal/epidural patient gets the GA thresholds (shivering 33.5, vasoconstriction 34.8) plus kcp × 1.8 and skin loss × 1.5 (params.ts:14–15). Redistribution is 0.9 of GA (−1.07 vs −1.19 °C in hour 1; expected ≈ half) and the core falls to 34.4 °C at 3 h with NO shivering (expected at ≈ 35.5 °C). The block's sympathectomy (vasodilation below the level) is right; the central thresholds are not changed by a neuraxial block except ≈ −0.5 °C for shivering (Kurz 1993) | **WR** | E3 · 7e thermal/heat.ts stepThermal (neuraxial takes depth 1 = the GA thresholds) |
| ET-29 | P1 | X-A ventilated, MODELED · GA (drug), 21 °C → exposed for 30 min (induction, positioning), then wet skin prep 15 min, then draped — vs draped throughout: core at 1 h | dCoreExposure1h -0.5; dryWexposed 132.4; dryWdraped 65; evapWprep 50; dCore24vs18at2h 0.66 | PL: dCoreExposure1h = -0.5 (sign -1, beyond 0.1) [Sessler 2000/2008: radiation and convection from exposed skin are ≈ 90 % of intraoperative loss; evaporation from prep solutions adds; direction only (no sourced magnitude)]<br>PL: dCore24vs18at2h = 0.66 (sign 1, beyond 0.1) [Morris RH, Ann Surg 1971;173:230 (theatre temperature is the main determinant of intraoperative cooling; ≥ 21–24 °C keeps most patients normothermic) [VERIFY]] | **PL** (direction only) | — · 7e thermal/environment.ts |
| ET-35 | P1 | X-A ventilated, MODELED · GA by drugs (propofol + sevoflurane) vs GA by the Stage 3 `thermal` flag → VO2 and EtCO2 at +30 min: two expressions of one anaesthetic state (IN check) | vo2Awake 241.52; vo2Drug 225.02; vo2Flag 191.21; drugVsAwakePct -6.83; flagVsAwakePct -20.83; etco2Drug 25.85; etco2Flag 22.16; metW_drug 64.05; metW_flag 64 | TW: drugVsAwakePct = -6.83 above [-30, -15] [GA lowers VO2 15–30 % (Miller 9e; tables GA_METABOLIC 0.85) — the drug-anaesthetised patient must match]<br>PL: flagVsAwakePct = -20.83 in [-30, -15] [as above]<br>HAND IN (automatic TW): one anaesthetic state, two metabolisms: drug GA (propofol + sevoflurane, 7f thermoDepth 0.94) lowers VO2 only −6.8 % (the temperature factor) while the hidden Stage 3 flag lowers it −20.8 % — resp/pipeline.ts:295 applies GA_METABOLIC only when `rs.temp.anaesthesia === 'general'`; the heat balance (heat.ts basalW) already reads the drug depth (metabolic heat 64 W in both). EtCO2 25.9 vs 22.2 at the same ventilation. FU-6 R4's gaLevel() (its plan, pipeline.ts metabolic) makes the factor follow the drug level | **IN** (FU-6 R4 pending) | FU-6 R4 · Stage 3 resp/pipeline.ts metabolic() (GA factor on the hidden flag) — FU-6 R4 gaLevel() |

### 2.2 Shivering at emergence; cold fluids and blood (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| ET-05a | P1 | X-A, emergence and extubation to room air · hypothermic (core ≈ 34.5 °C at emergence) vs normothermic → emergence: shivering and VO2 at 5–20 min | tcAtEmergence 34.49; tcCtrl 36.08; shivWmean 66; shivOnsetS 700; vo2Cold 365.8; vo2Warm 230.1; vo2Pct 58.97; vo2PctOwnBase 83.45; dHr -2; dMap -0.5; neCold 275; neWarm 275; spo2Cold 96.3; spo2Warm 96; svo2Warm 78.8; coCold 5.8; coWarm 5.8; pao2Cold 86.5; pao2Warm 92.6; dSpo2 0.3; svo2Cold 76.5; dEtco2 1.1; dPaco2 1.3; dVe 2.3 | TW: vo2Pct = 58.97 below [200, 400] [research/12 ET-05 (Miller 9e, thermoregulation: shivering VO2 +200–400 %); tables §5c ×2–3 typical, ×5 maximum. Measured postoperative shivering is often +40–100 % (Ciofolo MJ, Anesthesiology 1989;70:737; Frank SM 1995) [VERIFY] — Q for Ali]<br>HAND TW (automatic TW): shivering starts 12 min after sevoflurane off (7 min after extubation) at 34.5 °C and raises VO2 +59 % over the normothermic emergence (+83 % over the patient's own anaesthetised baseline); research/12's band (+200–400 %, Miller) is the textbook summit, the measured postoperative figures (+40–100 %) contain the model. The summit is capped by SHIVER_MAX_X × m0 and reached only 1.8 °C below the threshold (thresholds.ts:50–56); the residual depth (EMERGE τ 600 s) lowers the threshold during emergence. Q for Ali which band to teach | **TW** | E4 · 7e thermal/thresholds.ts shiverW (SHIVER_MAX_X, SHIVER_SPAN_C) |
| ET-05b | P1 | X-A, emergence and extubation to room air · hypothermic vs normothermic → emergence: HR and MAP (the cold pressor/sympathetic response) | tcAtEmergence 34.49; tcCtrl 36.08; shivWmean 66; shivOnsetS 700; vo2Cold 365.8; vo2Warm 230.1; vo2Pct 58.97; vo2PctOwnBase 83.45; dHr -2; dMap -0.5; neCold 275; neWarm 275; spo2Cold 96.3; spo2Warm 96; svo2Warm 78.8; coCold 5.8; coWarm 5.8; pao2Cold 86.5; pao2Warm 92.6; dSpo2 0.3; svo2Cold 76.5; dEtco2 1.1; dPaco2 1.3; dVe 2.3 | WR: dHr = -2 (expected sign 1) [Frank SM et al., Anesthesiology 1995;82:83 (core hypothermia 1.3 °C: noradrenaline ×4, vasoconstriction, MAP ↑); research/12 ET-05 (HR/MAP ↑)]<br>WR: dMap = -0.5 (expected sign 1) [Frank 1995 (MAP ↑ with hypothermia-driven noradrenaline); research/12 ET-05]<br>HAND WR (automatic WR): no cold → sympathetic drive: at 34.5 °C with shivering, plasma noradrenaline is 275 pg/mL (= normothermic), HR −2, MAP −0.5. 7e's hormone drives (hormones.ts:55–63) are nociception, hypotension, hypoxia, hypercapnia and hypoglycaemia; core temperature is not an input (Frank 1995: core −1.3 °C → noradrenaline ×4, MAP +) | **WR** (direction only) | E4 · 7e hormones.ts (no cold → sympathetic drive) |
| ET-05c | P1 | X-A, emergence and extubation to room air · hypothermic vs normothermic → emergence on room air: SpO2 (the O2 cost of shivering) | tcAtEmergence 34.49; tcCtrl 36.08; shivWmean 66; shivOnsetS 700; vo2Cold 365.8; vo2Warm 230.1; vo2Pct 58.97; vo2PctOwnBase 83.45; dHr -2; dMap -0.5; neCold 275; neWarm 275; spo2Cold 96.3; spo2Warm 96; svo2Warm 78.8; coCold 5.8; coWarm 5.8; pao2Cold 86.5; pao2Warm 92.6; dSpo2 0.3; svo2Cold 76.5; dEtco2 1.1; dPaco2 1.3; dVe 2.3 | WR: dSpo2 = 0.3 (expected sign -1) [research/12 ET-05 (SpO2 ↓ on air with shivering: VO2 up, SvO2 down, residual anaesthetic depression); Miller 9e thermoregulation]<br>HAND TW (automatic WR): no desaturation on room air (SpO2 96.3 vs 96.0; PaO2 86.5 vs 92.6; SvO2 76.5 vs 78.8) although VO2 is +59 %: the extra O2 demand is met entirely by extraction because cardiac output does not follow metabolic demand (CO 5.8 L/min in both arms, NE unchanged) and the normal lung's small shunt hides the lower SvO2. Direction right in PaO2, flat in SpO2 | **TW** (direction only) | E4 · 7c oxygen / Stage 3 drive |
| ET-05d | P1 | X-A, emergence and extubation to room air · hypothermic vs normothermic → emergence: CO2 production and EtCO2 | tcAtEmergence 34.49; tcCtrl 36.08; shivWmean 66; shivOnsetS 700; vo2Cold 365.8; vo2Warm 230.1; vo2Pct 58.97; vo2PctOwnBase 83.45; dHr -2; dMap -0.5; neCold 275; neWarm 275; spo2Cold 96.3; spo2Warm 96; svo2Warm 78.8; coCold 5.8; coWarm 5.8; pao2Cold 86.5; pao2Warm 92.6; dSpo2 0.3; svo2Cold 76.5; dEtco2 1.1; dPaco2 1.3; dVe 2.3 | PL: dEtco2 = 1.1 (sign 1, beyond 1) [research/12 ET-05 (EtCO2 ↑: VCO2 rises with shivering before ventilation catches up)] | **PL** (direction only) | — · Stage 3 gas / neuro drive |
| ET-06 | P1 | X-A ventilated, GA flag · GA, 21 °C → Ringer's lactate 2 L over 20 min at room temperature vs the same 2 L warmed to 37 °C: core and mean body temperature per litre | dCorePerL -0.348; dMbtPerL -0.265; dCorePerL10 -0.312; ivWmean -103.5 | PL: dMbtPerL = -0.265 in [-0.3, -0.2] [Sessler DI, Lancet 2008;371:1791 (1 L of crystalloid at ambient temperature lowers MEAN BODY temperature ≈ 0.25 °C) — research/12 ET-06 words it as core; the source's quantity is graded, the core is reported] | **PL** | — · 7e thermal/environment.ts infusionW (E-7e-1) |
| ET-07 | P1 | X-A ventilated, GA flag · class III haemorrhage (1.5 L / 10 min) → 6 u RBC over 60 min at 4 °C (unwarmed) vs warmed: core at the end | dCore -0.89; dMbtPerUnit -0.151; dCore10 -0.75; tcEndCold 34.66; tcEndWarm 35.55 | PL: dCore = -0.89 in [-1, -0.5] [research/12 ET-07 (ATLS 10e: 6 u of refrigerated blood lowers core −0.5 to −1 °C)]<br>TW: dMbtPerUnit = -0.151 above [-0.3, -0.2] [Sessler 2008 Lancet (one unit of refrigerated blood lowers mean body temperature ≈ 0.25 °C) — the two sources disagree for 6 units; Q for Ali]<br>HAND PL (automatic TW): core −0.89 °C at the end of 6 cold units (ATLS −0.5 to −1: PL); the mean-body fall per unit is −0.15 °C against Sessler's rounded 0.25 — which is the physics of the unit, not a model error: 280 mL × 4.18 J/mL/°C × 33 °C = 38.6 kJ over 70 kg × 3.5 kJ/kg/°C = 0.16 °C per unit (environment.ts:108 states 0.24 for a core-only share). The two sources disagree; Q for Ali | **PL** | — · 7e thermal/environment.ts ivInflow (E-7e-1) |

### 2.3 Malignant hyperthermia and dantrolene (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| ET-10a | P1 | MH-susceptible (profile `neuro.mhSusceptible`), ventilated VCV 12 × 600 · GA: sevoflurane 2 % + succinylcholine 1.5 mg/kg at T → the triggering agents themselves, no instructor action, 90 min | mhActMax 0; etco2Max 29.35; etco2Base 30; mhDevelops false; marks 300s mhTrigger, 317s recurarisation, 321s awareness, 325s fasciculation, 328s apnoea, 350s lossOfConsciousness, 878s breathing | WR: mhDevelops = false (expected true) [MHAUS / EMHG guidance; Larach MG et al., Anesthesiology 1994;80:771 (clinical grading scale); Miller 9e, malignant hyperthermia: a susceptible patient exposed to a volatile and succinylcholine develops MH (fulminant within minutes to an hour); research/12 ET-10]<br>HAND WR (automatic WR): MH never starts from its triggers: 7f marks `mhTrigger` at the succinylcholine dose (neuro/pipeline.ts:170–180) and at MAC > 0.1 (:206–210), and nothing reads the mark — Stage 3's MH state `rs.temp.mh` is created only by the instructor's `condition mh` (resp/pipeline.ts:691–695). EtCO2 stays 29–30 for 90 min, MH activity 0 | **WR** | E1 · 7f neuro/pipeline.ts (mhTrigger mark only) → Stage 3/7e MH state |
| ET-10b | P1 | X-A ventilated VCV 12 × 600 (fixed minute ventilation) · MH (instructor `condition mh 1`) under sevoflurane + succinylcholine → untreated: EtCO2 doubling time | etco2Base 30; tDoubleS 860; etco2At15 63.44; paco2At15 69.91; dHr15 47; hr15 118; map15 117.9; tcRiseMaxPerMin 0.174; tc30 40.32; tc60 44.29; tcMax 47.77; k20 5.75; k0 4.26; ph30 6.98; lact30 9.61; vo2x15 2.83; arrestAfterS 2680; arrested true; rhythms 20s sinus, 3040s vfCoarse, 3800s vfFine, 4380s asystole | PL: tDoubleS = 860 in [600, 900] [MHAUS / EMHG guidance; Larach MG et al., Anesthesiology 1994;80:771 (clinical grading scale); Miller 9e, malignant hyperthermia; research/12 ET-10 (EtCO2 doubles in 10–15 min at a fixed minute ventilation); tables §7 check 21] | **PL** | — · Stage 3 thermal/params.ts MH_ONSET_S, MH_VCO2_FACTOR |
| ET-10c | P1 | X-A ventilated · MH (instructor), untreated → HR at +15 min vs the same rig without MH | etco2Base 30; tDoubleS 860; etco2At15 63.44; paco2At15 69.91; dHr15 47; hr15 118; map15 117.9; tcRiseMaxPerMin 0.174; tc30 40.32; tc60 44.29; tcMax 47.77; k20 5.75; k0 4.26; ph30 6.98; lact30 9.61; vo2x15 2.83; arrestAfterS 2680; arrested true; rhythms 20s sinus, 3040s vfCoarse, 3800s vfFine, 4380s asystole | PL: dHr15 = 47 (sign 1, beyond 10) [MHAUS / EMHG guidance; Larach MG et al., Anesthesiology 1994;80:771 (clinical grading scale); Miller 9e, malignant hyperthermia: unexplained tachycardia is an early sign (Larach 1994 scale); research/12 ET-10] | **PL** (direction only) | — · 7e hormones.ts (MH → extraSymp 2·activity) |
| ET-10d | P1 | X-A ventilated · MH (instructor), untreated → core temperature: the fastest rise over 10 min | etco2Base 30; tDoubleS 860; etco2At15 63.44; paco2At15 69.91; dHr15 47; hr15 118; map15 117.9; tcRiseMaxPerMin 0.174; tc30 40.32; tc60 44.29; tcMax 47.77; k20 5.75; k0 4.26; ph30 6.98; lact30 9.61; vo2x15 2.83; arrestAfterS 2680; arrested true; rhythms 20s sinus, 3040s vfCoarse, 3800s vfFine, 4380s asystole | PL: tcRiseMaxPerMin = 0.174 in [0.067, 0.2] [research/12 ET-10 (+1 °C every 5–15 min); MHAUS / EMHG guidance; Larach MG et al., Anesthesiology 1994;80:771 (clinical grading scale); Miller 9e, malignant hyperthermia; tables §7 check 21] | **PL** | E2 · Stage 3/7e thermal/params.ts MH_HEAT_X |
| ET-10e | P1 | X-A ventilated · MH (instructor), untreated → K⁺ at +20 min; pH at +30 min | etco2Base 30; tDoubleS 860; etco2At15 63.44; paco2At15 69.91; dHr15 47; hr15 118; map15 117.9; tcRiseMaxPerMin 0.174; tc30 40.32; tc60 44.29; tcMax 47.77; k20 5.75; k0 4.26; ph30 6.98; lact30 9.61; vo2x15 2.83; arrestAfterS 2680; arrested true; rhythms 20s sinus, 3040s vfCoarse, 3800s vfFine, 4380s asystole | PL: k20 = 5.75 in [5.5, 6.5] [tables §7 check 21 (K 5.5–6.5 by 20 min); MHAUS (hyperkalaemia from rhabdomyolysis)]<br>PL: ph30 = 6.98 in [6.9, 7.25] [Larach 1994 scale (arterial pH < 7.25 scores as MH acidosis); MHAUS (mixed respiratory and metabolic acidosis)] | **PL** | — · 7e core.ts MH_K_EFFLUX / 7c acid–base |
| ET-10f | P1 | X-A ventilated · MH → masseter spasm after succinylcholine; generalised rigidity | — | no muscle-rigidity state: masseter spasm / generalised rigidity is on research/12's FU-7 missing-mechanism list (§5.11); the TOF and chest-wall compliance do not change in MH | **NE** | FU-7 · FU-7 (rigidity: research/12 §5.11 NE list) |
| ET-10g | P1 | X-A ventilated · MH (instructor), untreated 90 min → arrest (VF from hyperkalaemia/hyperthermia) if untreated | etco2Base 30; tDoubleS 860; etco2At15 63.44; paco2At15 69.91; dHr15 47; hr15 118; map15 117.9; tcRiseMaxPerMin 0.174; tc30 40.32; tc60 44.29; tcMax 47.77; k20 5.75; k0 4.26; ph30 6.98; lact30 9.61; vo2x15 2.83; arrestAfterS 2680; arrested true; rhythms 20s sinus, 3040s vfCoarse, 3800s vfFine, 4380s asystole | PL: arrested = true (expected true) [MHAUS / EMHG guidance; Larach MG et al., Anesthesiology 1994;80:771 (clinical grading scale); Miller 9e, malignant hyperthermia: untreated fulminant MH ends in VF/cardiac arrest (hyperkalaemia, hyperthermia, acidosis); A08-F4 (WR before FU-4 G8)] | **PL** | E2 · FU-4 G8 (arrest.ts T_HOT hazard) |
| ET-11a | P1 | X-A ventilated · MH (instructor) at +15 min → volatile off, FiO2 1, MV × 2, dantrolene 2.5 mg/kg, surface cooling: EtCO2 course | etco2AtTD 48.88; etco2Base 30; tHalfS 440; tHalfNoDantS 2100; etco2At30 24.6; etco2At30NoDant 55.28; etco2At30Untreated 30.94; mhAct30 0.25; mhAct60 0.27; mhAct60two 0; tcAtTD 38; tcPeakAfterS 860; tcPeak 39.01; tc60 37.44; tc60NoDant 44.35; tc60Untreated 46.18; tempFalls true; dK30 -0.47; dK30NoDant 0.96; k30Untreated 6.99; arrestTreated false; arrestNoDant true | PL: tHalfS = 440 in [300, 1200] [research/12 ET-11 (EtCO2 falls within 10–20 min of dantrolene; R48 prototype 12 min); MHAUS (hyperventilate, dantrolene 2.5 mg/kg, repeat to effect)] | **PL** | — · Stage 3/7e thermal/mh.ts + 7g dantrolene |
| ET-11b | P1 | X-A ventilated · MH (instructor), treated at +15 min → core temperature peaks and falls | etco2AtTD 48.88; etco2Base 30; tHalfS 440; tHalfNoDantS 2100; etco2At30 24.6; etco2At30NoDant 55.28; etco2At30Untreated 30.94; mhAct30 0.25; mhAct60 0.27; mhAct60two 0; tcAtTD 38; tcPeakAfterS 860; tcPeak 39.01; tc60 37.44; tc60NoDant 44.35; tc60Untreated 46.18; tempFalls true; dK30 -0.47; dK30NoDant 0.96; k30Untreated 6.99; arrestTreated false; arrestNoDant true | PL: tempFalls = true (expected true) [research/12 ET-11 (temperature peaks and falls after dantrolene and cooling); MHAUS (cool until < 38 °C)] | **PL** | — · Stage 3/7e thermal (cooling is a proxy: no active-cooling device, research/12 §1.3 I18) |
| ET-11c | P1 | X-A ventilated · MH (instructor), treated at +15 min → K⁺ over 30 min after dantrolene | etco2AtTD 48.88; etco2Base 30; tHalfS 440; tHalfNoDantS 2100; etco2At30 24.6; etco2At30NoDant 55.28; etco2At30Untreated 30.94; mhAct30 0.25; mhAct60 0.27; mhAct60two 0; tcAtTD 38; tcPeakAfterS 860; tcPeak 39.01; tc60 37.44; tc60NoDant 44.35; tc60Untreated 46.18; tempFalls true; dK30 -0.47; dK30NoDant 0.96; k30Untreated 6.99; arrestTreated false; arrestNoDant true | PL: dK30 = -0.47 (sign -1, beyond 0.3) [research/12 ET-11 (K falls once the hypermetabolism is controlled); MHAUS] | **PL** (direction only) | — · 7e core.ts MH_K_EFFLUX / 7c |

### 2.4 The surgical stress response (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| ET-16a | P1 | X-A ventilated, sevoflurane GA · incision (stimulus 1.0, held) at +10 min → fentanyl 0 / 2 / 5 µg/kg 1 min before: plasma adrenaline/noradrenaline and the pressor response | epiCtrl 34; epiRatioF0 2.57; neRatioF0 1.77; dEpiF0 53.3; dEpiF2 6; dEpiF5 1.9; epiBluntF5 0.96; dNeF0 211.1; dNeF5 7.2; dMapF0 7.69; dMapF2 2.14; dMapF5 -9.36; dHrF0 6; dHrF5 -22; antinocF0 0.57; antinocF5 0.99; symp0 0.48; symp5 0.01; cort2hF2 1263.81; cort4hF2 1503.04; cortPeakF2 1542.46; cortPeakH 5; cortCtrl4h 400; cortF5vsF0 -0.071; glu0 5.55; glu2hF2 6.85; dGlu2hF2 1.3; dGlu2hF0 1.79; dGlu2hF5 1.03; gluMaxF2 6.91; ins2hF2 15.27 | PL: epiRatioF0 = 2.57 in [2, 5] [Desborough JP, Br J Anaesth 2000;85:109–117 (the stress response to surgery: catecholamines, cortisol 400 → > 1500 nmol/L peaking 4–6 h, hyperglycaemia; opioids in ordinary doses blunt the haemodynamic/sympathetic arm, only very high doses (fentanyl 50–100 µg/kg) suppress the pituitary–adrenal arm); tables §5c (surgical stress: adrenaline 2–5× basal)]<br>PL: epiBluntF5 = 0.96 (sign 1, beyond 0.2) [Desborough JP, Br J Anaesth 2000;85:109–117 (the stress response to surgery: catecholamines, cortisol 400 → > 1500 nmol/L peaking 4–6 h, hyperglycaemia; opioids in ordinary doses blunt the haemodynamic/sympathetic arm, only very high doses (fentanyl 50–100 µg/kg) suppress the pituitary–adrenal arm) (opioid dose blunts the sympathoadrenal arm); research/12 ET-16]<br>TW: dMapF0 = 7.69 below [20, 30] [Shribman AJ et al., Br J Anaesth 1987;59:295 / R51 addendum 25: the surgical surge raises MAP +20–30 mmHg without opioid]<br>HAND TW (automatic TW): the sympathoadrenal arm is right in size and blunting (adrenaline ×2.6, noradrenaline ×1.8; fentanyl 5 µg/kg removes 96 % of it and gives HR −22), but the pressor response to incision without opioid is +7.7 mmHg (Shribman +20–30): the surge acts only through 7e's set-point/`symp` multipliers, which FU-4's output cap limits — FU-7 Task 10 (R51 addendum 25) routes the circulating catecholamine through 7g's rows | **TW** (FU-7 Task 10 pending) | FU-7 T10 · 7e hormones.ts / effects.ts (surge: FU-7 Task 10) |
| ET-16b | P1 | X-A ventilated, sevoflurane GA · incision held 5 h → fentanyl 2 µg/kg: cortisol course; fentanyl 5 vs 0 (quiet: ordinary doses do not suppress it) | epiCtrl 34; epiRatioF0 2.57; neRatioF0 1.77; dEpiF0 53.3; dEpiF2 6; dEpiF5 1.9; epiBluntF5 0.96; dNeF0 211.1; dNeF5 7.2; dMapF0 7.69; dMapF2 2.14; dMapF5 -9.36; dHrF0 6; dHrF5 -22; antinocF0 0.57; antinocF5 0.99; symp0 0.48; symp5 0.01; cort2hF2 1263.81; cort4hF2 1503.04; cortPeakF2 1542.46; cortPeakH 5; cortCtrl4h 400; cortF5vsF0 -0.071; glu0 5.55; glu2hF2 6.85; dGlu2hF2 1.3; dGlu2hF0 1.79; dGlu2hF5 1.03; gluMaxF2 6.91; ins2hF2 15.27 | PL: cortPeakF2 = 1542.46 in [1500, 2500] [Desborough JP, Br J Anaesth 2000;85:109–117 (the stress response to surgery: catecholamines, cortisol 400 → > 1500 nmol/L peaking 4–6 h, hyperglycaemia; opioids in ordinary doses blunt the haemodynamic/sympathetic arm, only very high doses (fentanyl 50–100 µg/kg) suppress the pituitary–adrenal arm)]<br>PL: cortPeakH = 5 in [4, 6] [Desborough JP, Br J Anaesth 2000;85:109–117 (the stress response to surgery: catecholamines, cortisol 400 → > 1500 nmol/L peaking 4–6 h, hyperglycaemia; opioids in ordinary doses blunt the haemodynamic/sympathetic arm, only very high doses (fentanyl 50–100 µg/kg) suppress the pituitary–adrenal arm) (peak 4–6 h)]<br>PL: cortF5vsF0 = -0.071 (quiet, tol ±0.1) [Desborough JP, Br J Anaesth 2000;85:109–117 (the stress response to surgery: catecholamines, cortisol 400 → > 1500 nmol/L peaking 4–6 h, hyperglycaemia; opioids in ordinary doses blunt the haemodynamic/sympathetic arm, only very high doses (fentanyl 50–100 µg/kg) suppress the pituitary–adrenal arm)] | **PL** | — · 7e hormones.ts CORT_* |
| ET-16c | P1 | X-A ventilated, sevoflurane GA · incision held → fentanyl 2 µg/kg: glucose rise at 2 h vs no incision | epiCtrl 34; epiRatioF0 2.57; neRatioF0 1.77; dEpiF0 53.3; dEpiF2 6; dEpiF5 1.9; epiBluntF5 0.96; dNeF0 211.1; dNeF5 7.2; dMapF0 7.69; dMapF2 2.14; dMapF5 -9.36; dHrF0 6; dHrF5 -22; antinocF0 0.57; antinocF5 0.99; symp0 0.48; symp5 0.01; cort2hF2 1263.81; cort4hF2 1503.04; cortPeakF2 1542.46; cortPeakH 5; cortCtrl4h 400; cortF5vsF0 -0.071; glu0 5.55; glu2hF2 6.85; dGlu2hF2 1.3; dGlu2hF0 1.79; dGlu2hF5 1.03; gluMaxF2 6.91; ins2hF2 15.27 | PL: dGlu2hF2 = 1.3 in [1, 3] [research/12 ET-16 (glucose +1–3 mmol/L); Desborough JP, Br J Anaesth 2000;85:109–117 (the stress response to surgery: catecholamines, cortisol 400 → > 1500 nmol/L peaking 4–6 h, hyperglycaemia; opioids in ordinary doses blunt the haemodynamic/sympathetic arm, only very high doses (fentanyl 50–100 µg/kg) suppress the pituitary–adrenal arm)] | **PL** | — · 7e glucose.ts / effects.ts |
| ET-17 | P1 | X-A ventilated, sevoflurane GA, non-diabetic · 2 h of surgery (stimulus 1.0) with fentanyl 2 µg/kg → glucose at 2 h | epiCtrl 34; epiRatioF0 2.57; neRatioF0 1.77; dEpiF0 53.3; dEpiF2 6; dEpiF5 1.9; epiBluntF5 0.96; dNeF0 211.1; dNeF5 7.2; dMapF0 7.69; dMapF2 2.14; dMapF5 -9.36; dHrF0 6; dHrF5 -22; antinocF0 0.57; antinocF5 0.99; symp0 0.48; symp5 0.01; cort2hF2 1263.81; cort4hF2 1503.04; cortPeakF2 1542.46; cortPeakH 5; cortCtrl4h 400; cortF5vsF0 -0.071; glu0 5.55; glu2hF2 6.85; dGlu2hF2 1.3; dGlu2hF0 1.79; dGlu2hF5 1.03; gluMaxF2 6.91; ins2hF2 15.27 | TW: glu2hF2 = 6.85 below [7, 8] [research/12 ET-17 (5.5 → 7–8 mmol/L); Desborough 2000] | **TW** | — · 7e glucose.ts |

### 2.5 Glucose, insulin, diabetes and steroids (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| ET-18a | P1 | type 1 diabetes (engine API `endo.diabetes type1`; not in pme-scenario/1) · GA + surgery, insulin OMITTED for 4 h → glucose over 4 h without insulin | gluT1base 7.22; gluT1at4h 9.61; gluAdultAt4h 6.91; insT1 10; insExoT1 10; keto4h 0; dka4h 0; ph4h 7.54; fallPerH -2.52; glu6hInfused 4.58; dK2hInfusion -1.12 | the omission is not expressible: the type 1 profile always carries its long-acting basal insulin (core.ts:101–104 basalExo), and no command stops it; the `endo` profile is engine-API only until FU-8 A16. PROBE (basal on): glucose rises only with the stress response | **NE** | E7 · 7e core.ts glucoseProfile (type 1 always carries basal insulin) / FU-8 A16 (schema) |
| ET-18b | P1 | type 1 diabetes (engine API) · GA + surgery, 4 h → ketosis from insulin deficiency | gluT1base 7.22; gluT1at4h 9.61; gluAdultAt4h 6.91; insT1 10; insExoT1 10; keto4h 0; dka4h 0; ph4h 7.54; fallPerH -2.52; glu6hInfused 4.58; dK2hInfusion -1.12 | WR: keto4h = 0 (expected sign 1) [JBDS-IP 2023 perioperative diabetes / JBDS DKA 2023: omitted insulin in type 1 → ketosis (β-hydroxybutyrate > 3 mmol/L) within hours]<br>HAND MI (automatic WR): no ketogenesis from insulin deficiency: DKA is 7c's instructor condition (`condition dka`) and an INPUT to 7e (core.ts header: "never an output (no ketone drive back)"); 7c's ketoacid pool stays 0 whatever the insulin (and the type 1 profile is never insulin-deficient, ET-18a) | **MI** | E7 · 7e glucose.ts → 7c ketoacids (new seam) |
| ET-18c | P1 | type 1 diabetes (engine API) · GA + surgery, hyperglycaemic → insulin infusion 0.1 units/kg/h for 2 h (fixed-rate): glucose fall per hour vs no infusion | gluT1base 7.22; gluT1at4h 9.61; gluAdultAt4h 6.91; insT1 10; insExoT1 10; keto4h 0; dka4h 0; ph4h 7.54; fallPerH -2.52; glu6hInfused 4.58; dK2hInfusion -1.12 | PL: fallPerH = -2.52 in [-4, -2] [JBDS DKA 2023 (fixed-rate 0.1 units/kg/h: target glucose fall ≈ 3 mmol/L/h) — band ±1 is a proposal around the guideline target] | **PL** | FU-8 B1 · 7e glucose.ts / 7g insulin row (FU-8 B1 reference) |
| ET-19 | P1 | type 2 diabetes 60 y (engine API) · GA flag, ventilated, no surgery → dexamethasone 8 mg IV at T vs none: glucose at 4–8 h | dGluMax4to8h 0; glu0 7.99 | WR: dGluMax4to8h = 0 below [2, 4] [research/12 ET-19 (PADDI: Corcoran TB et al., NEJM 2021;384:1731 — dexamethasone 8 mg raises glucose in diabetics, peak +2–4 mmol/L at 4–8 h) [VERIFY magnitude]]<br>HAND MI (automatic WR): dexamethasone is a placeholder row with no PD (pk/data/rows-other.ts:66 `pd: []`, "glucose ↑ is 7e"), and 7e observes only insulin and dextrose doses (adapters.ts:102–107): glucose Δ 0.00 | **MI** (FU-7 Task 18 pending) | FU-7 T18 · 7g rows-other.ts → 7e glucocorticoid term (FU-7 Task 18, D12; its diabetic arm is this cell) |
| ET-20a | P1 | X-A awake, spontaneous room air, non-diabetic · fasting normoglycaemia → insulin 10 units IV (≈ 0.14 units/kg): glucose nadir and its time | gluNadirMmol 2.92; tNadirMin 13.33; below39 true; below22 false; dK30 -0.8; dK60 -0.78; dKmin -0.87; epiPeakRatio 16.42; dHrPeak 18.4; dMapPeak 20.5; sweating false; glycoMax 0.25; consciousLost false; diMin 84 | TS: tNadirMin = 13.33 below [40, 60] (lower = stronger/faster) [research/12 ET-20 (nadir at 40–60 min; tables §7 prototype nadir 38 mg/dL). The insulin-tolerance-test literature (0.1–0.15 units/kg IV) puts the nadir at 20–30 min [VERIFY] — Q for Ali]<br>PL: below39 = true (expected true) [ADA level 1 (< 3.9 mmol/L) is certain after 0.14 units/kg IV in a non-diabetic (insulin tolerance test: < 2.2 mmol/L)]<br>HAND TS (automatic TS): glucose reaches its nadir 13 min after 10 units IV (research/12: 40–60 min; insulin-tolerance tests: 20–30 min) and only 2.9 mmol/L deep (ITT < 2.2): the bolus enters the insulin space at once (glucose.ts insulinBolus) with t½ 5 min and p2 0.025/min, so remote insulin peaks within minutes, and the counter-regulation (adrenaline ×16, glucagon-like EGP) pulls glucose back from 20 min. K −0.87 and HR +18 are in band | **TS** | E12 · 7e glucose.ts (Bergman) / 7g insulin |
| ET-20b | P1 | X-A awake · fasting → insulin 10 units IV: plasma K⁺ | gluNadirMmol 2.92; tNadirMin 13.33; below39 true; below22 false; dK30 -0.8; dK60 -0.78; dKmin -0.87; epiPeakRatio 16.42; dHrPeak 18.4; dMapPeak 20.5; sweating false; glycoMax 0.25; consciousLost false; diMin 84 | PL: dKmin = -0.87 in [-1, -0.5] [research/12 ET-20 (K −0.5 to −1 mmol/L); BF-08b insulin–dextrose −0.93 at 60 min (7c)] | **PL** | — · 7g kShift (exogenous insulin) / 7c |
| ET-20c | P1 | X-A awake · fasting → insulin 10 units IV: the adrenergic counter-regulation (adrenaline, HR) | gluNadirMmol 2.92; tNadirMin 13.33; below39 true; below22 false; dK30 -0.8; dK60 -0.78; dKmin -0.87; epiPeakRatio 16.42; dHrPeak 18.4; dMapPeak 20.5; sweating false; glycoMax 0.25; consciousLost false; diMin 84 | PL: epiPeakRatio = 16.42 in [10, 20] [tables §5c / params.ts DRIVE_HYPOGLY [TXT]: hypoglycaemic clamps raise adrenaline 10–20× (Cryer PE; Schwartz NS 1987) [VERIFY]]<br>PL: dHrPeak = 18.4 (sign 1, beyond 5) [research/12 ET-20 (adrenergic response: tachycardia, sweating)] | **PL** | — · 7e hormones.ts DRIVE_HYPOGLY_PER_MGDL |

### 2.6 Anaphylaxis and adrenaline (P1)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| ET-27a | P1 | X-A ventilated, sevoflurane GA · anaphylaxis grade II (severity 0.5) → adrenaline 50 µg IV at +3 min: MAP restored within 2 min | mapBase 79.4; mapAtDoseII 70.17; map2minII 96.85; dMap2minII 26.38; restoreIIs 0; restoredII true; mapAtDoseIII 54.48; mapNadirIIIU 5.27; map10minIII 97.65; dMap10minIII 92.35; restoreIIIs 15; restoredIII true; lungSevIIIat10 0.12; lungSevIIIUat10 0.3; dLungSevIII -0.18; spo2IIIU 99; spo2III 99; arrestIIIU true | PL: restoredII = true (expected true) [AAGBI/Harper NJN et al., Anaesthesia 2018;73:212 and 2020 guidance (adrenaline 50 µg IV boluses titrated to effect; grade III may need repeated boluses or an infusion; MAP responds within 1–2 min)]<br>PL: dMap2minII = 26.38 (sign 1, beyond 5) [AAGBI/Harper NJN et al., Anaesthesia 2018;73:212 and 2020 guidance (adrenaline 50 µg IV boluses titrated to effect; grade III may need repeated boluses or an infusion; MAP responds within 1–2 min)] | **PL** | — · 7e conditions.ts ANAPH / 7g adrenaline |
| ET-27b | P1 | X-A ventilated, sevoflurane GA · anaphylaxis grade III (severity 0.75) → adrenaline 50 µg IV every 3 min ×4: MAP course vs untreated | mapBase 79.4; mapAtDoseII 70.17; map2minII 96.85; dMap2minII 26.38; restoreIIs 0; restoredII true; mapAtDoseIII 54.48; mapNadirIIIU 5.27; map10minIII 97.65; dMap10minIII 92.35; restoreIIIs 15; restoredIII true; lungSevIIIat10 0.12; lungSevIIIUat10 0.3; dLungSevIII -0.18; spo2IIIU 99; spo2III 99; arrestIIIU true | PL: restoredIII = true (expected true) [AAGBI/Harper NJN et al., Anaesthesia 2018;73:212 and 2020 guidance (adrenaline 50 µg IV boluses titrated to effect; grade III may need repeated boluses or an infusion; MAP responds within 1–2 min) (MAP ≥ 80 % of baseline within 10 min of repeated boluses)]<br>PL: dMap10minIII = 92.35 (sign 1, beyond 10) [AAGBI/Harper NJN et al., Anaesthesia 2018;73:212 and 2020 guidance (adrenaline 50 µg IV boluses titrated to effect; grade III may need repeated boluses or an infusion; MAP responds within 1–2 min)] | **PL** | — · 7e conditions.ts ANAPH / 7g adrenaline |
| ET-27c | P1 | X-A ventilated, sevoflurane GA · anaphylaxis grade III → adrenaline ×4: bronchospasm (7b anaphylaxis lung severity) vs untreated | mapBase 79.4; mapAtDoseII 70.17; map2minII 96.85; dMap2minII 26.38; restoreIIs 0; restoredII true; mapAtDoseIII 54.48; mapNadirIIIU 5.27; map10minIII 97.65; dMap10minIII 92.35; restoreIIIs 15; restoredIII true; lungSevIIIat10 0.12; lungSevIIIUat10 0.3; dLungSevIII -0.18; spo2IIIU 99; spo2III 99; arrestIIIU true | PL: dLungSevIII = -0.18 (sign -1, beyond 0.05) [AAGBI/Harper NJN et al., Anaesthesia 2018;73:212 and 2020 guidance (adrenaline 50 µg IV boluses titrated to effect; grade III may need repeated boluses or an infusion; MAP responds within 1–2 min) (β2: bronchospasm eases)] | **PL** (direction only) | — · 7e anaphLung → 7b |

### 2.7 Deep hypothermia, fever and hyperthermia (P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| ET-08a | P2 | X-A ventilated, sevoflurane 2 % GA · core 32 °C (instructor target) vs 36.8 → the same sevoflurane dial: MAC requirement per °C | tc 32; macF 0.75; macRedPerC 5.21; diHypo 38; diNormo 46; etMacHypo 0.78; etMacNormo 0.77 | PL: macRedPerC = 5.21 in [4, 6] [Vitez TS, White PF, Eger EI, Anesthesiology 1974;41:80; Eger EI 2001 (MAC falls ≈ 5 % per °C of hypothermia); tables §5.3 macFactor] | **PL** | — · 7e thermal/metabolic.ts cascade.macF → 7f |
| ET-08b | P2 | X-A ventilated, sevoflurane GA, no NMB at induction · core 32 °C vs 36.8 → rocuronium 0.6 mg/kg after cooling: time to T1 25 % recovery (ratio hypothermic / normothermic) | t25HypoMin 164.5; t25NormoMin 60.5; ratio 2.72; ceRocHypoAt30 1565.9; ceRocNormoAt30 1129.46 | PL: ratio = 2.72 in [1.5, 3] [Heier T, Caldwell JE et al., Anesthesiology 1991;74:815 (core −2 °C doubles vecuronium duration); Beaufort AM 1995 (rocuronium prolonged in hypothermia) [VERIFY]; research/12 ET-08 (NMB duration ↑)] | **PL** | — · 7g PK clFactor (temperature) / 7f nmb EC50 (temperature) |
| ET-08c | P2 | X-A ventilated, GA flag, no volatile · core 34 °C vs 36.8 → propofol 100 µg/kg/min for 60 min after cooling: plasma concentration ratio | cpHypo 2.689; cpNormo 2.556; ratio 1.052; tc 34; coHypo 4.98; coNormo 5.1 | TW: ratio = 1.052 below [1.15, 1.4] [Leslie K, Sessler DI et al., Anesth Analg 1995;80:1007 (propofol plasma concentration ≈ 28 % higher at 34 °C during a fixed infusion)]<br>HAND TW (automatic TW): Cp +5 % at 34 °C after 60 min (Leslie +28 %): temperature scales only the ELIMINATION clearance (pk/pipeline.ts:157, −5 %/°C → −14 %), which at 60 min of infusion is still a minor share of the concentration; Leslie attributed most of the rise to a smaller intercompartmental clearance, which the engine keeps at its normothermic value | **TW** | E14 · 7g pk/pipeline.ts clFactor (−5 %/°C) |
| ET-08d | P2 | X-A · core 32 °C → hypothermic coagulopathy (PT/aPTT, platelet function, bleeding) | — | no coagulation model: 7e publishes `endo.cascade.coagF` (−10 %/°C below 35 °C) and nothing reads it (research/11 B47); 7i owns it (v1.1) | **NE** | 7i · 7i (R58/R60 v1.1) |
| ET-09a | P2 | X-A ventilated, sevoflurane GA · core 28 °C (instructor target) → HR and the ECG (Osborn J waves) at 28 °C | tc 28; hr28 40; hrNormo 72; map28 57.35; co28 3.09; ecgTempC 28.21; osborn true; rhythms 30s sinus | PL: hr28 = 40 in [40, 50] [research/12 ET-09; ERC 2021 special circumstances (moderate hypothermia: bradycardia) / Danzl DF, Pozos RS NEJM 1994;331:1756]<br>PL: osborn = true (expected true) [ERC 2021 / Danzl 1994: Osborn (J) waves below ≈ 32–33 °C (ECG generator: electrolytes.ts, from 33 °C)] | **PL** | — · 7e metabolic.ts tempHrF / ECG electrolytes.ts |
| ET-09b | P2 | X-A ventilated, sevoflurane GA · core 28 °C → atrial fibrillation | af false; rhythms 30s sinus | WR: af = false (expected true) [ERC 2021 / Danzl 1994: AF is common below 32 °C and reverts on rewarming]<br>HAND MI (automatic WR): no hypothermic AF: arrest.ts carries only the VF hazard below 28 °C; the rhythm stays sinus at 28 °C (A08-G4b, measured again, not re-reported) | **MI** (A08-G4b (FU-4 G12) pending) | E9 · FU-4 G12 → arrest.ts has the VF hazard only (no AF hazard) |
| ET-09c | P2 | X-A ventilated, sevoflurane GA · core 25 °C (instructor target) → spontaneous VF within 60 min | vf true; arrestS 890; rhythms 10s sinus, 1190s vfCoarse, 1940s vfFine, 2530s asystole | PL: vf = true (expected true) [ERC 2021 (the risk of VF is high below 28 °C; below 24 °C spontaneous arrest); research/12 ET-09 (VF risk)] | **PL** | — · FU-4 G12 (arrest.ts T_HAZARD) |
| ET-12 | P2 | X-A ventilated (fixed MV), GA flag · sepsis (7e `condition sepsis`, phase sepsis) from 60 s → the febrile state at 90 min: VO2 and HR per °C, EtCO2 at fixed MV | tc 36.86; dT 1.44; vo2PctPerC 24.11; hrPerC 13.91; dEtco2 7.07; vo2F 1.2; dMap -12.21; tcAt30 36.64 | TS: vo2PctPerC = 24.11 above [10, 13] [research/12 ET-12 (VO2 +10–13 %/°C; Miller 9e)]<br>TS: hrPerC = 13.91 above [8, 10] [tables §5c (HR +8–10 bpm/°C); research/12 ET-12 (+10/°C)]<br>PL: dEtco2 = 7.07 (sign 1, beyond 1) [research/12 ET-12 (EtCO2 ↑ at fixed MV)]<br>HAND TW (automatic TS): the rig is confounded and the per-°C figures are not the fever's: under GA at 21 °C the septic patient cannot mount a fever (core 36.86 against the flag control's 35.42; the set-point shift 2.2 °C needs heat the anaesthetised, vasodilated patient does not make), so the +35 % VO2 is the sepsis row's own hypermetabolism (vo2F 1.2, conditions.ts:32) × the temperature factor, and the HR includes the baroreflex answer to MAP −12. The temperature coefficient itself is Stage 3's tempFactor 7.5 %/°C (gas/params.ts:179–181), below the classical 10–13 %/°C of fever (research/12 ET-12); EtCO2 +7 at fixed MV is right | **TW** | E11 · 7e conditions.ts SEPSIS vo2F + Stage 3 tempFactor |
| ET-30 | P2 | X-A ventilated, GA flag · normothermic, draped → forced air 43 °C + fluid warmer + ambient 28 °C for 4 h: iatrogenic hyperthermia and the GA sweating defence | tc4h 38.31; tcMax 38.31; sweatAny true; sweatOnsetC 38.018; hr4h 82 | PL: tcMax = 38.31 in [37.3, 40] [Sessler 2008 (active warming with a high ambient can overheat an anaesthetised patient; direction only — the band marks "above normothermia")] | **PL** (direction only) | — · 7e thermal (the GA sweating threshold 38 °C, tables §5c) |
| ET-33 | P2 | X-A, emergence at ≈ 34.5 °C (ET-05 rig) · hypothermic emergence → pethidine 25 mg / an opioid at emergence: shivering stops (opioids lower the shivering threshold) | — | not expressible as a drug effect: `temp.shiverShift` ("pethidine, opioids: 7f/7g") has no writer anywhere in the engine, and pethidine/meperidine and clonidine are not in the library. Expected: meperidine 25 mg lowers the shivering threshold ≈ 2× more than the vasoconstriction threshold and stops postoperative shivering (Kurz A et al., Anesthesiology 1997;86:1046) [VERIFY] | **NE** | E10 · 7e thermal (shiverShift is declared and never written: heat.ts:81, 120) / FU-7 library (pethidine) |

### 2.8 Thyroid, adrenal and the stress axis (P2/P3)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| ET-13a | P2 | X-A ventilated, GA flag · thyroid storm (7e `condition thyroidStorm 1`) from 60 s → the storm at 1 h, then esmolol 0.5 mg/kg + 150 µg/kg/min | hrStorm 155; tcStorm 36.58; coStorm 6.11; coCtrl 5.13; mapStorm 77.32; hrPctEsmolol -27.74; tcStorm80 36.6 | PL: hrStorm = 155 in [140, 180] [research/12 ET-13 (HR 140+); Burch–Wartofsky; Miller 9e endocrine]<br>TW: tcStorm = 36.58 below [38.5, 41] [thyroid.ts header / tables §5c (core 38.5–41 °C)]<br>PL: hrPctEsmolol = -27.74 (sign -1, beyond 15) [research/12 ET-13 (β-blockade controls the rate); Miller 9e]<br>HAND TW (automatic TW): HR 155 and esmolol −28 % are right, but the storm is afebrile under GA (core 36.6 at 1 h; expected 38.5–41): the set-point shift (+1.8 °C) needs heat the vasodilated anaesthetised patient does not make, and the storm's metabolic heat is extraX 1.4 × m0 (thyroid.ts STORM vo2F 1.4) ≈ +32 W against a 21 °C room | **TW** | E11 · 7e thyroid.ts STORM |
| ET-13b | P2 | X-A ventilated, GA flag · thyroid storm → atrial fibrillation in the storm | af false | WR: af = false (expected true) [research/12 ET-13 (AF); Klein I, Ojamaa K, NEJM 2001;344:501 (AF in 10–25 % of thyrotoxicosis) [VERIFY]]<br>HAND MI (automatic WR): no thyroid → rhythm path: the storm scales HR as a sinus rate factor (thyroid.ts STORM hrF 1.8); no AF hazard exists (the same gap as hypothermic AF, ET-09b / A08-G4b) | **MI** | E9 · new: 7e → Stage 5 rhythm hazard (AF in storm/hypothermia) |
| ET-14 | P3 | hypothyroid (engine API `endo.thyroid hypo`) vs euthyroid · untreated hypothyroidism → resting values; propofol 2 mg/kg + sevoflurane induction; emergence after 1 h | hrHypo 55; hrNormo 73; dHrRest -18; mapDropHypo -22.11; mapDropNormo -23.36; extraDrop 1.25; emergeHypoMin 7.17; emergeNormoMin 6.5; dEmerge 0.67; dTc1h -0.31 | PL: dHrRest = -18 (sign -1, beyond 5) [tables §1.5 / research/12 ET-14 (bradycardia)]<br>WR: extraDrop = 1.25 (expected sign -1) [research/12 ET-14 (exaggerated hypotension at induction); Miller 9e endocrine]<br>TW: dEmerge = 0.67 (sign 1, beyond 2) [research/12 ET-14 (delayed emergence)]<br>PL: dTc1h = -0.31 (sign -1, beyond 0.1) [research/12 ET-14 (hypothermia: low BMR)]<br>HAND WR (automatic WR): hypothyroid bradycardia (−18) and a colder core (−0.31) are there, but propofol's MAP fall is not exaggerated (−22 % vs −23 %) and emergence is 0.7 min later only: the thyroid row scales HR/Ees/SVR/VO2 (thyroid.ts:19) and reaches neither the drug disposition (7g clearance) nor the baroreflex or depth | **WR** | E13 · 7e thyroid.ts ROW.hypo |
| ET-15a | P2 | adrenal insufficiency (engine API `endo.adrenalInsufficiency`) vs normal · no steroid cover → induction + surgery; phenylephrine 100 µg at +20 min: hypotension refractory to vasopressor | mapPostIndAI 73.73; mapPostIndN 73.73; mapSurgAI 86.9; mapSurgN 87.7; dMapSurg -0.8; pePressorAI 33.65; pePressorN 42.71; peRatio 0.79; cortAI 465.78; cortN 531.55; vasoRespAI 0.875 | TW: dMapSurg = -0.8 (sign -1, beyond 5) [research/12 ET-15 (refractory hypotension without steroid cover); Miller 9e endocrine (adrenal crisis under anaesthesia)]<br>PL: peRatio = 0.79 in [0, 0.8] [research/12 ET-15 (vasopressor-refractory: cortisol is permissive for catecholamine responsiveness) — magnitude a proposal]<br>HAND TW (automatic TW): adrenal insufficiency changes nothing at rest or after induction (MAP 73.7 in both; surgical MAP −0.8) and blunts phenylephrine to 0.79 of normal: `cortResponse` 0.5 halves only the stress RISE of cortisol (hormones.ts:84) and vasoResp reads cortisol/basal (effects.ts:64), so the basal state is normal — no glucocorticoid-deficient vasoplegia, no mineralocorticoid volume deficit, no hypoglycaemia | **TW** | E13 · 7e effects.ts vasoResp (cortisol permissive term) |
| ET-15b | P2 | adrenal insufficiency · refractory hypotension → hydrocortisone 100 mg IV (steroid cover / rescue) | — | hydrocortisone is not in the library (rejected: "unknown drug hydrocortisone"); FU-7 D13 records it as a request, not a task | **NE** | FU-7 D13 · FU-7 D13 request (hydrocortisone needs 7e cortisol-replacement semantics) |
| ET-32 | P2 | X-A · thoracic epidural (T4–T10 block) + GA → incision: the stress response blunted (cortisol, glucose, catecholamines) | — | no neuraxial block: `thermal anaesthesia neuraxial` changes thermoregulation only (research/11 C32; A08-C3). Expected: epidural block of the surgical segments abolishes the cortisol and glucose response to lower-abdominal surgery (Kehlet H, Br J Anaesth 1989;63:189) | **NE** | neuraxial · FU-7+ (neuraxial block; research/12 I23) |
| ET-34 | P2 | X-A ventilated, sevoflurane GA · incision held 4 h → induction with etomidate 0.3 mg/kg vs propofol 2 mg/kg: cortisol at 4 h | cortEto4h 1582.39; cortProp4h 1574.93; ratio 1.005 | TS: ratio = 1.005 above [0, 0.8] [Wagner RL, White PF et al., NEJM 1984;310:1415; Absalom A 1999 (one induction dose of etomidate inhibits 11β-hydroxylase for 6–12 h: the cortisol response to surgery is blunted) — magnitude a proposal]<br>HAND MI (automatic TS): etomidate does not touch the adrenal: `cortResponse` is 0.5 only for the adrenal-insufficiency profile (core.ts:118, 173); hormones.ts's header names etomidate but no drug writes it. Cortisol at 4 h 1582 vs 1575 nmol/L | **MI** | E10 · 7e hormones.ts cortResponse (the header names etomidate; nothing sets it) |

### 2.9 Glucose emergencies and DKA (P2)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| ET-21a | P2 | X-A ventilated, sevoflurane GA vs awake · insulin 10 units → hypoglycaemia → the autonomic warning (HR) under GA vs awake | gluNadirGA 2.92; gluNadirAwake 2.92; dHrGA 26; dHrAwake 16; masking 10; epiPeakGA 558.38; epiPeakAwake 558.38; sweatAwake false; diMinGA 36; diCtrl 46; glycoGA 0.25 | WR: masking = 10 (expected sign -1) [research/12 ET-21 (GA masks the autonomic signs: tachycardia, sweating blunted); Miller 9e (hypoglycaemia under anaesthesia is recognised late)]<br>HAND WR (automatic WR): under GA the hypoglycaemic HR rise is LARGER than awake (+26 vs +16): the hypoglycaemic sympathetic drive enters `extraSymp` (core.ts:168–171), which antinociception and depth do not blunt, while the anaesthetised baseline HR is lower. Adrenaline peaks identical (558 pg/mL); depth index 46 → 36 from neuroglycopenia is the only masking-type sign | **WR** (direction only) | E12 · 7e hormones.ts (hypoglycaemic drive is not blunted by antinociception/depth) |
| ET-21b | P2 | X-A awake and under GA · glucose ≈ 2 mmol/L → sweating (awake), neuroglycopenia on the depth index, seizure risk | gluNadirGA 2.92; gluNadirAwake 2.92; dHrGA 26; dHrAwake 16; masking 10; epiPeakGA 558.38; epiPeakAwake 558.38; sweatAwake false; diMinGA 36; diCtrl 46; glycoGA 0.25 | WR: sweatAwake = false (expected true) [Cryer PE (neurogenic symptoms of hypoglycaemia: sweating, tremor, palpitations; cholinergic sweating from ≈ 3 mmol/L)]<br>HAND MI (automatic WR): sweating is thermal only (thresholds.ts sweatW: core above the sweat threshold); no cholinergic hypoglycaemic sweating, and no seizure state (research/12 §5.3 NE list); 7e does publish `neuroglycopenia` into 7f's depth index (see diMinGA) | **MI** | E12 · 7e (sympathetic sweating) / FU-7 (seizures) |
| ET-22 | P2 | X-A awake, non-diabetic · normoglycaemia → dextrose 50 % 50 mL (25 g) IV: glucose rise and its course | dGlu5 10.2; dGlu15 7.32; dGlu30 3.54; dGlu60 -0.11; dGlu120 -0.24; dGluPeak 11.61 | TS: dGlu5 = 10.2 above [3, 5] [research/12 ET-22 (+3–5 mmol/L transiently). Balentine JR et al., J Emerg Med 1998;16:763: D50 25 g raised glucose by a mean 166 mg/dL (9.2 mmol/L, range 2–20) [VERIFY] — the sources disagree; Q for Ali]<br>HAND PL (automatic TS): +10.2 mmol/L at 5 min, +3.5 at 30, back to baseline by 60 min: the 25 g enters a 1.7 dL/kg glucose space at once (glucose.ts:88–90). research/12's +3–5 has no citation; the primary paper (Balentine 1998: mean +9.2, range 2–20 mmol/L) contains the model — graded on the primary source, Q for Ali | **PL** | — · 7e glucose.ts dextroseBolus (VG 1.7 dL/kg) |
| ET-31 | P2 | X-A awake · normokalaemic → insulin–dextrose (10 units + 25 g, the K⁺ treatment row) vs insulin 10 units and dextrose 25 g given as two rows: glucose course over 3 h | comboMax 0; comboMin 0; twoMax 6.93; twoMin -2.42; dKcombo60 -0.88; dKtwo60 -0.84 | WR: comboMax = 0 (expected sign 1) [25 g dextrose raises glucose at once (Balentine JR, J Emerg Med 1998;16:763: mean +9 mmol/L at 5 min) [VERIFY]]<br>WR: comboMin = 0 (expected sign -1) [Apel J et al., Clin Kidney J 2014;7:248 / Coca A 2017 (hypoglycaemia in 8–17 % 1–3 h after insulin–dextrose for hyperkalaemia)]<br>HAND IN (automatic WR): the same treatment, two answers: the `insulinDextrose` row (the K⁺ treatment 7c owns) moves K −0.88 but glucose 0.00 over 3 h, while `insulin` 10 units + `dextrose` 25 g as two rows give +6.9 then −2.4 mmol/L. 7e observes only the `insulin` and `dextrose` agent ids (adapters.ts:102–107); the combined row's PD is empty (rows-other.ts:26) | **IN** | E8 · 7e adapters.ts observeDoses (reads `insulin`/`dextrose` only) |
| ET-23a | P2 | X-A awake, spontaneous · DKA (7c `condition dka 1`) → Kussmaul compensation before induction (Winter's formula) | phPre 6.99; hco3Pre 4.32; paco2Pre 18.32; winter 14.48; kussmaulMinusWinter 3.85; veSpPre 12.1; veSpHealthy 6.61; dPh15 -0.18; dPh15HighMv -0.02; paco2Post15 35.88; kPre 3.7; kHealthy 4.18; dK15 0.04; dKvsHealthy -0.49; mapDropDka -26.38; mapDropHealthy -21.69; extraDrop -4.69; bvRelDka 1; gluPre 9.28 | TW: kussmaulMinusWinter = 3.85 outside [-2, 2] [Albert MS, Dell RB, Winter RW, Ann Intern Med 1967;66:312 (expected PaCO2 = 1.5·HCO3 + 8 ± 2)]<br>HAND TW (automatic TW): Kussmaul breathing doubles VE (12.1 vs 6.6 L/min) but PaCO2 is 18.3 at HCO3 4.3 (Winter 14.5 ± 2): under-compensated by 3.9 mmHg. neuro/spont.ts paco2SetPoint follows Winter, so the shortfall is the drive's gain/ceiling at pH 6.99 — close; FU-9 A7 edits the same set point (alkalosis side) | **TW** | — · 7f neuro/spont.ts paco2SetPoint (Winter) |
| ET-23b | P2 | X-A, DKA · RSI (propofol 1.5 + rocuronium 1) then VCV 12 × 500 vs 28 × 500 → pH 15 min after intubation at a normal minute ventilation | phPre 6.99; hco3Pre 4.32; paco2Pre 18.32; winter 14.48; kussmaulMinusWinter 3.85; veSpPre 12.1; veSpHealthy 6.61; dPh15 -0.18; dPh15HighMv -0.02; paco2Post15 35.88; kPre 3.7; kHealthy 4.18; dK15 0.04; dKvsHealthy -0.49; mapDropDka -26.38; mapDropHealthy -21.69; extraDrop -4.69; bvRelDka 1; gluPre 9.28 | PL: dPh15 = -0.18 (sign -1, beyond 0.05) [JBDS DKA 2023 / research/12 ET-23 (the Kussmaul compensation is lost after intubation: pH falls unless the minute ventilation is matched)] | **PL** | — · 7c acid–base / Stage 3 |
| ET-23c | P2 | X-A, DKA · DKA → K⁺ at presentation and after intubation | phPre 6.99; hco3Pre 4.32; paco2Pre 18.32; winter 14.48; kussmaulMinusWinter 3.85; veSpPre 12.1; veSpHealthy 6.61; dPh15 -0.18; dPh15HighMv -0.02; paco2Post15 35.88; kPre 3.7; kHealthy 4.18; dK15 0.04; dKvsHealthy -0.49; mapDropDka -26.38; mapDropHealthy -21.69; extraDrop -4.69; bvRelDka 1; gluPre 9.28 | WR: dKvsHealthy = -0.49 (expected sign 1) [JBDS DKA 2023 (K often high at presentation despite a total-body deficit: acidosis and insulinopenia shift K out)]<br>TW: dK15 = 0.04 (sign 1, beyond 0.1) [research/12 ET-23 (the acidosis after intubation shifts K further out)]<br>HAND WR (automatic WR): DKA presents HYPOkalaemic relative to the healthy twin (3.70 vs 4.18) and intubation's pH fall moves K +0.04: 7c's `dka` is a ketoacid load only — organic acidosis correctly shifts little K, but the two DKA causes of hyperkalaemia, insulin deficiency and hyperosmolality (glucose only 9.3 mmol/L here), have no K path; 7e's β-cell term goes to zero with dka yet the K shift reads only SECRETED insulin above basal (core.ts:147), never a deficit | **WR** | E7 · 7c core.ts kSet (pH) / 7e insulin |
| ET-23d | P2 | X-A, DKA vs healthy · DKA (osmotic diuresis: 5–7 L deficit) → propofol 1.5 mg/kg induction: MAP fall vs healthy | phPre 6.99; hco3Pre 4.32; paco2Pre 18.32; winter 14.48; kussmaulMinusWinter 3.85; veSpPre 12.1; veSpHealthy 6.61; dPh15 -0.18; dPh15HighMv -0.02; paco2Post15 35.88; kPre 3.7; kHealthy 4.18; dK15 0.04; dKvsHealthy -0.49; mapDropDka -26.38; mapDropHealthy -21.69; extraDrop -4.69; bvRelDka 1; gluPre 9.28 | PL: extraDrop = -4.69 (sign -1, beyond 3) [JBDS DKA 2023 (fluid deficit ≈ 100 mL/kg); research/12 ET-23 (hypovolaemic induction response)] | **PL** | E7 · 7c `dka` condition (chemistry only: no volume deficit) |

### 2.10 Septic phases, vasoplegia, endocrine tumours (P2/P3)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| ET-26a | P2 | X-A ventilated, GA flag · septic shock warm vs cold (7e phases) → the cold phase: CO, SvO2, lactate vs the warm phase at +20 min | coWarm 5.14; coCold 4.34; svo2Warm 78.98; svo2Cold 76.96; lactWarm 1; lactCold 1.01; mapWarm 74.25; mapCold 78.32; dCo -0.8; dSvo2 -2.02; dLact 0.01 | PL: dCo = -0.8 (sign -1, beyond 0.5) [tables §5e / research/12 ET-26 (cold septic shock: low CO)]<br>TW: dSvo2 = -2.02 (sign -1, beyond 3) [tables §5e (cold phase: SvO2 ↓)]<br>TW: dLact = 0.01 (sign 1, beyond 0.3) [tables §5e (cold phase: lactate ↑)]<br>HAND TW (automatic TW): the cold phase lowers CO only 5.1 → 4.3 L/min, SvO2 79 → 77 %, lactate 1.00 → 1.01 — and warm septic SHOCK itself has lactate 1.0 (Sepsis-3 requires > 2). The sepsis rows raise VO2 (vo2F) but carry no impaired extraction or aerobic-glycolysis lactate term (conditions.ts:29–35 'erMax/shunt are not seams'); CO is still normal because 7e's cold row (Ees × 0.5) is compensated by the baroreflex | **TW** | E11 · 7e conditions.ts SEPSIS rows |
| ET-26b | P2 | X-A ventilated, GA flag · warm septic shock vs healthy → noradrenaline 0.1 µg/kg/min: pressor response (catecholamine hyporesponsiveness) | dMapSeptic 9.32; dMapHealthy 31.89; ratio 0.29; mapSepticBase 74.25; vasoResp 0.736 | PL: ratio = 0.29 in [0, 0.8] [tables §5e (septic vasoResp 0.6); Levy B et al. 2018 (vasoplegia: adrenergic hyporesponsiveness) — magnitude a proposal] | **PL** | — · 7e vasoResp → 7g |
| ET-26c | P2 | X-A ventilated, GA flag · cold septic shock → dobutamine 5 µg/kg/min: CO response | dCo 0.4; coBase 4.34; dSvo2 2.52 | PL: dCo = 0.4 (sign 1, beyond 0.3) [tables §5e / Surviving Sepsis Campaign 2021 (dobutamine in low-output septic shock raises CO)] | **PL** | — · 7g dobutamine / 7e eesF |
| ET-28 | P2 | X-A ventilated, GA flag · SIRS vasoplegia (7e `sirs 1`) vs healthy → vasopressin 1 unit vs noradrenaline 10 µg bolus: pressor response and its preservation in vasoplegia | mapSirs 88.64; dMapVpSirs 12.53; dMapVpHealthy 16.17; dMapNeSirs 7.37; dMapNeHealthy 10.33; keptVp 0.77; keptNe 0.71; sparing 0.06 | PL: dMapVpSirs = 12.53 (sign 1, beyond 5) [tables §5e / research/12 ET-28 (vasopressin raises MAP in vasoplegia)]<br>TW: sparing = 0.06 (sign 1, beyond 0.1) [Landry DW et al., Circulation 1997;95:1122; tables §5e (V1 action is preserved where catecholamine responsiveness is lost: catecholamine sparing)]<br>HAND TW (automatic TW): vasopressin raises MAP +12.5 in SIRS (PL) but keeps 0.77 of its healthy effect against noradrenaline's 0.71: the `sirs` row has no vasopressor-hyporesponsiveness (vasoResp 1, conditions.ts:44) and the condition leaves MAP at 88.6 — SIRS 1 is not vasoplegic in MODELED, so catecholamine sparing cannot show | **TW** | E11 · 7g vasopressin row / 7e vasoResp |
| ET-24 | P3 | X-A · phaeochromocytoma → tumour handling; venous ligation | — | no phaeochromocytoma state: research/12 §5.11 FU-7 missing-mechanism list (expected: paroxysmal 250/130, arrhythmia; hypotension after vein ligation) | **NE** | FU-7 · FU-7 (state) |
| ET-25 | P3 | X-A · carcinoid crisis → tumour handling; octreotide | — | no carcinoid state and no octreotide (research/12 §5.11; expected: flushing, bronchospasm, hypotension; octreotide 50–100 µg) | **NE** | FU-7 · FU-7 (state, drug) |

### 2.11 MANUAL twins (direction-only; Q9 open)

| cell | tier | context · state → intervention | measured | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| ET-M1 | P1 | X-A ventilated, sevoflurane GA, MANUAL · anaphylaxis grade III (severity 0.75) → adrenaline 50 µg ×4 q3 min vs untreated (MODELED twin ET-27b) | mapBase 81.5; mapNadirU 81.48; dMap10 49.77; dLungSev -0.25; hrU 114; hrBase 75 | PL: dMap10 = 49.77 (sign 1, beyond 5) [Q9 (MANUAL: the insult and the drug still act on the non-reflex physiology); AAGBI 2020]<br>PL: dLungSev = -0.25 (sign -1, beyond 0.05) [AAGBI 2020 (β2 bronchodilation)] | **PL** (direction only) | — · Q9 (MANUAL physiology) / 7e conditions |
| ET-M2 | P1 | X-A ventilated, MANUAL · MH (instructor), untreated 90 min → EtCO2, core, K⁺ and arrest (MODELED twins ET-10b…g) | tDoubleS 860; tc60 44.29; k20 5.82; dHr15 46; map15 86.08; arrested true; arrestS 2680; tcMax 47.77 | PL: tDoubleS = 860 in [300, 1500] [MHAUS; the gas/thermal physiology is mode-independent]<br>PL: arrested = true (expected true) [MHAUS; research/12 §2.2 (every arrest cell runs in MANUAL)] | **PL** (direction only) | E2 · Q9 / FU-4 arrest machine (MANUAL no-flow route) |
| ET-M3 | P1 | X-A ventilated, sevoflurane GA, MANUAL · incision (stimulus 1.0, held), no opioid → stress hormones, glucose and the pressures (MODELED twin ET-16a/c) | dEpi 56.8; dGlu2h 1.85; dMap 2.96; dHr 10; dCort2h 953.09 | PL: dGlu2h = 1.85 (sign 1, beyond 0.5) [Desborough 2000 (the metabolic stress response is mode-independent)]<br>PL: dEpi = 56.8 (sign 1, beyond 10) [Desborough 2000] | **PL** (direction only) | — · Q9 (MANUAL: the instructor owns the pressures; the metabolic arm still runs) |

## 3. New gaps no stage owns, ranked, with the smallest mechanism and the file that would fix each

The line numbers are on 7c60b2b (`packages/engine-core/src/`).

### E1 — The MH triggers do nothing (new, P1; owner 7f → Stage 3/7e)
- **Cell:** ET-10a (WR).
- **Measured:** `neuro.mhSusceptible` + succinylcholine 1.5 mg/kg + sevoflurane 2 %: an `mhTrigger` mark at 300 s, MH
  activity 0 and EtCO2 29–30 for 90 min.
- **Code:** `l2/neuro/pipeline.ts:170–180` (succinylcholine) and `:206–210` (MAC > 0.1) write the mark; `l2/resp/
  pipeline.ts:691–695` creates `rs.temp.mh` only for the instructor's `condition mh`.
- **Smallest mechanism:** the engine turns the first `mhTrigger` of a susceptible patient into the same Stage 3 MH state
  (`{ severity, t0 }`) the condition creates, with a latency after the trigger (volatile alone: onset 10–60 min;
  with succinylcholine: minutes [MHAUS, Larach 1994]) and a profile severity. The instructor's condition stays for
  scenarios without a profile.
- **Tests moved:** the 7f MH-mark test (it must now start MH); ET-10a as the acceptance arm.

### E2 — MH heat is not limited by oxygen: the core reaches 47.8 °C after death (new, P1; owner 7e thermal)
- **Cells:** ET-10g and ET-M2 (PL on the arrest itself; the course after it is the defect), ET-10d.
- **Measured:** untreated MH arrests at +45 min at ≈ 42.5 °C (FU-4 G8's hazard, right); the core then rises to
  44.3 °C at 60 min and 47.8 °C at 90 min in VF/asystole.
- **Code:** `l2/thermal/heat.ts:146` `mhW = m0 · MH_HEAT_X · activity` and `:145` shivering heat are independent of
  perfusion; `l2/thermal/mh.ts` activity has no oxygen or flow input.
- **Smallest mechanism:** scale the MH and shivering heat (and their VO2/VCO2 factors) by 7c's delivered fraction
  `o2.vo2 / o2.demand`: aerobic muscle heat cannot exceed the oxygen it burns, so heat stops with the circulation.
- **Tests moved:** the 7e MH tests (tables §7 check 21 keeps its pre-arrest course); the FU-4 G8 hyperthermic-arrest row.

### E3 — A neuraxial block gets the full GA thermoregulation (new, P1; owner 7e thermal)
- **Cell:** ET-04 (WR).
- **Measured:** awake, `thermal anaesthesia neuraxial`: depth 1, hour-1 fall −1.07 °C (GA −1.19; expected ≈ half),
  core 34.4 °C at 3 h, no shivering.
- **Code:** `l2/thermal/heat.ts:161` `target = … anaesthesia === 'none' ? 0 : 1` gives neuraxial the GA thresholds;
  `:124` and `params.ts:14–15` add the block's vasodilation and skin loss.
- **Smallest mechanism:** a neuraxial depth of its own: thresholds of an unsedated patient with the shivering threshold
  −0.5 °C (Kurz 1993) and the vasoconstriction/shivering effectors abolished only below the block (a block-level
  fraction of the body, e.g. 0.5 for T10). Sedation adds its own depth through 7f.
- **Tests moved:** Stage 3's neuraxial redistribution test (research/03 §6.2 "0.5–1 °C, no plateau") — its "no plateau"
  should come from the blocked effectors, not from the GA thresholds.

### E4 — Cold drives nothing but shivering; cardiac output does not follow VO2 (new, P1; owner 7e hormones, 7a)
- **Cells:** ET-05b (WR), ET-05c (TW), ET-05a (TW).
- **Measured:** emergence at 34.5 °C vs normothermic: VO2 +59 %, noradrenaline 275 vs 275 pg/mL, HR −2, MAP −0.5,
  CO 5.8 vs 5.8 L/min, SvO2 76.5 vs 78.8 %, SpO2 96.3 vs 96.0 %.
- **Code:** `l2/endo/hormones.ts:55–63` `adrenalDrive` has no temperature term; no path couples VO2 demand to CO (the
  same gap as audit 09 R11, anaemia → CO).
- **Smallest mechanism:** (a) a cold drive into `extraSymp`: + k·max(0, thrVaso − Tc) with k sized to Frank 1995
  (core −1.3 °C → noradrenaline ×4) [ENG]; (b) the metabolic demand ratio (7c `demand/demand0`) as a CO/venous-return
  input — R11's owner should take both demand-driven cases together.
- **Tests moved:** 7e hormone tests; audit 09 R11's cells.

### E5 — The linear phase is slow and the plateau late (new, P1; owner 7e thermal, calibration R44)
- **Cells:** ET-01b (TW), ET-03a.
- **Measured:** −0.29 °C/h in hours 2–3 (Sessler 0.3–0.5); vasoconstriction starts at 6.2 h at 34.55 °C (Sessler
  3–4 h); the elderly patient (MAC 1.2 at 4 h, depth 1.37) never vasoconstricts in 7 h.
- **Code:** `l2/thermal/thresholds.ts:31–37` extrapolates the thresholds linearly for depth > 1, so a deeper MAC lowers
  the vasoconstriction threshold 0.2–0.8 °C; the draped insulation is calibrated to the awake balance
  (`heat.ts:108`), and a draped rig has no wound loss.
- **Smallest mechanism:** cap the depth the thresholds read at 1 (the tables give the GA row for typical anaesthesia:
  vasoconstriction 34.5 ± 0.2), or source the slope beyond it from Sessler's concentration–threshold data [VERIFY]
  instead of extrapolating the awake→GA line (2.1 °C per depth unit); then re-measure the linear phase.
- **Tests moved:** the 7e redistribution/plateau tests (R39-7 course).

### E6 — No age term in the thermoregulatory thresholds (new, P1; owner 7e thermal)
- **Cell:** ET-03a (MI).
- **Measured:** 80 y vs 40 y at 4 h: 34.73 vs 34.82 °C — the difference is MAC-age acting through E5, not age.
- **Smallest mechanism:** vasoconstriction and shivering thresholds −1 °C from 60 to 80 y (Kurz 1993) [VERIFY], linear.

### E7 — Insulin deficiency makes no ketones; the type 1 profile is never insulin-deficient; DKA has no K⁺ or volume (new, P1; owner 7e → 7c)
- **Cells:** ET-18a (NE), ET-18b (MI), ET-23c (WR), ET-23d (PL for the wrong reason).
- **Measured:** type 1 under 4 h of surgery: insulin 10 µU/mL (the basal replacement), glucose 7.2 → 9.6, ketones 0.
  `condition dka 1`: pH 6.99, HCO3 4.3, glucose 9.3 mmol/L, K⁺ 3.70 (healthy 4.18), blood volume 1.00; the extra
  induction fall (−4.7 %) comes from acidaemic contractility, not volume.
- **Code:** `l2/endo/core.ts:101–104` (basal insulin always on for type 1); the core header "DKA … never an output";
  `core.ts:147` K shift reads only SECRETED insulin above basal; 7c's `dka` sets a ketoacid pool only
  (`blood/pipeline.ts:341`).
- **Smallest mechanism:** (a) a profile/command to omit the basal insulin; (b) a ketogenesis rate driven by the insulin
  deficit (7e `egpDef`) into 7c's ketoacid pool, so DKA emerges; (c) insulin deficiency and hyperosmolality shift K
  out (7c kSet); (d) the glucose osmotic diuresis removes volume (7d). The instructor's `dka` condition then sets the
  same states.
- **Tests moved:** 7c DKA tests; 7e glucose tests; BF acid–base cells.

### E8 — The insulin–dextrose row is invisible to glucose (new, P2; owner 7e adapters / 7g row)
- **Cell:** ET-31 (IN).
- **Measured:** `insulinDextrose` 10 units: K⁺ −0.88, glucose 0.00 for 3 h; the same doses as two rows: +6.9 then
  −2.4 mmol/L.
- **Code:** `l2/endo/adapters.ts:102–107` observes the ids `insulin` and `dextrose` only; `pk/data/rows-other.ts:26`
  has an empty PD.
- **Smallest mechanism:** `observeDoses` expands `insulinDextrose` into its 10 units + 25 g (one line), so the K⁺
  treatment also teaches the rebound hypoglycaemia risk. BF (research/22 F13) observed the flat glucose and left it to
  this run.

### E9 — No AF hazard in hypothermia or thyroid storm (P2; owner Stage 5/7a rhythm hazard)
- **Cells:** ET-09b (MI; A08-G4b measured again), ET-13b (MI).
- **Smallest mechanism:** an AF onset hazard (and reversion on correction) driven by core < 32 °C and by the storm
  severity, in the same seeded hazard frame as `circ/arrest.ts`.

### E10 — Drugs do not reach the thermoregulatory or adrenal states (new, P2; owner 7g → 7e)
- **Cells:** ET-33 (NE), ET-34 (MI).
- **Measured:** etomidate 0.3 mg/kg: cortisol at 4 h 1582 vs 1575 nmol/L after propofol.
- **Code:** `temp.shiverShift` is declared (`heat.ts:81, 120`) and never written; `cortResponse` is set only by the
  adrenal profile (`core.ts:118, 173`), although `hormones.ts`'s header names etomidate.
- **Smallest mechanism:** a 7g `shiverShift` PD target (pethidine, clonidine, opioids; the rows must exist) and an
  etomidate `adrenalSuppression` target with a 6–12 h offset feeding `cortResponse`.

### E11 — Fever, storm and septic shock are not states under GA (new, P2; owner 7e conditions)
- **Cells:** ET-12, ET-13a, ET-26a, ET-28 (TW).
- **Measured:** sepsis (phase sepsis) and storm raise the set point 2.2 / 1.8 °C, but the anaesthetised core is 36.9 and
  36.6 °C (no fever); warm septic shock lactate 1.0; cold phase CO 5.1 → 4.3, SvO2 79 → 77, lactate +0.01; `sirs 1`
  MAP 88.6 (vasopressin kept 0.77 of its effect vs noradrenaline 0.71).
- **Code:** `l2/endo/conditions.ts:29–35` rows (vo2F ≤ 1.3; "erMax/shunt are not seams"; SIRS vasoResp 1);
  `l2/endo/thyroid.ts:21` STORM vo2F 1.4.
- **Smallest mechanism:** (a) the inflammatory/thyroid heat as a direct heat source sized to the tables' core
  (38.5–41 °C) rather than a set-point shift the anaesthetised patient cannot defend; (b) a septic extraction deficit
  (7c `erMax` seam the rows already name) so septic shock makes lactate; (c) SIRS/vasoplegia rows with vasoResp < 1.
- **Tests moved:** 7e condition tests; tables §5e.

### E12 — Hypoglycaemia: too early, too shallow, unmasked by GA, no sweating (new, P2; owner 7e)
- **Cells:** ET-20a (TS), ET-21a (WR), ET-21b (MI).
- **Measured:** 10 units IV awake: nadir 2.9 mmol/L at 13 min; under GA HR +26 vs awake +16; adrenaline peaks identical;
  no sweating.
- **Code:** `glucose.ts:103–107` (bolus straight into the insulin space, t½ 5 min, p2 0.025/min); `core.ts:168–171`
  (the hypoglycaemic drive enters `extraSymp`, not blunted by depth); `thresholds.ts sweatW` (thermal sweating only).
- **Smallest mechanism:** (a) insulin action through the remote compartment at the minimal model's published p2
  (≈ 0.01–0.02/min [VERIFY]); (b) the hypoglycaemic sympathetic drive scaled by (1 − depth effect) as the noxious
  drive is; (c) a cholinergic sweating output from the hypoglycaemic drive (the `sweating` flag).

### E13 — Hypothyroid and adrenal-insufficiency profiles are thin (new, P2/P3; owner 7e)
- **Cells:** ET-14 (WR), ET-15a (TW).
- **Measured:** hypothyroid: HR −18, core −0.31 °C at 1 h, but induction MAP fall −22 vs −23 % and emergence +0.7 min;
  adrenal insufficiency: MAP identical at rest and after induction, phenylephrine 0.79 of normal.
- **Smallest mechanism:** hypothyroid: a baroreflex-gain and drug-clearance factor (7g clFactor) and a MAC factor;
  adrenal insufficiency: a basal vasoResp < 1 (cortisol permissive effect at rest), a volume deficit (no aldosterone)
  and hypoglycaemia risk — and hydrocortisone to reverse them (FU-7 D13 request).

### E14 — Hypothermia slows elimination only (P2; owner 7g PK)
- **Cell:** ET-08c (TW).
- **Measured:** propofol 100 µg/kg/min at 34 °C: Cp +5 % at 60 min (Leslie 1995: +28 %).
- **Code:** `pk/pipeline.ts:157` temperature scales the elimination clearance only; 7e's `cascade.clearanceF`
  (−10 %/°C, `thermal/metabolic.ts:45`) is published and read by nothing.
- **Smallest mechanism:** apply the temperature factor to the intercompartmental clearances too (Leslie's finding), and
  delete the unread `clearanceF` (one source of truth).

### Smaller items (recorded, not graded)
- **Forced air on a closed, draped patient** rewarms at 0.6 °C/h past normothermia to 37.2 °C at 3 h (ET-02 draped arm);
  with an open wound it holds 36.2 °C (PL). Plausible physics; the blanket has no servo.
- **Anaphylaxis grade III** treated with four 50 µg boluses and no infusion re-collapses and arrests (asystole) 18 min
  after the last bolus; untreated grade III arrests at 7 min. Plausible teaching for "start an infusion"; the onset
  rhythm (asystole rather than PEA) is FU-4's seeded draw.
- **The gas monitor's MAC** is not temperature-corrected at 32 °C (0.78 vs 0.77) while the brain's requirement falls
  25 % — the same as real monitors.
- **The GA rigs drift into respiratory alkalosis** (pH 7.54 at 4 h at VCV 12 × 600 as VCO2 falls with the core):
  realistic for an unadjusted ventilator.
- **`endo.cascade.coagF`** (−10 %/°C below 35) is read by nothing (research/11 B47; 7i).

## 4. Findings for FU-7 (READY, not executed) — → FU-7 before execution

1. **Task 18 — dexamethasone (ET-19 MI).** Measured on main: type 2 diabetes + dexamethasone 8 mg, glucose Δ 0.00 at
   4–8 h (research/12 band +2–4 mmol/L, PADDI). The CM amendment already adds this diabetic arm; this run supplies its
   before-number and baseline (type 2 fasting 7.99 mmol/L). Task 18 routes the glucocorticoid into the cortisol `co`
   term of `stressEffects`; note that this term also cuts insulin sensitivity 0.8 at cortisol 1500 (E13 may want the
   same term for adrenal insufficiency).
2. **Task 10 — the surgical surge (ET-16a TW).** Without opioid the incision raises MAP only +7.7 mmHg (Shribman
   +20–30); adrenaline ×2.6, noradrenaline ×1.8 and the fentanyl blunting (96 % at 5 µg/kg) are right. ET-16a and its
   MANUAL twin ET-M3 (MAP +3, glucose +1.85, cortisol +953 at 2 h) are Task 10's acceptance arms; the metabolic arm
   (cortisol, glucose) must stay as measured.
3. **D13 — hydrocortisone (ET-15b NE).** Still a request. ET-15a shows what it would reverse is not there yet (E13):
   the plan should not add hydrocortisone before adrenal insufficiency has a basal deficit.
4. **Task 9 — sympathetic drive.** 7e's `extraSymp` also carries MH, hypoglycaemia and sepsis; E4's cold drive and
   E12's depth-blunted hypoglycaemic drive belong to the same seam Task 9 edits (`h.symp` vs the new surge state). Keep
   the MH HR response (+47 at 15 min, ET-10c PL) when the drive is split.
5. **Rigidity, phaeochromocytoma, carcinoid (ET-10f, 24, 25 NE)** stay on research/12's FU-7 missing-mechanism list;
   no FU-7 task owns them.

## 5. Findings for FU-8, FU-9, FU-6 and other in-flight stages

- **FU-8 A16** (the `endo` block in `pme-scenario/1`): every endocrine cell of this run (ET-14, 15, 18, 19; CM-09c) runs
  only through the engine API. A16 should also carry a type 1 "basal insulin omitted" option (E7a) if Ali wants the
  omission case.
- **FU-8 B1** (I-25, insulin reference per kg): measured here, insulin 0.1 units/kg/h for 2 h lowers K⁺ −1.12 against
  the no-infusion arm (7g's `kShift` at its E_max: B1's "−1.3 → −0.6"). Glucose (−2.5 mmol/L/h, ET-18c PL) is 7e's own
  and unaffected, as B1 states.
- **FU-6 R4** (the GA level replaces the hidden flag): ET-35 is its measured case — drug GA VO2 −6.8 % vs flag
  −20.8 %; EtCO2 25.9 vs 22.2. Add ET-35 to FU-6's acceptance list.
- **FU-9** (blood, fluids, acid–base): nothing re-reported. E7(c) (DKA K⁺) sits beside F6 (renal K⁺) and FU-9 A7
  (alkalosis set point, the same `spont.ts` line as ET-23a's slightly under-compensated Kussmaul, PaCO2 18.3 vs Winter
  14.5). E2's O2-limited heat reads 7c's `o2.vo2/o2.demand`, which FU-9 A2 (F3, extraction before VO2 cut) changes:
  land E2 after A2.
- **Audit 09 R11** (demand → CO): E4(b) is the thermal case of the same missing coupling.
- **7i:** ET-08d (hypothermic coagulopathy; `coagF` unread).

## 6. Cells blocked by missing features

| blocker | cells | expected response kept for the owner |
|---|---|---|
| muscle rigidity (FU-7) | ET-10f | masseter spasm after succinylcholine; generalised rigidity in fulminant MH |
| type 1 insulin omission (profile) | ET-18a | PROBE with basal insulin on: glucose 7.2 → 9.6 mmol/L over 4 h of surgery (adult 6.9) |
| hypothermic coagulopathy (7i) | ET-08d | PT/aPTT ↑, platelet dysfunction below 35 °C; `endo.cascade.coagF` exists, unread |
| hydrocortisone (FU-7 D13 request) | ET-15b | refractory hypotension reverses within 30–60 min (rejected: "unknown drug hydrocortisone") |
| phaeochromocytoma, carcinoid (FU-7) | ET-24, ET-25 | 250/130 with arrhythmia on handling, hypotension after ligation; flushing, bronchospasm, octreotide |
| neuraxial block (FU-7+) | ET-32 | epidural block abolishes the cortisol/glucose response to lower-abdominal surgery (Kehlet 1989) |
| shivering-threshold drugs (7g rows + seam) | ET-33 | pethidine 25 mg / clonidine stop postoperative shivering (Kurz 1997) |

Changed since research/12: ET-19 is graded MI (the drug is accepted with no effect, DI-76's precedent), not NE; ET-14,
15 and 18 run through the engine API (research/12: "P, schema"); ET-08b/c and ET-09 use the MODELED core target as the
cooling device.

## 7. Proposed scripted suite (the owners' acceptance cells)

| owner | cells to re-measure at its gate | acceptance items (bands are Ali's proposals) |
|---|---|---|
| **7f → Stage 3/7e** (E1) | ET-10a | MH starts in a susceptible patient after the triggers: EtCO2 doubles in 10–30 min |
| **7e thermal** (E2, E3, E5, E6) | ET-10g, M2, 04, 01b, 03a | no core rise after arrest; neuraxial redistribution 0.4–0.6 of GA with shivering at ≈ 35.5 °C; linear phase 0.3–0.5 °C/h and vasoconstriction at 3–4 h; elderly threshold ≈ −1 °C |
| **7e hormones / R11 owner** (E4) | ET-05a–c | cold emergence: noradrenaline ↑, HR/MAP ↑, CO ↑ with VO2 |
| **7e → 7c** (E7) | ET-18a/b, 23c/d | insulin omission → ketones and glucose ↑; DKA K⁺ ≥ healthy; DKA volume deficit |
| **7e adapters** (E8) | ET-31 | the insulin–dextrose row moves glucose as the two rows do |
| **rhythm hazard** (E9) | ET-09b, 13b | AF below 32 °C and in storm |
| **7g → 7e** (E10) | ET-33, 34 | pethidine stops shivering; etomidate cortisol ≤ 0.8 of propofol's at 4 h |
| **7e conditions** (E11) | ET-12, 13a, 26a, 28 | febrile core in sepsis/storm; septic shock lactate > 2; cold phase CO/SvO2 ↓; vasoplegic SIRS |
| **7e glucose** (E12) | ET-20a, 21a/b | nadir 20–60 min (Ali's band); GA blunts the HR response; sweating awake |
| **7e profiles** (E13) | ET-14, 15a | exaggerated induction hypotension (hypothyroid, adrenal); refractory to phenylephrine |
| **7g PK** (E14) | ET-08c | propofol Cp +15–40 % at 34 °C |
| **FU-7** Tasks 10, 18 | ET-16a, M3, 19 | MAP +20–30 at incision; dexamethasone +2–4 mmol/L in type 2 |
| **FU-6 R4** | ET-35 | drug GA VO2 −15 to −30 % |
| **regression** (PL today) | ET-01a, 02, 03b, 06, 07, 08a/b, 09a/c, 10b–e, 11a–c, 16b/c, 18c, 20b/c, 22, 23b, 26b/c, 27a–c, 29, 30, M1 | must stay PL |

Each owner runs `./run.sh cli.ts <ids>` against its branch's worktree (`PME_ENGINE`) and pastes the `report.ts` rows
beside this run's column in its gate note (research/12 §7).

## 8. Questions for Ali (with the model's numbers)

1. **Shivering VO2.** Emergence at 34.5 °C raises VO2 +59 % (+83 % over the anaesthetised baseline). research/12 and
   Miller quote +200–400 %; measured postoperative shivering is +40–100 % (Ciofolo 1989; Frank 1995). Which do you teach?
2. **MH from its triggers.** Should an MH-susceptible profile start MH by itself after sevoflurane/succinylcholine (E1),
   and with what latency — a fixed onset, or a draw (volatile alone 10–60 min, succinylcholine minutes)?
3. **Neuraxial thermoregulation.** Today a spinal patient is thermally a GA patient (0.9 of the redistribution, no
   shivering to 34.4 °C). Confirm the target: redistribution ≈ half, shivering at ≈ 35.5 °C.
4. **Cold blood.** 6 unwarmed units lower the core −0.89 °C (ATLS −0.5 to −1: PL) and the mean body −0.15 °C per unit
   (the physics of 280 mL at 4 °C); Sessler's rounded 0.25 °C per unit would need ≈ 450 mL units. Keep the physics?
5. **Insulin nadir.** 10 units IV in a non-diabetic: nadir 2.9 mmol/L at 13 min. research/12 says 40–60 min; the
   insulin-tolerance test says 20–30 min and < 2.2 mmol/L. Which band?
6. **D50.** 25 g raises glucose +10.2 mmol/L at 5 min, back to baseline at 60 min. research/12 says +3–5; Balentine 1998
   measured a mean +9.2 (2–20). Graded PL on the primary paper — confirm.
7. **Fever under anaesthesia.** Septic and thyrotoxic patients under GA at 21 °C stay at 36.6–36.9 °C (the set point
   rises, heat does not). Should the conditions carry a heat source that produces 38.5–41 °C regardless of GA?
8. **Septic shock lactate.** Warm septic shock runs at lactate 1.0 and MAP 74. Should the sepsis rows carry an
   extraction/lactate term (Sepsis-3 needs > 2), and should `sirs 1` be hypotensive?
9. **Direction-only cells** (no sourced magnitude): ET-03b (child cools −0.36 °C more in hour 1), ET-05b/c/d, ET-10c
   (HR +47), ET-11c (K⁺ −0.47), ET-21a, ET-27c, ET-29 (exposure −0.5 °C; 24 vs 18 °C +0.66), ET-30 (38.3 °C), and
   ET-M1…M3 (Q9). The ratio bands of ET-15a, 26b and 34 (≤ 0.8) are proposals.
10. **[VERIFY] figures:** Matsukawa 1995 (−1.6 °C in hour 1; epidural −0.8), Kurz 1993 (elderly −1 °C), Kurz 1996
    (36.6 vs 34.7 °C), Heier 1991, Leslie 1995 (+28 %), Balentine 1998, the ITT nadir time, Klein 2001 (AF in
    thyrotoxicosis), PADDI's magnitude. Please confirm from the sources you use before they become tests.

## 9. Files and how to re-run

All files are in `research/14-coverage-et-scripts/`. Nothing in the repo was changed; the worktree was removed.
- `runner.ts`: the arm runner. ET readouts: core/peripheral/site temperatures and every heat flow of the 7e balance,
  thermal depth, shivering/sweating, VO2 demand and Stage 3's metabolic factor (read-only import of `metabolic()`),
  the 7e endocrine outputs, the arrest state, the displayed temperature.
- `spec.ts`: cell type, contexts (endocrine profiles through the engine API), rigs (drug GA, GA flag) and helpers.
- `cells-a.ts` (temperature, P1), `cells-b.ts` (MH, stress, glucose, anaphylaxis), `cells-c.ts` (P2/P3), `cells-m.ts`
  (MANUAL twins); `gaps.json` (cell → gap id for `report.ts`).
- `grade.ts` (a band centred on 0 now grades TW outside it instead of silently PL), `regrade.ts`, `cli.ts` (`ET_OUT`
  for a partial store), `merge.ts`, `report.ts` (→ `out/matrix.md`), `ledger.ts` (→ `out/ledger.md`), `hooks.mjs`,
  `run.sh`; `probe0–3.ts`: the exploration probes (state paths, command acceptance, cooling rigs).

```
git -C <repo> worktree add --detach <wt> origin/main && (cd <wt> && npx -y pnpm@9.15.9 install --frozen-lockfile)
cd research/14-coverage-et-scripts
PME_ENGINE=<wt>/packages/engine-core/src/index.ts ./run.sh cli.ts all      # ≈ 25 min single process
node --experimental-strip-types report.ts > out/matrix.md && node --experimental-strip-types ledger.ts > out/ledger.md
```
