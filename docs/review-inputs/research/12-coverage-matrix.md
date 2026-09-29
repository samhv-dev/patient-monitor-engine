# 12 — Whole-physiology coverage matrix: design of the R54 audit

*Written 2026-09-28 against repo `main` 9dc6d4d. Design only: no engine runs were needed. The existing audits' numbers
are quoted from research/08, 09 and 10. Companion: `11-capability-inventory-and-glossary.md`, which gives the readout
keys, what exists, and what is missing.*

R54 makes this matrix **the standing definition of "linked physiology"**: the model must behave like a human in every
situation it claims to support. The FU-4, FU-5 and FU-6 gates must each show their part of the matrix. Audits 08, 09
and 10 are its first third. The remaining audits run it in parts (§5), and each part feeds FU-7+ plans.

---

## 0. Headline

- **Four axes:**
  - 14 body systems, read out on every cell;
  - 172 patient states (pathologies at their clinically distinct grades, from the engine's catalogues and condition
    lists, plus the planned 7i/7j states);
  - 24 intervention classes (≈ 95 concrete interventions);
  - 28 patient contexts (9 age/sex/size/pregnancy contexts and 19 comorbidity profiles), each in MODELED and, for a
    subset, MANUAL.

  The full product (≈ 4.6 × 10⁵ triples before modes) is meaningless. The matrix is the **relevant** set: every state
  paired with the interventions that treat it, provoke it or are classically hazardous in it, in the contexts where
  that pairing changes the answer (§1).
- **Designed size: 837 cells.** 201 are already measured by audits 08/09/10 (§4). **636 new cells in 286 scripted
  scenarios are split into 10 audit runs** of 52–75 cells, each one agent and ≤ 90 min of engine time (§5):
  - renal/hepatic;
  - endocrine/thermal;
  - neuro/NMB/depth (with the brain);
  - drug–drug and drug–disease interactions across all classes;
  - paediatric;
  - obstetric;
  - comorbidity profiles (elderly, obese, HTN, CAD, AS, HFrEF, COPD, CKD, diabetes, cirrhosis, PH, MS, AF,
    asthma, OSA, anaemia…);
  - devices (pacing, defibrillation, CPR, IABP, LVAD, ECMO);
  - surgical stimuli and positioning;
  - one run this design adds: blood/fluids/electrolytes/acid–base/transfusion, the base 7i builds on.
- **Priority** (§3; score = frequency × consequence × teaching value):

  | tier | meaning | cells | of which new |
  |---|---|---|---|
  | **P1** | what an anaesthesiologist meets daily | **485** | 331 |
  | **P2** | weekly in a tertiary centre, or a lethal error | **326** | 281 |
  | **P3** | rare or niche | **26** | 24 |

  Every run does its P1 cells first. The recommended order is DI, CM and BF first (they decide FU-7); then SP, NN, ET
  and RH; then PD after V.1 and DV after FU-4; OB twice (now for the expected column, again at the 7j gate).
- **The matrix starts filled** with audits 08/09/10's 201 cells:

  | verdict | cells |
  |---|---|
  | plausible | 68 (34 %) |
  | too weak | 36 |
  | too strong | 2 |
  | wrong | 71 |
  | missing | 17 |
  | inconsistent | 7 |

  The wrong/missing cells cluster in mechanisms FU-4/FU-5/FU-6 already own:
  - no emergent arrest;
  - anaesthetic sympatholysis as a gain scale;
  - hyperkalaemia as morphology only;
  - dead-space bookkeeping;
  - the missing bronchodilator response;
  - the hidden GA switch;
  - pulse oximetry in low flow;
  - alarm latching and chaining.
- **Blocked cells.** 181 of the 636 new cells (28 %) are **not expressible** on today's main:

  | blocker | cells |
  |---|---|
  | obstetric (7j) | 58 |
  | posture and surgical events | 35 |
  | missing profiles (engine or `pme-scenario/1`) | 34 |
  | coagulation and labs (7i) | 21 |
  | other missing mechanisms or states (FU-7) | 15 |
  | devices (7h) | 10 |
  | missing drugs | 7 |
  | neuraxial outside obstetrics | 1 |

  They are designed now, with their expected response and source, so the owning plan starts from a ready acceptance
  list. Four of those blockers are one-line schema or library additions:
  - the `pme-scenario/1` `endo` block;
  - `pregnancyWeeks`;
  - hydrocortisone;
  - dexamethasone PD.

---

## 1. Axes

### 1.1 Systems (the readout columns of every cell)

Each cell records the expected and measured response of **every system the intervention should move**. Systems it
should *not* move are recorded too (a "quiet" check). The readout keys are the inventory's (§2 of research/11).

| code | system | main readouts (inventory keys) | owner stages |
|---|---|---|---|
| CIRC | circulation and coronary | MAP/SBP/DBP, HR, CO, SV, SVR, PVR, CVP, PAWP, LVEDP, EF, Pmsf, CoPP, kIsch, PPV/SPV (derived) | 2, 7a, FU-4 |
| RHY | rhythm and conduction | rhythm id, rate, QRS/QT/PR, escape, arrest state, ST | 1, 5, FU-4 |
| AIR | upper airway and airway devices | airway state, obstruction, device (ETT/SGA), gastric breaths | 3, 7f, FU-6 |
| LUNG | lung mechanics, gas exchange, ventilation, drive | PaO2, SaO2, PaCO2, EtCO2, Pa–Et, shunt, VD, VT, RR, VE/VA, Ppeak/Pplat/PEEPi, Crs, FRC, drive | 3, 7b, V, FU-6, 7k |
| BLD | blood, acid–base, electrolytes, O2 transport, fluids | pH, HCO3, BE, lactate, Na, K, Cl, iCa, Mg, Hb, glucose, osm, CaO2, DO2, VO2, SvO2, blood volume, COP, EVLWI | 7c, 7i |
| COAG | coagulation (new) | PT/INR, aPTT, fibrinogen, platelets, TEG/ROTEM, bleeding rate | 7i |
| KID | kidney | RBF, GFR, UO, AKI stage, K/acid excretion, creatinine (7i) | 7d |
| LIV | liver and metabolism | HBF, lactate clearance, drug clearance, liverFn, INR, glucose output | 7d, 7e, 7g |
| BRN | brain and ICP | ICP, CPP, CBF, CMRO2, PbtO2, SjvO2, Cushing, pupils | 7d, 7f |
| END | endocrine, stress, thermal | catecholamines, cortisol, glucose/insulin, core/peripheral temperature, shivering, MH | 3, 7e |
| NEU | NMB, depth, consciousness, drive | TOF/TOFR/PTC, DoA index/SR, MAC, consciousness, movement, apnoea, drive depression | 7f |
| PK | drug disposition | Cp/Ce time course, onset, offset, CSHT, flow and organ dependence | 7g |
| DEV | devices and the monitor output | displayed numerics, validity flags, alarms (priority, latching, chaining), INOPs, device state | 4b, 2, FU-5 |
| OBS | mother–fetus unit (new) | UBF, FHR, CTG, uterine tone | 7j |

### 1.2 Patient states (pathologies and severities)

The states come from the engine's catalogues: 7a profile conditions and events, the 32 7b lung conditions, 7c/7d/7e/7f
conditions, the 36 rhythms, the airway events, and tables §1.5 (the comorbidity layer, partly unimplemented). The
planned 7i/7j states are added. A state is a condition at a named severity or grade. Grades that change the answer are
separate states (ATLS class I–IV; Ring–Messmer II–IV; GOLD 1–4).

| family | states (grades) | count | expressible today? |
|---|---|---|---|
| baseline | awake spontaneous; awake on O2; GA maintained (TIVA / volatile) ventilated; GA SGA spontaneous; sedation (MAC) | 5 | yes |
| haemorrhage / volume | hypovolaemia class I, II, III, IV; dehydration; hypervolaemia/overload; capillary leak | 7 | yes (dehydration and overload via bleed/fluid) |
| obstructive | tamponade (compensated, severe, accumulating); massive PE; submassive PE; tension PTX (L/R); VAE; fat embolism; dynamic hyperinflation | 10 | yes (one-command PE and accumulating tamponade/PTX after FU-4) |
| distributive | sepsis SIRS / sepsis / warm shock / cold shock; anaphylaxis II, III, IV; vasoplegia; neurogenic shock; high spinal | 11 | partly (neurogenic and high spinal: no) |
| cardiogenic / structural | HFrEF (compensated, decompensated); HFpEF; AS severe/critical; MS; AR; MR (chronic/acute); RV infarct; PH / RV failure; acute ischaemia (STEMI territories); LVOT obstruction (missing) | 13 | mostly (LVOT obstruction: no) |
| rhythm | sinus brady; AVB 1/2/3; SVT (AVNRT/AVRT); AF (controlled/RVR); flutter; VT mono/poly; torsades; VF; PEA; asystole; paced (AAI/VVI/DDD) with faults; long QT; Brugada; WPW/pre-excited AF | 18 | yes |
| airway | obstruction (partial/complete); laryngospasm; bronchospasm (airway / lung); oesophageal intubation; endobronchial; disconnect; kinked tube; aspiration; difficult airway (missing) | 10 | mostly (laryngospasm is a proxy) |
| lung | asthma; COPD GOLD 1–4; ARDS mild/moderate/severe (high/low recruiter); pneumonia; atelectasis; pulmonary oedema (cardiogenic/NPPE); effusion; haemothorax; simple PTX; ILD; obesity lung; NM weakness; diaphragm paralysis; BPF; OLV; neonatal RDS; smoke inhalation; COVID | 22 | yes |
| blood / metabolic | hyper-K (6, 7.5, 9); hypo-K; hyper/hypo-Ca; hypo/hyper-Mg; hypo/hyper-Na (incl. TURP glycine); lactic acidosis; DKA; hyperchloraemic acidosis; metabolic alkalosis; anaemia (acute/chronic); CO poisoning; MetHb; burns | 18 | yes |
| coagulation (7i) | dilutional coagulopathy; trauma-induced coagulopathy; DIC; heparinised; hyperfibrinolysis; thrombocytopenia; hypothermic/acidotic coagulopathy | 7 | **no** (7i) |
| renal / hepatic | AKI (pre-renal, intrinsic); CKD 4–5 / dialysis; IAH/ACS; hepatic failure; cirrhosis Child B/C; hepatic hypoperfusion | 7 | partly (CKD and cirrhosis only as the aki/hepaticFailure proxies) |
| brain | TBI with expanding haematoma; diffuse oedema; raised ICP; Cushing; herniation; seizure/status (missing); stroke (missing) | 7 | partly |
| endocrine / thermal | inadvertent hypothermia (mild/moderate/severe); therapeutic hypothermia; fever; MH; thyroid storm; myxoedema; adrenal crisis; hypo-/hyperglycaemia; HHS; phaeochromocytoma crisis (missing); carcinoid (missing) | 13 | mostly |
| NMB / neuro | residual block; myasthenia; LEMS; burn/denervation (sux); pseudocholinesterase deficiency (hetero/homo); awareness; LAST; opioid overdose; benzodiazepine overdose; serotonin syndrome (missing) | 10 | mostly |
| obstetric (7j) | term pregnancy (supine/tilted); pre-eclampsia (severe); eclampsia; PPH (atony); AFE; high/total spinal; failed intubation; placental abruption | 8 | **no** (only the lung row) |
| devices | pacemaker failure to capture/sense; IABP mistiming (early/late inflation/deflation); LVAD suction/low flow/thrombosis; ECMO (missing) | 6 | partly |
| **total** | | **172** | |

### 1.3 Intervention classes

| code | class | concrete interventions (engine ids where they exist) | expressible |
|---|---|---|---|
| I1 | IV hypnotics | propofol (bolus/TCI/infusion), thiopental, etomidate, ketamine, midazolam, dexmedetomidine | yes |
| I2 | inhaled agents | sevoflurane, isoflurane, desflurane (incl. rapid step-up), N2O | yes |
| I3 | opioids and antagonist | fentanyl, morphine, remifentanil (bolus/infusion), sufentanil; naloxone | yes |
| I4 | NMB and reversal | succinylcholine (1st/2nd dose), rocuronium, vecuronium, cisatracurium; neostigmine ± glycopyrrolate, sugammadex (2/4/16 mg/kg) | yes |
| I5 | vasopressors and inotropes | phenylephrine, ephedrine, noradrenaline, adrenaline (bolus/infusion/1 mg arrest), vasopressin, dobutamine, dopamine, milrinone | yes |
| I6 | vasodilators and rate control | GTN, hydralazine, labetalol, esmolol, metoprolol; nitroprusside, clonidine, Ca-channel blockers (missing) | partly |
| I7 | chronotropes and antiarrhythmics | atropine, glycopyrrolate, adenosine, amiodarone, lidocaine, magnesium | yes |
| I8 | electrolyte and metabolic therapy | CaCl2/gluconate, NaHCO3, insulin–dextrose, dextrose, salbutamol (K), KCl (missing) | mostly |
| I9 | other drugs | dantrolene, lipid emulsion, mannitol, hypertonic saline, furosemide, TXA (no PD yet), dexamethasone/ondansetron (no PD), hydrocortisone (missing) | partly |
| I10 | crystalloids and colloids | 0.9 % saline, RL, Plasma-Lyte, D5W, albumin 5 %, gelatin; bolus sizes 250 mL–30 mL/kg | yes |
| I11 | blood products | RBC (fresh/35 d, warmed/cold), FFP, platelets, whole blood; cryo/fibrinogen/PCC (missing) | volume only (factors: 7i) |
| I12 | haemorrhage | bleed by volume/rate (slow ooze → exsanguination) | yes |
| I13 | ventilation settings | VT, RR, PEEP 0–20, FiO2, I:E; mode VC/PC/PRVC/PSV/PAV (link); recruitment; permissive hypercapnia | yes |
| I14 | oxygenation and airway manoeuvres | preoxygenation, apnoea, BVM, intubation (ETT), SGA, extubation, OLV/mainstem, suction (missing) | yes |
| I15 | airway insults | obstruction, laryngospasm, bronchospasm, disconnect, kink, oesophageal, endobronchial, aspiration | yes (laryngospasm as proxy) |
| I16 | positioning | head-up (yes); Trendelenburg, reverse, lateral, prone, lithotomy, beach-chair, left tilt (missing) | head-up only |
| I17 | surgical stimuli | laryngoscopy, incision, sternotomy (intensity only); peritoneal traction/oculocardiac (vagal), pneumoperitoneum (IAP only), tourniquet, aortic cross-clamp/unclamp, cement, TURP absorption (missing as events) | intensity + IAP |
| I18 | temperature management | forced-air warming, fluid warmer, exposure/prep, ambient, active cooling (missing) | mostly |
| I19 | resuscitation | CPR quality/rate, defibrillation, synchronised cardioversion, transcutaneous pacing, adrenaline/amiodarone per ALS | yes |
| I20 | devices | IABP (ratio/timing), LVAD (speed), implanted pacemaker (mode/faults), ECMO VA/VV (missing) | partly |
| I21 | neuro-protective | hyperventilation, head-up, mannitol, HTS, CSF drainage (missing), barbiturate burst suppression | mostly |
| I22 | renal | catheter, diuretics, fluids for oliguria, dialysis/CRRT (missing) | partly |
| I23 | regional and neuraxial | spinal/epidural block (missing: `thermal:neuraxial` is thermal only); LA toxicity via PK (yes) | LAST only |
| I24 | measurement and monitor actions | ABG/VBG, NIBP cycle, line zero/flush/damp/level/wedge, probe site/off, leads off, alarm silence/ack | yes |

### 1.4 Patient contexts

| code | context | engine expression | expressible |
|---|---|---|---|
| X-A | adult man 40 y 70 kg 175 cm (reference) | profile | yes |
| X-F | adult woman 40 y 60 kg 165 cm | profile | yes |
| X-E | elderly 80 y | profile | yes |
| X-O | obese BMI 41 (127 kg, 175 cm) | profile + lung `obesity` | yes |
| X-C | child 4 y 16 kg | profile | yes (V.1 fixes the CO ratio) |
| X-I | infant 6 mo 7 kg | profile | partly (paediatric band) |
| X-N | neonate term 3.5 kg | profile | **no** (neonatal profile broken; R22) |
| X-D | adolescent 14 y 50 kg | profile | yes (no adolescent band yet) |
| X-P | term pregnancy (and T2) | lung `pregnancy` only | **partial → no until 7j** |
| comorbidity (19) | HTN (treated/untreated), CAD (stable / recent MI), AS severe, MS, MR, HFrEF, HFpEF, PH/RV failure, β-blocked, AF permanent, pacemaker-dependent, COPD GOLD 3, asthma (poorly controlled), OSA, CKD 5 (dialysis), diabetes T1/T2 (± autonomic neuropathy), cirrhosis Child C, myasthenia, burns (> 48 h) | 7a `conditions`, 7b lung, 7d `aki/hepaticFailure` proxy, 7e `endo`, 7f `nm` | circulation/lung/NM yes; CKD/cirrhosis as proxies; diabetes/thyroid **API only (not in `pme-scenario/1`)**; OSA, autonomic neuropathy, pacemaker-dependent as a profile: **no** |
| mode | MODELED (all cells); MANUAL (the P1 subset plus every arrest cell) | `mode` | yes |

---

## 2. The cell

A **cell** is one (context × state × intervention) triple, read on every system in §1.1. One scripted scenario usually
fills several cells: for example, a timeline that gives propofol, then PEEP, then a bleed, to a tamponade patient.

### 2.1 Cell record (one JSON per cell in the run's `results/`; one row in the run's matrix table)

| field | content |
|---|---|
| `id` | `<run>-<nnn>` (e.g. `RH-014`); the existing audit cells keep their ids (`A08-B2`, `A09-E1`, `A10-C3`) |
| `tier` | P1 / P2 / P3 (§3) |
| `context` | §1.4 code, plus the comorbidity grade and the mode (MODELED; MANUAL where listed) |
| `state` | §1.2 state at a named severity; how it is produced (profile field or event, with the exact command) |
| `intervention` | §1.3 class + the concrete dose/setting/time; its **control arm** (the same timeline without the intervention, measured at the same sim time, as in audit 08 §K) |
| `expected` | for each system that should move: direction, magnitude band, time course (onset, peak, offset), and **the source** (textbook chapter, guideline, primary paper, or a tables § row with its tag). For each system that should not move: "quiet" and its tolerance. The events that must or must not happen (arrest, rhythm change, apnoea, alarm) |
| `measured` | the numbers from the scripted run: pre (30 s mean), nadir/peak with its time, end of window; the control-arm difference; events with times; the monitor's displayed values and alarms where DEV is a readout |
| `verdict` | **PL** plausible (inside the band) · **TW** too weak · **TS** too strong · **WR** wrong (opposite direction, a missing event such as no arrest, or a contradiction between systems) · **MI** missing (the quantity or mechanism does not exist; cite research/11 §3) · **IN** inconsistent (two commands for one disease disagree, or double-count) · **NE** not expressible (the command/profile is rejected or absent: give the owner) · **NM** designed, not yet measured |
| `gap` | the smallest physiological mechanism that would fix it, with its code location (file:line), in the audits' style (R45: mechanism first, never a widened band) |
| `owner` | the stage that fixes it (FU-4/5/6, 7i/7j/7k, S9, FU-7+) |
| `tests` | calibrated tests the fix would move (the audits' §5 pattern) |

### 2.2 Grading rules

- **Bands are proposals for Ali** until he rules. The auditor quotes the source and never invents a band. A cell with
  no source is graded "direction only" and listed in the run's open questions.
- **Control arms are mandatory** for drug and ventilation cells. State-dependence (R53) is measured as the difference
  between the intervention in the state and the same intervention in the healthy reference context, the audit 08 §K
  method.
- **"Quiet" checks are cells too.** For example, phenylephrine must not move ICP; propofol in a healthy adult must not
  arrest (the FU-4 "no arrest in the healthy counterpart" rule).
- **The monitor is graded separately from the truth.** A cell whose truth is right but whose display is wrong gets two
  verdicts (truth, DEV), as audit 10 did.
- **MANUAL:** every arrest cell and every P1 haemodynamic cell also runs in MANUAL. There the expected response is the
  instructor's target plus the non-reflex physiology (Q9 of audit 08; Ali's ruling pending).

---

## 3. Prioritisation

Each cell gets a score from three 1–3 ratings:
- **F**, frequency in anaesthetic practice: 3 = daily, 2 = weekly in a tertiary centre, 1 = rare.
- **C**, consequence of the model being wrong: 3 = teaches a lethal error, 2 = a wrong management choice, 1 = cosmetic.
- **T**, teaching and exam value: 3 = a core viva/board topic, 2 = common teaching, 1 = niche.

The tier is **P1 if F = 3**, or if F + C ≥ 5 with C = 3. **P2** is any other cell with F + C + T ≥ 6. **P3** is the
rest. Rare but lethal and exam-critical events (MH, LAST, AFE, tension PTX, tamponade + induction) are P1 or P2 by
C/T even when F = 1.

The daily **P1 core** is listed so every run starts from it:

| P1 core (examples) | why |
|---|---|
| induction with propofol / etomidate / ketamine in: healthy, elderly hypertensive, hypovolaemic, HFrEF, AS, obese, child | the most common haemodynamic event in anaesthesia (post-induction hypotension) |
| phenylephrine, ephedrine, noradrenaline, adrenaline boluses and infusions in the same contexts; atropine/glyco for bradycardia | the daily response to that hypotension |
| sevoflurane/desflurane maintenance and step changes; remifentanil infusion | maintenance |
| laryngoscopy/intubation and incision stimuli with and without opioid | the pressor response |
| VT/RR/PEEP/FiO2 changes, preoxygenation, apnoea, SGA spontaneous ventilation, extubation with residual block | ventilation |
| bleeding 500–1500 mL and crystalloid/colloid/RBC replacement; Hb, lactate and Ca during transfusion | blood loss |
| rocuronium, sugammadex, neostigmine/glycopyrrolate; TOF course | NMB |
| inadvertent hypothermia and warming; glucose under stress and in diabetes | homeostasis |
| monitor behaviour at low perfusion, in arrhythmia, with artefact, and alarm handling | what the trainee sees |

---

## 4. Cells already measured (audits 08, 09, 10 on main 9f864b3, 23b791f and 84fc9af)

The verdicts are copied from the audits, not re-graded. Gap ids: **G1–G15** (audit 08), **R1–R15** (audit 09),
**M1–M16** (audit 10). Owners follow the rulings: FU-4 (G, R1), FU-5 (M), FU-6 (R2–R15), V.1 (tension-PTX
mechanics, child CO ratio). Context codes are from §1.4. Unless stated, the rig is adult X-A, ventilated VCV 12 × 600,
PEEP 5, FiO2 0.5 (audit 08) or 12 × 500 (09/10), MODELED.

### 4.1 Audit 08 (haemodynamic integration; 62 cells)

| id | tier | context | state | intervention | systems | verdict | gap | owner |
|---|---|---|---|---|---|---|---|---|
| A08-A1 | P1 | X-A | GA baseline | propofol 2 mg/kg | CIRC | WR (too weak; HR rises) | G2 | FU-4 |
| A08-A1b | P1 | X-A | GA baseline | propofol 1 mg/kg | CIRC | TW | G2 | FU-4 |
| A08-A2 | P1 | X-A | GA baseline | sevoflurane to 0.65 MAC | CIRC | TW (HR wrong) | G2 | FU-4 |
| A08-A3 | P1 | X-A | GA baseline | PEEP 5 → 15 | CIRC | PL | — | — |
| A08-A4 | P1 | X-A | class I | bleed 500 mL/5 min | CIRC | PL | — | — |
| A08-A5 | P1 | X-A | class III | bleed 1.5 L/10 min | CIRC, BLD, KID | PL (slightly weak) | calib. row 3 | R44 pass |
| A08-A6 | P1 | X-A | GA baseline | phenylephrine 100 µg | CIRC | PL | — | — |
| A08-A7 | P1 | X-A | GA baseline | ephedrine 10 mg | CIRC | TW | G15 | calib. |
| A08-A8 | P1 | X-A | GA baseline | adrenaline 100 µg | CIRC | PL | G15 (HR low) | calib. |
| A08-A9 | P1 | X-A | GA baseline | atropine 0.5 mg | CIRC | PL | — | — |
| A08-B0 | P1 | X-A | severe tamponade | none (compensation) | CIRC | PL | — | — |
| A08-B0s | P1 | X-A spont | severe tamponade | spontaneous breathing | CIRC | WR (no pulsus) | G6 | FU-4 |
| A08-B1 | P1 | X-A | severe tamponade | propofol 1 mg/kg | CIRC, RHY | WR | G1, G2 | FU-4 |
| A08-B2 | P1 | X-A | severe tamponade | propofol 2 mg/kg | CIRC, RHY | WR | G1, G2 | FU-4 |
| A08-B9 | P1 | X-A | severe tamponade | propofol 4 mg/kg | CIRC, RHY | WR | G1, G2 | FU-4 |
| A08-B3 | P1 | X-A | severe tamponade | PEEP 10 | CIRC | TW | G6 | FU-4 |
| A08-B3b | P1 | X-A | severe tamponade | PEEP 15 | CIRC | TW | G6 | FU-4 |
| A08-B4 | P1 | X-A | severe tamponade | sevoflurane 2 % | CIRC | TW | G2 | FU-4 |
| A08-B5 | P1 | X-A | severe tamponade | bleed 1 L | CIRC, RHY | TW | G1 | FU-4 |
| A08-B6 | P1 | X-A | severe tamponade | chain propofol → PEEP → sevo → bleed | CIRC, RHY | WR | G1, G2 | FU-4 |
| A08-B7 | P1 | X-A | severe tamponade | Ali's chain (propofol 3 mg/kg, PEEP 15, sevo, bleed 2 L) | CIRC, RHY, DEV | WR | G1, G2, G14 | FU-4/5 |
| A08-B8 | P1 | X-A | tamponade 0.8 | propofol 2 mg/kg | CIRC | WR | G2 | FU-4 |
| A08-C0 | P1 | X-A | class III | bleed 1.5 L (compensation) | CIRC, BLD | PL | — | — |
| A08-C1 | P1 | X-A | class III | propofol 2 mg/kg | CIRC, PK | TW | G2, G10 | FU-4 |
| A08-C2 | P1 | X-A | class III | sevoflurane 2 % | CIRC | TW | G2 | FU-4 |
| A08-C3 | P1 | X-A | class III | spinal sympathectomy | CIRC | MI | neuraxial model | FU-7+ |
| A08-C4 | P1 | X-A | class IV | bleed 2.5 L | CIRC, RHY | WR (no arrest; reflex reset) | G1, G7, G13 | FU-4 |
| A08-D0 | P2 | X-A | massive PE (7a) | none | CIRC, LUNG | WR | G6 | FU-4 |
| A08-D3 | P2 | X-A | massive PE (7a + 7b) | none | CIRC, LUNG | IN | G6 | FU-4 |
| A08-Kpe | P2 | X-A | massive PE | propofol 2 mg/kg | CIRC | TW | G2, G5 | FU-4 |
| A08-D1 | P2 | X-A | massive PE | PEEP 15 | CIRC | PL (direction) | — | — |
| A08-E1 | P1 | X-A | tension PTX (7b) | none | CIRC, RHY | WR (no PEA) | G1 | FU-4/V.1 |
| A08-E1p | P1 | X-A | tension PTX (7b) | PEEP 15 | CIRC, RHY | WR (EMD, "sinus") | G1 | FU-4 |
| A08-E2 | P1 | X-A | tension PTX (7a) | none | CIRC, LUNG | IN | G6 | FU-4 |
| A08-F0 | P2 | X-A | septic shock warm | none | CIRC, BLD | WR (not hyperdynamic) | G8 | FU-4 |
| A08-F1 | P2 | X-A | septic shock warm | propofol 2 mg/kg | CIRC | TW | G2 | FU-4 |
| A08-F2 | P1 | X-A | anaphylaxis IV | untreated | CIRC, RHY | WR (no arrest) | G1, G8 | FU-4 |
| A08-F3 | P1 | X-A | anaphylaxis IV | PEEP 15 | CIRC | WR | G1 | FU-4 |
| A08-F4 | P1 | X-A | MH | untreated 50 min | END, BLD, CIRC, RHY | WR (no arrest; hypertensive at pH 6.6) | G1, G8 | FU-4 |
| A08-G1 | P2 | X-A | hyper-K 7.5/8.5/9.5 (profile) | none | RHY, CIRC | WR (bug + missing) | G3 | FU-4 |
| A08-G3b | P1 | burns | burns | succinylcholine 1.5 mg/kg | BLD, RHY | WR | G3 | FU-4 |
| A08-G3 | P2 | X-A | class IV | 10 u RBC (35 d), no Ca | BLD, CIRC | PL | — | — |
| A08-G4 | P2 | X-A awake | hypothermia to 28 °C | cooling | END, BLD, RHY | WR (shivers to 28 °C) | G12 | FU-4/7e |
| A08-G4b | P2 | X-A GA | hypothermia to 28 °C | cooling | RHY | MI (no AF/VF) | G12 | FU-4 |
| A08-H1 | P1 | X-A | GA baseline | fentanyl 10 µg/kg | CIRC, RHY | TW | G7, G15 | FU-4 |
| A08-H1b | P1 | X-A | GA baseline | remifentanil 3 µg/kg bolus | CIRC, RHY | TW | G7 | FU-4 |
| A08-H2 | P1 | X-A | GA baseline | succinylcholine 2nd dose | RHY | MI | G7 | FU-4 |
| A08-H3 | P1 | X-A | GA baseline | neostigmine, no glycopyrrolate | RHY | PL | — | — |
| A08-I1 | P1 | X-A | induced, unventilated | apnoea 20 min | LUNG, RHY, CIRC | WR (sinus at SpO2 0) | G1, G5 | FU-3/FU-4 |
| A08-J1 | P1 | X-A | GA baseline | propofol 4 + remifentanil 2 µg/kg | CIRC | TW | G2 | FU-4 |
| A08-J2 | P1 | X-E + HTN | GA baseline | propofol 4 + remifentanil 2 | CIRC | TW | G2 | FU-4 |
| A08-J3 | P1 | X-E + HTN | GA baseline | propofol 2 mg/kg | CIRC | TW | G2 | FU-4 |
| A08-K-as | P1 | AS + CAD + HTN 75 y | compensated | propofol 2 mg/kg | CIRC | TW (behaves as healthy) | G2, G5 | FU-4 |
| A08-K-hf | P1 | HFrEF 60 y | compensated | propofol 2 mg/kg | CIRC | TW | G2 | FU-4 |
| A08-K-ptx | P1 | X-A | tension PTX | propofol 2 mg/kg | CIRC | TW | G1, G2 | FU-4 |
| A08-K-man | P1 | X-A MANUAL | GA baseline | propofol 2 mg/kg | CIRC | PL (no reflex, as designed) | G9 (Q9) | Ali |
| A08-K-manhv | P1 | X-A MANUAL | class III | propofol 2 mg/kg | CIRC | TW | G9 | Ali |
| A08-L-B0 | P1 | X-A MANUAL | severe tamponade | none | CIRC | WR (tracker set-and-hold) | G9 | Ali/FU-4 |
| A08-L-B6 | P1 | X-A MANUAL | severe tamponade | chain | CIRC, RHY | WR (no arrest) | G1, G9 | FU-4 |
| A08-L-C0 | P1 | X-A MANUAL | class III | bleed 1.5 L | CIRC | PL (instructor HR, as designed) | G9 | Ali |
| A08-L-C4 | P1 | X-A MANUAL | class IV | bleed 2.5 L | CIRC, RHY | WR (MAP 10 for 35 min) | G1, G9 | FU-4 |
| A08-X | P1 | X-A | VF | CPR + adrenaline | CIRC, BRN, KID, END | WR (last-beat state: CoPP 79, CBF 1.0) | G4 | FU-4 |

### 4.2 Audit 09 (respiratory, airway, gas; 88 cells)

| id | tier | context | state | intervention | systems | verdict | gap | owner |
|---|---|---|---|---|---|---|---|---|
| A09-A1 | P1 | X-A awake | baseline spont, air | none | LUNG | WR (VD inflated by calibration) | R1 | FU-4 G11 |
| A09-A2 | P1 | X-A | GA ventilated | VCV 12 × 500 | LUNG, CIRC | WR (PaCO2 60) | R1 | FU-4 G11 |
| A09-A2b | P1 | X-A | GA (switch) | VCV 12 × 500 | LUNG | TW (PaCO2 47) | R1 | FU-4 |
| A09-A2e | P1 | X-A MANUAL | GA ventilated | VCV 12 × 500 | LUNG | WR | R1 | FU-4 |
| A09-A2f | P1 | X-F | GA ventilated | VCV 7 mL/kg PBW | LUNG, BLD | WR (PaCO2 103, pH 7.06) | R1 | FU-4 |
| A09-A2g | P1 | X-A | GA ventilated | VCV 7 mL/kg PBW | LUNG | WR (PaCO2 49) | R1 | FU-4 |
| A09-A3 | P1 | X-A awake | baseline | FiO2 0.21 → 0.4 → 1.0 | LUNG | PL | — | — |
| A09-A3b | P1 | X-A | GA ventilated | FiO2 steps | LUNG | TW (atelectasis/shunt small) | R14 | FU-6 |
| A09-A4 | P1 | X-A awake | baseline | face-mask preoxygenation | LUNG | PL | — | — |
| A09-VD-A/F/P/O/E/C | P1 | X-A, X-F, X-P, X-O, X-E, X-C | intubated baseline | ETT dead space | LUNG | WR ×6 (VD/VT 0.43–0.8) | R1 | FU-4 |
| A09-B1 | P1 | X-A | induced apnoea, preox | no switch | LUNG | TW (9.75 min) | R4 | FU-6 |
| A09-B1g | P1 | X-A | induced apnoea, preox | GA switch | LUNG, RHY | PL (7.8 min) | — | — |
| A09-B2 | P1 | X-A | induced apnoea, air | none | LUNG | PL | — | — |
| A09-B3 | P1 | X-O | induced apnoea, preox | no switch | LUNG | TW | R4 | FU-6 |
| A09-B3g | P1 | X-O | induced apnoea, preox | GA switch | LUNG | PL | — | — |
| A09-B4 | P1 | X-P | induced apnoea, preox | no switch | LUNG | TW | R10 | 7j |
| A09-B4g | P1 | X-P | induced apnoea, preox | GA switch | LUNG | TW (5.6 min) | R10 | 7j |
| A09-B5 | P1 | X-C | induced apnoea, preox | no switch | LUNG | TW (7.8 min) | R4, R15 | FU-6/V.1 |
| A09-B5g | P1 | X-C | induced apnoea, preox | GA switch | LUNG, DEV | WR (PaCO2 55 at rest; display lag 60 s) | R15 | V.1/FU-6 |
| A09-B7 | P1 | X-A MANUAL | induced apnoea | none | RHY, CIRC | MI (no hypoxic brady/arrest) | Q9 | Ali |
| A09-C1a | P1 | X-A | induction | propofol 2 + rocuronium | LUNG, AIR | PL (direction) | R3 | FU-6 |
| A09-C1b | P1 | X-A | induction | small obstructed breaths | DEV (capnogram) | WR (full plateau below VD) | R5 | FU-6 |
| A09-C1c | P1 | X-A | induced apnoea 3 min | none | LUNG | PL | — | — |
| A09-C1d | P1 | X-A | induced | BVM FiO2 1 | LUNG | PL | — | — |
| A09-C1e | P1 | X-A | induced | laryngoscopy stimulus 1.5, no opioid | CIRC | TW (MAP +6) | G2-type | FU-4 |
| A09-C1f | P1 | X-A | intubated | VCV 12 × 500 | LUNG | WR | R1 | FU-4 |
| A09-C2 | P1 | X-A | induction, air, no preox | propofol + roc | LUNG, RHY | PL | — | — |
| A09-C4 | P1 | X-A | natural airway, air | propofol 2 mg/kg alone | AIR, LUNG | WR (RR 41, no apnoea) | R3 | FU-6 |
| A09-D1 | P1 | X-A awake | natural airway | remifentanil 0.05→0.2 µg/kg/min | LUNG, NEU | PL (pattern) / MI (no sedation) | R12 | FU-6 |
| A09-D1n | P1 | X-A | opioid depression | naloxone 0.1 mg × 2 | LUNG | PL | — | — |
| A09-D2 | P1 | X-A | SGA spont | sevoflurane 0.7 → 1.5 MAC | LUNG, CIRC | TW (tachypnoea weak) | R12 | FU-6 |
| A09-D3 | P1 | X-A | emergence | extubation at TOFR 0.6 | AIR, LUNG | TS | R3 | FU-6 |
| A09-D4 | P1 | X-A | SGA, remi + propofol | FiO2 0.5; stimulus 1.5 | LUNG, NEU | MI (stimulus does not drive breathing) | R12 | FU-6 |
| A09-D-HVR | P2 | X-A | awake → anaesthetised | hypoxic challenge | LUNG | MI (no selective depression of HVR) | R12 | FU-6 |
| A09-E1 | P1 | X-A | airway bronchospasm | none | LUNG, DEV | PL (but moderate at severity 1) | — | calib. |
| A09-E1t | P1 | X-A | airway bronchospasm | salbutamol 250 µg IV, adrenaline 50 µg | LUNG | MI | R2 | FU-6 |
| A09-E1b | P1 | X-A | lung bronchospasm | salbutamol, sevoflurane, adrenaline | LUNG | MI / IN | R2, R6 | FU-6 |
| A09-E1c | P2 | X-A | asthma | RR 12 → 8 | LUNG | PL | — | — |
| A09-E2 | P1 | X-A | laryngospasm proxy 60 s | release | AIR, LUNG | WR (VT uncapped) | R3 | FU-6 |
| A09-E2b | P1 | X-A | laryngospasm proxy 180 s | release | AIR, LUNG, CIRC | MI (no NPPE, no pleural swing) / WR | R3 | FU-6 |
| A09-E3 | P1 | X-A | kinked ETT | 120 s | LUNG, DEV | WR (Paw = PEEP) | R9 | FU-6 |
| A09-E4 | P1 | X-A | endobronchial | none; withdrawal | LUNG | PL | — | — |
| A09-E5 | P1 | X-A | disconnection | 240 s | LUNG, DEV | PL | — | — |
| A09-E6 | P1 | X-A | oesophageal intubation | after preox | LUNG, DEV | PL | — | — |
| A09-F1 | P2 | X-A | ARDS severe | VCV 6 mL/kg, PEEP 5 | LUNG | PL | — | — |
| A09-F1r | P2 | X-A | ARDS severe | PEEP 10/15, recruitment | LUNG, CIRC | TW (no compliance gain) | R14 | FU-6 |
| A09-F2 | P2 | COPD GOLD 4 | dynamic hyperinflation | RR 10 → 30 | LUNG, CIRC | PL | — | — |
| A09-F2d | P2 | COPD GOLD 4 | dynamic hyperinflation | disconnect 30 s | CIRC | TW | — | FU-6 |
| A09-F3 | P2 | X-A | OLV | FiO2 1.0, VT 350 × 16 | LUNG | TS (PaO2 80) / MI (volatile HPV, posture) | R13 | FU-6 |
| A09-F4 | P1 | X-A | tension PTX (7b) | none | LUNG, CIRC | WR (peak +8.5, no PEA) | G1, V.1 | V.1/FU-4 |
| A09-F4b | P1 | X-A | tension PTX (7a) | none | LUNG | WR (no lung effect) | R6 | FU-4 |
| A09-F4c | P1 | X-A | tension PTX (both) | none | LUNG | PL (no double count) | — | — |
| A09-F5 | P1 | X-A | class III | PEEP 5 → 15 | CIRC, LUNG | PL | — | — |
| A09-F5b | P1 | X-A | GA baseline | PEEP 5 → 15 | CIRC, LUNG | PL | — | — |
| A09-F6 | P2 | X-A | GA | VT 300 (permissive hypercapnia) | LUNG, BLD | WR (dead space) / MI (no hypercapnic PVR) | R1, R14 | FU-4/FU-6 |
| A09-G1a | P2 | X-A | PE (7a) | none | LUNG, CIRC | WR | R6, G6 | FU-4 |
| A09-G1b | P2 | X-A | PE (7b) | none | LUNG, CIRC | TW (haemodynamics) | G6 | FU-4 |
| A09-G1c | P2 | X-A | PE (both) | none | CIRC | IN (mPAP 117) | R6 | FU-4 |
| A09-G1d | P2 | X-A awake | PE (7b) | spontaneous | LUNG | TW (no hyperventilation) | R12 | FU-6 |
| A09-G2 | P2 | X-A awake | anaemia Hb 5 | none | CIRC, BLD | MI (no CO response) | R11 | FU-6/7i |
| A09-G3b | P3 | X-A | MetHb 30 % | none | LUNG, DEV | PL | — | — |
| A09-G3 | P2 | X-A | COHb 30 % | FiO2 1.0 60 min | BLD | MI (no CO elimination) | R11 | FU-6 |
| A09-G4 | P2 | X-A | hypothermia 30 °C | fixed VCV | LUNG, BLD | PL | — | — |
| A09-G5 | P2 | X-A awake | metabolic acidosis (HCl) | none | LUNG, BLD | PL | — | — |
| A09-G5b | P2 | X-A | metabolic acidosis | ventilated | BLD | PL | — | — |
| A09-G6 | P1 | X-A | VF | CPR quality 1 → 0.4 → 1, ROSC | LUNG, DEV | PL | — | — |
| A09-G7 | P1 | X-A | class IV | bleed 2.5 L | LUNG (EtCO2) | PL | — | — |
| A09-G7b | P1 | X-A | severe tamponade | none | LUNG (EtCO2) | PL | — | — |
| A09-H1 | P1 | X-A | airway bronchospasm | capnogram | DEV | PL | — | — |
| A09-H2 | P2 | X-A | lung bronchospasm | capnogram | DEV | IN | R6 | FU-6 |
| A09-H3 | P2 | COPD | baseline | capnogram | DEV | TW (gap 27, slope shallow) | R46 flag | FU-6 |
| A09-H4 | P1 | X-A | NMB wearing off | capnogram curare cleft | DEV | PL | — | — |
| A09-H5 | P2 | X-A | exhausted absorber FiCO2 5–8 | 20 min | LUNG, BLD | WR (display-only FiCO2) | R8 | FU-6 |
| A09-H6 | P2 | X-A | GA | RR 6, VT 700 | DEV | TW (cardiogenic ripple invisible) | R5 | FU-5/6 |
| A09-H7 | P1 | X-A | endobronchial | capnogram | DEV | PL | — | — |
| A09-H8 | P2 | X-A | massive PE (7b) | capnogram | DEV | PL | — | — |
| A09-H9 | P1 | X-A | VF + CPR | capnogram | DEV | PL | — | — |
| A09-H10 | P1 | X-A | oesophageal | capnogram | DEV | PL | — | — |
| A09-H11 | P1 | X-A | opioid bradypnoea RR ≤ 6 | EtCO2 window | DEV | WR (numeric 0–22, alarm flapping) | R5 | FU-5/6 |
| A09-H12 | P1 | X-A | GA | RR 12 → 24 | LUNG, DEV | PL | — | — |
| A09-Ib | P1 | X-A | airway bronchospasm | link vs internal ventilator | LUNG | WR (diverges: SpO2 0 vs 98) | R7 | FU-6 |
| A09-Ic1 | P1 | X-A | anaphylaxis (7e + lung) | none | CIRC, LUNG | PL (no double count) | — | — |
| A09-Ic2 | P1 | X-A | bronchospasm (airway + lung) | none | LUNG | IN (multiplicative) | R6 | FU-6 |

### 4.3 Audit 10 (monitor output fidelity; 51 cells; skin-dependent cells run on philips-like, mindray-like and saadat-like, in MANUAL and MODELED)

| id | tier | context | state | intervention / probe | systems | verdict | gap | owner |
|---|---|---|---|---|---|---|---|---|
| A10-A0 | P1 | X-A | baseline | SpO2/PI/PR | DEV | PL | — | — |
| A10-A1 | P1 | X-A MANUAL | MAP 100 → 44 | PI with vasoconstriction | DEV | WR (PI −15 % only) | M1 | FU-5 |
| A10-A1t | P1 | X-A MANUAL | target 18/10 | tracker floor | CIRC, DEV | IN (valid SpO2, PI "--") | M1, T-issues | FU-5/FU-4 |
| A10-A1m | P1 | X-A | bleed 3 L (MAP 2) | SpO2 at low flow | DEV | WR (SpO2 98 valid) | M1 | FU-5 |
| A10-A2 | P1 | X-A | Ali's B7 chain | SpO2 at low flow | DEV | WR | M1 | FU-5 |
| A10-A4 | P1 | X-A | VF / asystole / PEA | SpO2 validity, INOP | DEV | MI (no NO PULSE INOP) | M8 | FU-5 |
| A10-A4c | P1 | X-A | CPR | SpO2 "?" | DEV | WR (tile drops "?") | M1 | FU-5 |
| A10-A5 | P2 | X-A MANUAL | ROSC | SpO2 recovery | DEV | PL (minor) | — | — |
| A10-A7a | P1 | X-A | probe off | SpO2 INOP, PR source | DEV | WR (PR from ART in the SpO2 tile) | M12 | FU-5 |
| A10-A7b | P1 | X-A | motion | "?" | DEV | WR (tile shows no "?") | M1 | FU-5 |
| A10-A7c | P1 | X-A | same-arm NIBP | SpO2 hold | DEV | PL | — | — |
| A10-A8 | P1 | X-A | apnoea from air, finger | display lag | DEV | PL (displays 0 %: M15) | M15 | FU-5 |
| A10-A8e | P2 | X-A | same, ear probe | lag | DEV | PL | — | — |
| A10-B1 | P1 | X-A MODELED | sinus 30 commanded | HR / escape | RHY, DEV | WR (escape not reset) | G-FU3 r1 | FU-4 |
| A10-B2 | P1 | X-A | sinus brady 35, junctional 40, VT 180, VVI 70, sinus tachy 187 | HR, VTAC alarm | DEV | PL | — | — |
| A10-B3 | P1 | X-A | AF 150 | HR, PR deficit | CIRC, DEV | IN (44 % non-ejecting beats) | FU-4 r5 | FU-4 |
| A10-B4 | P1 | X-A | VF coarse | HR, chaining | DEV | WR (HR_HIGH flaps; EXTREME TACHY in VF) | M7 | FU-5 |
| A10-B5 | P1 | X-A | asystole | chaining | DEV | WR (HR 0<50 alongside) | M7 | FU-5 |
| A10-B6 | P1 | X-A | PEA | HR, PR, SpO2 | DEV | PL | — | — |
| A10-B7 | P2 | X-A | CHB 32 | PAUSE event alarm | DEV | WR (flicker) | M13 | FU-5 |
| A10-B8 | P2 | X-A | asystole → ROSC | HR recovery | DEV | WR (low: HR "3") | M16 | FU-5 |
| A10-B9 | P1 | X-A | leads off | HR fallback | DEV | WR (HR "0" valid) | M3 | FU-5 |
| A10-B10 | P2 | X-A | HR 80 ↔ 120 ↔ 40 steps | response time per skin | DEV | PL | — | — |
| A10-C1 | P1 | X-A | MAP ladder | ART accuracy | DEV | PL | — | — |
| A10-C2 | P1 | X-A | PEA | ART stale beats | DEV | WR (valid 118/79 for 6 s) | M5 | FU-5 |
| A10-C3 | P1 | X-A | VF / asystole flat line | non-pulsatile indication | DEV | MI | M5, M8 | FU-5 |
| A10-C4 | P1 | X-A | CPR | ART during compressions | DEV | PL | — | — |
| A10-C5 | P2 | X-A | over-damped line | ART | DEV | TW | — | FU-5 |
| A10-C6 | P2 | X-A | under-damped line, flush | ART | DEV | PL | — | — |
| A10-C7 | P1 | X-A | normal and hypotensive | NIBP accuracy | DEV | PL | — | — |
| A10-C8 | P1 | X-A | pulse pressure ≤ 20 | NIBP | DEV | WR (fails at any MAP) | M4 | FU-5 |
| A10-C9 | P2 | X-A | AF 150 | NIBP | DEV | PL | — | — |
| A10-C10 | P1 | X-A | VF/CPR; ROSC | NIBP INOP; recovery | DEV | PL | — | — |
| A10-C11 | P1 | X-A | CVP at a limit | alarm chatter | DEV | WR | M6 | FU-5 |
| A10-D1 | P1 | X-A | ventilated baseline | EtCO2, awRR, RR | DEV | PL | — | — |
| A10-D2 | P1 | X-A | ventilator off 60 s | APNEA | DEV | WR (two red alarms) | M2 | FU-5 |
| A10-D3 | P1 | X-A | ventilation resumes | latching | DEV | WR (latched, audible) | M2 | FU-5 |
| A10-D4 | P1 | X-A | apnoea with hypoxic bradycardia | impedance RR | DEV | WR (RR = HR) | M10 | FU-5 |
| A10-D5 | P1 | X-A | disconnect; oesophageal ETT | CO2 apnoea | DEV | PL | — | — |
| A10-D6 | P1 | X-A | VF, ventilation continued | EtCO2 decay | LUNG (truth) | WR (37 → 1 in 20 s) | T3 | FU-4 |
| A10-D7 | P1 | X-A | CPR; low flow | EtCO2 | DEV | PL | — | — |
| A10-D8 | P3 | X-A | start-up | spurious alarms | DEV | WR (low) | M14 | FU-5 |
| A10-D9 | P1 | X-A | philips-like layout | RR/awRR visibility | DEV | MI | M10 | FU-5 |
| A10-E1 | P2 | X-A | cooling 37 → 34 | T1 lag | DEV | PL | — | — |
| A10-E2 | P2 | X-A | TEMP LOW | alarm text | DEV | WR (integer text) | M6 | FU-5 |
| A10-E3 | P2 | X-A | temperature probe off | INOP | DEV | MI | M8 | FU-5 |
| A10-E4 | P1 | X-A | NMB, depth | NMT/BFA tiles | DEV | PL | — | — |
| A10-E5 | P2 | X-A | volatile maintenance | agent tile | DEV | MI | M11 | S9 |
| A10-F1 | P1 | X-A | any alarm | philips-like silence | DEV | WR (mutes new alarms 90 s) | M9 | FU-5 |
| A10-F2 | P1 | X-A | VF arrest storm | priority / chaining / latching | DEV | WR | M2, M7 | FU-5 |
| A10-F3 | P2 | X-A | skin declarations | settings unwired | DEV | MI | M11 | FU-5 |

### 4.4 Run DI (drug interactions; research/14-audit-drug-interactions.md; 105 cells on main 3ff2fb0, 2026-09-28)

The cells were measured by coverage run 1. Every NM in §5.4 flips to the verdict below. The run kept research/12's ids
DI-01…45, added DI-46…90 for the brief's items (induction × comorbidity, TCI/CSHT, onset/offset, antagonists,
placeholders), and added DI-M1…M4 as MANUAL twins. The report file is research/14, not the /16 named in §5.4.

| verdict | cells | of which FU-4 pending |
|---|---|---|
| PL | 42 | 6 |
| TW | 25 | 12 |
| TS | 9 | 1 |
| WR | 8 | 2 |
| MI | 9 | — |
| IN | 2 | — |
| NE | 10 | — |

- **By tier:** P1 59, P2 45, P3 1.
- **FU-6 R2:** DI-40.
- **Gap ids D1–D15** are research/14 §3. D1, D5, D6 and D11 are FU-4's, with follow-on rows. D2, D3, D4, D7, D8, D9,
  D10, D12, D13 and D14 are new (owners: 7g, 7f, 7c, 7e/7a, FU-7 and DV).

| cell | tier | intervention (short) | verdict | owner |
|---|---|---|---|---|
| DI-01a | P1 | propofol 2 mg/kg | **TW** (FU-4 pending) | FU-4 G2 |
| DI-01b | P1 | remifentanil 1 µg/kg bolus | **TW** (FU-4 pending) | FU-4 G7 |
| DI-01c | P1 | propofol 2 mg/kg + remifentanil 1 µg/kg vs each alone | **TW** | 7g combine.ts |
| DI-01d | P1 | propofol 2 mg/kg ± remifentanil 1 µg/kg: apnoea | **TW** | 7f drive.ts / neuro/spont.ts |
| DI-02 | P1 | midazolam 0.03 mg/kg 2 min before propofol 1.4 mg/kg vs propofol 1.4 alone | **PL** | 7f depth.ts |
| DI-03 | P1 | fentanyl 2 µg/kg + midazolam 0.05 mg/kg (Bailey 1990) | **WR** | 7f drive.ts |
| DI-04a | P1 | ephedrine 10 mg | **TS** | 7g combine.ts betaBlunt |
| DI-04b | P1 | phenylephrine 100 µg | **PL** | 7g |
| DI-04c | P1 | bleed 1500 mL / 10 min (the state itself) | **TW** | 7a baroreflex (β-blocked profile) |
| DI-05 | P2 | adrenaline 100 µg IV | **WR** | 7g combine.ts |
| DI-06 | P2 | propofol induction; vasopressin rescue | **NE** | FU-7 profile (and FU-4’s humoral arm, which will carry angio |
| DI-07 | P1 | esmolol 0.5 mg/kg + propofol 2 mg/kg | **TW** | 7g |
| DI-08 | P1 | labetalol 10 mg at 180 s vs none | **TW** | 7e stimulus / 7a set point (SP run) |
| DI-09 | P1 | phenylephrine 0.5 µg/kg/min from 900 s vs none (neuraxial arm NE: no neuraxial event) | **PL** | 7g / 7a baroreflex |
| DI-10 | P1 | noradrenaline 0.1 µg/kg/min; then + vasopressin 0.04 U/min | **TW** | 7g / 7e |
| DI-11 | P2 | milrinone 50 µg/kg over 10 min then 0.5 µg/kg/min; + noradrenaline 0.05 at +20 min | **TW** | 7g / 7a RV |
| DI-12 | P2 | dobutamine 5 µg/kg/min | **TW** | 7g NR-7g-2 (inotrope venous return) |
| DI-13a | P1 | amiodarone 300 mg during CPR | **MI** | DV/FU-7 (shock outcome has no drug or myocardial term) |
| DI-13b | P1 | amiodarone 150 mg over 10 min vs esmolol 0.5 mg/kg | **PL** | 7g rows (amiodarone) / 7a rate rule |
| DI-14a | P1 | adenosine 6 mg then 12 mg | **PL** | 7g hooks.ts |
| DI-14b | P1 | adenosine 6 mg (transient slowing only) | **PL** | 7g hooks.ts |
| DI-14c | P2 | adenosine 6 mg (may accelerate) | **MI** | FU-7 (no accessory-pathway hazard) |
| DI-15 | P2 | verapamil | **NE** | FU-7 drug |
| DI-16 | P2 | atropine | **NE** | FU-7 profile |
| DI-17 | P1 | neostigmine 0.05 mg/kg with atropine 1 mg vs with glycopyrrolate 0.4 mg vs alone | **PL** (FU-4 pending) | FU-4 G7 (vagal) + 7g |
| DI-18 | P2 | adrenaline 100 µg (arrhythmia threshold under a modern volatile) | **PL** | 7g (no catecholamine–volatile arrhythmia hazard: correct for |
| DI-19 | P2 | sevoflurane 2 % with 66 % N2O vs without (second-gas effect) | **MI** | 7g volatile.ts (no shared alveolar uptake between agents) |
| DI-20 | P2 | N2O 66 % | **NE** | FU-7 (N2O gas-space expansion) |
| DI-21 | P1 | ketamine 1 mg/kg | **WR** | 7g combine.ts (ketamine indirect arm) |
| DI-22 | P1 | etomidate 0.3 vs propofol 2 mg/kg at +11 min | **PL** (FU-4 pending) | FU-4 G2 + humoral arm |
| DI-23 | P2 | lidocaine 1.5 mg/kg IV on top of bupivacaine 100 mg (additive toxicity) | **TW** | 7g pipeline (cnsE/cvE take the MAXIMUM, not the sum) |
| DI-24 | P2 | lipid emulsion 1.5 mL/kg + 0.25 mL/kg/min at the first sign | **PL** | 7g LAST (NR-7g-4: the engine rig at 70 kg reaches VF; the de |
| DI-25 | P2 | rocuronium 0.6 mg/kg; calcium chloride 1 g | **MI** | 7f interactions.ts (calcium has no NMB path) |
| DI-26 | P1 | calcium chloride 1 g; insulin–dextrose; salbutamol 10 mg neb | **PL** | 7c treatments.ts |
| DI-27 | P2 | sodium bicarbonate 1 mmol/kg | **PL** | 7c |
| DI-28 | P2 | furosemide 40 mg | **PL** | 7d renal / 7g (venodilation only) |
| DI-29 | P2 | rocuronium 0.6 mg/kg re-dose 5 min after sugammadex | **PL** | 7g nmb.ts binding |
| DI-30 | P2 | remifentanil | **NE** | FU-7 profile |
| DI-31 | P1 | phenylephrine 100 µg vs ephedrine 10 mg | **PL** | 7a coronary / 7g |
| DI-32 | P1 | etomidate 0.3 vs propofol 2 mg/kg; then dobutamine 5 µg/kg/min | **TW** | 7g (NR-7g-2 inotrope venous return) |
| DI-33 | P2 | GTN 400 µg then fluid 500 mL | **TW** | 7a (RV infarct) / 7g |
| DI-34 | P2 | GTN 1 µg/kg/min for 10 min | **WR** (FU-4 pending) | FU-4 G2 (state-dependence) |
| DI-35 | P3 | vasodilator / inotrope | **NE** | FU-7 state |
| DI-36 | P1 | propofol 2 mg/kg + PEEP 10 at RR 20 (auto-PEEP stacking) | **TW** (FU-4 pending) | FU-4 G2 + 7b |
| DI-37a | P1 | succinylcholine 1.5 mg/kg | **WR** (FU-4 pending) | FU-4 G3 (potassium) |
| DI-37b | P1 | succinylcholine 1.5 mg/kg then calcium chloride 1 g at the ECG change | **TS** (FU-4 pending) | 7c treatments.ts |
| DI-37c | P1 | succinylcholine 1.5 mg/kg | **IN** | 7c (burns severity is the only K path; the 7f nm profile doe |
| DI-37d | P1 | succinylcholine 1.5 mg/kg | **PL** | 7c |
| DI-38 | P2 | morphine 10 mg (M6G accumulation) | **NE** | FU-7 (active metabolites) |
| DI-39 | P2 | ketamine 1 mg/kg at constant PaCO2 | **PL** | 7d brain / 7g cbfVaso |
| DI-40 | P2 | salbutamol 10 mg nebulised | **WR** (FU-6 R2 pending) | FU-6 R2 (bronchodilator response) |
| DI-41 | P1 | adrenaline 100 µg ×2 | **TS** | 7g / 7e |
| DI-42 | P2 | morphine 10 mg IV fast (histamine) | **TW** | 7g (histamine published, nothing consumes it) |
| DI-43 | P2 | opioid (PCA-equivalent) | **NE** | FU-7 profile |
| DI-44 | P2 | propofol 100 µg/kg/min for 60 min (cumulative hypotension, CSHT) | **PL** | 7g PK |
| DI-45 | P2 | sugammadex 16 mg/kg (rare marked bradycardia / anaphylaxis) | **MI** | FU-7 (no sugammadex cardiac/anaphylaxis hazard) |
| DI-46 | P1 | propofol 2 mg/kg | **TW** (FU-4 pending) | FU-4 G2 |
| DI-47 | P1 | propofol 2 mg/kg | **TW** (FU-4 pending) | FU-4 G2 |
| DI-48 | P1 | propofol 1.5 mg/kg | **TW** (FU-4 pending) | FU-4 G2 |
| DI-49 | P1 | propofol 2 mg/kg | **TW** (FU-4 pending) | FU-4 G2 |
| DI-50 | P1 | rocuronium 0.6 mg/kg alone: onset and T1 25 % recovery | **PL** | 7f nmb.ts / 7g PK |
| DI-51 | P1 | rocuronium 0.6 mg/kg under sevoflurane vs TIVA (potentiation) | **TS** | 7f interactions.ts |
| DI-52 | P1 | sugammadex 4 mg/kg vs neostigmine 0.05 mg/kg at the same depth | **TS** | 7f neostigmine.ts |
| DI-53 | P2 | succinylcholine 1 mg/kg | **PL** | 7g PCHE_CL_MULT |
| DI-54 | P2 | magnesium 2 g over 2 min | **PL** | 7g hooks.ts |
| DI-55 | P1 | phenylephrine 100 µg under sevoflurane vs TIVA-free baseline | **PL** | 7g / 7a baroreflex |
| DI-56 | P1 | noradrenaline 0.1 µg/kg/min in acidosis vs normal pH | **PL** | 7g pd.ts acidosisFactor |
| DI-57 | P1 | ephedrine 10 mg ×3 at 5-min intervals (tachyphylaxis) | **TS** | 7g tachy() |
| DI-58 | P1 | GTN 1 µg/kg/min in hypovolaemia vs normovolaemia | **PL** (FU-4 pending) | FU-4 G2 |
| DI-59 | P2 | hydralazine 10 mg vs labetalol 10 mg (onset and offset) | **PL** | 7g rows-cardiovascular.ts |
| DI-60 | P2 | dexmedetomidine 1 µg/kg over 10 min then 0.5 µg/kg/h | **MI** | 7g rows-anaesthetic.ts |
| DI-61 | P1 | lidocaine 1.5 mg/kg vs amiodarone 150 mg | **MI** | FU-7 (no antiarrhythmic → rhythm conversion except adenosine |
| DI-62 | P1 | fentanyl 10 µg/kg, then atropine 0.5 mg at the nadir | **TW** (FU-4 pending) | FU-4 G7 (vagal events) |
| DI-63 | P2 | atropine 0.5 mg vs glycopyrrolate 0.4 mg (onset/offset) | **PL** | 7g rows-cardiovascular.ts |
| DI-64 | P2 | insulin 10 U vs dextrose 25 g (glucose course) | **PL** | 7e glucose.ts / 7c kShift |
| DI-65 | P1 | dantrolene 2.5 mg/kg at 20 min | **PL** | 7e thermal/MH + 7g dantrolene |
| DI-66 | P1 | propofol 2 mg/kg: peak Ce and MAP fall vs the same dose at normal CO | **TW** (FU-4 pending) | FU-4 G10 (flow-dependent distribution) |
| DI-67 | P1 | propofol TCI Ce 3 µg/mL (Eleveld) — time to target and overshoot | **PL** | 7g tci.ts |
| DI-68 | P2 | remifentanil 0.25 µg/kg/min for 60 min: offset (context-insensitive) vs fentanyl 250 µg bo | **PL** | 7g csht.ts |
| DI-69 | P1 | onset/offset of each induction agent (time to the MAP nadir and to recovery) | **MI** | 7f depth.ts (+7g gamma shapes) |
| DI-70 | P2 | desflurane step 3 % → 12 % (sympathetic surge) vs sevoflurane step | **TW** | 7g pipeline.ts desSurge |
| DI-71 | P1 | naloxone 0.4 mg | **TS** | 7g antagonists / 7f drive |
| DI-72 | P2 | flumazenil 0.2 mg ×2 | **TS** | 7g antagonists |
| DI-73 | P2 | tranexamic acid 1 g (placeholder row) | **PL** | 7i (coagulation and fibrinolysis) |
| DI-74 | P2 | heparin, protamine (absent) | **NE** | 7i (R58) |
| DI-75 | P2 | oxytocin / carbetocin / ergometrine / carboprost (absent) | **NE** | 7j (R59) |
| DI-76 | P2 | dexamethasone 8 mg and ondansetron 4 mg (placeholder rows: quiet checks) | **MI** | 7e (glucose) / FU-7 (QTc) |
| DI-77 | P1 | MAC reduction by an opioid (macEff vs macBrain) and the depth interaction | **PL** | 7f depth.ts / 7g |
| DI-78 | P1 | propofol 2 mg/kg in sepsis vs the same dose healthy at the same sim time | **TW** (FU-4 pending) | FU-4 G2 (sympatholysis as a gain scale) |
| DI-79 | P1 | propofol 2 mg/kg | **TW** (FU-4 pending) | FU-4 G2 + 7a baroreflex |
| DI-80 | P1 | ketamine 1.5 mg/kg vs propofol 2 mg/kg at +11 min | **PL** | 7g (ketamine indirect arm) |
| DI-81 | P1 | etomidate 0.3 mg/kg | **PL** | 7g |
| DI-82 | P1 | etomidate 0.3 vs ketamine 1.5 mg/kg (KETASED comparison) | **PL** | 7g |
| DI-83 | P2 | dobutamine 5 µg/kg/min | **PL** | 7g combine.ts (betaOcc, vasoResp) |
| DI-84 | P1 | propofol TCI Ce 3 µg/mL (Eleveld): delivered dose and achieved concentration | **TW** (FU-4 pending) | FU-4 G10 (flow-dependent distribution) |
| DI-85 | P2 | propofol plasma TCI 3 µg/mL (Eleveld) for 1 h vs 3 h, then off: 50 % plasma decrement and  | **PL** | 7g csht / 7f depth |
| DI-86 | P2 | fentanyl plasma TCI 2 ng/mL (Shafer) for 1 h vs 3 h, then off: 50 % plasma decrement (Hugh | **PL** | 7g csht.ts |
| DI-87 | P2 | dial off at FGF 6 L/min: desflurane vs sevoflurane vs isoflurane emergence | **PL** | 7g volatile.ts / 7f depth |
| DI-88 | P2 | time to peak effect: fentanyl 2 µg/kg, remifentanil 1 µg/kg, midazolam 0.05 mg/kg, rocuron | **TS** | 7g models / 7f nmb |
| DI-89 | P1 | propofol 2 mg/kg + remifentanil 1 µg/kg: 7f apnoea flag vs spontaneous VE | **WR** | 7f drive.ts:64 vs neuro/spont.ts (MODELED chemoreflex) |
| DI-90 | P2 | rocuronium 0.6 mg/kg after the Mg load vs alone | **IN** | 7f interactions.ts ← 7c blood Mg |
| DI-M1 | P1 | propofol 2 mg/kg (MANUAL; MODELED twin DI-01a) | **PL** (FU-4 pending) | Q9 (MANUAL physiology) / FU-4 G9 |
| DI-M2 | P1 | propofol 2 mg/kg (MANUAL; MODELED twin DI-22) | **PL** (FU-4 pending) | Q9 / FU-4 G9 |
| DI-M3 | P1 | propofol 1.5 mg/kg then phenylephrine 100 µg (MANUAL; MODELED twins DI-48, DI-31) | **PL** (FU-4 pending) | Q9 |
| DI-M4 | P1 | esmolol 0.5 mg/kg; atropine 1 mg; ephedrine 10 mg (chronotropes in MANUAL; MODELED twins D | **WR** | Q9 (MANUAL HR is the instructor’s) |

### 4.5 Run CM (comorbidity profiles; research/19-coverage-comorbidity.md; 69 cells on main 0fd5397, 2026-09-29)

The cells were measured by coverage run CM on `origin/main` 0fd5397 (FU-3, FU-4, FU-5 merged). Every NM in §5.7 flips
to the verdict below. The run kept research/12's ids CM-01…18, split into the designed cells a–f (65), added CM-15c
(a quiet cell after CM-15b arrested) and CM-M1…M3 as MANUAL twins. The report file is research/19, as §5.7 names it.

| verdict | cells | of which another stage's fix is pending |
|---|---|---|
| PL | 26 | 2 |
| TW | 13 | 3 |
| TS | 4 | — |
| WR | 10 | 2 |
| IN | 4 | — |
| MI | 1 | — |
| NE | 11 | — |

- **By tier:** P1 39, P2 29, P3 1.
- **Gap ids C1–C12** are research/19 §3. New with no owner: C1 (no tonic sympathetic tone — induction is context-blind
  after FU-4; FU-4 S14 `it.fails`), C2 (ST timer), C3 (AF: LVEDP sampled mid-relaxation → ischaemia and arrest in a
  healthy heart), C4 (obesity sized on total weight and double-counted with lung `obesity`), C5–C9, C10 (missing
  profiles), C12 (`RhythmOpts` validation). Pending elsewhere: FU-6 R14/R2/drive/hypercapnic PVR; FU-7 Tasks 10, 17.
- **Expressibility:** 11 NE against the 15 designed — CM-16 (profile rhythm `pacedVVI` with `opts.pacer`) and CM-09c
  (engine API `endo`) became expressible.

| cell | tier | intervention (short) | verdict | owner |
|---|---|---|---|---|
| CM-01a | P1 | none (resting values) | **TS** | 7a profile / 7b |
| CM-01b | P1 | propofol 1.5 mg/kg | **WR** | FU-4 G2 (done) / 7a profile |
| CM-01c | P1 | propofol PK: 1.5 mg/kg bolus (peak Ce and its time) and Eleveld effect-site TCI 3 µg/mL fo | **PL** | 7g PK (Eleveld/age) |
| CM-01d | P1 | phenylephrine 100 µg at T + 120 s | **PL** | 7a baroreflex (profile G_v) |
| CM-01e | P1 | bleed 1 L over 10 min | **TS** | 7a baroreflex (profile gSymp) |
| CM-01f | P1 | apnoea: time to SaO2 90 % | **WR** | 7b / Stage 3 (profile FRC and closing capacity) |
| CM-02a | P1 | none (resting values); the profile-only twin checks double counting | **IN** | 7a/7c profile + Stage 3 gasPatient + 7b obesity |
| CM-02b | P1 | apnoea: time to SaO2 90 % | **IN** | Stage 3 / 7b (FRC); FU-6 R4 removes the switch |
| CM-02c | P1 | VT 6 mL/kg PBW (423 mL) vs 6 mL/kg TBW (762 mL) | **PL** | 7b mechanics (obesity) |
| CM-02d | P1 | PEEP 5 → 10 plus a recruitment manoeuvre 40 cmH2O × 30 s at T | **TW** (FU-6 R14 pending) | 7b recruitment (obesity atelectasis) |
| CM-02e | P1 | reverse Trendelenburg 30° | **NE** | posture stage (FU-7 "surgical events and posture") |
| CM-03a | P1 | none (resting values) | **TW** | 7a profile |
| CM-03b | P1 | propofol 2 mg/kg | **WR** | FU-4 G2 (done) / 7a profile |
| CM-03c | P1 | laryngoscopy stimulus 1.5 for 60 s at T + 120 s | **TW** (FU-7 Task 10 pending) | 7e stimulus / 7a set point |
| CM-03d | P1 | cerebral blood flow at MAP 65 vs each patient's own baseline | **PL** | 7d brain (HTN_LL_SHIFT) |
| CM-04a | P1 | HR 70 → 110 held for 10 min | **IN** | 7a coronary.ts |
| CM-04b | P1 | phenylephrine 100 µg vs ephedrine 10 mg at T + 120 s | **PL** | 7a coronary / 7g |
| CM-04c | P1 | bleed 1 L over 10 min | **TW** | 7a coronary.ts |
| CM-04d | P1 | esmolol 1 mg/kg at T + 180 s vs none | **PL** | 7g esmolol / 7a coronary |
| CM-05a | P1 | propofol 1.5 mg/kg | **WR** | FU-4 G2 (done) / 7a coronary |
| CM-05b | P1 | AF onset at 100/min vs sinus held at 100/min (isolates the atrial kick) | **IN** | 7a atria (atrial kick) / Stage 5 AF |
| CM-05c | P1 | phenylephrine 100 µg at T + 120 s | **TW** | 7a coronary / 7g |
| CM-05d | P1 | GTN 1 µg/kg/min for 10 min | **WR** | 7g GTN / 7a |
| CM-06a | P1 | none (resting values) | **TS** | 7a profile |
| CM-06b | P1 | etomidate 0.3 mg/kg vs propofol 2 mg/kg | **PL** | FU-4 G2 (done) / 7g |
| CM-06c | P1 | Ringer's lactate 500 mL over 10 min | **TW** | 7a EDPVR / 7c lung water |
| CM-06d | P1 | dobutamine 5 µg/kg/min | **PL** (FU-7 Task 17 pending) | 7g dobutamine |
| CM-06e | P1 | afterload reduction: hydralazine 10 mg IV | **TW** | 7a (afterload sensitivity) / 7g hydralazine |
| CM-07a | P1 | none (resting values) | **TW** | 7b copd / 7c acid–base |
| CM-07b | P1 | RR 12 → 20 at T (auto-PEEP); Pa–EtCO2 gap | **PL** | 7b mechanics / dead space |
| CM-07c | P1 | FiO2 0.21 → 1.0 for 30 min (uncontrolled oxygen) | **PL** (FU-6 (drive) pending) | 7b V/Q + HPV / Stage 3 drive |
| CM-07d | P2 | bronchospasm (lung bronchospasm 0.5) at T | **PL** | 7b mechanics |
| CM-07e | P1 | extubation to FiO2 0.4 at 40 min | **TW** (FU-6 (drive, fatigue) pending) | 7b / Stage 3 drive |
| CM-08a | P2 | none (resting chemistry) | **PL** | 7c blood profile / 7d aki proxy |
| CM-08b | P2 | rocuronium 0.6 mg/kg: time to T1 25 % | **PL** | 7g PK (renal clearance of rocuronium) |
| CM-08c | P2 | Ringer's lactate 1 L over 15 min | **TS** | 7d renal / 7c fluid |
| CM-08d | P2 | succinylcholine 1.5 mg/kg | **PL** | 7c succinylcholine K |
| CM-08e | P2 | profile: β ×1.3, renal drug clearance ×0.3, AV fistula CO +10 %, post-dialysis hypovolaemi | **NE** | FU-7 profile (ckd) |
| CM-09a | P2 | resting HR 90–100, fixed; baroreflex G_v ×0.3 | **NE** | FU-7 profile (dan) |
| CM-09b | P2 | propofol induction: exaggerated hypotension with no HR response | **NE** | FU-7 profile (dan) |
| CM-09c | P2 | surgical stress (stimulus 1.0) for 60 min | **PL** | 7e glucose (diabetes) |
| CM-09d | P2 | aspiration risk at induction | **NE** | FU-7 / SP run (aspiration as a risk state) |
| CM-10a | P2 | none (resting haemodynamics) | **NE** | FU-7 profile (cirrhosis) / 7a |
| CM-10b | P2 | propofol 2 mg/kg | **NE** | FU-7 profile (cirrhosis) / 7g protein binding |
| CM-10c | P2 | plasma colloid osmotic pressure | **TW** | 7c COP |
| CM-10d | P2 | INR / bleeding | **NE** | 7i (v1.1) |
| CM-10e | P2 | IAP 15 mmHg for 2 h; glucose course | **TW** | 7e glucose (liverFn) / 7d renal IAP |
| CM-11a | P2 | laryngoscopy and intubation (airway instrumentation) | **MI** | FU-7 profile (bronchial reactivity) |
| CM-11b | P2 | sevoflurane 2 % (≈ 1 MAC) | **WR** (FU-6 R2 pending) | FU-6 R2 (bronchodilation) |
| CM-12a | P2 | opioid (fentanyl 1 µg/kg) under sedation | **NE** | FU-7 profile (osa) |
| CM-12b | P2 | extubation with residual opioid | **NE** | FU-7 profile (osa) |
| CM-13a | P1 | propofol 2 mg/kg | **TW** | 7a PH profile / FU-4 G5 |
| CM-13b | P1 | hypoventilation: VT 600 → 300 at T (PaCO2 ≈ 60) | **WR** (FU-6 (hypercapnic PVR, A09-F6) pending) | 7b HPV / 7a PVR |
| CM-13c | P1 | noradrenaline 0.1 vs phenylephrine 1 µg/kg/min from T + 120 s | **WR** | 7g α/β rows on the pulmonary circuit |
| CM-13d | P2 | inhaled nitric oxide 20 ppm | **NE** | FU-7 drug library (missing drug: iNO) |
| CM-14a | P2 | HR 70 → 110 held for 10 min | **PL** | 7a mitral valve (Gorlin) |
| CM-14b | P2 | lung water and oxygenation after 10 min of tachycardia | **TW** | 7c lung water / 7b diffusion |
| CM-14c | P2 | esmolol 1 mg/kg at T + 180 s vs none | **PL** | 7g esmolol / 7a |
| CM-15a | P2 | propofol 2 mg/kg | **PL** | 7a atria / Stage 5 AF |
| CM-15b | P2 | esmolol 0.5 mg/kg vs none | **WR** | 7g esmolol (AV node) / 7a |
| CM-15c | P1 | none (the rhythm itself; quiet check added after CM-15b arrested) | **WR** | 7a coronary.ts (per-beat CPP in AF) |
| CM-16a | P2 | diathermy: oversensing (inhibition) for 20 s | **PL** | Stage 5 pacer faults / DV |
| CM-16b | P2 | loss of capture (failureToCapture, faultRate 1) for 60 s | **PL** | Stage 5 pacer faults / DV |
| CM-17 | P3 | none (displayed SpO2 vs true oxygenation) | **PL** | 7c ODC / L3 pulse oximeter |
| CM-18a | P2 | bleed 1 L over 10 min | **PL** | 7c O2 transport |
| CM-18b | P2 | RBC 2 units over 20 min | **PL** | 7c transfusion |
| CM-M1 | P1 | propofol 1.5 mg/kg | **PL** | Q9 (MANUAL physiology) |
| CM-M2 | P1 | propofol 1.5 mg/kg | **PL** | Q9 (MANUAL physiology) |
| CM-M3 | P1 | propofol 2 mg/kg | **PL** | Q9 (MANUAL physiology) |


### 4.6 Run DV (devices, pacing, defibrillation, CPR; research/20-coverage-devices.md; 65 cells on main 3feee6f, 2026-09-29)

The cells were measured by coverage run DV on `origin/main` 3feee6f (engine code = 0fd5397: FU-3, FU-4, FU-5 merged).
Every NM in §5.8 flips to the verdict below. The run kept research/12's ids DV-01…26, split into the designed cells
a–d (DV-17's three readouts graded as one cell), added DV-13d (a quiet cell after a correctly timed IABP arrested a
compensated HFrEF + MI patient) and DV-M1…M5 as MANUAL twins. The report file is research/20, as §5.8 names it.

| verdict | cells | of which another stage's fix is pending |
|---|---|---|
| PL | 26 | — |
| TW | 10 | — |
| TS | 4 | 1 (FU-4 S13 CoPP `it.fails`) |
| WR | 12 | 2 (FU-7 Task 12) |
| IN | 1 | — |
| MI | 3 | 2 (7h) |
| NE | 9 | — (7h / EMI) |

- **By tier:** P1 28, P2 32, P3 5.
- **Gap ids V1–V12** are research/20 §3. New with no owner:
  - V1: a shock- or instructor-made PEA never enters the arrest state (no ROSC, no decay);
  - V2: the IABP reads CoPP from the post-deflation dip, leaks balloon volume, and deflates late in MANUAL — a
    correctly timed balloon arrests a compensated HFrEF + MI patient at +8.8 min;
  - V3: CPR on a tamponade gives an arterial 181/124;
  - V4: CPR EtCO2 from an interim quality fit, blind to volume (V.1 Request, unowned);
  - V6: pacing is painless;
  - V7: the CPR event does not reach the ECG artefact (IN);
  - V8: CPR cerebral flow 0.71;
  - V9: the LVAD has no preload physiology.
  Pending elsewhere: V5 (shock outcome state-blind) → FU-7 Task 12, which must also add temperature, energy and rhythm
  class; V10 → 7h; V11 → 7c/FU-9.
- **Expressibility:** 9 NE against the 9 designed (ICD ×2, ECMO ×4, magnet, pericardiocentesis, EMI). DV-19 was designed
  "Y" but has no thrombosis input (MI).

| cell | tier | intervention (short) | verdict | owner |
|---|---|---|---|---|
| DV-01a | P1 | first shock 150 J and 200 J biphasic, 40 seeds each (the skin's first-shock energy: philip | **TW** | L3 outcome.ts VF_TABLE (calibration R44; the same file FU-7 Task 12 ed |
| DV-01b | P1 | shock 200 J, then CPR q 0.8 from +20 s for 8 min, 40 seeds: the post-shock rhythm and what | **WR** | FU-4 arrest machine (hemo/pipeline.ts:397–417; device-layer.ts:199–226 |
| DV-01c | P1 | shock 200 J pre-selected to an organised rhythm (sinus) — does the circulation sustain it? | **WR** (FU-7 Task 12 pending) | L3 outcome.ts ShockContext (FU-7 Task 12, E-FU7-6) |
| DV-02a | P1 | CPR quality 1.0 (and the default 0.8) from 120 s: CoPP and cerebral flow over minutes 2–8 | **TS** (FU-4 S13 it.fails (CoPP) + new (CBF) pending) | FU-4 CPR model (circ/params.ts:109–125) for CoPP; 7d brain (CBF under  |
| DV-02b | P1 | EtCO2 during minutes 2–8 of CPR (truth and displayed) | **PL** | 3 / FU-4 (CO2 low-flow coupling, gas/coupling.ts CPR_FLOW_EXP) |
| DV-02c | P1 | CPR quality 0.4 vs 1.0 (poor vs good compressions) | **PL** | FU-4 CPR model / 3 (CO2 coupling) |
| DV-03 | P1 | CPR q 0.8 alone from 720 s for 10 min (no volume, no adrenaline) | **WR** | FU-4 (arrest) — PL; new: gas/coupling.ts cardiacOutput during CPR (CO2 |
| DV-04a | P1 | CPR q 0.8 from PEA + 60 s for 10 min (no drainage); reference: the same CPR in VF | **WR** | FU-4 (tamponade dynamics + CPR on volume); gas/coupling.ts for EtCO2 |
| DV-04b | P1 | pericardiocentesis / surgical drainage | **NE** | 7h (pericardiocentesis) / FU-7 |
| DV-05a | P1 | adrenaline 1 mg at 240, 480, 720 s vs no drug (same CPR) | **PL** | 7g (adrenaline α) / FU-4 CPR |
| DV-05b | P1 | adrenaline 1 mg ×3 over 10 min: rhythm course | **PL** | FU-4 (asystole stays, Q3) |
| DV-06a | P1 | synchronised 120 J and 200 J biphasic, and 20 J, 40 seeds each | **WR** | L3 outcome.ts CARDIOVERSION_SINUS (FU-7 Task 12 E-FU7-6: energy and rh |
| DV-06b | P1 | synchronised 50 J and 100 J biphasic, 40 seeds each | **TW** | L3 outcome.ts (one 0.8 for every organised rhythm and energy) |
| DV-06c | P1 | synchronised 100 J biphasic, 40 seeds | **TW** | L3 outcome.ts |
| DV-07 | P2 | UNsynchronised 150 J at 40 phases of the cardiac cycle (vs the synchronised arms of DV-06a | **PL** | L3 outcome.ts R_ON_T_VF |
| DV-08a | P1 | TCP fixed 70 ppm, output 0 → 140 mA in 10 mA steps every 20 s | **PL** | 4b pacer / Stage 5 tcp.ts |
| DV-08b | P1 | TCP fixed 70 ppm 100 mA: electrical capture and the pulse | **PL** | Stage 5 tcp.ts / 7a (paced beats eject by contractility) |
| DV-08c | P1 | TCP 80 mA (discomfort): sympathetic/pain response vs the same capture in the ventilated GA | **MI** | new: 4b pacer → 7e stimulus (pain as a nociceptive input scaled by mA  |
| DV-09a | P2 | TCP 100 mA with the instructor fault failureToCapture | **PL** | 4b pacer |
| DV-09b | P2 | TCP DEMAND 70 ppm 80 mA with failureToSense (pacer fires asynchronously) vs demand without | **PL** | 4b pacer / Stage 5 tcp.ts |
| DV-10a | P2 | loss of capture (failureToCapture, faultRate 1) at 300 s | **PL** | Stage 5 pacing.ts |
| DV-10b | P2 | failure to sense (DDD) → competition; oversensing (VVI, faultRate 1) → inhibition | **PL** | Stage 5 pacing.ts |
| DV-10c | P2 | electrosurgery (diathermy) bursts near the generator: EMI oversensing | **NE** | Stage 5 pacing.ts / FU-7 (EMI → oversensing) |
| DV-11 | P2 | magnet over the generator | **NE** | 7h |
| DV-12a | P2 | ICD detection and internal shock | **NE** | 7h |
| DV-12b | P2 | anti-tachycardia pacing (8 pulses at 88 % of the cycle), then shock | **NE** | 7h |
| DV-13a | P1 | IABP 1:1, 40 mL, correct timing (inflation at the notch, deflation before the R) | **PL** | 7a devices.ts (IABP) / hemo pipeline |
| DV-13b | P1 | IABP 1:1 correct timing: assisted end-diastolic and systolic pressures vs unassisted; the  | **TS** | 7a devices.ts (IABP) |
| DV-13c | P1 | IABP 1:1 correct timing: cardiac output and PAWP after 3–5 min | **TW** | 7a devices.ts (IABP) |
| DV-13d | P1 | IABP 1:1 correct timing for 18 min vs no IABP: the quiet check (a correctly timed balloon  | **WR** | new: 7a coronary.ts:142 (CoPP from the beat's minimum aortic pressure) |
| DV-14a | P2 | EARLY inflation (−120 ms: inflates in systole) vs correct | **TW** | 7a devices.ts |
| DV-14b | P2 | LATE inflation (+120 ms) vs correct | **PL** | 7a devices.ts |
| DV-14c | P2 | EARLY deflation (−200 ms) vs correct | **TW** | 7a devices.ts |
| DV-14d | P2 | LATE deflation (+150 ms: the balloon is still full when the LV ejects) vs correct | **WR** | 7a devices.ts |
| DV-15a | P2 | IABP 1:2: assisted and unassisted beats side by side | **PL** | 7a devices.ts |
| DV-15b | P2 | trigger in AF and in arrest (tables: internal/asynchronous trigger in arrest; trigger-loss | **MI** | new: 7h (IABP trigger modes and alarms) |
| DV-16a | P2 | baseline arterial pulse pressure | **PL** | 7a devices.ts (LVAD) |
| DV-16b | P2 | NIBP cycles (3 stat measurements) | **TW** | Stage 2 NIBP (hemo/nibp) — FU-8 list (FU-5 follow-ups) |
| DV-16c | P2 | pulse oximetry | **TW** | Stage 3 pleth (pulsatility → PI) |
| DV-16d | P2 | console numerics: flow, power, pulsatility index | **TS** | 7a devices.ts (LVAD HQ/power/PI) |
| DV-17 | P2 | hypovolaemia: bleed 1500 mL over 5 min from 600 s → suction | **WR** | 7a devices.ts (preload dependence, suction) + new Stage 5 hook |
| DV-18a | P2 | hypertension: phenylephrine 1 µg/kg/min from 600 s | **PL** | 7a devices.ts LVAD_KH |
| DV-18b | P2 | acute RV failure (circ condition rvInfarct 1 at 600 s) | **TW** | 7a devices.ts / circ conditions |
| DV-19 | P3 | thrombus in the pump | **MI** | 7h (LVAD failure modes) |
| DV-20a | P3 | VA-ECMO 4 L/min: pulsatility and PP fall with flow fraction; EtCO2 low | **NE** | 7h |
| DV-20b | P3 | VV-ECMO 5 L/min, sweep 2–4 L/min: SaO2 as the weighted mix; PaCO2 set by sweep | **NE** | 7h |
| DV-20c | P3 | differential hypoxaemia (right radial SpO2 low, legs normal) | **NE** | 7h |
| DV-20d | P3 | recirculation 0.1–0.3: SaO2 falls without a flow change | **NE** | 7h |
| DV-21a | P1 | charge 200 J, charge 360 J, disarm, charge and leave it armed | **PL** | 4b defib.ts / skins |
| DV-21b | P1 | SYNC on, charge 150 J, shock (outcome pre-selected unchanged so the rhythm stays): sync ma | **PL** | 4b sync.ts / device-layer.ts |
| DV-22a | P2 | shock 200 J pre-selected to sinus at 360 s (compressions stop 2 s before): EtCO2 at ROSC | **PL** | 3 / FU-4 |
| DV-22b | P2 | 10-s pause for a rhythm check at 360 s: CoPP during the pause and its rebuild | **PL** | FU-4 CPR model |
| DV-23a | P2 | CPR q 0.8 at 110/min: does the ECG carry the compression artefact, and the arterial line t | **IN** | new: engine.ts (couple `cpr` → `artefact.cpr` at the same rate, depth  |
| DV-23b | P2 | CPR q 0.8 at 110/min: the SpO2 tile and its pulse rate | **PL** | FU-5 (pleth quality) |
| DV-24a | P2 | shock 200 J at 4 min, 40 seeds: termination vs normothermia | **WR** | L3 outcome.ts (FU-7 Task 12 must add a temperature factor — new item f |
| DV-24b | P2 | shock 200 J after rewarming vs at 28.5 °C, 40 seeds | **WR** | L3 outcome.ts (FU-7 Task 12 + temperature) |
| DV-25a | P2 | shock 200 J at 300 s untreated vs normokalaemic VF, 40 seeds; and a pre-selected organised | **WR** (FU-7 Task 12 pending) | L3 outcome.ts (FU-7 Task 12 kEcg factor) |
| DV-25b | P2 | CaCl2 1 g + insulin–dextrose + NaHCO3 50 mmol at 100 s, then a shock pre-selected to sinus | **TW** | 7c (K treatments; kChem from plasma K vs kEcg) / FU-4 K hazard |
| DV-26a | P2 | BVM/ventilation FiO2 1.0 at 190 s (no CPR, no drug) vs continued apnoea | **PL** | FU-3 hypoxic path / 3 |
| DV-26b | P2 | CPR q 0.8 + ETT/VCV FiO2 1.0 from 450 s vs CPR without ventilation | **PL** | FU-3/FU-4 arrest machine |
| DV-M1 | P1 | CPR q 0.8 from 120 s | **PL** | Q9 (MANUAL physiology) |
| DV-M2 | P1 | CPR q 0.8 alone from 720 s | **PL** | Q9 / FU-4 D6 |
| DV-M3 | P1 | shock 200 J pre-selected to sinus: the post-ROSC pressure ramp (brief §6.5: 50 % → 100 % o | **TS** | 4b device-layer.ts ROSC ramp |
| DV-M4 | P1 | TCP fixed 70 ppm 100 mA | **PL** | Q9 |
| DV-M5 | P1 | IABP 1:1, correct timing: when does the balloon deflate? | **WR** | new: hemo/pipeline.ts onCircBeat → devices.ts iabpOnBeat (schedule fro |

---

## 5. Partition into audit runs (one agent each)

Each run is one read-only audit agent, the audit 08/09/10 pattern. The agent:
- scripts the scenarios below with the shared runner (§6) on the current `main`, in MODELED plus the MANUAL subset;
- grades every cell (§2);
- ranks the gaps;
- writes the smallest mechanism for each gap, with file:line;
- lists the calibrated tests each fix would move;
- proposes the scripted suite that becomes the owning stage's acceptance cells;
- asks Ali the clinical questions, with the model's numbers.

Budget per run: ≤ 90 min of engine time, 45–85 cells, and one report `research/<nn>-coverage-<run>.md` with
`<nn>-audit-scripts/`.

**Order** (P1 density × dependency on the FU stages):
1. **DI** (drug interactions), **CM** (comorbidity) and **BF** (blood/fluids) first. Their P1 cells decide FU-7.
2. Then **SP** (stimuli/positioning), **NN** (neuro/NMB/depth), **ET** (endocrine/thermal), **RH** (renal/hepatic).
3. Then **PD** (paediatric, after V.1's child fixes) and **DV** (devices, after FU-4's arrest pathway).
4. **OB** runs twice: now, to write the expected responses and sources as 7j's acceptance cells (most cells NE), and
   again at the 7j gate.

Runs that measure physiology FU-4/FU-6 is changing (DI, CM, BF, DV) run on FU-4's merged main. Until then, they record
the pre-FU-4 numbers only where FU-4 does not touch the cell.

Scenario table columns:
- **cells**: how many matrix cells the scenario fills (one per intervention × readout group graded).
- **expr**: Y = expressible today; P k = partly expressible (k cells not expressible); NE = not expressible (the
  owner is named).
- **expected**: the headline human response and the source key. The auditor completes every band and every source.

### 5.1 RH — renal and hepatic (`research/13-coverage-renal-hepatic.md`)

Readouts: KID (RBF, GFR, UO, oliguria, AKI stage, excretion), LIV (HBF, lactate clearance, liverFn, INR, glucose
output), PK (clearance of flow-limited drugs), BLD (K, lactate, Na, osm), CIRC. Blockers: no creatinine/urea (7i), no
CKD or cirrhosis profile (only the `aki`/`hepaticFailure` proxies), no rhabdomyolysis state.

| id | tier | context · state → timeline | cells | expected (source) | expr |
|---|---|---|---|---|---|
| RH-01 | P1 | X-A · GA 4 h, VCV → hourly UO; oliguria-flag timing | 2 | UO 0.5–1 mL/kg/h under GA (ADH, sympathetic); flag only after the full KDIGO window (KDIGO; Miller, renal physiology) | Y |
| RH-02 | P1 | X-A · bleed class II → III | 3 | UO 20–30 → 5–15 mL/h; RBF falls before GFR (autoregulation); lactate clearance falls with HBF (ATLS; tables §5.2–5.3) | Y |
| RH-03 | P1 | X-A · class III → 2 L RL vs 2 u RBC | 2 | UO recovers within 30–60 min of MAP/CO restoration (ATLS) | Y |
| RH-04 | P1 | X-E + HTN · GA at MAP 65 vs 80 | 2 | renal autoregulation shifted +10 mmHg: UO lower at MAP 65 (tables §1.5 htn) | Y |
| RH-05 | P1 | HFrEF · low output (MAP 65, CVP 12) → dobutamine 5 µg/kg/min | 2 | UO 0.1–0.15 → 0.2–0.3 mL/kg/h in 30–60 min (tables §7 check 20) | Y |
| RH-06 | P2 | X-A · IAP 15 / 20 / 25 mmHg | 4 | UO ↓ from IAP 15, anuria > 25; CO ↓, SVR ↑; Ppeak ↑, Crs ↓ (WSACS; Barash, laparoscopy) | Y |
| RH-07 | P2 | X-A · furosemide 20 / 40 mg IV | 3 | diuresis onset 5–10 min, peak 30 min; K ↓; volume ↓ (Miller, renal pharmacology) | Y |
| RH-08 | P2 | X-A · mannitol 1 g/kg | 3 | transient volume expansion, then osmotic diuresis; Na dilution then rise (Miller) | Y |
| RH-09 | P2 | AKI · succinylcholine 1.5 mg/kg; 4 u RBC | 2 | larger K rise, slower excretion (Miller; tables §5.2) | Y |
| RH-10 | P2 | AKI proxy for CKD 5 · rocuronium 0.6 → sugammadex 2 | 3 | roc duration ×1.3–1.5; sugammadex complex not cleared (recurarisation risk low); morphine metabolite accumulation MI (Naguib; Miller NMB) | P 1 |
| RH-11 | P2 | AKI proxy · succinylcholine (no neuropathy) | 1 | K +0.5 as in health (not exaggerated) (Thapa & Brull 2000) | Y |
| RH-12 | P2 | hepaticFailure 0.8 · 2 h GA | 4 | lactate clearance ↓ (lactate rises on RL); hypoglycaemia; INR ↑; midazolam/fentanyl clearance ↓ (tables §5.3; Miller, hepatic) | Y |
| RH-13 | P2 | hepaticFailure · RL 2 L | 1 | lactate +0.5–1 (lactate load not cleared) | Y |
| RH-14 | P2 | hepaticFailure as cirrhosis Child C · propofol 2 mg/kg | 2 | hyperdynamic low-SVR baseline; exaggerated hypotension (Miller, liver disease) | P 2 (no cirrhosis profile) |
| RH-15 | P1 | X-A · class III → propofol / fentanyl PK | 2 | flow-limited clearance ↓ and smaller central volume: Ce ↑ 1.5–2× (Johnson 2003; audit 08 G10) | Y |
| RH-16 | P1 | X-A · sevoflurane 1 MAC 1 h | 1 | HBF ↓ ≤ 20 %, hepatic function preserved (Miller, inhaled agents) | Y |
| RH-17 | P2 | sepsis warm · 2 h | 2 | AKI stage 1–2 develops; lactate clearance ↓ (Sepsis-3; KDIGO) | Y |
| RH-18 | P3 | crush/rhabdomyolysis | 1 | K ↑, AKI, myoglobinuria | NE (7i/FU-7) |
| RH-19 | P3 | hepatorenal physiology | 1 | oliguria with normal volume (low renal perfusion) | NE (FU-7) |
| RH-20 | P2 | X-A · core 33 °C | 3 | drug clearance −7–10 %/°C; lactate clearance ↓; cold diuresis ↑ (Miller, hypothermia) | Y |
| RH-21 | P1 | X-A MANUAL · class III | 1 | UO follows MAP only (no neurohumoral arm): the design check (audit 08 Q9) | Y |
| RH-22 | P2 | sepsis warm · noradrenaline to MAP 65 → 75 | 2 | UO ↑ with MAP restoration (SEPSISPAM) | Y |
| RH-23 | P2 | X-A · glycine 3 L absorbed over 30 min (TURP) | 3 | Na → 120, osmolar gap, volume overload, bradycardia/hypertension then hypotension (Barash, TURP syndrome) | Y |
| RH-24 | P2 | AKI · creatinine over 24 h (time-scale) | 2 | KDIGO creatinine criterion; creatinine lags GFR by hours | NE (7i) |
| RH-25 | P2 | X-A · 3 % saline 250 mL | 2 | Na +2–4; UO ↑ (natriuresis) | Y |

### 5.2 ET — endocrine and thermal (`research/14-coverage-endocrine-thermal.md`)

Readouts: END (core/peripheral T, shivering, catecholamines, cortisol, glucose/insulin, MH), CIRC, LUNG (VO2/VCO2,
EtCO2), BLD (K, lactate, pH), NEU (MAC shift), PK (clearance), DEV (T1/T2). Blockers: diabetes/thyroid/adrenal exist in
the engine API but not in `pme-scenario/1` (research/11 §4.4); no hydrocortisone and no dexamethasone PD; no
phaeochromocytoma or carcinoid; coagulation is 7i.

| id | tier | context · state → timeline | cells | expected (source) | expr |
|---|---|---|---|---|---|
| ET-01 | P1 | X-A · GA 3 h, no warming, 21 °C | 2 | −1 to −1.5 °C in hour 1 (redistribution), then 0.3–0.5 °C/h, plateau at 3–4 h (Sessler, *Anesthesiology* 2000) | Y |
| ET-02 | P1 | X-A · same + forced air + fluid warmer | 1 | redistribution still −0.5 to −1; plateau near 36 (Sessler) | Y |
| ET-03 | P1 | X-E and X-C · as ET-01 | 2 | elderly: lower thresholds and slower recovery; child: faster cooling (surface/mass) (tables §1.1) | Y |
| ET-04 | P1 | X-A · neuraxial thermal state | 1 | redistribution about half of GA; shivering threshold lowered (Sessler) | Y |
| ET-05 | P1 | X-A · emergence at 34.5 °C | 4 | shivering: VO2 +200–400 %, HR/MAP ↑, SpO2 ↓ on air; EtCO2 ↑ (Miller, thermoregulation) | Y |
| ET-06 | P1 | X-A · 2 L crystalloid at 21 °C | 1 | core −0.25 °C per litre (Sessler) | Y |
| ET-07 | P1 | X-A · 6 u RBC at 4 °C, unwarmed | 1 | core −0.5 to −1 °C (ATLS) | Y |
| ET-08 | P2 | X-A · 32 °C | 3 | MAC −5 %/°C; NMB duration ↑; propofol Cp ↑; coagulopathy (Miller; Heier) | P 1 (coag 7i) |
| ET-09 | P2 | X-A · 28 °C | 3 | Osborn J waves, bradycardia 40–50, AF, VF risk; shock resistance (ERC hypothermia) | Y |
| ET-10 | P1 | MH-susceptible · sevoflurane + succinylcholine, untreated | 5 | EtCO2 doubles in 10–15 min at fixed MV; HR ↑; T +1 °C / 5–15 min; K ↑; lactate; masseter/total rigidity (MI); arrest if untreated (MHAUS; tables §7 check 21) | P 1 (rigidity) |
| ET-11 | P1 | MH · stop volatile, hyperventilate, dantrolene 2.5 mg/kg, cool | 3 | EtCO2 falls within 10–20 min; T peaks and falls; K falls (MHAUS; R48 prototype 12 min) | Y |
| ET-12 | P2 | sepsis · fever 39 °C | 3 | VO2 +10–13 %/°C; HR +10/°C; EtCO2 ↑ at fixed MV (Miller) | Y |
| ET-13 | P2 | thyroidStorm · esmolol | 3 | HR 140+, AF, hyperthermia, high CO; β-blocker controls rate (Miller, endocrine) | Y |
| ET-14 | P3 | hypothyroid profile · induction | 3 | exaggerated hypotension, bradycardia, delayed emergence, hypothermia (tables §1.5) | P 3 (API only; not in the scenario schema) |
| ET-15 | P2 | adrenal insufficiency · induction + surgery | 2 | refractory hypotension; hydrocortisone responsive (Miller) | P 1 (no hydrocortisone) |
| ET-16 | P1 | X-A · incision with fentanyl 0 / 2 / 5 µg/kg | 3 | catecholamines and cortisol ↑, glucose +1–3 mmol/L, blunted by opioid dose (Desborough 2000) | Y |
| ET-17 | P1 | X-A · 2 h surgery, non-diabetic | 1 | glucose 5.5 → 7–8 mmol/L | Y |
| ET-18 | P1 | diabetes type 1 · no insulin 4 h → insulin 0.1 u/kg/h | 3 | ketosis and glucose ↑; corrected by infusion (JBDS perioperative guideline) | P 3 (schema) |
| ET-19 | P1 | diabetes type 2 · dexamethasone 8 mg | 1 | glucose +2–4 mmol/L at 4–8 h (PADDI) | NE (dexamethasone has no PD) |
| ET-20 | P1 | X-A · insulin 10 u IV | 3 | glucose nadir at 40–60 min; K −0.5–1; adrenergic response (tables §7 prototype nadir 38 mg/dL) | Y |
| ET-21 | P2 | X-A · hypoglycaemia under GA | 2 | autonomic signs masked; tachycardia, sweating blunted; seizure risk | Y |
| ET-22 | P2 | X-A · dextrose 50 % 50 mL | 1 | glucose +3–5 mmol/L transiently | Y |
| ET-23 | P2 | dka · RSI and ventilation | 4 | Kussmaul compensation lost after intubation (pH falls unless MV high); K shifts; hypovolaemic induction response (JBDS DKA) | Y |
| ET-24 | P3 | phaeochromocytoma · tumour handling | 2 | paroxysmal hypertension 250/130, arrhythmia; hypotension after vein ligation | NE (FU-7) |
| ET-25 | P3 | carcinoid crisis | 1 | flushing, bronchospasm, hypotension; octreotide | NE (FU-7) |
| ET-26 | P2 | sepsis warm → cold · noradrenaline, vasopressin, dobutamine | 3 | cold phase: CO ↓, SvO2 ↓, lactate ↑; inotrope response (tables §5e) | Y |
| ET-27 | P1 | anaphylaxis II / III · adrenaline 50 µg repeated | 3 | MAP restored within 1–2 min per dose; bronchospasm eases; repeated doses/infusion for grade III (AAGBI 2020) | Y |
| ET-28 | P2 | SIRS vasoplegia · vasopressin 1–2 u | 2 | MAP ↑ with catecholamine sparing (tables §5e) | Y |


### 5.3 NN — neuro, NMB, depth and brain (`research/15-coverage-neuro-nmb-depth.md`)

Readouts: NEU (TOF/TOFR/PTC, T1, block AP/diaphragm, DoA index/SR, MAC, consciousness, movement, apnoea), PK (Ce),
BRN (ICP, CPP, CBF, CMRO2, PbtO2, SjvO2, pupils), LUNG (drive), CIRC, DEV (NMT/BFA tiles). Blockers: no seizure state
(only a bus flag), no opioid chest-wall rigidity, no EEG waveform.

| id | tier | context · state → timeline | cells | expected (source) | expr |
|---|---|---|---|---|---|
| NN-01 | P1 | X-A · rocuronium 0.6 mg/kg | 2 | TOF 0 at 1.5–2 min; T1 25 % at 30–40 min (tables §7 check 25; Naguib) | Y |
| NN-02 | P1 | X-A · rocuronium 1.2 mg/kg (RSI) | 1 | intubating conditions at 60 s (Miller NMB) | Y |
| NN-03 | P1 | X-A · succinylcholine 1 mg/kg | 3 | fasciculation; onset 60 s; T1 90 % at 8–10 min; K +0.5 (Miller NMB) | Y |
| NN-04 | P1 | cholinesterase heterozygous / homozygous · succinylcholine | 2 | 20–30 min / 4–8 h block (Miller) | Y |
| NN-05 | P1 | X-A · sugammadex 2 at TOF 2, 4 at PTC 1–2, 16 immediately after roc 1.2 | 3 | TOFR 0.9 at ≈ 2 / 3 / 1.5 min (Naguib; tables §7 check 25) | Y |
| NN-06 | P1 | X-A · neostigmine 50 µg/kg + glycopyrrolate at TOF 1 vs TOF 4 | 2 | ceiling effect: TOFR 0.9 in 10–15 min only from TOF 4; not from TOF 1 (Fuchs-Buder; Kopman) | Y |
| NN-07 | P2 | X-A · neostigmine at full recovery | 1 | a small fade/weakness is possible (paradoxical) (Miller) | Y |
| NN-08 | P2 | X-A · extubation at TOFR 0.6 → hypoxic challenge | 2 | upper-airway obstruction; blunted hypoxic ventilatory response (Eriksson 1993) | Y |
| NN-09 | P1 | X-A · roc 0.6 under sevoflurane 1 MAC vs TIVA | 1 | duration +20–30 % under volatile (Miller) | Y |
| NN-10 | P2 | X-A · MgSO4 4 g → roc 0.6 | 1 | faster onset, duration ↑ (tables §5d; 7f interactions) | Y |
| NN-11 | P2 | myasthenia · roc 0.3; succinylcholine 1 | 2 | roc sensitivity (ED95 ×0.1–0.5); sux resistance (ED95 ×2.6) (Miller) | Y |
| NN-12 | P3 | LEMS · roc and sux | 1 | sensitive to both | Y |
| NN-13 | P2 | burns (> 48 h) · roc 0.6 | 2 | resistance (higher dose, shorter duration); sux K (tables §5d) | Y |
| NN-14 | P3 | X-A · sugammadex under-dose → recurarisation | 1 | TOFR falls again within 10–30 min (Naguib) | Y |
| NN-15 | P1 | X-A · propofol TCI Ce 2 → 4 → 6 → 8 µg/mL | 3 | LOC at Ce 2–3; DoA 40–60 at Ce 3–5; burst suppression from Ce ≈ 6–8; MAP falls with Ce (Eleveld; BIS manual) | Y |
| NN-16 | P1 | X-A · sevoflurane 0.5 / 1.0 / 1.5 MAC + incision | 3 | movement to incision in 50 % at 1 MAC (MAC definition); DoA ↓; SR > 0 at ≥ 1.5 MAC (Miller, inhaled agents) | Y |
| NN-17 | P1 | X-A · remifentanil 0.1–0.3 + propofol | 2 | MAC reduction up to 60–70 %; movement suppressed; DoA barely changed (Lang 1996) | Y |
| NN-18 | P1 | X-A · ketamine 1 mg/kg | 3 | DoA stays high (paradox); HR/MAP ↑; drive preserved (Miller, IV anaesthetics) | Y |
| NN-19 | P2 | X-A · dexmedetomidine 1 µg/kg over 10 min | 3 | biphasic BP (↑ then ↓), bradycardia; rousable sedation; drive preserved (Miller) | Y |
| NN-20 | P2 | X-E · midazolam 0.05 + fentanyl 1 µg/kg sedation | 2 | synergistic drive depression, obstruction, desaturation on air (Bailey 1990) | Y |
| NN-21 | P1 | X-A · emergence from sevoflurane 1 MAC | 2 | eyes open at Et 0.3–0.4 MAC (MAC-awake); time by CSHT/washout (Miller) | Y |
| NN-22 | P2 | X-A · NMB + MAC 0.3 + stimulus 1 | 2 | HR/MAP ↑, DoA > 60, awareness flag; no movement (paralysed) (NAP5) | Y |
| NN-23 | P1 | X-A · fentanyl 5 µg/kg apnoea → naloxone 0.1 mg × 2 | 2 | reversal in 1–2 min; renarcotisation at 30–60 min (fentanyl outlasts naloxone) (Miller, opioids) | Y |
| NN-24 | P2 | X-A · midazolam 0.1 mg/kg → flumazenil 0.5 mg | 1 | reversal in 1–2 min; resedation possible (Miller) | Y |
| NN-25 | P1 | TBI · haematoma 1 mL/min | 3 | ICP 12 → 20 at 10–15 min → 40 at 20–25 min; Cushing (MAP ↑, HR ↓); herniation (tables §7 check 19) | Y |
| NN-26 | P1 | TBI ICP 25 · hyperventilation to 30; mannitol 0.5 g/kg; 3 % saline 250 mL; head-up 30°; propofol bolus; sevoflurane 1 vs 2 MAC; ketamine 1 mg/kg | 7 | ICP −25 %; mannitol −25–30 % at 20–40 min; HTS similar; head-up −5–7; propofol ICP ↓ with CPP risk; sevoflurane above 1 MAC raises CBF/ICP; ketamine no rise when ventilated (BTF; Miller neuro) | Y |
| NN-27 | P1 | X-E + HTN · GA at MAP 65, then PaCO2 40 → 25 | 2 | CBF ≈ 70 % from pressure, ≈ 35–40 % after hyperventilation (tables §7 check 18) | Y |
| NN-28 | P2 | X-A · PaCO2 20 → 80; PaO2 < 50 | 2 | CBF 2–4 %/mmHg PaCO2; CBF ↑ below PaO2 50 (Miller, neurophysiology) | Y |
| NN-29 | P2 | X-A · VF 5 min → ROSC | 2 | CBF 0, PbtO2 falling, SjvO2 → 0 in arrest; hyperaemia after ROSC (fixed only after FU-4 G4) | Y |
| NN-30 | P2 | X-A · bupivacaine 2 mg/kg IV (LAST) → lipid 1.5 mL/kg | 3 | CNS (seizure flag) then CV collapse/VF; lipid rescue (ASRA/AAGBI LAST) | Y |
| NN-31 | P3 | status epilepticus | 1 | CMRO2 ↑, SpO2 ↓, lactate ↑ | NE (FU-7) |
| NN-32 | P2 | X-A · remifentanil 2 µg/kg rapid bolus | 1 | chest-wall rigidity: Crs ↓, VT ↓ on BVM (Miller, opioids) | NE (FU-7) |

### 5.4 DI — drug–drug and drug–disease interactions, all classes (`research/16-coverage-drug-interactions.md`)

**Status (2026-09-28): measured.** Report: `research/14-audit-drug-interactions.md`; verdicts in §4.4.

Readouts: all systems a class moves, and a control arm for every pair (each drug alone + the pair; same sim time).
Blockers: no ACE inhibitor/ARB, opioid-tolerant, OSA or HOCM profile; no Ca-channel blockers, glucagon, nitroprusside
or clonidine; no histamine-releasing NMB (atracurium).

| id | tier | context · state → timeline | cells | expected (source) | expr |
|---|---|---|---|---|---|
| DI-01 | P1 | X-A · propofol 2 ± remifentanil 1 µg/kg | 3 | synergy: MAP fall and apnoea greater than additive (Minto; Bouillon 2004) | Y |
| DI-02 | P1 | X-A · midazolam 0.03 + propofol (co-induction) | 2 | propofol dose −20–30 %, hypotension additive (Miller) | Y |
| DI-03 | P1 | X-A awake · fentanyl 1 µg/kg + midazolam 0.05 | 2 | respiratory-depression synergy; hypoxaemia on air (Bailey 1990) | Y |
| DI-04 | P1 | betaBlocked · ephedrine 10 mg; phenylephrine 100 µg; bleed class III | 4 | ephedrine ×0.5; phenylephrine intact; HR stays < 100 in class III, SBP falls earlier (tables §7 check 17b) | Y |
| DI-05 | P2 | betaBlocked (non-selective) · adrenaline 100 µg | 1 | unopposed α: hypertension, reflex bradycardia (Miller) | Y |
| DI-06 | P2 | chronic ACEi/ARB · induction; vasopressin rescue | 2 | refractory hypotension, vasopressin-responsive (Miller) | NE (FU-7 profile) |
| DI-07 | P1 | X-A · esmolol 0.5 mg/kg + propofol induction | 1 | additive hypotension | Y |
| DI-08 | P1 | X-A · labetalol 10 mg before laryngoscopy | 1 | pressor response blunted | Y |
| DI-09 | P1 | X-A · phenylephrine infusion during propofol infusion; during neuraxial vasodilation | 2 | MAP held with reflex bradycardia; neuraxial arm NE | P 1 (neuraxial) |
| DI-10 | P1 | septic shock warm (vasoResp ↓) · noradrenaline, then + vasopressin | 2 | reduced catecholamine responsiveness; vasopressin sparing (VASST; tables §5e) | Y |
| DI-11 | P2 | rvFailure · milrinone + noradrenaline | 2 | PVR ↓, RV output ↑, SVR held by noradrenaline | Y |
| DI-12 | P2 | class III vs HFrEF · dobutamine 5 µg/kg/min | 2 | hypovolaemia: tachycardia and hypotension; HFrEF: CO +30 % (tables §7 check 20) | Y |
| DI-13 | P1 | VF; AF RVR · amiodarone 300 / 150 mg | 2 | VF shock success ↑; AF rate ↓, hypotension with rapid injection (ALS) | Y |
| DI-14 | P1 | SVT; AF; pre-excited AF · adenosine 6/12 mg | 3 | SVT terminates; AF slows transiently (reveals flutter waves); pre-excited AF may accelerate (ALS) | Y |
| DI-15 | P2 | pre-excited AF · verapamil | 1 | VF risk | NE (no Ca-channel blocker) |
| DI-16 | P2 | heart transplant · atropine | 1 | no HR response (denervated) | NE (no profile) |
| DI-17 | P1 | X-A · neostigmine with atropine vs with glycopyrrolate | 2 | atropine: early tachycardia then brady; glyco: matched onset (Miller NMB) | Y |
| DI-18 | P2 | X-A · sevoflurane + adrenaline infiltration | 1 | arrhythmia threshold high with sevoflurane (not halothane-like) | Y |
| DI-19 | P2 | X-A · sevoflurane with 66 % N2O | 1 | second-gas/concentration effect: faster FA/FI rise (Miller, uptake) | Y |
| DI-20 | P2 | pneumothorax / VAE · N2O | 1 | expansion of gas spaces | NE (MI: no N2O diffusion into spaces) |
| DI-21 | P1 | prolonged septic shock (catecholamine-depleted) · ketamine 1 mg/kg | 2 | direct myocardial depression unmasked: MAP may fall (Miller) | Y |
| DI-22 | P1 | class III · etomidate 0.3 vs propofol 2 mg/kg | 2 | etomidate preserves MAP; propofol falls 30–50 % (Miller; INTUBE) | Y |
| DI-23 | P2 | X-A · lidocaine 1.5 mg/kg IV after bupivacaine block dose | 1 | additive LA toxicity | Y |
| DI-24 | P2 | LAST · lipid emulsion | 1 | faster recovery of CV function (ASRA) | Y |
| DI-25 | P2 | MgSO4 load · calcium; Mg + nifedipine | 2 | Ca antagonises Mg; nifedipine arm NE | P 1 |
| DI-26 | P1 | hyper-K 7 · Ca, insulin–dextrose, salbutamol | 3 | Ca stabilises the membrane in 1–3 min without lowering K; insulin −0.6–1.0 in 30–60 min; salbutamol additive (UK Renal Association) | Y |
| DI-27 | P2 | lactic acidosis ventilated · NaHCO3 1 mmol/kg | 3 | PaCO2 ↑ at fixed MV; iCa ↓; small pH rise (Miller) | Y |
| DI-28 | P2 | class II · furosemide 40 mg | 1 | further hypotension (diuresis in hypovolaemia) | Y |
| DI-29 | P2 | X-A · rocuronium re-dose after sugammadex 4 | 1 | block resistance for hours (free sugammadex) (Naguib) | Y |
| DI-30 | P2 | opioid-tolerant · remifentanil | 1 | reduced analgesic and respiratory effect | NE (profile) |
| DI-31 | P1 | as severe · phenylephrine vs ephedrine after induction hypotension | 2 | phenylephrine restores CoPP; ephedrine tachycardia worsens ischaemia (Barash, valvular) | Y |
| DI-32 | P1 | HFrEF · etomidate vs propofol; + dobutamine | 2 | etomidate stable; propofol afterload fall may even raise SV; inotrope effect (Miller) | Y |
| DI-33 | P2 | rvInfarct · GTN 400 µg; fluid 500 mL | 2 | GTN MAP −20–30 %; fluid +5–10 (tables §7 check 15) | Y |
| DI-34 | P2 | ms / as · GTN | 2 | preload-dependent collapse (Barash) | Y |
| DI-35 | P3 | HOCM · vasodilator / inotrope | 1 | LVOT obstruction worsens | NE (no state) |
| DI-36 | P1 | COPD GOLD 3 · propofol + PEEP 10 at RR 20 | 2 | auto-PEEP adds to PEEP; hypotension compounded (Barash) | Y |
| DI-37 | P1 | burns / denervation / hyper-K · succinylcholine | 2 | K +3–7 → arrhythmia (Miller) | Y |
| DI-38 | P2 | AKI · morphine 10 mg | 1 | prolonged sedation/drive depression (M6G) | NE (MI: no metabolite) |
| DI-39 | P2 | TBI · ketamine 1 mg/kg ventilated | 1 | no ICP rise at constant PaCO2 (Zeiler 2014) | Y |
| DI-40 | P2 | lung bronchospasm · salbutamol neb 5 mg | 1 | bronchodilation in 5–15 min (FU-6 R2) | Y |
| DI-41 | P1 | betaBlocked · anaphylaxis III + adrenaline; + glucagon | 2 | adrenaline resistance; glucagon arm NE (AAGBI) | P 1 |
| DI-42 | P2 | X-A · morphine 10 mg IV fast (histamine) | 1 | hypotension, flushing (Miller) | Y |
| DI-43 | P2 | OSA · opioid PCA-equivalent | 1 | obstruction and desaturation | NE (profile) |
| DI-44 | P2 | X-E · propofol infusion 100 µg/kg/min 2 h | 1 | cumulative hypotension; long CSHT context (Miller) | Y |
| DI-45 | P2 | X-A · sugammadex 16 mg/kg (anaphylaxis/bradycardia) | 1 | rare marked bradycardia | NE (MI) |


### 5.5 PD — paediatric (`research/17-coverage-paediatric.md`)

Contexts X-C (4 y 16 kg), X-I (6 mo 7 kg), X-D (14 y 50 kg), X-N (neonate: NE until R22 fixes the neonatal profile).
Readouts: all, plus the age-band alarm limits (DEV). Run it **after V.1** (child CO ratio) and FU-4 G11 (patient-scaled
dead space and ventilator defaults). Blockers: the neonatal profile, no congenital heart disease, no emergence
delirium.

| id | tier | context · state → timeline | cells | expected (source) | expr |
|---|---|---|---|---|---|
| PD-01 | P1 | X-C · awake baseline | 3 | HR 80–120, RR 20–30, BP 90–110/55–70, PaCO2 38–42, EtCO2 ≈ PaCO2 − 3 (PALS; tables §1.1) | Y |
| PD-02 | P1 | X-I · awake baseline | 2 | HR 110–160, RR 30–40 (PALS) | P 1 (paediatric band approximate) |
| PD-03 | P1 | X-N · baseline | 2 | HR 100–160, RR 40–60, SpO2 ≥ 95 after transition | NE (R22) |
| PD-04 | P1 | X-C · sevoflurane 8 % inhalational induction | 3 | MAC ≈ 2.5 %; HR ↑; airway obstruction at stage 2 (Miller, paediatric) | Y |
| PD-05 | P1 | X-C · propofol 3 mg/kg IV | 2 | MAP −15–25 %; apnoea common | Y |
| PD-06 | P1 | X-C · preoxygenated apnoea | 1 | SaO2 90 % at 160 ± 31 s (Patel 1994) | Y |
| PD-07 | P1 | X-I · preoxygenated apnoea | 1 | 70–100 s | Y |
| PD-08 | P1 | X-C · hypoxaemia | 2 | bradycardia rather than tachycardia below SaO2 ≈ 60–70 % (tables §1.1 hypoxiaHrSign) | Y |
| PD-09 | P1 | X-C · laryngospasm proxy → succinylcholine 2 mg/kg + atropine 20 µg/kg | 3 | desaturation in < 60 s, bradycardia; relieved by sux (APA; Miller) | Y |
| PD-10 | P1 | X-C · succinylcholine without atropine; second dose | 2 | bradycardia/sinus arrest risk (Miller) | Y |
| PD-11 | P1 | X-C · VCV 8 mL/kg × 20 with a paediatric circuit | 2 | PaCO2 35–42 when apparatus dead space is sized (R1/R15) | Y |
| PD-12 | P1 | X-I · adult HME on the circuit | 1 | VD/VT large → hypercapnia (apparatus dead space) | Y |
| PD-13 | P1 | X-C · bleed 20 % → 30 % BV | 2 | tachycardia early, hypotension late (≥ 30 %) (ATLS paediatric) | Y |
| PD-14 | P1 | X-C · 20 mL/kg bolus | 1 | HR ↓, MAP ↑ (PALS) | Y |
| PD-15 | P1 | X-C · GA 1 h unwarmed; warming | 2 | faster cooling than adults (tables §1.1) | Y |
| PD-16 | P2 | X-C · atropine 20 µg/kg | 1 | HR +30–50 % | Y |
| PD-17 | P2 | X-C · VF: shock 4 J/kg, CPR 15:2, adrenaline 10 µg/kg | 3 | PALS algorithm responses; EtCO2 during CPR | Y |
| PD-18 | P2 | X-C · bronchospasm → salbutamol | 2 | as adult, higher RR and faster desaturation (after FU-6 R2) | Y |
| PD-19 | P2 | X-C · rocuronium 0.6; sugammadex 2 | 2 | onset ≈ 1 min, shorter duration than adult (Miller, paediatric) | Y |
| PD-20 | P2 | X-C · propofol TCI (Eleveld child) | 1 | Cp/Ce per the model; higher dose per kg | Y |
| PD-21 | P2 | X-C · fentanyl 2 µg/kg | 1 | apnoea/drive depression; brady | Y |
| PD-22 | P2 | X-C · emergence delirium | 1 | agitation on emergence from sevoflurane | NE (FU-7) |
| PD-23 | P1 | X-C, X-I · monitor age band | 2 | paediatric alarm limits and NIBP cuff pressures (research/06 §5) | Y |
| PD-24 | P2 | X-D · baseline + propofol induction | 2 | adult-like with adolescent HR (tables §1.1 adds the band) | Y |
| PD-25 | P2 | X-C · 6 h fast | 1 | glucose falls faster than adults; ketosis | Y |
| PD-26 | P2 | TBI in X-C | 2 | CPP target 40–50 (age); ICP thresholds (BTF paediatric) | Y |
| PD-27 | P3 | X-N · neonatal RDS; PDA shunt | 2 | — | NE (R22) |
| PD-28 | P2 | X-C · MH (sevoflurane + sux) | 1 | as adult, faster rise per kg | Y |
| PD-29 | P2 | X-C · caudal bupivacaine 3 mg/kg intravascular | 1 | LAST (VF/arrest); lipid 1.5 mL/kg | Y |
| PD-30 | P2 | X-I · tetralogy spell | 1 | R→L shunt ↑, desaturation; phenylephrine/volume | NE (no congenital heart disease) |

### 5.6 OB — obstetric (`research/18-coverage-obstetric.md`)

The run's first pass writes 7j's acceptance cells: expected responses and sources for every cell, and a measurement
of whatever exists today (the `pregnancy` lung row, generic bleed, Mg, aspiration, airway obstruction). The second
pass runs at the 7j gate. Readouts: CIRC, LUNG, BLD, COAG, NEU, END, OBS, DEV (CTG). Blockers: everything in
research/11 §3 C.

| id | tier | context · state → timeline | cells | expected (source) | expr |
|---|---|---|---|---|---|
| OB-01 | P1 | X-P · term baseline supine vs tilted | 6 | CO +40 %, HR +15, SVR −25 %, BV +45 %, Hb 11.5–12, PaCO2 30–32, VO2 +20 % (Soma-Pillay 2016; tables §1.4) | P 5 (lung only) |
| OB-02 | P1 | X-P · supine → 15° left tilt | 2 | supine CO −25 %; tilt restores CO +15–25 %, MAP +10–15 in 1–2 min (tables §7 check 22) | NE (7j) |
| OB-03 | P1 | X-P · spinal to T4 for CS; phenylephrine 25–50 µg/min prophylaxis | 4 | MAP −25–35 % in 3–5 min without vasopressor; HR ↑ (brady 10 % Bezold–Jarisch); infusion holds MAP (Kinsella 2018 consensus) | NE (7j) |
| OB-04 | P1 | X-P · high/total spinal | 3 | bradycardia, hypotension, apnoea, LOC; rescue with airway + vasopressors (OAA) | NE (7j) |
| OB-05 | P1 | X-P · GA for CS (RSI propofol/thiopental + roc/sux) | 4 | desaturation to 90 % at 2.5–4 min; PaCO2 target 30–32; MAC −25–40 %; pressor response to laryngoscopy (tables §7 check 23; OAA/DAS) | P 3 |
| OB-06 | P1 | X-P · failed intubation → CICO | 2 | rapid desaturation; bradycardia (OAA/DAS 2015) | P 1 |
| OB-07 | P1 | X-P · aspiration at induction | 1 | shunt/bronchospasm (lung `aspiration`) | Y |
| OB-08 | P1 | X-P · oxytocin 5 u bolus vs 3 u slow vs infusion | 3 | bolus: SVR ↓ with MAP −30 %, HR ↑, ST changes; slow dose milder (Thomas 2007) | NE (no uterotonic) |
| OB-09 | P2 | X-P · carbetocin 100 µg | 1 | similar, milder hypotension | NE |
| OB-10 | P2 | X-P · ergometrine 500 µg | 2 | hypertension, vasospasm; contraindicated in pre-eclampsia | NE |
| OB-11 | P2 | X-P · carboprost 250 µg IM | 2 | bronchospasm, hypertension, hypoxaemia | NE |
| OB-12 | P1 | X-P · atony PPH 1.5 → 2.5 L; uterotonic response | 4 | tachycardia appears late (large BV); SBP falls after ≈ 1.5 L; bleeding slows with tone (RCOG Green-top 52) | P 2 (bleed exists) |
| OB-13 | P1 | X-P · PPH + massive transfusion + fibrinogen | 3 | Fib < 2 g/L predicts severe PPH; FIBTEM A5 < 12 → fibrinogen (Collins 2014) | NE (7i) |
| OB-14 | P1 | pre-eclampsia severe · labetalol/hydralazine; MgSO4 4 g; laryngoscopy | 5 | BP 170/110 → target < 160/110; Mg 2–3.5 mmol/L; exaggerated pressor response (NICE NG133) | NE (7j) |
| OB-15 | P2 | eclampsia · seizure → Mg | 2 | seizure, hypoxaemia, aspiration | NE |
| OB-16 | P2 | X-P · Mg toxicity (5 mmol/L) → Ca gluconate | 3 | loss of reflexes > 5, respiratory depression > 6, NMB potentiation; Ca reverses | P 2 (Mg + NMB exist) |
| OB-17 | P2 | HELLP | 2 | platelets < 100, LFTs ↑, haemolysis | NE (7i/7j) |
| OB-18 | P2 | amniotic fluid embolism | 4 | hypoxaemia, RV failure → LV failure, arrest, DIC (UKOSS) | NE |
| OB-19 | P2 | maternal arrest · perimortem CS at 4–5 min | 2 | CPR ineffective supine; delivery relieves aortocaval compression (RCUK) | NE |
| OB-20 | P1 | X-P · maternal hypotension / hypoxaemia / tachysystole → fetus | 4 | late decelerations, reduced variability, fetal bradycardia (NICE CTG; FIGO) | NE (7j) |
| OB-21 | P2 | X-P · terbutaline 250 µg SC | 2 | maternal tachycardia, hypokalaemia, hyperglycaemia | NE |
| OB-22 | P2 | X-P · epidural test dose (adrenaline 15 µg IV) | 1 | HR +10 within 60 s | NE (neuraxial) |
| OB-23 | P2 | X-P · epidural top-up for CS | 1 | slower, milder hypotension than spinal | NE |
| OB-24 | P2 | X-P + obese · GA | 1 | desaturation < 2 min; difficult ventilation | NE |
| OB-25 | P2 | X-P + ms · labour tachycardia; fluid | 2 | LAP ↑ → pulmonary oedema; β-blocker helps (ESC pregnancy) | P 1 |


### 5.7 CM — comorbidity profiles (`research/19-coverage-comorbidity.md`)

A standard battery per profile, graded **against the healthy reference cell at the same sim time**. The battery:
(a) awake baseline, (b) induction, (c) laryngoscopy stimulus, (d) vasopressor rescue, (e) bleed 1 L, (f) PEEP 10,
(g) emergence; each profile runs only the items that change the answer. Readouts: all. Blockers: no CKD, cirrhosis,
OSA, diabetic autonomic neuropathy or pacemaker-dependent profile; the diabetes profile is not in the scenario schema.

| id | tier | context · state → timeline | cells | expected (source) | expr |
|---|---|---|---|---|---|
| CM-01 | P1 | X-E (80 y) · a, b (propofol 1.5), d, e; PK; apnoea | 6 | lower MAP set point reset, induction −30–45 %, slower onset (Ce peak later), dose −30–50 % for the same Ce (Reich 2005; Eleveld age term); apnoea to 90 % shorter (FRC/CC) | Y |
| CM-02 | P1 | X-O (BMI 41) · a, b, VCV by PBW vs TBW, PEEP 10 + RM, reverse Trendelenburg | 5 | CO ↑ and BV/kg ↓; PBW-based VT keeps Pplat lower; PEEP + RM raises PaO2; reverse Trendelenburg improves FRC (Pelosi; tables §1.3) | P 1 (position) |
| CM-03 | P1 | htn untreated/treated · a, b, c, CBF at MAP 65 | 4 | larger induction fall, exaggerated pressor response, CBF lower limit shifted +15–20 (tables §1.5; Miller, HTN) | Y |
| CM-04 | P1 | cad 3-vessel / recent MI · HR 110 (stimulus); phenylephrine vs ephedrine; bleed 1 L; esmolol | 4 | ST ↓ ≥ 1 mm when demand exceeds CFR supply; ischaemia worsens with tachycardia; esmolol relieves (tables §3; §7 check 10) | Y |
| CM-05 | P1 | as severe (+ cad + htn) · b; AF onset; phenylephrine; GTN | 4 | induction MAP 103 → 60–65, ST ↓, Ees ↓ ≥ 25 %; AF loses atrial kick (SV −20–30 %); phenylephrine rescues; GTN harms (tables §7 check 10) | Y |
| CM-06 | P1 | hfref (EF 30 %) · a, b (etomidate vs propofol), fluid 500 mL, dobutamine, afterload reduction | 5 | afterload-sensitive SV; fluid raises PAWP → oedema; dobutamine CO +30 % (tables §1.5; §7 check 20) | Y |
| CM-07 | P1 | copd GOLD 3 · a (PaCO2 45–50, HCO3 ↑), induction + ventilation, FiO2 1 awake, bronchospasm, extubation | 5 | chronic hypercapnia; auto-PEEP; O2-induced hypercapnia (+5–20 mmHg); post-extubation failure risk (tables §1.5; GOLD) | Y |
| CM-08 | P2 | aki proxy for CKD 5 / dialysis · K 5.5, Hb 10, HCO3 20; roc; fluid; sux | 5 | baseline chemistry (tables §1.5 ckd); prolonged roc; fluid overload; sux K +0.5 | P 2 (no CKD profile) |
| CM-09 | P2 | diabetes type 2 ± autonomic neuropathy · a, b, stress glucose, aspiration risk | 4 | fixed HR 90–100; exaggerated induction hypotension (G_v ×0.3); glucose 8–12 under stress (tables §1.5 dan) | P 3 (dan; schema) |
| CM-10 | P2 | hepaticFailure as cirrhosis Child C · a, b, albumin 25, INR, IAP (ascites), glucose | 5 | hyperdynamic low SVR, low COP, prolonged drug effect, hypoglycaemia | P 3 (proxy) |
| CM-11 | P2 | asthma poorly controlled · intubation; sevoflurane | 2 | bronchospasm at intubation (reactivity 0.1–0.2); sevo bronchodilation (tables §1.5) | P 1 (no reactivity model) |
| CM-12 | P2 | OSA severe · opioid; extubation | 2 | obstruction at DoA < 90; opioid C50 ×0.6 (tables §1.5 osa) | NE (profile) |
| CM-13 | P1 | ph severe / rvFailure · induction; hypercapnia; noradrenaline vs phenylephrine; iNO | 4 | RV ischaemia spiral after induction; PaCO2 ↑ raises PVR; noradrenaline preferred; iNO arm NE (tables §1.5 ph; Barash PH) | P 1 |
| CM-14 | P2 | ms severe · HR 110; esmolol | 3 | LAP ↑ with HR (diastolic time), pulmonary oedema; rate control relieves (ACC/AHA 2020) | Y |
| CM-15 | P2 | AF permanent · induction; amiodarone/esmolol for RVR | 2 | rate-dependent SV; rate control improves MAP (tables §1.5 af) | Y |
| CM-16 | P2 | pacemaker-dependent · diathermy; loss of capture | 2 | underlying CHB 30–35 or asystole; magnet → asynchronous | NE (profile) |
| CM-17 | P3 | smoker (COHb 8 %) · baseline | 1 | SpO2 over-reads by ≈ COHb; CaO2 ↓ (tables §1.5 smoker) | Y |
| CM-18 | P2 | chronic anaemia Hb 8 · bleed 1 L; transfusion trigger | 2 | earlier lactate rise, DO2 ↓; RBC restores (tables §1.5 anaemia) | Y |

### 5.8 DV — devices, pacing, defibrillation, CPR (`research/20-coverage-devices.md`)

Run **after FU-4** (arrest pathway, CPR model, CoPP) and FU-5 (alarm handling). Readouts: RHY, CIRC (CoPP, CO), LUNG
(EtCO2), BRN, DEV (device state, alarms, INOPs, audio). Blockers: no ICD, ECMO, pacemaker magnet, electrosurgical
interference with pacing, or pericardiocentesis.

| id | tier | context · state → timeline | cells | expected (source) | expr |
|---|---|---|---|---|---|
| DV-01 | P1 | VF · shock 150/200 J biphasic | 3 | termination; post-shock rhythm (asystole/PEA/organised); ROSC probability rises with CoPP and early shock (ERC/AHA ALS) | Y |
| DV-02 | P1 | VF · CPR quality 1 / 0.4 | 3 | CoPP 15–25 in good CPR (Paradis 1990); EtCO2 10–20 (> 20 at ROSC); poor CPR halves both | Y |
| DV-03 | P1 | exsanguination · CPR alone | 1 | no pulse returns without volume (FU-4 ruling 1) | Y |
| DV-04 | P1 | tamponade PEA · CPR; drainage | 2 | CPR ineffective until drained; drainage restores output | P 1 (no pericardiocentesis) |
| DV-05 | P1 | asystole · adrenaline 1 mg q 3–5 min | 2 | CoPP ↑; ROSC rare (ALS) | Y |
| DV-06 | P1 | AF / flutter / VT with pulse · synchronised 120–200 / 50–100 / 100 J | 3 | conversion rates by rhythm; sync marker on R (ALS) | Y |
| DV-07 | P2 | AF · unsynchronised shock | 1 | R-on-T → VF risk | Y |
| DV-08 | P1 | CHB 30 · transcutaneous pacing | 3 | capture at 40–80 mA; electrical ≠ mechanical capture (check the pulse); pain under light sedation (ALS) | Y |
| DV-09 | P2 | TCP failure to capture / sense | 2 | no mechanical beats; competitive pacing | Y |
| DV-10 | P2 | VVI/DDD implanted · failure to capture/sense; oversensing | 3 | escape or asystole; inhibition by EMI arm NE | P 1 |
| DV-11 | P2 | pacemaker · magnet | 1 | asynchronous at the magnet rate | NE |
| DV-12 | P2 | ICD · VT/VF therapy; ATP | 2 | ATP bursts, internal shock | NE (7h) |
| DV-13 | P1 | cardiogenic shock · IABP 1:1 correct timing | 3 | augmentation > SBP; assisted EDP −15–20; CO +0.5–1 L/min; PAWP −20 % (tables §8.1) | Y |
| DV-14 | P2 | IABP · early/late inflation; early/late deflation | 4 | the four timing-error waveforms and their haemodynamics (tables §8.1) | Y |
| DV-15 | P2 | IABP · 1:2; AF; arrest (internal trigger) | 2 | assisted/unassisted beats side by side; trigger loss alarms | Y |
| DV-16 | P2 | LVAD 5400 rpm · baseline monitoring | 4 | PP 10–20, NIBP often fails, SpO2 unreliable; flow 4–6; power 4–5 W (tables §8.2) | Y |
| DV-17 | P2 | LVAD · hypovolaemia → suction | 3 | flow ↓, PI spike then fall, ectopy/VT (tables §8.2) | Y |
| DV-18 | P2 | LVAD · RV failure; hypertension | 2 | flow falls with afterload; RV failure limits LVAD preload | Y |
| DV-19 | P3 | LVAD · pump thrombosis | 1 | power ≥ 10 W, flow estimate spuriously high | Y |
| DV-20 | P3 | ECMO VA / VV · flow, sweep, differential hypoxaemia, recirculation | 4 | tables §8.5 rows | NE (7h) |
| DV-21 | P1 | defibrillator state and audio | 2 | charge time, READY, SYNC markers, shock artefact (vendor) | Y |
| DV-22 | P2 | CPR pauses for rhythm check; ROSC | 2 | EtCO2 jump ≥ 10 at ROSC; pause artefacts | Y |
| DV-23 | P2 | CPR artefact on ECG/SpO2/ART | 2 | compression artefact; SpO2 "?"; PR = compression rate (audit 10) | Y |
| DV-24 | P2 | hypothermic VF 28 °C · shocks | 2 | shock-resistant below 30 °C; rewarm (ERC) | Y |
| DV-25 | P2 | hyper-K arrest · Ca, shock | 2 | Ca and K lowering before shocks succeed (ERC special circumstances) | Y |
| DV-26 | P2 | asphyxial arrest · ventilation first | 2 | oxygenation restores rhythm in hypoxic brady/PEA (ERC) | Y |


### 5.9 SP — surgical stimuli and positioning (`research/21-coverage-stimuli-positioning.md`)

Readouts: CIRC, NEU (movement, DoA), END (stress hormones), LUNG (Crs, FRC, V/Q, EtCO2), BRN (MAP at head, ICP),
KID, BLD, DEV. Blockers: the only stimulus is one `stimulus` intensity; no vagal surgical events, tourniquet,
cross-clamp, cement, CO2 absorption from pneumoperitoneum, or positions other than head-up; no CPB.

| id | tier | context · state → timeline | cells | expected (source) | expr |
|---|---|---|---|---|---|
| SP-01 | P1 | X-A · laryngoscopy + ETT: no opioid / fentanyl 2 / remifentanil 0.5 / lidocaine 1.5 / esmolol 0.5 | 5 | MAP +20–30 %, HR +20 without opioid; dose-dependent blunting (Miller, airway; Kovac 1996) | Y |
| SP-02 | P1 | X-A · incision at 1.0 MAC vs 0.6 MAC + remifentanil | 2 | movement 50 % at 1 MAC; HR/MAP ↑ 10–20 % | Y |
| SP-03 | P1 | X-A · sternotomy/sternal spread | 1 | intense pressor response (stimulus 1.5) | Y |
| SP-04 | P1 | X-A · SGA insertion vs ETT | 1 | smaller pressor response | Y |
| SP-05 | P1 | X-A · extubation (cough, hypertension) | 1 | MAP/HR +15–25 % | Y |
| SP-06 | P1 | X-A · peritoneal traction; mesenteric traction | 2 | vagal bradycardia/asystole; flushing and hypotension (mesenteric traction syndrome) | NE (no vagal event) |
| SP-07 | P2 | X-C · oculocardiac reflex | 1 | sinus bradycardia/asystole on traction; atropine | NE |
| SP-08 | P1 | X-A · pneumoperitoneum 12–15 mmHg | 5 | IAP → SVR ↑, CO −10–30 %; Crs −30–50 %, Ppeak ↑; EtCO2 +5–10 (absorption); UO ↓ (Barash, laparoscopy) | P 1 (CO2 absorption) |
| SP-09 | P2 | X-A · insufflation vagal reflex | 1 | bradycardia/asystole on rapid insufflation | NE |
| SP-10 | P2 | X-A · CO2 embolism; subcutaneous emphysema | 2 | EtCO2 ↑ then ↓, "mill-wheel", SpO2 ↓ (VAE lung row partly) | P 1 |
| SP-11 | P1 | X-A · steep Trendelenburg 30° | 4 | CVP ↑, ICP ↑, FRC ↓, Crs ↓, ETT migration toward endobronchial | NE (position) |
| SP-12 | P1 | X-A · beach-chair / reverse Trendelenburg | 3 | MAP at head = arm MAP − 0.77 mmHg/cm; cerebral desaturation risk; NIBP site matters | P 2 (head-up exists for ICP only) |
| SP-13 | P2 | ARDS · prone | 3 | PaO2 ↑ (V/Q), Crs ~, IAP ↑ if abdomen compressed (PROSEVA physiology) | NE |
| SP-14 | P2 | X-A · lateral decubitus; + OLV | 3 | V/Q mismatch (non-dependent ventilation, dependent perfusion); OLV PaO2 150–250 (catalogue §22) | NE (posture; audit 09 R13) |
| SP-15 | P2 | X-A · lithotomy leg-up and leg-down | 2 | autotransfusion ≈ 300 mL; hypotension on leg-down | NE |
| SP-16 | P2 | X-A · tourniquet 60 min → release | 4 | late hypertension; release: EtCO2 +5–10, K ↑, lactate ↑, MAP ↓, core T ↓ | NE (event) |
| SP-17 | P2 | X-E + cad · aortic cross-clamp infrarenal/suprarenal → unclamp | 4 | afterload ↑, LV strain/ischaemia; unclamping hypotension, acidosis, K ↑ (Barash, vascular) | NE (event) |
| SP-18 | P2 | X-E · cemented hemiarthroplasty | 2 | BCIS: hypoxaemia, hypotension, PH, arrest in grade 3 (fatEmbolism lung row partly) | P 1 |
| SP-19 | P1 | X-A · surgical bleeding: sudden 1 L/min vs ooze 20 mL/min | 2 | different reflex/fluid-shift time courses (ATLS) | Y |
| SP-20 | P2 | X-A · sitting craniotomy VAE (lung `vae`); N2O on/off | 3 | EtCO2 ↓, PAP ↑, SpO2 ↓, CO ↓; N2O worsens (Miller, neuro) | P 1 (N2O expansion) |
| SP-21 | P2 | X-E · carotid sinus manipulation | 1 | bradycardia, hypotension | NE |
| SP-22 | P2 | X-A · low-CVP liver resection (head-up tilt, GTN) | 1 | CVP < 5, blood loss ↓ | NE (tilt) |
| SP-23 | P2 | X-A · OLV onset; PA clamp (pneumonectomy) | 2 | shunt falls after clamping; RV afterload ↑ | P 1 |
| SP-24 | P3 | cardiac surgery · CPB on/off | 1 | — | NE (7h) |
| SP-25 | P3 | X-A · diathermy: ECG artefact; pacemaker inhibition | 2 | artefact shown; PM inhibition arm NE | P 1 |
| SP-26 | P1 | X-A · stimulus ends at closure | 1 | MAP falls when stimulus stops at unchanged depth | Y |

### 5.10 BF — blood, fluids, electrolytes, acid–base, transfusion and coagulation baseline (`research/22-coverage-blood-fluids.md`)

Added by this design because no other run owns 7c's space and 7i starts from it. Readouts: BLD, COAG (7i), CIRC, RHY,
KID, LUNG (EVLWI), DEV (lab panel). Blockers: coagulation (7i), temperature-corrected gases, albumin-bound drug
fractions.

| id | tier | context · state → timeline | cells | expected (source) | expr |
|---|---|---|---|---|---|
| BF-01 | P1 | X-A · 0.9 % saline 2 L vs Plasma-Lyte 2 L | 2 | Cl +5, BE −2 vs ≈ 0 (Stage 7c prototype; Kellum) | Y |
| BF-02 | P1 | X-A awake vs GA vs class III · 1 L crystalloid | 2 | intravascular retention 20–30 % at 30 min; more under GA/hypovolaemia (context-sensitive; Hahn) | Y |
| BF-03 | P1 | class II · albumin 5 % / gelatin 500 mL | 2 | volume effect 80–100 % | Y |
| BF-04 | P1 | X-A · 1 u RBC | 1 | Hb +1 g/dL | Y |
| BF-05 | P1 | class IV · 10 u RBC + FFP 1:1 + platelets | 5 | iCa ↓ (citrate), K ↑ (storage), T ↓, acidosis; dilutional coagulopathy (NE) (massive transfusion literature) | P 1 (7i) |
| BF-06 | P1 | iCa 0.9 · CaCl2 1 g | 2 | iCa +0.2–0.3; MAP ↑ in hypocalcaemia | Y |
| BF-07 | P1 | hyper-K 6.5 / 7.5 / 8.5 (profile and acute) | 3 | peaked T → wide QRS → sine wave → VF/asystole from 8–9; conduction block (UK RA; re-measure after FU-4 G3) | Y |
| BF-08 | P1 | hyper-K 7.5 · Ca, insulin–dextrose, salbutamol, NaHCO3, furosemide | 4 | K −0.6–1.0 (insulin) −0.5–1.0 (salbutamol) in 30–60 min; Ca reverses ECG within minutes | Y |
| BF-09 | P2 | hypo-K 2.5 | 2 | U waves, ectopy, NMB potentiation | Y |
| BF-10 | P2 | hypo-Mg; torsades · MgSO4 2 g | 2 | torsades terminates (7g hook) | Y |
| BF-11 | P2 | X-A · hypo-Na 120 (glycine/water) | 2 | osm ↓; CNS signs (MI) | P 1 |
| BF-12 | P2 | X-A · 7.5 % saline 250 mL | 1 | Na +4–6 | Y |
| BF-13 | P1 | lactic acidosis (shock) · NaHCO3 1 mmol/kg | 3 | PaCO2 ↑, iCa ↓, transient pH ↑ | Y |
| BF-14 | P2 | X-A · 5 L saline | 1 | hyperchloraemic acidosis, BE −5 | Y |
| BF-15 | P2 | metabolic alkalosis (vomiting) | 2 | compensatory hypoventilation PaCO2 +0.7/HCO3 | P 2 (no alkali-loss event) |
| BF-16 | P1 | acute vs chronic hypercapnia | 2 | HCO3 +1 vs +3.5 per 10 mmHg (Boston rules) | Y |
| BF-17 | P1 | X-A · hyperventilation PaCO2 25 | 3 | iCa ↓, K ↓, CBF ↓ | Y |
| BF-18 | P2 | X-A awake · acute isovolaemic Hb 7 | 2 | HR +10–20, CO ↑ (Weiskopf 1998; audit 09 R11) | Y |
| BF-19 | P2 | X-A · acute normovolaemic haemodilution | 1 | DO2 maintained by CO ↑ | Y |
| BF-20 | P2 | sepsis capillary leak · fluids 30 mL/kg | 2 | EVLWI ↑, PaO2 ↓; transient MAP gain (tables §5e) | Y |
| BF-21 | P2 | mr severe / hfref · 1.5 L crystalloid | 3 | PAWP 15 → > 25; EVLWI > 10; SpO2 96 → 89–92 (tables §7 check 11) | Y |
| BF-22 | P2 | albumin 20 g/L | 3 | COP ↓, oedema threshold ↓, AG correction; free-drug fraction (MI) | P 1 |
| BF-23 | P3 | methaemoglobinaemia · methylene blue | 1 | MetHb ↓ | NE (no drug) |
| BF-24 | P1 | bleeding · TXA 1 g | 1 | reduced fibrinolysis (LY30 ↓) | NE (7i) |
| BF-25 | P1 | dilution 1.5 BV; 33 °C + pH 7.1 | 5 | INR/aPTT ↑, fibrinogen < 1.5, platelets < 100, ROTEM CT/A10 changes | NE (7i) |
| BF-26 | P1 | coagulopathy · fibrinogen concentrate / cryo / PCC / platelets | 4 | targeted correction by FIBTEM/EXTEM | NE (7i) |
| BF-27 | P2 | X-A · heparin 300 u/kg → protamine | 3 | ACT > 480; protamine hypotension/PH | NE (7i) |
| BF-28 | P2 | sepsis / AFE · DIC | 2 | platelets ↓, fibrinogen ↓, D-dimer ↑ | NE (7i) |
| BF-29 | P1 | low CO · ABG vs VBG | 2 | PvCO2 − PaCO2 > 6 in low flow; SvO2 ↓ | Y |
| BF-30 | P1 | any · ABG sent at t, result at t + turnaround | 1 | the result reflects the draw time (7c) | Y |
| BF-31 | P2 | 32 °C · α-stat report | 1 | uncorrected vs temperature-corrected values | NE (7i) |


### 5.11 Totals

| run | scenarios | cells | P1 | P2 | P3 | not expressible today |
|---|---|---|---|---|---|---|
| RH renal/hepatic | 25 | 54 | 15 | 37 | 2 | 7 |
| ET endocrine/thermal | 28 | 66 | 34 | 26 | 6 | 13 |
| NN neuro/NMB/depth | 32 | 68 | 41 | 24 | 3 | 2 |
| DI drug interactions | 45 | 75 | 41 | 33 | 1 | 13 |
| PD paediatric | 30 | 52 | 31 | 19 | 2 | 7 |
| OB obstetric | 25 | 66 | 41 | 25 | 0 | 58 |
| CM comorbidity | 18 | 65 | 37 | 27 | 1 | 15 |
| DV devices | 26 | 61 | 22 | 34 | 5 | 9 |
| SP stimuli/positioning | 26 | 59 | 27 | 29 | 3 | 35 |
| BF blood/fluids/acid–base | 31 | 70 | 42 | 27 | 1 | 22 |
| **new cells** | **286** | **636** | **331** | **281** | **24** | **181** |
| audits 08/09/10 (measured) | — | 201 | 154 | 45 | 2 | 0 |
| **matrix** | | **837** | **485** | **326** | **26** | **181** |

The NE column is a work list in itself:
- **7j:** 58 cells (all OB, including its coagulation cells).
- **Posture and surgical events:** 35 cells (SP and CM-02; a FU-7 "surgical events and posture" stage).
- **Profiles missing from the engine or the scenario schema:** 34 cells (CKD, cirrhosis, OSA, diabetic autonomic
  neuropathy, pacemaker-dependent, ACEi, opioid-tolerant, heart transplant, HOCM, neonate/congenital heart disease,
  bronchial reactivity; diabetes and thyroid in `pme-scenario/1`).
- **7i:** 21 cells outside OB (coagulation, creatinine, α-stat, rhabdomyolysis).
- **Other missing mechanisms or states (FU-7):** 15 cells (rigidity, phaeochromocytoma, carcinoid, seizures, N2O
  space expansion, active metabolites, alkali loss, protein binding, emergence delirium, hepatorenal).
- **Devices (7h):** 10 cells (ICD, ECMO, magnet, CPB, pericardiocentesis).
- **Missing drugs:** 7 cells (hydrocortisone, dexamethasone PD, Ca-channel blockers, glucagon, methylene blue, iNO).
- **Neuraxial outside obstetrics:** 1 cell.

---

## 6. Runner pattern (reuse of 08/09/10)

The three existing harnesses share one shape. The coverage runs should use a common library copied (not imported)
into each run's `audit-scripts/`, so each run stays reproducible on its own commit.

| piece | origin | what to reuse / change |
|---|---|---|
| engine load | `08-audit-scripts/runner.ts` (`PME_ENGINE` path to a detached worktree's `packages/engine-core/src/index.ts`, `hooks.mjs` JSON attribute shim) | keep. `research/11-inventory-scripts/hooks.mjs` adds a `@pme/*` → `packages/*/src` resolver, so a run can also import main read-only without `pnpm install` in a worktree |
| scenario type | `Scenario {name, title, mode, patient, steps: [t, body \| poke, label][], tEnd, printEvery, truthHz}` and the `A.*` command builders (drug, infusion, vap, bleed, fluid, cond, lung, vent, ett, transfusion, cpr, mode) | extend `A.*` with every event in research/11 §2.15: position, renal, brain, stimulus, thermal7e, metabolic, lab, airway, preoxygenate, recruit, mainstem, pacer, defib, iabp, lvad, tof/depth, neuroProfile, tci |
| cell spec | new | `CellSpec {id, tier, context, stateSteps, interventionSteps, controlSteps, window, expected: [{sys, key, kind: 'band' \| 'direction' \| 'event' \| 'quiet', lo?, hi?, dir?, byS?, source}], owner}` — one scenario emits several cells |
| sampling | 08 `sample()` every 5 s from `e.st` (hemo/resp/blood/organs/endo/pk); 09 fine 0.1 s sampling for peak pressures and breath-level capture; 10 `measurement`/`alarm`/`alarmStatus` event capture per skin | one `Row` superset keyed by the inventory paths (research/11 §2). Prefer the public `truth` event (`truthHz: 1`) and `measurement` events over `e.st`; use `e.st` only for keys the truth tree prunes, and pin those per commit (the 08 runner broke on renamed internals before) |
| control arm | 08 §K "minus a no-drug control at the same sim time"; 08 `whatif.ts` state pokes (audit-only seams) | automatic: each cell with an intervention runs its control; pokes stay allowed only for mechanism probes and are labelled as such |
| grading | by hand in 08/09/10 | `grade(cell, rows)`: band → PL/TW/TS by direction; `event` (arrest, rhythm change, apnoea, alarm) → WR if absent or present when it must not be; `quiet` → WR if outside tolerance; rejected command → NE with the engine's reason; absent readout key → MI (checked against the inventory). The human auditor confirms every WR/MI and writes the mechanism |
| outputs | `results/<scenario>.json`, `out/tables.txt`, `summarize.ts`, `matrix.ts` (08), `shots.e2e.ts` (10, Playwright screenshots per skin) | keep all four; add `out/cells.json` (one record per §2.1 cell) and `out/matrix.md` (the run's rows in the §4 table format) so the orchestrator can merge them into this file's status tables |
| modes and skins | 08 MODELED + MANUAL; 10 per-skin suffixes | MANUAL for the P1 haemodynamic cells and every arrest cell; per-skin only for DEV readouts (philips-like, mindray-like, saadat-like) |
| determinism | seed 7 everywhere | keep; stochastic cells (sux vagal events, defibrillation success, laryngospasm) run 3 seeds and report the proportion |
| runtime | 08 ≈ 5 min / 72 scenarios; 09 similar; 10 ≈ 1 min | the 90-min budget holds with ≤ 45 scenarios × ≤ 60 sim-min at ≈ 10× real time; long courses (AKI, hypothermia, DKA) use the organ time-scale (`renal.timeScale`) where the engine offers it, or are split |

**Procedure per run** (the audit brief the orchestrator hands each agent):
1. Read this file's run section, research/11 §2–§3, and the rulings R45, R53 and R54.
2. Pin the commit (worktree from `origin/main`). Verify every command in the scenario list is accepted, or mark the
   cell NE with the rejection reason.
3. Run the P1 cells first, then P2, then P3. Save as you go: one JSON per cell.
4. Grade. For every WR/MI/TW/TS/IN, find the code path (file:line) and write the smallest physiological mechanism
   (R45: no widened bands, no multipliers without a mechanism).
5. Write the report in the 08/09/10 structure: headline; method and rig; results by family; ranked gaps; mechanism per
   gap; calibrated tests moved; proposed scripted suite (the owner's acceptance cells); questions for Ali.
6. Append the run's rows to `12-coverage-matrix.md` §4 (the orchestrator merges them) and flip the cells' verdicts from
   NM.

---

## 7. How the matrix is kept

- **Gate rule (R54).** FU-4, FU-5, FU-6 and every later physiology stage list in their gate note the matrix cells they
  own. They re-measure those cells on the merged branch with the run's scripts and show the verdict change. A stage
  that turns a PL cell into anything else must explain it.
- **Owned-cell map for the open stages**:
  - **FU-4:** A08 G1–G15 cells, A09-A*/VD (R1), A10-B1/B3/D6, and the arrest cells of DV and BF-07.
  - **FU-5:** A10 M-cells, the DEV readouts of every run.
  - **V.1:** A08-E1, A09-F4, A09-B5*.
  - **FU-6:** A09 R2–R15 cells, and the LUNG cells of NN-08, PD-11/12 and CM-07.
  - **7i:** B-gap cells and the NE cells of BF, RH-24, ET-08, OB-13/17.
  - **7k:** research/11 §3 A.
  - **7j:** OB.
  - **S9:** DEV label cells, against the research/11 glossary.
- **Regression.** Audits 08/09/10 re-run at every physiology gate (their scripts take ≈ 10 min together). The matrix's
  §4 verdict columns get a dated column per re-run rather than being overwritten.
- **Growth.** A new condition, drug or device adds its cells here in the same PR. At minimum it adds its P1 cells: the
  state alone, the first-line treatment, the classic hazard, and the reference-context "quiet" cell.

---

## 8. Questions for Ali (the matrix's own)

1. **Scope of "human".** Should the matrix grade the P3 exam-critical states (phaeochromocytoma, carcinoid, AFE,
   HOCM, CPB) now, or park them until 7j/7h? The design keeps them as designed-but-NE cells so the owning plan has its
   acceptance list.
2. **MANUAL.** In MANUAL, should insults still produce the reflex-free physiology (audit 08 Q9), or should the
   instructor's targets hold until released? The expected column of every MANUAL cell depends on this.
3. **Band authority.** Where textbooks disagree (post-induction hypotension in the elderly: −25 % vs −45 %), should the
   matrix use the INTUBE/Reich-type observational numbers or the textbook teaching numbers? The runs will quote both
   until you rule.
4. **Priorities.** Is the P1 core in §3 your daily practice? The Iranian case mix (Aban 1405 resident boot camp) may
   raise obstetric and trauma cells to P1.
