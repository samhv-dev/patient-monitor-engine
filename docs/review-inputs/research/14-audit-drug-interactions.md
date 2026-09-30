# 14 — Coverage run DI: drug–drug and drug–disease interactions (R54 matrix, run 1)

*Coverage auditor, 2026-09-28. Read-only on the repo. Engine pinned at `main` **3ff2fb0** (the only later commit on
`origin/main`, 94040f7, touches `docs/RESUME.md` only, so the numbers hold for today's main). Seed 7 throughout. Scripts:
`research/14-audit-scripts/` (rerunnable; `out/cells.json` holds one graded record per cell, no raw rows).*

> **Provenance:** written after a weekly-cap kill. The run was resumed from the first auditor's scripts (groups A–E),
> re-run in full on the pinned commit, and extended with group F and group G:
> - group F: the brief's induction rows, inotropes × β-blockade × sepsis, TCI in low output, true context-sensitive
>   decrements, volatile emergence, onset times, and the MANUAL subset;
> - group G: research/12's DI-06/08/09, which the first files lacked.
>
> Final store: `14-audit-scripts/out/cells.json`, 105 cells.

## 0. Headline

- **105 cells** in nine families: the 45 matrix scenarios of research/12 §5.4 (DI-01…45, which make up its 75-cell
  design), 42 cells for the brief's items (DI-46…90), and 4 MANUAL twins (DI-M1…M4). There are 59 P1, 45 P2 and 1 P3
  cells. Every drug cell has a control arm; drug–disease cells also have the healthy reference pair.
- **Verdicts:**

  | verdict | cells | of which FU-4 pending |
  |---|---|---|
  | plausible (PL) | **42** | 6 |
  | too weak (TW) | **25** | 12 |
  | too strong (TS) | **9** | 1 |
  | wrong (WR) | **8** | 2 |
  | missing (MI) | **9** | — |
  | inconsistent (IN) | **2** | — |
  | not expressible (NE) | **10** | — |

  That leaves **38 non-plausible cells that no stage owns yet**, against 15 that FU-4 already owns. One more, DI-40, is
  FU-6 R2's.
- **What FU-4 will move** (measured here, not re-reported; its plan's prototype numbers are quoted in §3):
  - post-induction hypotension is about −10 % in every context, against −25 to −50 % expected (DI-01a, 36, 46–49,
    78, 79, 34);
  - opioid bradycardia is −4 to −7 bpm (DI-01b, 62);
  - burns + succinylcholine gives K⁺ 10.7 with no arrest (DI-37a/b);
  - propofol by bolus or TCI in class III is insensitive to cardiac output (DI-66, 84).
- **New findings, ranked** (§3 has the full list and the smallest mechanism for each):
  1. **The gamma effect curve** gives near-instant onset to 19 library rows. Naloxone and flumazenil act in 5 s,
     ketamine causes unconsciousness in 5 s, midazolam reaches 87 % of its peak at 30 s (D2).
  2. **Thiopental and etomidate never cause unconsciousness or apnoea.** 7f's depth and drive read only four agents
     (D3; P1).
  3. **Chronic β-blockade is a 2× EC50 shift**, so ephedrine and adrenaline are unaffected (ratios 1.12 and 0.94), and
     there is no reflex bradycardia with unopposed α (D4).
  4. **Antiarrhythmics never convert a rhythm, and shock success has no drug term** (D7).
  5. **The laryngoscopy pressor response is +6 mmHg**, because the baroreflex buffers the nociceptive rise. So labetalol
     and opioid blunting cannot be taught (D8; P1).
  6. **Ketamine's pressor effect persists when catecholamines are exhausted** (D9).
  7. **Opioid–benzodiazepine respiratory synergy is weak** (Bailey pair: SpO₂ 93 %, no apnoea), and the 7f apnoea flag
     contradicts the breathing (flag set for 255 s at VE up to 8.4 L/min) (D10).
  8. **One state, two commands:** the profile Mg potentiates rocuronium (+39 %) but magnesium sulfate does not
     (+0.5 %). The nm "burn/denervation" profile does not raise succinylcholine K⁺ (D12, D6).
  9. **Volatiles:** no second-gas effect, no desflurane surge on a dial step, and rocuronium potentiation too strong
     (+127 %) (D13).
  10. **LAST is the maximum over agents, not the sum** (D14).
- **What works:**
  - the TCI and CSHT models (Eleveld, Minto, Shafer reproduce their papers; fentanyl CSHT 18 → 72 min);
  - sugammadex, neostigmine and cholinesterase kinetics;
  - adenosine in AVNRT and AF, magnesium in torsades;
  - lipid in LAST;
  - Ca/insulin/salbutamol K⁺ kinetics;
  - bicarbonate CO₂ loading;
  - MH and dantrolene;
  - acidosis blunting of noradrenaline (0.53 at pH 7.2);
  - phenylephrine reflex bradycardia and its volatile attenuation;
  - opioid MAC reduction (61 %);
  - volatile emergence order (desflurane < sevoflurane < isoflurane);
  - etomidate and ketamine stability in hypovolaemia, AS and sepsis.
- **Resume note.** The first auditor's results were reproduced exactly on 3ff2fb0: 68 of 68 cells were identical when
  re-run. But 11 of its cells were measurement artefacts, and they were fixed before grading:
  - DI-25, 51 and 52: wrong search window or depth;
  - DI-27 and 56: an acid load giving pH 6.5 instead of 7.2;
  - DI-57: tachyphylaxis read as a cumulative level;
  - DI-59: a rounded-minimum match;
  - DI-13b: the maximum of AF HR;
  - DI-14a and 54: rhythm switches were read from the `rhythmSegment` event, which fires only for templated AF;
  - DI-53: cholinesterase given as an event, which is rejected;
  - DI-77: a MAC-equivalent graded with the wrong sign.

## 1. Method and rig

- **Design source:** research/12 §5.4 (DI, 45 scenarios / 75 cells) plus the run brief's item list; research/11 §5
  glossary names are used in the tables (MAP, HR, CO, SVR, SpO₂, EtCO₂, PaCO₂, K⁺, iCa, T1, TOF ratio, PTC, Ce, Cp,
  MAC, depth index "DI", CSHT).
- **Rig.** Adult 40 y, 70 kg, 175 cm, male; sensors ABP/CVP/PAP/SpO₂/CO₂/temp on. "Vent" = ETT + VCV 12 × 600 mL,
  PEEP 5, FiO₂ 0.5 from t = 1 s (audit 08's rig). "Spontaneous" = no airway device, the engine's own breathing.
  Interventions at t = 300 s in plain rigs; at 960 s after a 10-min bleed started at 60 s (class II 1000 mL, class III
  1500 mL); at 1260 s after the 7e sepsis ramp.
- **Contexts** (research/12 §1.4): X-A healthy; X-E 80 y + HTN; HFrEF 60 y; severe AS + severe CAD + HTN 75 y; severe
  MS 55 y; `betaBlocked`; `rvFailure`; COPD GOLD 3 (`copd` 0.75); AKI; burns (`blood.burns 1`); denervation
  (`neuroProfile nm`); homozygous/heterozygous cholinesterase; Mg 2.5 mmol/L; profile K 5.5 / 7.0.
- **Arms.** Every drug cell runs its **control arm** (the same timeline without the drug, same sim time) and, for
  drug–disease cells, the **healthy reference arm** pair (drug vs no drug in X-A at the same time), so state-dependence
  (R53) is read as the difference of differences (audit 08 §K). Drug–drug cells add each drug alone; "excess" = pair
  minus the sum of the singles.
- **Sampling.** Committed state read-only every 5 s (10–20 s for hour-long cells); the 1 Hz `anaesthesia` truth event
  (DI, MAC, TOF, consciousness), `measurement` HR, `beat` QRS, rhythm segments and neuro marks. No pokes.
- **Grading** (research/12 §2.2, automatic, then every non-PL confirmed by hand): band → PL / TW / TS by direction,
  WR if the sign is opposite; direction-only → PL when the sign matches beyond a tolerance; quiet → PL within
  tolerance; event → PL when it matches. A rejected command → NE; a quantity the engine lacks → MI. One verdict per cell
  = the worst of its items. Bands are **proposals for Ali** with their source; none was widened (R45).
- **MANUAL.** research/12 §2.2 asks every P1 haemodynamic cell to also run in MANUAL. Ali's Q9 (what MANUAL physiology
  should be) is open, so the MANUAL cells (DI-M1…M4) are graded **direction-only** and read beside their MODELED twins.
- **FU-4 pending.** Cells whose mechanism FU-4 is already fixing (anaesthetic sympatholysis as a gain scale, the humoral
  arm, the arrest state machine and PEA decay, potassium beyond morphology, CPR, tension PTX, the dead-space root,
  vagal events, flow-dependent distribution) are measured and marked **FU-4 pending**; they are not re-reported as new.
- **Runtime.** Groups A–E took ≈ 28 min of wall time for 85 cells on an idle machine. The full 105-cell re-run took
  ≈ 70 min under a shared load average of about 100.

## 2. Results

How to read the tables:
- **Measured** values are control-subtracted unless the key names an arm (for example `mapMinProp`). Keys:
  - `…Pct`: % change against the control at the same sim time;
  - `d…`: absolute difference;
  - `…S` / `…Min`: seconds / minutes from the intervention.
- **Graded items** list each expectation with its band and source (bands are proposals for Ali).
- **HAND** marks the auditor's confirmation where it changed the automatic verdict, with the code reason.
- Gap ids refer to §3. Every table is regenerated by `report.ts` from `out/cells.json`.

In short, family by family:
- **2.1 Induction:** the ≈ −10 % propofol fall is context-blind (FU-4 D1). Etomidate and ketamine are right in
  hypovolaemia, AS and sepsis. Propofol in class III (−25 %, MAP 60, no arrest) is plausible because the bleed was slow.
- **2.2 Synergy:** the CNS response surface works (co-induction DI −10 points, MAC reduction 61 %). The ventilatory and
  haemodynamic interactions are additive or weaker (D1, D10).
- **2.3 NMB:** kinetics are right. The interactions are the gaps: volatile potentiation too strong, calcium absent, the
  Mg drug ignored, the nm profile not reaching K⁺.
- **2.4 Vasoactives:** acidosis and phenylephrine are right. β-blockade barely acts (D4), tachyphylaxis is too steep,
  and septic responsiveness is too low.
- **2.5 Vasodilators:** state-dependence is present for venodilation in hypovolaemia (DI-58, extra −11 %) but absent
  in AS/MS (D1). Histamine and dexmedetomidine are too weak.
- **2.6 Rhythm:** adenosine and magnesium are right. Antiarrhythmics do nothing to rhythm (D7), and opioid bradycardia
  is FU-4's.
- **2.7 Metabolic:** almost all plausible. LAST additivity (D14), potassium on the ECG (FU-4) and bronchodilation
  (FU-6) are the exceptions.
- **2.8 Disposition:** the PK models reproduce their papers. The fallback gamma curve is the systematic onset error (D2).
- **2.9 MANUAL:** pressures move in the right direction, but displayed HR ignores every chronotrope (Q9).

### 2.1 Induction agents × comorbidity (MODELED)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-01a | P1 | X-A vent · GA, no comorbidity → propofol 2 mg/kg | mapPct -10.1; mapMin 86.1; nadirS 200; hrUp 19; hrDown 0; coPct -12.3; svrPct -11.6; arrest false | TW: mapPct = -10.1 above [-40, -25] [Miller 10e ch. 21 p. 519: MAP −25–40 % after 2–2.5 mg/kg]<br>PL: arrest = false (expected false) [FU-4 rule: the healthy/compensated counterpart must not arrest] | **TW** (FU-4 pending) | D1 · FU-4 G2 |
| DI-46 | P1 | X-E 80 y HTN · comorbid, ventilated → propofol 2 mg/kg | mapPct -11.3; mapMin 108; nadirS 140; hrUp 12; hrDown 0; coPct -10.1; svrPct -13.8; arrest false; kIschMin 1; cppMin 74.8 | TW: mapPct = -11.3 above [-50, -30] [elderly hypertensive: induction fall 40 % vs 30 % healthy (tables §1.5 HTN row; INTUBE 2021 instability 42.6 %)]<br>PL: arrest = false (expected false) [FU-4 rule: the healthy/compensated counterpart must not arrest] | **TW** (FU-4 pending) | D1 · FU-4 G2 |
| DI-47 | P1 | HFrEF · comorbid, ventilated → propofol 2 mg/kg | mapPct -10.4; mapMin 77.6; nadirS 170; hrUp 16; hrDown 0; coPct -10.8; svrPct -13.4; arrest false; kIschMin 1; cppMin 53.4 | TW: mapPct = -10.4 above [-40, -20] [tables §1.5 (HFrEF afterload-sensitive; COPD auto-PEEP compounds)]<br>PL: arrest = false (expected false) [FU-4 rule: the healthy/compensated counterpart must not arrest] | **TW** (FU-4 pending) | D1 · FU-4 G2 |
| DI-48 | P1 | severe AS + CAD 75 y · comorbid, ventilated → propofol 1.5 mg/kg | mapPct -8.7; mapMin 107; nadirS 190; hrUp 12; hrDown 0; coPct -10.4; svrPct -11.4; arrest false; kIschMin 1; cppMin 78.2 | TW: mapPct = -8.7 above [-45, -30] [tables §7 check 10: MAP 103 → 60–65 at 2 min after 1.5 mg/kg]<br>PL: arrest = false (expected false) [FU-4 rule: the healthy/compensated counterpart must not arrest] | **TW** (FU-4 pending) | D1 · FU-4 G2 |
| DI-49 | P1 | COPD GOLD 3 · comorbid, ventilated → propofol 2 mg/kg | mapPct -12.9; mapMin 83; nadirS 450; hrUp 20; hrDown -1; coPct -13.5; svrPct -12.3; arrest false; kIschMin 1; cppMin 73.4 | TW: mapPct = -12.9 above [-40, -25] [tables §1.5 (HFrEF afterload-sensitive; COPD auto-PEEP compounds)]<br>PL: arrest = false (expected false) [FU-4 rule: the healthy/compensated counterpart must not arrest] | **TW** (FU-4 pending) | D1 · FU-4 G2 |
| DI-36 | P1 | COPD GOLD 3 · COPD GOLD 3, RR 20, PEEP 10 → propofol 2 mg/kg + PEEP 10 at RR 20 (auto-PEEP stacking) | mapPctVentOnly -5.3; mapPctBoth -21.8; mapPctPropAdd -16.7; cvpBoth 17; arrest false | TW: mapPctBoth = -21.8 above [-55, -25] [auto-PEEP at RR 20 plus induction: compounded hypotension (Barash ch. on obstructive disease)]<br>PL: arrest = false (expected false) [FU-4 rule: the healthy/compensated counterpart must not arrest] | **TW** (FU-4 pending) | D1 · FU-4 G2 + 7b |
| DI-79 | P1 | betaBlocked vs X-A, ventilated · chronic β-blockade → propofol 2 mg/kg | mapPctBB -10.4; mapPctXA -10.1; extraFall -0.3; hrUpBB 5; hrUpXA 19 | TW: extraFall = -0.3 (sign -1, tol 2) [chronic β-blockade removes the chronotropic buffer, so induction hypotension is larger (tables §1.5 betaBlocked; Miller ch. 14)]<br>PL: hrUpBB = 5 in [0, 8] [no reflex tachycardia under β-blockade (tables §7 17b: HR stays < 100)] | **TW** (FU-4 pending) | D1 · FU-4 G2 + 7a baroreflex |
| DI-78 | P1 | X-A vent, septic shock warm (7e sepsis 1) · septic shock, vasodilated → propofol 2 mg/kg in sepsis vs the same dose healthy at the same sim time | mapBaseSeptic 79.5; mapPctSeptic -15.5; mapMinSeptic 63.4; mapPctHealthy -10.2; extraFall -5.3; hrUpSeptic 1; arrest false | PL: extraFall = -5.3 (sign -1, tol 2) [sepsis is the strongest predictor of post-induction collapse (INTUBE 2021; R53 state-dependence: vasodilated + preload-dependent)]<br>TW: mapPctSeptic = -15.5 above [-50, -30] [septic induction: MAP ≈ 80 falls to 40–55 and needs a vasopressor (INTUBE 2021: instability 42.6 %)] | **TW** (FU-4 pending) | D1 · FU-4 G2 (sympatholysis as a gain scale) |
| DI-22 | P1 | X-A vent, class III bleed · class III haemorrhage → etomidate 0.3 vs propofol 2 mg/kg at +11 min | mapPctEtom -2.1; mapPctProp -25; mapMinEtom 78.7; mapMinProp 60.2; arrestEtom false; arrestProp false | PL: mapPctEtom = -2.1 in [-15, 0] [etomidate preserves MAP (tables §6.3: MAP −0–10 %)]<br>PL: mapPctProp = -25 in [-50, -25] [propofol in hypovolaemia falls further (Miller ch. 21; INTUBE)]<br>PL: arrestProp = false (expected false) [FU-4 9th-cap ruling 2: class III + propofol must reach MAP 30–50 without arrest in 5 min (INTUBE arrest 3.1 %)] | **PL** (FU-4 pending) | D11 · FU-4 G2 + humoral arm |
| DI-80 | P1 | X-A vent, class III bleed · class III haemorrhage → ketamine 1.5 mg/kg vs propofol 2 mg/kg at +11 min | mapPctKet 2.3; mapRiseKet 8.1; mapPctProp -25; hrKet 14; arrestKet false | PL: mapPctKet = 2.3 in [-15, 5] [ketamine preserves MAP in haemorrhage while sympathetic reserve lasts (Miller ch. 21; tables §6.3); falls only when catecholamine-depleted]<br>PL: arrestKet = false (expected false) [ketamine induction in class III must not arrest (FU-4 rule)] | **PL** | — · 7g (ketamine indirect arm) |
| DI-66 | P1 | X-A vent, class III bleed vs normovolaemia · class III haemorrhage (CO ≈ 3 L/min) → propofol 2 mg/kg: peak Ce and MAP fall vs the same dose at normal CO | coBleed 2.9; coNormal 4.7; cePeakBleed 3.4; cePeakNormal 3; ceRatio 1.13; mapPctBleed -25; mapPctNormal -10.2; diMinBleed 42; diMinNormal 46 | TW: ceRatio = 1.13 below [1.3, 2.2] [Kazama 2002 / Johnson 2003: a low cardiac output raises the propofol peak Ce ≥ 1.3× (FU-4 Task 14 target: S6b ratio ≥ 1.3)]<br>PL: mapPctBleed = -25 (sign -1, tol 15) [the same dose must hurt more in hypovolaemia (R53; INTUBE)] | **TW** (FU-4 pending) | D11 · FU-4 G10 (flow-dependent distribution) |
| DI-32 | P1 | HFrEF · HFrEF → etomidate 0.3 vs propofol 2 mg/kg; then dobutamine 5 µg/kg/min | mapPctEtom -1.6; mapPctProp -10.4; svPctProp -17.7; coPctProp -10.8; coPctDobuVsProp 17.7 | PL: mapPctEtom = -1.6 in [-15, 0] [etomidate is the stable induction in HFrEF (Miller ch. 21)]<br>TW: coPctDobuVsProp = 17.7 below [20, 45] [tables §7 check 20 / T6.2: dobutamine 5 µg/kg/min CO +20–40 % in a failing ventricle] | **TW** | D15 · 7g (NR-7g-2 inotrope venous return) |
| DI-81 | P1 | severe AS + CAD 75 y · fixed LV outflow, coronary disease → etomidate 0.3 mg/kg | mapPct -1.9; mapMin 114.5; nadirS 145; hrUp 4; hrDown 0; coPct -10.6; svrPct -4.3; arrest false; kIschMin 1; cppMin 76.5 | PL: mapPct = -1.9 in [-15, 0] [etomidate is the stable induction in severe AS (Miller ch. 21; tables §6.3 MAP −0–10 %)]<br>PL: arrest = false (expected false) [FU-4 rule] | **PL** | — · 7g |
| DI-82 | P1 | X-A vent, septic shock warm · septic shock → etomidate 0.3 vs ketamine 1.5 mg/kg (KETASED comparison) | mapPctEtom -1.9; mapPctKet 1.8; mapRiseKet 5.1 | PL: mapPctEtom = -1.9 in [-20, 0] [KETASED (Jabre 2009): etomidate and ketamine give similar, modest haemodynamic change in the critically ill]<br>PL: mapPctKet = 1.8 in [-20, 5] [KETASED (Jabre 2009); tables §6.3] | **PL** | — · 7g |
| DI-21 | P1 | X-A vent · prolonged septic shock, cold phase (catecholamine-depleted proxy) → ketamine 1 mg/kg | mapPctSeptic 1.8; mapRiseSeptic 4.6; mapPctHealthy 1.5; mapRiseHealthy 6.1; hrSeptic 13; arrest false | PL: mapRiseHealthy = 6.1 in [5, 25] [tables §6.3: ketamine raises MAP 15–25 % through sympathetic drive in a catecholamine-replete patient]<br>WR: mapPctSeptic = 1.8 (expected sign -1) [direct myocardial depression unmasked when catecholamine-depleted (Miller ch. 21; tables §6.3 "direct Ees ×0.9 unmasked")] | **WR** | D9 · 7g combine.ts (ketamine indirect arm) |
| DI-31 | P1 | severe AS + CAD 75 y · post-induction hypotension → phenylephrine 100 µg vs ephedrine 10 mg | mapPhe 131.9; mapEph 118.6; mapNone 110.9; hrPhe -15; hrEph 4; cppPhe 77.2; cppEph 84.5; kIschPhe 1; kIschEph 1 | PL: mapPhe = 131.9 in [85, 999] [tables §7 check 10: phenylephrine 100 µg → MAP ≥ 85 within 90 s (a floor; the first run added a 130 ceiling with no source)]<br>PL: hrEph = 4 (sign 1, tol 3) [ephedrine raises HR 10–15 (tables §7 check 10: tachycardia worsens ischaemia in AS)] | **PL** | D1 · 7a coronary / 7g |
| DI-07 | P1 | X-A vent · GA → esmolol 0.5 mg/kg + propofol 2 mg/kg | mapPctBoth -10.6; mapPctSum -11; ratioToSum 0.96; hrEsmolol -4; hrBoth 11; hrProp 19; arrest false | TW: hrEsmolol = -4 above [-25, -7] [tables §6.2: esmolol 0.5 mg/kg HR −10–20 %]<br>PL: ratioToSum = 0.96 in [0.8, 1.6] [β-blockade plus propofol: at least additive hypotension (Miller ch. 14)]<br>PL: arrest = false (expected false) [FU-4 rule: the healthy/compensated counterpart must not arrest] | **TW** | D15 · 7g |
| DI-06 | P2 | chronic ACE inhibitor / ARB · renin–angiotensin blockade → propofol induction; vasopressin rescue | — | no ACEi/ARB profile or angiotensin state (research/12 §5.4 blockers); FU-4’s humoral arm is the natural home of the angiotensin term | **NE** | — · FU-7 profile (and FU-4’s humoral arm, which will carry angiotensin) |

### 2.2 Hypnotic × opioid × benzodiazepine × volatile: depth, drive, MAP

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-01b | P1 | X-A vent · GA → remifentanil 1 µg/kg bolus | mapPct -3.7; mapMin 91.9; nadirS 105; hrUp 0; hrDown -4; coPct -12.1; svrPct -5.4; arrest false | TW: hrDown = -4 above [-25, -9] [FU-4 S15 target from Miller ch. 22: remifentanil 1 µg/kg HR −15 to −30 %]<br>TW: mapPct = -3.7 above [-18, -5] [tables §6.3 opioid row: SVR −5–15 %, HR −10–20 %] | **TW** (FU-4 pending) | D5 · FU-4 G7 |
| DI-01c | P1 | X-A vent · GA → propofol 2 mg/kg + remifentanil 1 µg/kg vs each alone | mapPctBoth -14.2; mapPctSumAlone -13.8; excessPct -0.4; hrDown -2; arrest false | TW: excessPct = -0.4 (sign -1, tol 2) [hypnotic + opioid act on one response surface: the pair is more than additive (Bouillon 2004; Miller ch. 22)]<br>PL: arrest = false (expected false) [FU-4 rule: the healthy/compensated counterpart must not arrest] | **TW** | D1 · 7g combine.ts |
| DI-01d | P1 | X-A spontaneous, FiO2 0.5 · awake → propofol 2 mg/kg ± remifentanil 1 µg/kg: apnoea | apnoeaS_both 260; apnoeaS_prop 0; vePctBoth -99.2; vePctProp -75.9; paco2Peak 75.9; spo2Min 0 | PL: apnoeaS_both = 260 in [60, 600] [propofol + remifentanil induction: apnoea in nearly all, minutes long (Miller ch. 22)]<br>WR: apnoeaS_prop = 0 below [30, 300] [propofol 2 mg/kg alone: apnoea 30–60 s typical (Miller ch. 21)]<br>HAND TW (automatic WR): propofol 2 mg/kg alone lowers spontaneous VE 76 % but never below 1 L/min (0 s of real apnoea; the 7f flag claims 220 s, DI-89); the pair gives 260 s — the chemoreflex in neuro/spont.ts buffers the drug depression | **TW** | D10 · 7f drive.ts / neuro/spont.ts |
| DI-02 | P1 | X-A vent · GA → midazolam 0.03 mg/kg 2 min before propofol 1.4 mg/kg vs propofol 1.4 alone | diMinBoth 51; diMinProp 61; diDelta -10; locBoth true; locProp true; mapPctBoth -13.1; mapPctSum -13.2 | PL: diDelta = -10 (sign -1, tol 2) [co-induction synergy: midazolam 0.02–0.05 mg/kg cuts the propofol induction dose 20–50 % (Short & Chui 1991; Miller ch. 21)]<br>PL: locBoth = true (expected true) [the reduced propofol dose still loses consciousness after midazolam] | **PL** | — · 7f depth.ts |
| DI-03 | P1 | X-A awake spontaneous, room air · awake → fentanyl 2 µg/kg + midazolam 0.05 mg/kg (Bailey 1990) | spo2MinBoth 93; spo2MinFent 95; spo2MinMidaz 95; apnoeaBoth false; apnoeaFent false; apnoeaFlagBoth false; vePctBoth -48; vePctFent -43.5; vePctMidaz -17.1; paco2Peak 46.4 | TS: spo2MinBoth = 93 above [70, 89] [Bailey 1990: fentanyl 2 µg/kg + midazolam 0.05 mg/kg → SpO2 < 90 % in 11/12]<br>WR: apnoeaBoth = false (expected true) [Bailey 1990: apnoea in 6/12]<br>PL: spo2MinMidaz = 95 in [93, 100] [Bailey 1990: midazolam alone caused no hypoxaemia] | **WR** | D10 · 7f drive.ts |
| DI-77 | P1 | X-A vent · GA maintenance, sevoflurane + remifentanil → MAC reduction by an opioid (macEff vs macBrain) and the depth interaction | macBrainBefore 0.7; macEffBefore 0.7; macBrainAfter 0.9; macEffAfter 2.3; macEffRise 1.4; macReduction 0.61; diWithOpioid 44; diWithout 46; mapPct -8 | PL: macReduction = 0.61 in [0.4, 0.7] [remifentanil 0.15 µg/kg/min (Ce ≈ 3.5–4 ng/mL) reduces sevoflurane MAC ≈ 50–60 % (Lang 1996: 1.37 ng/mL halves isoflurane MAC; tables §5d)]<br>PL: mapPct = -8 (sign -1, tol 3) [adding an opioid to a volatile lowers MAP further (tables §6.3)] | **PL** | — · 7f depth.ts / 7g |
| DI-89 | P1 | X-A spontaneous, FiO2 0.5 · induction apnoea and its recovery → propofol 2 mg/kg + remifentanil 1 µg/kg: 7f apnoea flag vs spontaneous VE | flagSecondsWhileBreathing 255; veWhileFlagged 8.4; apnoeaVeS 260; spo2Min 0; mapMin 46.8; arrest false; anyFlag true | WR: flagSecondsWhileBreathing = 255 (quiet, tol ±0) [one truth: the apnoea flag (neuroMark "apnoea", drive.apnoea) must not stay set while the patient breathes ≥ 3 L/min (research/12 §2.1 IN)] | **WR** | D10 · 7f drive.ts:64 vs neuro/spont.ts (MODELED chemoreflex) |
| DI-30 | P2 | opioid-tolerant · chronic opioid use → remifentanil | — | no opioid-tolerant profile: no receptor-density/EC50 shift input (research/11 §2.15) | **NE** | — · FU-7 profile |
| DI-43 | P2 | OSA · obstructive sleep apnoea → opioid (PCA-equivalent) | — | no OSA profile: tables §1.5 asks for a depth-dependent upper-airway collapse threshold, absent | **NE** | — · FU-7 profile |

### 2.3 Neuromuscular block: volatile potentiation, reversal, Mg/Ca, succinylcholine hazards

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-50 | P1 | X-A vent · GA → rocuronium 0.6 mg/kg alone: onset and T1 25 % recovery | onsetS 95; t1_25minutes 25.7; tofrAt45min 0.4 | PL: onsetS = 95 in [60, 150] [rocuronium 0.6 mg/kg (2×ED95): maximum block at 1.8 min (label; Miller ch. 24 Table 24.3)]<br>PL: t1_25minutes = 25.7 in [24, 40] [clinical duration (T1 25 %) 30–35 min (label; 7g gate measured 30.0)] | **PL** | — · 7f nmb.ts / 7g PK |
| DI-51 | P1 | X-A vent, sevoflurane ≈ 1 MAC · GA volatile maintenance → rocuronium 0.6 mg/kg under sevoflurane vs TIVA (potentiation) | macAtDose 1; t25_volatile 70; t25_tiva 30.8; prolongPct 127 | TS: prolongPct = 127 above [25, 80] [potent volatiles at ≈ 1 MAC prolong non-depolarising block ≈ 30–50 % vs propofol (Miller ch. 24; 7f interactions.ts EC50 ÷ (1 + 0.5·MAC))] | **TS** | D13 · 7f interactions.ts |
| DI-17 | P1 | X-A vent · residual block at TOF 2 → neostigmine 0.05 mg/kg with atropine 1 mg vs with glycopyrrolate 0.4 mg vs alone | hrNeoAlone -19; hrAtropinePeak 27; tAtropinePeakS 0; hrAtropineLate 6; hrGlycoPeak 10; hrGlycoEarly 10; tofrNeo15min 0.9; tofrCtl 0.4 | PL: hrNeoAlone = -19 in [-40, -12] [FU-4 S15 target from Miller ch. 24: neostigmine without an antimuscarinic HR −25 to −40 %]<br>PL: hrAtropinePeak = 27 in [10, 45] [atropine 1 mg: HR +20–40, onset < 1 min — faster than neostigmine (tables §6.2; Miller ch. 24)]<br>PL: hrGlycoEarly = 10 in [0, 12] [glycopyrrolate onset 2–3 min: matched to neostigmine, so no early tachycardia (tables §6.2)] | **PL** (FU-4 pending) | D2, D5 · FU-4 G7 (vagal) + 7g |
| DI-52 | P1 | X-A vent · deep block (PTC 1–2) → sugammadex 4 mg/kg vs neostigmine 0.05 mg/kg at the same depth | ptcBefore 2; sgxMinutesToTofr09 2.08; neoMinutesToTofr09 26.08; ctlMinutesToTofr09 63 | TS: sgxMinutesToTofr09 = 2.08 below [2.1, 4.3] (lower = stronger/faster) [sugammadex 4 mg/kg at 1–2 PTC: TOFR 0.9 in 2.7 min (label; 7g gate 2.22)]<br>PL: neoMinutesToTofr09 = 26.08 in [15, 90] [neostigmine cannot reverse deep block: recovery stays long, its ceiling needs TOF ≥ 2 (Miller ch. 24 p. 716)] | **TS** | D15 · 7f neostigmine.ts |
| DI-29 | P2 | X-A vent · after sugammadex 4 mg/kg → rocuronium 0.6 mg/kg re-dose 5 min after sugammadex | blockAfterRedose 1; blockFresh 0; onsetSredose null; onsetSfresh 65 | PL: blockAfterRedose = 1 (sign 1, tol 0.05) [free sugammadex binds the re-dose: resistance for hours after 4 mg/kg (Naguib; Miller ch. 24 pp. 728–731)] | **PL** | — · 7g nmb.ts binding |
| DI-45 | P2 | X-A vent · GA → sugammadex 16 mg/kg (rare marked bradycardia / anaphylaxis) | hrDown 0; mapPct 0; minutesToT1_10 1.83 | PL: minutesToT1_10 = 1.83 in [0.6, 2] [sugammadex 16 mg/kg 3 min after rocuronium 1.2: T1 10 % in 1.2 min (label; 7g gate 1.80)]<br>WR: hrDown = 0 above [-30, -5] [marked bradycardia is a recognised (rare) sugammadex reaction — the MISSING mechanism is the point of the cell (Miller ch. 24; MHRA)]<br>HAND MI (automatic WR): the sugammadex row has pd: [] (rows-cardiovascular.ts:18): no bradycardia or anaphylaxis path exists — a missing mechanism, not an opposite sign | **MI** | D15 · FU-7 (no sugammadex cardiac/anaphylaxis hazard) |
| DI-53 | P2 | X-A vent, homozygous atypical cholinesterase · pseudocholinesterase deficiency → succinylcholine 1 mg/kg | normalMin 8.3; hetMin 14.3; homBlockAt45min 0 | PL: normalMin = 8.3 in [5, 12] [succinylcholine 1 mg/kg: T1 25 % at 7–10 min (label; 7g gate 7.2)]<br>PL: hetMin = 14.3 in [10, 25] [heterozygous: ×1.5–2 (Miller ch. 24; 7g gate ×1.67)]<br>PL: homBlockAt45min = 0 in [0, 0.1] [homozygous: block lasts hours (7g gate 310 min)] | **PL** | — · 7g PCHE_CL_MULT |
| DI-25 | P2 | X-A vent, Mg loaded (profile 2.5 mmol/L) · therapeutic hypermagnesaemia → rocuronium 0.6 mg/kg; calcium chloride 1 g | t25_mg 42.5; t25_normal 30.7; prolongPct 38.6; t25_mgThenCa 42.5; caShortensMin 0 | PL: prolongPct = 38.6 in [20, 90] [magnesium potentiates non-depolarisers: vecuronium ED50 −25 % after 40 mg/kg (Miller ch. 24 p. 698)]<br>WR: caShortensMin = 0 (expected sign -1) [calcium antagonises the magnesium potentiation (Miller ch. 24) — the Mg + Ca arm minus the Mg arm]<br>HAND MI (automatic WR): the magnesium potentiation is right (+39 %); calcium has no NMB term — 7f ec50Multipliers (neuro/interactions.ts:23–45) reads profile Mg, volatile MAC, temperature and nm profile only | **MI** | D12 · 7f interactions.ts (calcium has no NMB path) |
| DI-90 | P2 | X-A vent · magnesium sulfate 60 mg/kg (pre-eclampsia / analgesia load) → rocuronium 0.6 mg/kg after the Mg load vs alone | mgPeak 2.1; t25_mgDrug 30.8; t25_normal 30.7; prolongPct 0.5; mapPct -8.8 | TW: prolongPct = 0.5 below [20, 90] [magnesium sulfate potentiates non-depolarisers (Miller ch. 24 p. 698: vecuronium ED50 −25 % after 40 mg/kg); DI-25 gives +39 % from the profile Mg]<br>HAND IN (automatic TW): blood Mg reaches 2.1 mmol/L but rocuronium is unchanged (+0.5 %), while the profile Mg 2.5 of DI-25 prolongs it +39 %: 7f reads the profile field only (neuro/pipeline.ts:186), not 7c blood.out.mg — two commands for one state disagree | **IN** | D12 · 7f interactions.ts ← 7c blood Mg |
| DI-37a | P1 | X-A vent, burns severity 1 (profile blood.burns) · burns > 48 h → succinylcholine 1.5 mg/kg | kPeakBurns 10.7; dkBurns 6.5; dkNormal 0.5; qrsPeak 259; arrest false; rhythmChange false | PL: dkBurns = 6.5 in [3, 7] [Miller ch. 24: succinylcholine after burns/denervation raises K 3–7 mmol/L]<br>PL: dkNormal = 0.5 in [0.3, 0.8] [normal patient +0.5 mmol/L (tables §5b.2)]<br>WR: arrest = false (expected true) [FU-4 prototype: burns + sux → VF at +3.7 min, prevented by calcium (9th-cap ruling; Miller: hyperkalaemic arrest)] | **WR** (FU-4 pending) | D6 · FU-4 G3 (potassium) |
| DI-37b | P1 | X-A vent, burns 1 · burns > 48 h → succinylcholine 1.5 mg/kg then calcium chloride 1 g at the ECG change | kPeakWithCa 10.7; kEcgWithCa 8.3; kEcgNoCa 10.7; qrsWithCa 227; qrsNoCa 259; iCaPeak 1.4; arrestWithCa false; arrestNoCa false | TS: qrsWithCa = 227 above [80, 110] [calcium narrows the QRS within 1–3 min without lowering K (UK Renal Association; 7c gate: QRS 93 → 126 → 93)]<br>PL: arrestWithCa = false (expected false) [calcium prevents the hyperkalaemic arrest (FU-4 prototype)] | **TS** (FU-4 pending) | D6 · 7c treatments.ts |
| DI-37c | P1 | X-A vent, nm profile denervation · denervation (upregulated receptors) → succinylcholine 1.5 mg/kg | dk 0.5; kPeak 4.7; t1Min 0; arrest false | TW: dk = 0.5 below [3, 7] [Miller ch. 24: denervation/immobilisation gives the same K surge as burns]<br>HAND IN (automatic TW): two commands for one disease disagree: neuroProfile nm "burn"/"denervation" (7f, neuro/pipeline.ts:118) changes the NMB response but not the succinylcholine K⁺ rise, which only profile blood.burns (7c) drives | **IN** | D6 · 7c (burns severity is the only K path; the 7f nm profile does not reach it) |
| DI-37d | P1 | X-A vent, CKD proxy: profile K 5.5 + aki · renal failure, K 5.5 → succinylcholine 1.5 mg/kg | kPeak 6; dk 0.5; qrsPeak 93; arrest false | PL: dk = 0.5 in [0.3, 0.9] [Miller ch. 24: stable renal failure has the NORMAL +0.5 response (the hazard is the starting K, not a bigger rise)]<br>PL: kPeak = 6 in [5.8, 6.6] [starting K 5.5 + 0.5 (tables §1.5 CKD row)] | **PL** | — · 7c |

### 2.4 Vasopressors and inotropes × β-blockade × volatile × acidosis × sepsis; stimulus

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-04a | P1 | betaBlocked vs X-A · GA ventilated → ephedrine 10 mg | mapRiseBB 8.7; mapRiseXA 7.8; ratio 1.12; hrRiseBB 3; hrRiseXA 2 | TW: mapRiseXA = 7.8 below [8, 25] [tables §6.2: ephedrine 10 mg MAP/SVR +10–15 %, HR +10–15 %]<br>TS: ratio = 1.12 above [0.3, 0.7] [tables §1.5 / §7 17b: ephedrine response ×0.5 when chronically β-blocked] | **TS** | D4 · 7g combine.ts betaBlunt |
| DI-04b | P1 | betaBlocked vs X-A · GA ventilated → phenylephrine 100 µg | mapRiseBB 27.5; mapRiseXA 25.9; ratio 1.06; hrDropBB -6; hrDropXA -16 | PL: mapRiseXA = 25.9 in [15, 30] [tables §7 check 1 / 7g gate: phenylephrine 100 µg MAP +15–25 mmHg (here as %)]<br>PL: ratio = 1.06 in [0.85, 1.3] [the α1 response is intact under β-blockade (tables §1.5; Miller ch. 14)] | **PL** | — · 7g |
| DI-04c | P1 | betaBlocked vs X-A · class III haemorrhage (30 %) → bleed 1500 mL / 10 min (the state itself) | hrPeakBB 71; hrPeakXA 129; sbpMinBB 97.8; sbpMinXA 91.9; coMinBB 2.9; coMinXA 2.9; lactBB 3.3 | TW: hrPeakBB = 71 below [80, 99] [tables §7 17b: HR 80–95 (shock index < 1 despite shock)]<br>TW: sbpMinBB = 97.8 above [65, 82] (lower = stronger/faster) [tables §7 17b: SBP 65–80, hypotension earlier than 17a]<br>PL: hrPeakXA = 129 in [115, 145] [tables §7 17a: HR 120–140 without β-blockade] | **TW** | D4 · 7a baroreflex (β-blocked profile) |
| DI-05 | P2 | betaBlocked vs X-A · GA ventilated → adrenaline 100 µg IV | mapRiseBB 32.9; mapRiseXA 29.7; excessPct 3.2; hrMinBB 1; hrMaxBB 12; hrMaxXA 12 | PL: excessPct = 3.2 (sign 1, tol 2) [unopposed α under non-selective β-blockade: a larger pressor response (Miller ch. 14)]<br>WR: hrMinBB = 1 (expected sign -1) [reflex bradycardia accompanies the unopposed α rise (Miller ch. 14)] | **WR** | D4 · 7g combine.ts |
| DI-55 | P1 | X-A vent, sevoflurane ≈ 1 MAC · GA volatile → phenylephrine 100 µg under sevoflurane vs TIVA-free baseline | macBrain 1; mapRiseVolatile 27.1; mapRiseAwake 25; hrDropVolatile -5; hrDropAwake -15; reflexRatio 0.33 | PL: reflexRatio = 0.33 in [0.2, 0.7] [Nagasaki 2001: sevoflurane 2 % lowers pressor baroreflex sensitivity 50–60 %, so the reflex bradycardia is ≈ 0.4× awake (7g volatile gvHr comment)]<br>PL: mapRiseVolatile = 27.1 in [15, 40] [the α1 pressor effect itself is not volatile-dependent (tables §6.2)] | **PL** | — · 7g / 7a baroreflex |
| DI-56 | P1 | X-A vent, metabolic acidosis (HCl load 2 mmol/kg) · acidaemia pH ≈ 7.2 → noradrenaline 0.1 µg/kg/min in acidosis vs normal pH | phAcid 7.2; dMapAcid 13.5; dMapNormal 25.3; ratio 0.53; svrPctAcid 19.2; svrPctNormal 33.9 | PL: phAcid = 7.2 in [7.1, 7.3] [the rig aims at pH 7.2 (tables §5b.1 mineral-acid load)]<br>PL: ratio = 0.53 in [0.4, 0.85] [catecholamine efficacy falls in acidaemia: ×(1 − 2.5·(7.4 − pH)) → ≈ 0.5 at pH 7.2 (tables §5b.1/§6.2; 7g pd.ts acidosisFactor)] | **PL** | — · 7g pd.ts acidosisFactor |
| DI-57 | P1 | X-A vent, class II bleed · class II haemorrhage → ephedrine 10 mg ×3 at 5-min intervals (tachyphylaxis) | rise1 6.4; rise2 2.4; rise3 0.3; ratio21 0.37; ratio31 0.05 | PL: rise1 = 6.4 in [5, 30] [ephedrine 10 mg raises MAP 10–15 % (tables §6.2)]<br>TS: ratio21 = 0.37 below [0.4, 0.95] (lower = stronger/faster) [tachyphylaxis: each repeat ×0.7 (tables §6.2; 7g gate SVR increments 0.120/0.029/0.012)] | **TS** | D15 · 7g tachy() |
| DI-09 | P1 | X-A vent · propofol infusion 100 µg/kg/min from 60 s → phenylephrine 0.5 µg/kg/min from 900 s vs none (neuraxial arm NE: no neuraxial event) | mapPctProp -5.3; mapPctPropPhe 14.1; mapRisePhe 24.6; hrPhe -23; coPctPhe -18.6 | PL: mapRisePhe = 24.6 in [8, 40] [phenylephrine infusion holds MAP during propofol (tables §6.2: 0.15–0.5 µg/kg/min)]<br>PL: hrPhe = -23 (sign -1, tol 2) [with a reflex bradycardia (tables §6.2; Miller ch. 14)] | **PL** | — · 7g / 7a baroreflex |
| DI-10 | P1 | X-A vent · septic shock warm (7e condition sepsis 1) → noradrenaline 0.1 µg/kg/min; then + vasopressin 0.04 U/min | mapSepticBase 79.5; hrSepticBase 185; coSepticBase 4.7; svrSepticBase 1158; dMapNEseptic 5.3; dMapNEhealthy 25.9; respRatio 0.2; dMapVasopressinAdded 7.7 | TW: respRatio = 0.2 below [0.3, 0.85] [reduced catecholamine responsiveness in septic shock (tables §5e vasoResp; Levy 2018)]<br>PL: dMapVasopressinAdded = 7.7 in [5, 25] [vasopressin 0.04 U/min adds ≈ +40 % SVR and is not blunted by vasoplegia/acidosis (VASST 2008; tables §6.2)] | **TW** | D15 · 7g / 7e |
| DI-83 | P2 | betaBlocked / septic warm vs X-A · chronic β-blockade; septic shock → dobutamine 5 µg/kg/min | coPctXA 12.9; coPctBB 7.2; coPctSeptic 10.9; ratioBB 0.56; ratioSeptic 0.84; hrXA 3; hrBB 3 | PL: ratioBB = 0.56 in [0.2, 0.8] [β-blockade shifts the dobutamine dose–response right (competitive; Miller ch. 14; tables decision 7 EC50 shift)]<br>PL: ratioSeptic = 0.84 in [0.3, 0.9] [β-adrenergic hyporesponsiveness in septic shock (tables §5e vasoResp; Levy 2018)] | **PL** | — · 7g combine.ts (betaOcc, vasoResp) |
| DI-12 | P2 | class III bleed vs HFrEF · hypovolaemia vs low-output failure → dobutamine 5 µg/kg/min | coPctHFrEF 17.9; hrDHFrEF 4; mapPctHFrEF 2; coPctBleed 3.9; hrDBleed 13; mapPctBleed -2.2 | TW: coPctHFrEF = 17.9 below [20, 45] [tables §7 check 20 / §6.2: dobutamine 5 µg/kg/min CO +20–40 % in low output]<br>PL: mapPctBleed = -2.2 (sign -1, tol 1) [in hypovolaemia the β2 vasodilation drops MAP while HR rises (tables §7 check 20 companion; Miller ch. 14)] | **TW** | D15 · 7g NR-7g-2 (inotrope venous return) |
| DI-11 | P2 | rvFailure profile · chronic RV failure → milrinone 50 µg/kg over 10 min then 0.5 µg/kg/min; + noradrenaline 0.05 at +20 min | pvrPct -18.9; svrPct -9.5; coPct 8.3; mapPct -1.6; mapPctWithNE 9.8; svrPctWithNE 5.8; cvpPct -6.4 | TW: pvrPct = -18.9 above [-60, -20] [tables §6.2: milrinone PVR ×0.75 and SVR −21 % at 0.5 µg/kg/min (label)]<br>TW: coPct = 8.3 below [10, 45] [inodilation raises RV output in RV failure (label +30 % at 0.5)]<br>PL: mapPctWithNE = 9.8 (sign 1, tol 1) [noradrenaline restores the systemic pressure the inodilator dropped (Miller ch. 14)] | **TW** | D15 · 7g / 7a RV |
| DI-41 | P1 | betaBlocked vs X-A · anaphylaxis grade III (7e condition) → adrenaline 100 µg ×2 | mapNadirBB 29.3; dMapEpiBB 66.7; dMapEpiXA 71.1; resistanceRatio 0.94; arrestBB false; arrestXA false; arrestUntreated false | TS: resistanceRatio = 0.94 above [0.2, 0.8] [adrenaline resistance in β-blocked anaphylaxis (AAGBI/Resuscitation Council guidance; glucagon is the named rescue — absent here)]<br>TS: dMapEpiXA = 71.1 above [10, 60] [adrenaline 50–100 µg restores pressure in grade III anaphylaxis (AAGBI)] | **TS** | D4 · 7g / 7e |
| DI-08 | P1 | X-A vent, propofol 2 mg/kg at 240 s · GA, laryngoscopy at 300 s (7e stimulus 1.5 = laryngoscopy, hormones.ts:35, for 60 s) → labetalol 10 mg at 180 s vs none | pressorNoLab 6.1; pressorLab 6; ratio 0.98; hrRiseNoLab 3; hrRiseLab 2 | TW: pressorNoLab = 6.1 below [15, 45] [laryngoscopy after propofol alone: MAP +20–40 mmHg (Miller ch. 44 airway; tables §5.3 stress response)]<br>TS: ratio = 0.98 above [0.2, 0.8] [labetalol before laryngoscopy blunts the pressor response (Miller; Inada 1989)]<br>HAND TW (automatic TS): the laryngoscopy pressor response itself is +6 mmHg after propofol (awake +12), so the labetalol ratio cannot be read: the stimulus multiplies SVR/HR against an unchanged baroreflex set point (endo/effects.ts:51–52), which buffers it away | **TW** | D8 · 7e stimulus / 7a set point (SP run) |

### 2.5 Vasodilators × preload-dependent states; histamine; α2

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-33 | P2 | recent-MI profile (RV-infarct proxy: condition rvInfarct) · RV infarct → GTN 400 µg then fluid 500 mL | cvpBase 9; pawpBase 5.1; mapBase 87.6; mapPctGtn -13; mapDeltaFluid 3.1; arrest false | TW: mapPctGtn = -13 above [-35, -20] [tables §7 check 15: NTG 400 µg → MAP −20–30 % in RV infarct]<br>TW: mapDeltaFluid = 3.1 below [5, 15] [tables §7 check 15: 500 mL fluid → MAP +5–10] | **TW** | D15 · 7a (RV infarct) / 7g |
| DI-34 | P2 | severe MS 55 y and severe AS 75 y · fixed-orifice valve lesion → GTN 1 µg/kg/min for 10 min | mapPctMS -9.7; coPctMS -20; mapPctAS -8.8; cppPctAS -1.3; kIschAS 1; mapPctHealthy -9; extraFallAS 0.2 | PL: mapPctHealthy = -9 in [-25, -8] [tables §6.2: GTN 1 µg/kg/min SVR ×0.85 with venodilation +10–15 % of V]<br>WR: extraFallAS = 0.2 (expected sign -1) [preload/afterload-dependent lesions collapse further than a normal heart with a vasodilator (Barash, valvular disease; R53 state-dependence)] | **WR** (FU-4 pending) | D1 · FU-4 G2 (state-dependence) |
| DI-58 | P1 | X-A vent, class II bleed · class II haemorrhage → GTN 1 µg/kg/min in hypovolaemia vs normovolaemia | mapPctBleed -20.3; mapPctNormal -8.9; extraFall -11.4; coPctBleed -30; arrest false | PL: extraFall = -11.4 (sign -1, tol 2) [a venodilator on the steep part of the venous-return curve drops pressure further (R53; Barash)] | **PL** (FU-4 pending) | — · FU-4 G2 |
| DI-59 | P2 | X-A vent, hypertension after a stimulus · hypertensive response → hydralazine 10 mg vs labetalol 10 mg (onset and offset) | mapPctHydralazine -8.8; tNadirHydralazineS 1070; hrHydralazine 23; mapPctLabetalol -9; hrLabetalol -6 | PL: tNadirHydralazineS = 1070 in [300, 1500] [hydralazine onset 5–20 min, peak 10–20 min (label; tables §6.2)]<br>PL: hrHydralazine = 23 (sign 1, tol 2) [reflex tachycardia after a pure arterial dilator (label; the row notes it "emerges")]<br>PL: hrLabetalol = -6 (sign -1, tol 2) [labetalol lowers HR 10–20 % (tables §6.2)] | **PL** | — · 7g rows-cardiovascular.ts |
| DI-42 | P2 | X-A vent · GA → morphine 10 mg IV fast (histamine) | mapPct -3.6; mapMin 92.3; nadirS 840; hrUp 14; hrDown 0; coPct -8.3; svrPct -8.6; arrest false; histamineBusSeen see report (bus.airway.histamine has no consumer) | TW: mapPct = -3.6 above [-25, -8] [tables §6.3 / Miller ch. 22: fast morphine 10 mg lowers SVR 10–20 % through histamine release]<br>PL: hrUp = 14 in [3, 25] [histamine-mediated hypotension raises HR (Miller ch. 22)] | **TW** | D15 · 7g (histamine published, nothing consumes it) |
| DI-60 | P2 | X-A vent, dexmedetomidine · GA adjunct → dexmedetomidine 1 µg/kg over 10 min then 0.5 µg/kg/h | mapEarly -1.8; mapLatePct -6.1; hrLate -1; apnoea false | TW: hrLate = -1 above [-30, -6] [tables §6.3: dexmedetomidine HR −10–20 %]<br>PL: mapLatePct = -6.1 in [-25, -5] [tables §6.3: SVR −10–20 % after the load]<br>WR: mapEarly = -1.8 (expected sign 1) [tables §6.3: biphasic — SVR +15 % during a fast load (noted as "not modelled in v1")]<br>HAND MI (automatic WR): the early pressor phase is declared "not modelled in v1" in the row (rows-anaesthetic.ts:81): missing, not reversed; the HR fall is also too weak (−1 vs −10–20 %) | **MI** | D1 · 7g rows-anaesthetic.ts |
| DI-35 | P3 | HOCM · dynamic LVOT obstruction → vasodilator / inotrope | — | no LVOT-obstruction state (research/12 §1.2 "LVOT obstruction (missing)") | **NE** | — · FU-7 state |

### 2.6 Antiarrhythmics, anticholinergics and rhythm

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-13a | P1 | X-A vent, VF arrest with CPR · VF → amiodarone 300 mg during CPR | rhythmsWithAmio 5s sinus,305s vfCoarse,1055s vfFine; rhythmsWithout 5s sinus,305s vfCoarse,1055s vfFine; etco2CPR 26.8; mapCPR 54.6; amioCe 2; stillVF vfFine | PL: amioCe = 2 (sign 1, tol 0) [the drug must reach an effect site during CPR (ALS 2021: amiodarone 300 mg after the third shock)]<br>HAND MI (automatic PL): amiodarone reaches its site (Ce 2 ref units) but nothing reads it during VF: the shock outcome context (l3/defib-pacer/outcome.ts:41–72) has only rhythm class, energy, VF duration and R-on-T — no antiarrhythmic, adrenaline, K⁺ or perfusion term | **MI** | D7 · DV/FU-7 (shock outcome has no drug or myocardial term) |
| DI-13b | P1 | X-A vent, AF with rapid ventricular response · AF ≈ 140/min → amiodarone 150 mg over 10 min vs esmolol 0.5 mg/kg | hrBase 157; hrAmio -27; hrEsmolol -16; mapPctAmio -9.7; mapPctEsmolol -8.3; avNodeAmio 0.1; rhythmsAmio 5s sinus,305s afib | PL: hrAmio = -27 in [-45, -10] [amiodarone slows AF conduction: HR −10 % and more with the AV-nodal effect (tables §6.2; ALS)]<br>PL: mapPctAmio = -9.7 in [-25, -3] [tables §6.2: SVR −10–20 % with the solvent on rapid injection]<br>PL: hrEsmolol = -16 in [-50, -12] [esmolol is the fast rate-control option (tables §6.2; FU-2 E-FU2-6 AV-nodal block)] | **PL** | — · 7g rows (amiodarone) / 7a rate rule |
| DI-14a | P1 | X-A vent, AVNRT 180/min · AV-node-dependent SVT → adenosine 6 mg then 12 mg | rhythms 1s sinus,301s svtAvnrt,369s pWaveAsystole,384s sinus; convertedS 24; pauseStartS 9; mapNadirDuringBlock 19; hrAfter 74 | PL: pauseStartS = 9 in [3, 30] [adenosine: AV block 3–10 s after the push, 10–30 s duration (research 03 §8.6; ALS)]<br>PL: convertedS = 24 in [5, 60] [AVNRT terminates and sinus resumes (ALS; 7g gate: standstill 8.9 s → sinus 23.5 s)] | **PL** | — · 7g hooks.ts |
| DI-14b | P1 | X-A vent, AF 140 · AF → adenosine 6 mg (transient slowing only) | rhythms 1s sinus,301s afib,369s avb3Narrow,384s afib; hrDrop -111; hrAfter90s -87; endRhythm afib; stayedAF true | PL: hrDrop = -111 in [-120, -10] [adenosine transiently slows AF and reveals the atrial activity, it does not convert it (ALS)]<br>PL: stayedAF = true (expected true) [the rhythm must return to AF, not convert to sinus (ALS)] | **PL** | — · 7g hooks.ts |
| DI-14c | P2 | X-A vent, pre-excited AF · WPW with AF → adenosine 6 mg (may accelerate) | rhythms 1s sinus,301s preexcitedAf; hrChange 0; hrDrop 0; vfSeen false | WR: hrChange = 0 (expected sign 1) [AV-nodal block in pre-excited AF can accelerate the accessory-pathway conduction (ALS; Miller ch. 25 arrhythmia) — a teaching hazard]<br>HAND MI (automatic WR): the adenosine hook (pk/hooks.ts:31) acts only on AV-node-dependent SVT, atrial rhythms and sinus; preexcitedAf is outside it and no accessory-pathway conduction exists | **MI** | D7 · FU-7 (no accessory-pathway hazard) |
| DI-61 | P1 | X-A vent, monomorphic VT with a pulse · VT 150/min → lidocaine 1.5 mg/kg vs amiodarone 150 mg | rhythmsLido 5s sinus,305s vtMono; rhythmsAmio 5s sinus,305s vtMono; lidoConverted false; amioConverted false; eitherConverted false; mapPctLido -0.3; mapPctAmio -6.3; lidoCe 2.3 | WR: eitherConverted = false (expected true) [lidocaine or amiodarone terminates a share of stable monomorphic VT (ALS; PROCAMIO) — no conversion hook exists: MI by hand]<br>PL: mapPctAmio = -6.3 in [-25, 0] [tables §6.2: amiodarone lowers SVR 10–20 % (hypotension on rapid injection)]<br>HAND MI (automatic WR): pk/hooks.ts has conversion paths for adenosine, LAST and magnesium only (lines 31–64); amiodarone/lidocaine carry no rhythm effect beyond the AV-node occupancy | **MI** | D7 · FU-7 (no antiarrhythmic → rhythm conversion except adenosine/Mg) |
| DI-54 | P2 | X-A vent, torsades · torsades de pointes → magnesium 2 g over 2 min | mgPeak 1.4; rhythmsI 5s sinus,305s torsades,470s sinus; rhythmsC 5s sinus,305s torsades; convertedS 110; mapEnd 90.6 | PL: convertedS = 110 in [5, 300] [magnesium 2 g terminates torsades within minutes (ALS; tables §6.2)] | **PL** | — · 7g hooks.ts |
| DI-18 | P2 | X-A vent, sevoflurane 1 MAC · GA volatile → adrenaline 100 µg (arrhythmia threshold under a modern volatile) | mapRise 26.2; hrRise 25; ectopy false; rhythms 5s sinus | PL: ectopy = false (expected false) [sevoflurane does not sensitise to catecholamines the way halothane did: no arrhythmia at 100 µg (Miller ch. 20; Navarro 1994 sevo threshold > 5 µg/kg s.c.)]<br>PL: mapRise = 26.2 in [10, 60] [adrenaline 100 µg IV pressor response (tables §6.2 push-dose 10–20 µg)] | **PL** | — · 7g (no catecholamine–volatile arrhythmia hazard: correct for sevoflurane, missing for halothane) |
| DI-62 | P1 | X-A vent · opioid bradycardia → fentanyl 10 µg/kg, then atropine 0.5 mg at the nadir | hrDropFentanyl -7; hrAfterAtropine 25; mapPctFentanyl -5.5; atropineRise 20 | TW: hrDropFentanyl = -7 above [-30, -8] [fentanyl 10 µg/kg: vagal bradycardia HR −10–20 % (tables §6.3; Miller ch. 22)]<br>PL: hrAfterAtropine = 25 in [8, 45] [atropine 0.5 mg reverses opioid bradycardia (Miller ch. 22; tables §6.2 HR +20–40 scaled by vagal tone)] | **TW** (FU-4 pending) | D5 · FU-4 G7 (vagal events) |
| DI-63 | P2 | X-A vent · GA → atropine 0.5 mg vs glycopyrrolate 0.4 mg (onset/offset) | atropinePeak 28; atropinePeakS 30; atropineAt30min 20; glycoPeak 19; glycoPeakS 80; glycoAt30min 17 | PL: atropinePeak = 28 in [15, 45] [tables §6.2: atropine 0.5–1 mg HR +20–40, onset < 1 min]<br>PL: atropinePeakS = 30 in [10, 180] [atropine onset < 1 min, peak ≈ 1 min (tables §6.2)]<br>PL: glycoPeakS = 80 in [60, 600] [glycopyrrolate onset 2–3 min (tables §6.2)]<br>PL: glycoPeak = 19 in [8, 25] [tables §6.2: glycopyrrolate HR +10–20] | **PL** | D2 · 7g rows-cardiovascular.ts |
| DI-15 | P2 | pre-excited AF · WPW with AF → verapamil | — | no calcium-channel blocker in the library (research/11 §2.13) | **NE** | D7 · FU-7 drug |
| DI-16 | P2 | heart transplant · denervated heart → atropine | — | no transplanted-heart profile (vagal tone is not a profile input) | **NE** | — · FU-7 profile |

### 2.7 LAST, electrolytes, metabolic, MH, bronchospasm, brain, kidney

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-23 | P2 | X-A vent · after a bupivacaine block dose → lidocaine 1.5 mg/kg IV on top of bupivacaine 100 mg (additive toxicity) | cnsBoth 0.9; cnsBupiOnly 0.9; cvBoth 0.5; cvBupiOnly 0.5; cnsExcess 0; mapPct -7 | WR: cnsExcess = 0 (expected sign 1) [local-anaesthetic toxicity is additive between agents (ASRA 2020; Miller ch. 25): lidocaine on top of bupivacaine must raise the CNS effect]<br>HAND TW (automatic WR): lidocaine adds nothing to bupivacaine (CNS effect 0.9 vs 0.9): pk/pipeline.ts:384–385 takes the maximum over agents, so toxicity is not additive — an interaction that is too weak, not a reversed one | **TW** | D14 · 7g pipeline (cnsE/cvE take the MAXIMUM, not the sum) |
| DI-24 | P2 | X-A vent · LAST: bupivacaine 225 mg IV → lipid emulsion 1.5 mL/kg + 0.25 mL/kg/min at the first sign | freeCeNoLipid 10; freeCeLipid 6.2; ratio 0.62; cvNoLipid 0.9; cvLipid 0.8; rhythmsNoLipid 5s sinus,330s sinusBrady,375s vfCoarse,1130s vfFine; rhythmsLipid 5s sinus,330s sinusBrady; arrestNoLipid true; arrestLipid false | PL: ratio = 0.62 in [0.4, 0.75] [ASRA 2020 / 7g gate: lipid lowers the free level ≥ 30 % (gate measured ×0.681)]<br>PL: arrestNoLipid = true (expected true) [7g decision 12: bupivacaine 225 mg → seizure, bradycardia, then VF at 78 s (untreated)] | **PL** | — · 7g LAST (NR-7g-4: the engine rig at 70 kg reaches VF; the demo at 80 kg did not) |
| DI-26 | P1 | X-A vent, profile K 7.0 · hyperkalaemia 7.0 → calcium chloride 1 g; insulin–dextrose; salbutamol 10 mg neb | kBase 7; dkCa5min 0; dkEcgCa -0.9; qrsBase 93; qrsAfterCa 93; dkInsulin30 -0.5; dkInsulin60 -0.9; dkSalbutamol30 -0.5; dkBoth30 -1.3 | PL: dkCa5min = 0 in [-0.15, 0.15] [calcium stabilises the membrane without lowering K (UK Renal Association 2023)]<br>PL: dkInsulin60 = -0.9 in [-1.1, -0.6] [insulin–dextrose: K −0.6 to −1.0 mmol/L at 30–60 min (UK Renal Association; 7c gate −0.87 at 60 min)]<br>PL: dkSalbutamol30 = -0.5 in [-1, -0.4] [nebulised salbutamol 10–20 mg: K −0.5 to −1.0 within 30 min (UK Renal Association)]<br>PL: dkBoth30 = -1.3 (sign -1, tol 0.5) [insulin and salbutamol are additive (UK Renal Association)] | **PL** | D6 · 7c treatments.ts |
| DI-27 | P2 | X-A vent, lactic acidosis (HCl load proxy) · metabolic acidosis at fixed minute ventilation → sodium bicarbonate 1 mmol/kg | phBefore 7.2; dPh 0.1; dEtco2 6.2; dPaco2 6.9; dIca -0.1; dNa 4.9; dHco3 4.2 | PL: dEtco2 = 6.2 in [3, 9] [7c decision 14: 1 mmol/kg at fixed MV raises EtCO2 5–8 mmHg within 1–3 min]<br>PL: dPh = 0.1 in [0.02, 0.2] [a small pH rise only (Miller ch. 47; 7c)]<br>PL: dIca = -0.1 (sign -1, tol 0.005) [alkalinisation lowers ionised calcium (Miller ch. 47)] | **PL** | — · 7c |
| DI-28 | P2 | X-A vent, class II bleed · class II haemorrhage → furosemide 40 mg | mapPct -5.1; uopDelta 103.7; cvpDelta -0.8; coPct -15.9 | PL: uopDelta = 103.7 (sign 1, tol 5) [furosemide 40 mg: diuresis within 5–30 min (7d Task 11)]<br>PL: mapPct = -5.1 (sign -1, tol 2) [diuresis on top of hypovolaemia lowers pressure further (Miller ch. 47)] | **PL** | — · 7d renal / 7g (venodilation only) |
| DI-64 | P2 | X-A vent · GA, normoglycaemia → insulin 10 U vs dextrose 25 g (glucose course) | gluBase 100; gluMinInsulin 52.5; dGluInsulin60 -35; gluPeakDextrose 309.2; dGluDextrosePeak 209; kDeltaInsulin -0.8 | PL: dGluInsulin60 = -35 in [-120, -30] [insulin 10 U IV: glucose falls over 30–60 min (Miller ch. 47; 7e glucose model)]<br>PL: dGluDextrosePeak = 209 in [60, 300] [25 g dextrose raises glucose at once (7e)]<br>PL: kDeltaInsulin = -0.8 (sign -1, tol 0.1) [insulin shifts K into cells (tables §5b.2)] | **PL** | — · 7e glucose.ts / 7c kShift |
| DI-65 | P1 | X-A vent, MH-susceptible · MH triggered by sevoflurane + succinylcholine → dantrolene 2.5 mg/kg at 20 min | etco2At10min 59.2; etco2At20min 96.3; tempAt20min 38.8; kAt20min 5.9; hrAt20min 145; dEtco2_10minAfterDantrolene -13.8; dHr20minAfter -33; dTempEnd -2.8 | PL: etco2At10min = 59.2 in [52, 70] [tables §7 check 21: EtCO2 40 → 60 by 10 min at constant MV]<br>PL: dEtco2_10minAfterDantrolene = -13.8 in [-40, -5] [tables §7 check 21: dantrolene 2.5 mg/kg → EtCO2 falls within 5–10 min]<br>PL: kAt20min = 5.9 in [5.5, 6.5] [tables §7 check 21: K 5.5–6.5 by 20 min] | **PL** | — · 7e thermal/MH + 7g dantrolene |
| DI-40 | P2 | X-A vent, bronchospasm severity 1 · bronchospasm → salbutamol 10 mg nebulised | paco2Peak 59; etco2Base 27.1; dPaco2 0; dEtco2 0.1; dSpo2 1; hrRise 28 | WR: dPaco2 = 0 above [-20, -2] [bronchodilation in 5–15 min (FU-6 R2; GINA)]<br>PL: hrRise = 28 in [3, 30] [salbutamol raises HR 10–20 % (tables §6.2 row)] | **WR** (FU-6 R2 pending) | D15 · FU-6 R2 (bronchodilator response) |
| DI-39 | P2 | X-A vent, TBI (brain mass 20 mL) · raised ICP → ketamine 1 mg/kg at constant PaCO2 | icpBase 12.5; dIcp 2.4; dPaco2 0.3; dCbf 0.2; mapDelta 6.2 | PL: dIcp = 2.4 (quiet, tol ±3) [Zeiler 2014 / Miller ch. 21: ketamine does not raise ICP at constant PaCO2 under controlled ventilation]<br>PL: mapDelta = 6.2 (sign 1, tol 1) [ketamine supports MAP, so CPP improves (tables §6.3)] | **PL** | — · 7d brain / 7g cbfVaso |
| DI-38 | P2 | AKI profile · renal failure → morphine 10 mg (M6G accumulation) | — | MI: no active metabolite (morphine-6-glucuronide) in the PK layer; `elim.renal 0.1` only scales clearance | **NE** | — · FU-7 (active metabolites) |

### 2.8 Disposition: TCI and flow, CSHT, onset/offset, antagonists, volatiles, placeholders

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-84 | P1 | X-A vent, class III bleed vs normovolaemia · haemorrhage, CO ≈ 3 L/min → propofol TCI Ce 3 µg/mL (Eleveld): delivered dose and achieved concentration | ceBleed10 3; ceNormal10 3; ceRatio 1; mapPctBleed -24.7; mapPctNormal -14; diBleed 46; diNormal 46 | TW: ceRatio = 1 below [1.2, 2] [a TCI model assumes a normal circulation: in haemorrhage the real concentration exceeds the target (Kurita 2002; Johnson 2003; FU-4 Task 14 S6b ratio ≥ 1.3)] | **TW** (FU-4 pending) | D11 · FU-4 G10 (flow-dependent distribution) |
| DI-67 | P1 | X-A vent · GA, TCI → propofol TCI Ce 3 µg/mL (Eleveld) — time to target and overshoot | tTo95pctS 140; cePeak 3; ceAt25min 3; diAt25min 46; mapPct -17 | PL: tTo95pctS = 140 in [100, 200] [7g gate: TCI Eleveld Ce 3 reaches 95 % at 2.35 min (band 2.1–2.6 min)]<br>PL: cePeak = 3 in [2.99, 3.01] [an effect-site TCI must not overshoot the target (7g gate: max Ce 3.0005)]<br>PL: diAt25min = 46 in [35, 60] [depth index 40–60 at propofol Ce 3 (7f depth; BIS convention)] | **PL** | — · 7g tci.ts |
| DI-44 | P2 | X-E 80 y HTN · GA maintenance → propofol 100 µg/kg/min for 60 min (cumulative hypotension, CSHT) | mapPct10 -6.2; mapPct60 -14.4; ce10 1.3; ce60 2.6; ceRatio 2 | TS: ceRatio = 2 above [1.15, 1.8] [a fixed-rate propofol infusion keeps accumulating over the first hour (Eleveld 2018 / Miller ch. 21 Fig. 21-8)]<br>PL: mapPct60 = -14.4 (sign -1, tol 5) [the hypotension deepens as Ce rises in an elderly hypertensive (Miller ch. 21)]<br>HAND PL (automatic TS): the engine reproduces the published Eleveld model to 1e-9 (7g gate); Eleveld itself gives Ce(60 min)/Ce(10 min) = 2.0 at a fixed 100 µg/kg/min in an 80-y patient. The 1.15–1.8 band was read off a Marsh-era figure, so the band, not the model, is off — recorded for Ali (Q-7g-1 family) | **PL** | — · 7g PK |
| DI-85 | P2 | X-A vent · TIVA maintenance → propofol plasma TCI 3 µg/mL (Eleveld) for 1 h vs 3 h, then off: 50 % plasma decrement and time to consciousness | cp1h 3; cp3h 3; csht1hMin 3; csht3hMin 5.5; wake1hMin 7.2; wake3hMin 8.7 | PL: wake1hMin = 7.2 in [4, 20] [emergence after propofol-only anaesthesia 5–15 min (Miller ch. 21; Hughes 1992 CSHT context)]<br>PL: wake3hMin = 8.7 in [5, 25] [emergence lengthens little with duration for propofol (Hughes 1992: CSHT < 25 min up to 3 h)] | **PL** | — · 7g csht / 7f depth |
| DI-86 | P2 | X-A vent · opioid infusion → fentanyl plasma TCI 2 ng/mL (Shafer) for 1 h vs 3 h, then off: 50 % plasma decrement (Hughes 1992 definition: constant Cp) | cp1h 2; csht1hMin 18; csht3hMin 72; ratio3to1 4 | PL: csht1hMin = 18 in [12, 40] [fentanyl CSHT ≈ 20 min at 1 h (Hughes 1992; Shafer model 17.8, 7g gate)]<br>PL: ratio3to1 = 4 in [3, 8] [fentanyl CSHT rises steeply: 3 h > 3 × 1 h (Hughes 1992; 7g gate decision 3: 17.8 → 70)] | **PL** | — · 7g csht.ts |
| DI-68 | P2 | X-A vent · GA maintenance → remifentanil 0.25 µg/kg/min for 60 min: offset (context-insensitive) vs fentanyl 250 µg bolus | remiCeSteady 6.5; remiHalfMin 4.3; fentPeak 4.8; fentHalfMin 18.2 | PL: remiHalfMin = 4.3 in [1.5, 5] [remifentanil 50 % decrement 2–4 min whatever the context (Kapila 1995; 7g gate CSHT 2.1 min flat)]<br>PL: fentHalfMin = 18.2 in [10, 90] [fentanyl context-sensitive half-time 17.8 min at 1 h and rises steeply (Miller ch. 22 p. 588; 7g gate)] | **PL** | — · 7g csht.ts |
| DI-88 | P2 | X-A vent / spontaneous · GA / sedation → time to peak effect: fentanyl 2 µg/kg, remifentanil 1 µg/kg, midazolam 0.05 mg/kg, rocuronium 1.2 mg/kg | fentTtpeS 215; remiTtpeS 85; midazDiNadirS 70; midazCePeakS 180; roc12OnsetS 45 | PL: fentTtpeS = 215 in [180, 270] [fentanyl time to peak effect 3.6 min (Shafer & Varvel 1991; Miller ch. 22)]<br>PL: remiTtpeS = 85 in [60, 120] [remifentanil TTPE 1.4–1.6 min (Minto 1997)]<br>TS: midazDiNadirS = 70 below [120, 420] (lower = stronger/faster) [midazolam: T½ke0 2–3 min, peak 3–5 min (Miller ch. 21 p. 532)]<br>PL: roc12OnsetS = 45 in [45, 90] [rocuronium 1.2 mg/kg: maximum block ≈ 1.0 min (label; Miller ch. 24)] | **TS** | D2 · 7g models / 7f nmb |
| DI-69 | P1 | X-A vent · GA → onset/offset of each induction agent (time to the MAP nadir and to recovery) | propLocS 60; thioLocS null; etomLocS null; ketLocS 5; propEmergenceS 440; thioEmergenceS 0; etomEmergenceS 0; ketEmergenceS 295; mapPctThio -20.6; mapPctEtom -1.8; mapPctKet 2.5; hrKet 8 | PL: propLocS = 60 in [20, 120] [propofol TTPE 90–100 s, loss of consciousness in one arm–brain circulation (Miller ch. 21 p. 515)]<br>WR: thioEmergenceS = 0 below [240, 900] [thiopental: awakening 5–10 min by redistribution (Miller ch. 21 Table 21.1)]<br>WR: etomEmergenceS = 0 below [150, 600] [etomidate: duration 3–5 min after 0.3 mg/kg (Miller ch. 21 p. 541)]<br>PL: mapPctThio = -20.6 in [-35, -12] [tables §6.3: thiopental SVR −20 %, Ees −15 %]<br>PL: hrKet = 8 in [8, 35] [tables §6.3: ketamine HR +15–20 %]<br>HAND MI (automatic WR): thiopental and etomidate never produce unconsciousness: 7f depth() reads only propofol, volatile, midazolam and ketamine (neuro/depth.ts:71, :80), although 7g publishes both in uHyp (combine.ts:88); ketamine LOC at 5 s is too fast (gamma shape) | **MI** | D2, D3 · 7f depth.ts (+7g gamma shapes) |
| DI-71 | P1 | X-A spontaneous · opioid overdose (fentanyl 5 µg/kg, air) → naloxone 0.4 mg | apnoeaSecondsNoNaloxone 0; apnoeaSecondsNaloxone 0; spo2MinNoNaloxone 91; spo2MinNaloxone 91; veRecoveryPct 173.1; reversalS 5 | PL: veRecoveryPct = 173.1 (sign 1, tol 5) [naloxone 0.4 mg reverses opioid ventilatory depression in 1–2 min (label; 7g gate: antagonist.opioid ≥ 1.4)]<br>TS: reversalS = 5 below [30, 180] (lower = stronger/faster) [naloxone IV onset 1–2 min (label; Miller ch. 22)] | **TS** | D2, D10 · 7g antagonists / 7f drive |
| DI-72 | P2 | X-A spontaneous · benzodiazepine oversedation (midazolam 0.15 mg/kg) → flumazenil 0.2 mg ×2 | diMinNoFlum 47; diAfterFlum 90; diDelta 22; conscRecoveredS 5; spo2Min 56 | PL: diDelta = 22 (sign 1, tol 2) [flumazenil reverses benzodiazepine sedation within 1–2 min (label; 7g decision 6 competitive antagonism)]<br>TS: conscRecoveredS = 5 below [30, 180] (lower = stronger/faster) [flumazenil onset 1–2 min (label)] | **TS** | D2 · 7g antagonists |
| DI-87 | P2 | X-A vent · volatile maintenance 1 MAC for 60 min → dial off at FGF 6 L/min: desflurane vs sevoflurane vs isoflurane emergence | macDes 1; macSev 1; macIso 1.1; wakeDesMin 5.9; wakeSevMin 8.1; wakeIsoMin 11.1; desToSev 0.73; isoToSev 1.37 | PL: desToSev = 0.73 in [0.5, 0.95] [desflurane emergence is faster than sevoflurane (Macario 2005 meta-analysis; Miller ch. 19: b/g 0.45 vs 0.65)]<br>PL: isoToSev = 1.37 in [1.05, 2.5] [isoflurane (b/g 1.46) emerges slowest (Miller ch. 19)]<br>PL: wakeSevMin = 8.1 in [4, 20] [eye opening 5–15 min after 1 h of ≈ 1 MAC sevoflurane without adjuncts (Miller ch. 19)] | **PL** | — · 7g volatile.ts / 7f depth |
| DI-70 | P2 | X-A vent · GA volatile → desflurane step 3 % → 12 % (sympathetic surge) vs sevoflurane step | macBeforeDes 0.4; macAfterDes 1.1; hrSurgeDes 1; mapSurgeDes 0; hrSevoStep -2; mapPctSevoStep -15.1 | TW: hrSurgeDes = 1 below [8, 35] [tables §6.3: a rapid desflurane rise above 1 MAC gives HR +20–30 %, MAP +20 % for 2–4 min]<br>PL: mapPctSevoStep = -15.1 (sign -1, tol 2) [a sevoflurane step deepens the hypotension instead (tables §6.3 Malan 1995)] | **TW** | D13 · 7g pipeline.ts desSurge |
| DI-19 | P2 | X-A vent · GA induction with a volatile → sevoflurane 2 % with 66 % N2O vs without (second-gas effect) | faFi5min_n2o 0.7; faFi5min_air 0.7; macBrain10min_n2o 1.1; macBrain10min_air 0.7; faN2o10min 50.6; secondGasDelta 0 | WR: secondGasDelta = 0 (expected sign 1) [concentration/second-gas effect: N2O uptake speeds the volatile FA/FI rise (Miller ch. 19 uptake and distribution)]<br>PL: macBrain10min_n2o = 1.1 in [1, 1.6] [sevo 2 % ≈ 0.8 MAC + 66 % N2O ≈ 0.63 MAC: total > 1 MAC (tables §6.3; MAC N2O 104 %)]<br>HAND MI (automatic WR): the two agents step independently (pipeline.ts:357–358, volatile.ts): no concentrating or second-gas term exists; the N2O MAC adds correctly (macBrain 1.1 vs 0.7) | **MI** | D13 · 7g volatile.ts (no shared alveolar uptake between agents) |
| DI-20 | P2 | X-A vent, simple pneumothorax · closed gas space → N2O 66 % | — | MI: N2O does not diffuse into closed gas spaces; `lungCondition ptxSimple` volume is not a gas compartment (research/11 §2.5) | **NE** | — · FU-7 (N2O gas-space expansion) |
| DI-73 | P2 | X-A vent, class III bleed · haemorrhage → tranexamic acid 1 g (placeholder row) | txaCe 1; hbDelta 0; mapDelta 0; bvRelDelta 0 | PL: txaCe = 1 (sign 1, tol 0) [the row exists and takes a dose (7g library), but has no PD: CRASH-2 mortality benefit works through bleeding, which needs 7i coagulation]<br>PL: hbDelta = 0 (quiet, tol ±0.05) [no effect is expected on today's main — the cell records the missing mechanism (R58 / 7i)] | **PL** | D15 · 7i (coagulation and fibrinolysis) |
| DI-74 | P2 | X-A vent · anticoagulation / reversal → heparin, protamine (absent) | — | no heparin or protamine row in the library (research/11 §2.13 "absent"); no coagulation state to act on | **NE** | D15 · 7i (R58) |
| DI-75 | P2 | obstetric · postpartum atony → oxytocin / carbetocin / ergometrine / carboprost (absent) | — | no uterotonic in the library and no uterus/fetus model (research/11 §2.13, §5.15) | **NE** | D15 · 7j (R59) |
| DI-76 | P2 | X-A vent · GA → dexamethasone 8 mg and ondansetron 4 mg (placeholder rows: quiet checks) | gluDelta 0; mapDelta 0; hrDelta 0 | WR: gluDelta = 0 below [10, 60] [dexamethasone 8 mg raises glucose ≈ 1–2 mmol/L over an hour (Miller ch. 47; Hans 2006) — the row is declared "no monitor effect in v1"]<br>PL: hrDelta = 0 (quiet, tol ±3) [ondansetron: no HR effect expected; its QTc prolongation is not modelled (row comment)]<br>HAND MI (automatic WR): the dexamethasone row is a declared placeholder (rows-other.ts:66, pd: []): the glucose rise is missing, not reversed | **MI** | D15 · 7e (glucose) / FU-7 (QTc) |

### 2.9 MANUAL subset (direction-only; Q9 open)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-M1 | P1 | X-A vent MANUAL · GA → propofol 2 mg/kg (MANUAL; MODELED twin DI-01a) | mapPct -21.1; mapMin 83.8; nadirS 180; hrUp 0; hrDown 0; coPct -4; svrPct -21; arrest false | PL: mapPct = -21.1 (sign -1, tol 5) [propofol lowers MAP (Miller ch. 21); the MANUAL size is Q9]<br>PL: arrest = false (expected false) [FU-4 rule, MANUAL too (audit 08 G9: MANUAL must share the arrest pathway)] | **PL** (FU-4 pending) | D1 · Q9 (MANUAL physiology) / FU-4 G9 |
| DI-M2 | P1 | X-A vent MANUAL, class III bleed · class III haemorrhage → propofol 2 mg/kg (MANUAL; MODELED twin DI-22) | mapBefore 52.9; mapMin 38.1; mapPct -30.1; hrBefore 80; arrest false | PL: mapPct = -30.1 (sign -1, tol 5) [propofol in hypovolaemia (Miller ch. 21)]<br>PL: arrest = false (expected false) [FU-4 rule, MANUAL too (audit 08 G9: MANUAL must share the arrest pathway)] | **PL** (FU-4 pending) | D1 · Q9 / FU-4 G9 |
| DI-M3 | P1 | severe AS + CAD 75 y MANUAL · severe AS → propofol 1.5 mg/kg then phenylephrine 100 µg (MANUAL; MODELED twins DI-48, DI-31) | mapPctProp -12.9; mapPhe 68.7; mapNoPhe 60.2; phePressor 10; hrPhe -2; arrest false | PL: mapPctProp = -12.9 (sign -1, tol 5) [tables §7 check 10 (direction)]<br>PL: phePressor = 10 (sign 1, tol 5) [phenylephrine restores MAP (tables §7 check 10)]<br>PL: arrest = false (expected false) [FU-4 rule, MANUAL too (audit 08 G9: MANUAL must share the arrest pathway)] | **PL** (FU-4 pending) | D1 · Q9 |
| DI-M4 | P1 | X-A vent MANUAL · GA → esmolol 0.5 mg/kg; atropine 1 mg; ephedrine 10 mg (chronotropes in MANUAL; MODELED twins DI-07, DI-63, DI-04a) | hrEsmolol 0; hrAtropine 0; hrEphedrine 0; hrModelAtropine 28; mapEphedrine 16; mapEsmolol -0.4 | WR: hrEsmolol = 0 (expected sign -1) [a direct negative chronotrope lowers HR whatever the mode (tables §6.2); Q9 decides whether MANUAL HR is the instructor’s]<br>WR: hrAtropine = 0 (expected sign 1) [atropine raises HR (tables §6.2); Q9]<br>PL: mapEphedrine = 16 (sign 1, tol 2) [ephedrine raises MAP (tables §6.2)] | **WR** | D15 · Q9 (MANUAL HR is the instructor’s) |


## 3. Ranked gaps and the smallest mechanism per gap

Ranked by clinical reach: how many cells a gap drives, weighted by P1 and by whether a trainee would see it in the first
minute. "FU-4 pending" means FU-4's plan (`scratch/plans-backup/fu-4-integration-polish.md`) already carries the fix.
The measured numbers are listed and not re-reported as new. Line numbers are on 3ff2fb0.

### D1 — FU-4 pending: anaesthetic sympatholysis is a gain scale, so the effect ignores the patient's state (G2)
- **Cells:** DI-01a, 46, 47, 48, 49, 36, 34, 78, 79 and the MANUAL twins DI-M1…M3.
- **Measured:** propofol 2 mg/kg lowers MAP by about 10 % whatever the patient:
  - healthy −10.1 %;
  - 80 y HTN −11.3 %;
  - HFrEF −10.4 %;
  - COPD −12.9 %;
  - AS + CAD 1.5 mg/kg −8.7 %;
  - β-blocked −10.4 %;
  - septic −15.5 %.
  HR rises 12–20 bpm. GTN falls by the same amount in severe AS as in a normal heart (extra fall +0.2 %).
- **Expected:** −25 to −40 % healthy, more in the elderly, in AS and in sepsis (Miller ch. 21; INTUBE).
- **Code:** `circ/model.ts:204` (`gSymp: m.prof.gSymp * de.gv`); the propofol row `rows-anaesthetic.ts:36–37`.
- **Fix, already planned:** FU-4 Task 2. Suppress the sympathetic OUTPUT and reset the set point (`symp`, `setF`). The
  prototype gives −31 % healthy, −30 % in the elderly and in AS, −28 % in HFrEF.
- **New on top of FU-4.** Task 2 changes only the propofol, sevoflurane and isoflurane rows. This run shows the same
  gain-scale failure in rows Task 2 leaves alone:
  - **dexmedetomidine:** HR −1 bpm vs −10–20 %, and no fall in MAP (DI-60);
  - **thiopental, midazolam and desflurane:** the same `gv`-only rows;
  - **opioids:** the hypnotic–opioid haemodynamic synergy is simply additive (DI-01c, excess −0.4 %).

  The smallest mechanism is to give these rows FU-4's `symp`/`setF` targets, sized per class:
  - α2 agonists: central sympatholysis (the main effect);
  - opioids: a small central sympatholysis;
  - benzodiazepines: a small one.

  Tests moved: `circ-sanity-1`, `neuro-circ`, the FU-4 S-suite; new DI-60 and DI-01c bands.

### D2 — the gamma effect curve gives near-instant onset to every drug without a compartment model (new)
- **Cells:** DI-69 (ketamine loses consciousness at 5 s), DI-71 (naloxone reverses in 5 s), DI-72 (flumazenil wakes in
  5 s), DI-88 (midazolam reaches 87 % of its peak effect at 30 s, DI nadir at 70 s), DI-63 (atropine peak at 30 s), and
  the early glycopyrrolate tachycardia in DI-17.
- **Code:** `pk/gamma.ts:10–27`. E(t) = (t/tp)ⁿ·e^{n(1−t/tp)}, with n solved from tp and t10. When t10/tp is large
  (naloxone 30, flumazenil 60, atropine 90, glycopyrrolate 60, midazolam 20, ketamine 15), n falls to 0.05–0.2. The
  curve is then flat-topped from t = 0, reaching 0.8 of its peak within seconds. 26 rows use the curve (every
  `gammaPk(...)` in `data/rows-*.ts`). The 19 with t10/tp ≥ 10 reach ≥ 60 % of their peak by 0.1·tp.
- **Smallest mechanism:** give the fallback curve a finite rise. Use the Bateman (effect-compartment) form
  E(t) ∝ e^{−k_el·t} − e^{−k_eo·t}, with k_eo and k_el solved from the row's tp and t10 exactly as n is today. It has
  zero initial slope and the same peak time and tail. The rows keep their numbers.
- **Tests moved:** `l2/pk/units-gamma.test.ts` ("peaks at 1 at tp and repeats add" still holds); the naloxone test in
  `pk-acceptance-pd.test.ts` (reversal within 3 min holds); onset cells DI-69/71/72/88/63.

### D3 — thiopental and etomidate do not cause unconsciousness or apnoea (new, P1)
- **Cells:** DI-69. Thiopental 4 mg/kg and etomidate 0.3 mg/kg never produce loss of consciousness. The patient stays
  "conscious" and keeps breathing, although the MAP change is right (thiopental −20.6 %, etomidate −1.8 %).
  DI-22/32/81/82 read haemodynamics only, so they pass.
- **Code:** 7g already publishes both agents in `bus.cns.uHyp` through `hypC50` (`combine.ts:86–88`). But 7f's
  `depth()` reads only propofol, volatile, midazolam and ketamine concentrations (`neuro/depth.ts:71`, `:80`), and so
  does `neuroResp` (`neuro/drive.ts:51–55`).
- **Smallest mechanism:** 7f reads a hypnotic-equivalent from the bus for every row with `hypC50`, not one field per
  agent. That means adding etomidate and thiopental to u, `hypnotic` and dHyp with the rows' own C50s.
- **Tests moved:** `l2/neuro/depth-drive.test.ts` (new cases); DI-69.

### D4 — chronic β-blockade barely shifts β-agonist drugs (new)
- **Cells and measured:**
  - DI-04a: the ephedrine pressor response under β-blockade is 1.12× the healthy one (expected ×0.5).
  - DI-05: adrenaline 100 µg raises HR by the same +12 bpm with or without β-blockade, and there is no reflex
    bradycardia.
  - DI-41: in anaphylaxis, adrenaline works as well in the β-blocked patient (ratio 0.94, expected 0.2–0.8).
  - DI-83: dobutamine is the exception (ratio 0.56, plausible).
- **Code:** `engine.ts:489` passes `circ.prof.betaBlockC` (0.5 for `betaBlocked`, `circ/profile.ts:193`) as the drug
  occupancy. Competitive antagonism at occupancy 0.5 is a dose ratio of 2 (`combine.ts:44`, `pd.ts:11–14`), which a
  100 µg adrenaline bolus (Ce ≫ EC50) overrides. The 0.5 is really the tables' "baroreflex contractility gain ×0.5",
  reused as a receptor occupancy.
- **Smallest mechanism:** give the profile its own drug β-occupancy (for chronic metoprolol-like blockade, a dose ratio
  of about 5–20 for β1). It enters the EC50 shift, while the baroreflex keeps `betaBlockC`. Non-selective blockade adds
  β2, so adrenaline's `svr` β2 row is blocked and the α rise goes unopposed.
- **Tests moved:** `pk-acceptance-pd.test.ts` "dobutamine … β-blocked profile ≤ half" (still passes);
  `circ/model-sanity` β-blocked rows; DI-04a/05/41.
- **Related, in the state itself (DI-04c).** The β-blocked patient in class III haemorrhage peaks at HR 71 (tables
  17b: 80–95) and holds SBP 98, higher than the healthy patient's 92 (tables: 65–80, earlier hypotension). The healthy
  heart's loss of β-reflex tachycardia is fully replaced by α vasoconstriction. The missing piece is β1-mediated renin
  release. FU-4's new humoral arm (vasopressin, angiotensin, adrenal; 9th-cap ruling 2) should carry a β1 → renin term
  so that β-blockade removes the angiotensin share. Owner: FU-4 humoral arm, with this term added.

### D5 — FU-4 pending: vagal events (G7)
- **Cells:** DI-01b (remifentanil 1 µg/kg HR −4 bpm, expected −15 to −30 %), DI-62 (fentanyl 10 µg/kg −7 bpm),
  DI-17 (neostigmine alone −19 bpm, plausible).
- **Code:** opioid rows `hr −0.25` (`rows-anaesthetic.ts:87`, `:96`), a multiplier the reflex undoes.
- **Fix, already planned:** FU-4 Task 12 (`vagalMs`, `muscarinic`).

### D6 — FU-4 pending: potassium acts on morphology only (G3)
- **Cells and measured:**
  - DI-37a: burns + succinylcholine give K⁺ 10.7 mmol/L (a rise of 6.5), QRS 259 ms, and no arrest.
  - DI-37b: calcium chloride narrows the QRS only to 227 ms, and there is no arrest in either arm.
  - DI-26: a profile K⁺ of 7.0 shows QRS 93 ms, because the ECG reads K⁺ relative to the profile
    (`blood/pipeline.ts:210`). The K⁺ kinetics of calcium, insulin and salbutamol are plausible.
- **Fix, already planned:** FU-4 Task 7. Its prototype gives burns + succinylcholine VF at 525 s, prevented by calcium.
- **New on top of FU-4.** The succinylcholine K⁺ surge needs one source of truth (DI-37c, IN): 7f's
  `neuroProfile nm 'burn' | 'denervation'` changes rocuronium sensitivity (`neuro/interactions.ts:38–41`), but only
  `blood.burns` drives 7c's K⁺ rise. Denervation + succinylcholine gives +0.5 mmol/L (expected +3–7). The smallest
  mechanism is for 7c's succinylcholine K⁺ term to read the nm profile too (burn, denervation, prolonged
  immobilisation).

### D7 — antiarrhythmics do not act on rhythm, and shock success has no drug term (new)
- **Cells:** DI-13a (amiodarone during VF), DI-61 (lidocaine or amiodarone for stable VT: never converts), DI-14c
  (adenosine in pre-excited AF: no acceleration).
- **Code:** `pk/hooks.ts:26–65` only has adenosine, LAST and magnesium. The shock outcome (`l3/defib-pacer/outcome.ts:41–72`)
  depends on rhythm class, energy, VF duration and R-on-T. It has no antiarrhythmic, adrenaline, K⁺ or perfusion
  (CPR quality) term.
- **Smallest mechanism:**
  - a per-drug conversion hazard in `hooks.ts`: amiodarone and lidocaine convert VT/AF at a rate set by Ce, per ALS
    and PROCAMIO;
  - antiarrhythmic occupancy as a factor on `VF_TABLE.rosc` in `outcomeProbabilities` (ALS 2021; ARREST/ALPS trials);
  - an accessory-pathway rhythm row whose ventricular rate rises when AV-node block exceeds 0.5.

  Owner: FU-7 or the DV run (after FU-4's arrest machine).

### D8 — a noxious stimulus is buffered away by the baroreflex, so pressor-response pharmacology cannot be taught (new, P1)
- **Cells and measured:** DI-08. Laryngoscopy (7e stimulus 1.5) after propofol raises MAP by only a few mmHg, and
  labetalol changes nothing. A 5-min stimulus 1.0 after propofol gives +2 mmHg; awake it gives +12.
- **Expected:** +20–40 mmHg and HR +20–30 within 30–60 s (Miller, airway management).
- **Code:** the 7e stress output multiplies HR set point and SVR (`endo/effects.ts:51–52`). The baroreflex then sees
  the MAP rise against an unchanged set point and withdraws tone (`circ/baroreflex.ts`, `circ/model.ts:204`). Onset τ
  25 s is right (`endo/params.ts:5`).
- **Smallest mechanism:** central sympathetic activation from nociception resets the baroreflex set point upward
  (FU-4's `setF` path, with the opposite sign), so the reflex defends the new pressure instead of cancelling it.
- **Owner:** 7e/7a, the SP run. It unblocks the opioid-blunting and β-blocker-before-laryngoscopy cells.

### D9 — ketamine's pressor effect is a direct multiplier, so it persists when catecholamines are exhausted (new)
- **Cells and measured:** DI-21. In the cold (catecholamine-depleted proxy) sepsis phase, MAP rises +1.8 % (healthy
  +1.5 %). Expected: a fall, as the direct myocardial depression is unmasked.
- **Code:** `rows-anaesthetic.ts:47` puts `hr +0.35` and `svr +0.4` on 7a directly.
- **Smallest mechanism:** move ketamine's sympathomimetic arm to 7e's central sympathetic drive (`extraSymp`), which
  saturates and falls with depletion. Keep the direct Ees −0.2.
- **Tests moved:** DI-21, DI-80, DI-82; the ketamine rows in `neuro-circ`.

### D10 — respiratory synergy is weak, and the apnoea flag contradicts the breathing (new)
- **Opioid overdose is buffered by the chemoreflex.** Fentanyl 5 µg/kg on air (DI-71's control) never takes VE below
  1 L/min, and SpO₂ bottoms at 91 %. In a spontaneously breathing adult this is an apnoeic overdose. The 7f flag
  counted 1255 s of "apnoea" here: the same contradiction as DI-89.
- **DI-03, too weak (Bailey 1990).** Fentanyl 2 µg/kg + midazolam 0.05 mg/kg on room air gives SpO₂ 93 % and no
  apnoea (VE −48 % vs fentanyl alone −43.5 %). Expected: SpO₂ < 90 % in 11/12 and apnoea in 6/12.
  - Code: `neuro/drive.ts:57` `syn = 1 − 0.5·dOp·dHyp`, a small product term.
  - Smallest mechanism: put the opioid–hypnotic ventilatory interaction on the same Greco response surface the CNS
    uses (`pd.ts:23–24`, α 1.5), so a sedative dose of midazolam shifts the opioid's ventilatory C50.
- **DI-89, inconsistent.** The 7f `apnoea` flag and the "apnoea" neuro mark are computed from drug depression alone
  (`drive.ts:64`). In MODELED the chemoreflex (`neuro/spont.ts`) breathes on regardless, so the flag stays set for
  255 s while spontaneous VE is up to 8.4 L/min.
  - Smallest mechanism: the flag is the chemoreflex's own zero-rate state, so there is one truth.

### D11 — FU-4 pending: IV PK is blind to cardiac output (G10)
- **Cells and measured:**
  - DI-66: a propofol bolus in class III (CO 2.9 L/min) peaks at 1.13× the normal Ce (target ≥ 1.3).
  - DI-84: a TCI in class III reaches exactly its target (ratio 1.0), where a real patient overshoots.
- **Fix, already planned:** FU-4 Task 14 (flow-dependent V1 and inter-compartment clearances). Its prototype gives a
  ratio of 2.01.

### D12 — the magnesium drug and the magnesium profile disagree; calcium has no NMB term (new)
- **DI-25:** profile Mg 2.5 prolongs rocuronium by +39 % (plausible). Calcium does not shorten it (0 min). Code:
  `neuro/interactions.ts:23–45` has no calcium term.
- **DI-90, inconsistent:** magnesium sulfate 60 mg/kg raises 7c's blood Mg to 2.1 mmol/L but prolongs rocuronium by
  only +0.5 %, where the profile Mg 2.5 of DI-25 gives +39 %. 7f reads the profile field `mgMmolL` only
  (`neuro/pipeline.ts:186`).
- **Smallest mechanism:** 7f reads 7c's `blood.out.mg` and `iCa` (the profile Mg becomes the blood baseline), with
  calcium antagonism as an EC50 multiplier.

### D13 — volatile interactions (new)
- **No second-gas or concentration effect (DI-19, MI).** With 66 % N₂O, sevoflurane FA/FI at 5 min is 0.70, the same as
  in air. `pk/volatile.ts:59` updates each agent's FA independently (`pipeline.ts:357–358`).
  - Smallest mechanism: N₂O uptake adds an inflow of inspired gas (augmented ventilation, VA + U_N₂O) and concentrates
    the remaining alveolar gas.
- **The desflurane surge never fires on a vaporiser step (DI-70).** Dial 3 → 12 % gives HR +1 bpm. The trigger reads
  brain MAC rising > 0.3 in 60 s (`pipeline.ts:404`), which the brain compartment never does.
  - Smallest mechanism: trigger on the rise of the inspired/end-tidal fraction (the airway-receptor mechanism, Weiskopf
    1994).
- **Volatile potentiation of rocuronium is too strong (DI-51, TS).** Sevoflurane 1 MAC prolongs the T1 25 % time by
  +127 % (expected 25–80 %). The [ENG] divisor 1 + 0.5·MAC (`neuro/interactions.ts:24`) acts on a steep Hill.
  - Smallest mechanism: size the divisor against a potentiation-of-duration source, not against EC50.

### D14 — local-anaesthetic toxicity takes the worse agent, not the sum (new)
- **Cells and measured:** DI-23. Lidocaine 1.5 mg/kg on top of bupivacaine 100 mg adds nothing (CNS effect 0.9 vs 0.9).
- **Code:** `pk/pipeline.ts:384–385` (`Math.max`).
- **Smallest mechanism:** a fractional-threshold sum, Σ cᵢ/thᵢ, into one Hill (ASRA 2020: additive toxicity).

### D15 — smaller gaps
- **Histamine is published but nothing consumes it (DI-42).** Fast morphine 10 mg gives MAP −3.6 % (expected −8 to
  −25 %). `combine.ts:107`. The smallest mechanism is for 7a (SVR, venous capacitance) and 7b (bronchial tone) to read
  `bus.airway.histamine`.
- **Sugammadex has no cardiac or anaphylactic hazard (DI-45, MI).** `rows-cardiovascular.ts:18` has `pd: []`.
- **Placeholder rows:**
  - dexamethasone has no glucose effect (DI-76, MI; 7e owner);
  - tranexamic acid has no fibrinolysis target (DI-73; 7i);
  - heparin, protamine and uterotonics are absent (DI-74/75, NE; 7i, 7j).
- **Inotrope and vasodilator sizes, R44 calibration (TW):**
  - dobutamine in HFrEF: CO +18 % vs +20–40 % (DI-12/32; the known `it.fails` in `pk-acceptance-pd.test.ts:59`);
  - milrinone in RV failure: PVR −19 %, CO +8 % (DI-11);
  - GTN in RV infarct: −13 %, and fluid +3 mmHg (DI-33);
  - esmolol 0.5 mg/kg: HR −4 bpm vs −10–20 % (DI-07; the bolus Ce vs the EC50 of 250 rate-equivalent).
- **Ephedrine tachyphylaxis is too strong (DI-57, TS).** In class II, three 10 mg doses add +6.4, +2.4 and
  +0.3 mmHg. The repeat ratio is 0.37, then 0.05, against ×0.7 per repeat. The 0.7 dose scale
  (`pipeline.ts:274–275`) compounds with a Hill whose EC50 is one 10 mg dose (`rows-cardiovascular.ts:33`), so the
  summed doses saturate. Smallest mechanism: set the EC50 to several doses, so the tachyphylaxis factor alone sets the
  repeat response. That moves `pk-acceptance-pd` "third dose ≤ 0.6 × the first", which still passes at 0.49.
- **Sugammadex at PTC 2 is 1 s faster than the band (DI-52, TS, marginal).** TOFR 0.9 at 2.08 min vs 2.1–4.3; label
  median 2.7. Neostigmine at the same depth takes 26 min (plausible).
- **Adrenaline in grade III anaphylaxis is strong (DI-41).** 100 µg ×2 raises MAP +71 mmHg in X-A (band 10–60). This
  is secondary to D4.
- **FU-6 R2 pending: no bronchodilator response (DI-40).**
- **FU-4 G8 pending:** the warm-sepsis baseline is HR 185, CO 4.7. Noradrenaline response ratio 0.2 (DI-10, expected
  0.3–0.85); `endo/conditions.ts:33` vasoResp.
- **MANUAL (Q9): drug chronotropy is ignored.** Esmolol, atropine and ephedrine change displayed HR by 0 (the model HR
  moves +28 with atropine) (DI-M4). MANUAL HR is the instructor's (`hemo/pipeline.ts` set-and-hold). Whether a drug
  may move it is Ali's Q9.

## 4. Proposed scripted suite (the owners' acceptance cells)

The suite is `research/14-audit-scripts/` as it stands: `cli.ts all` re-runs every cell on a pinned worktree in about
an hour of wall time, and `report.ts` prints the table. Each owning stage adopts its cells as follows:

| owner | cells to re-measure at its gate (verdict must move to PL, or the band goes to Ali) | acceptance items |
|---|---|---|
| **FU-4** (G2, G3, G7, G8, G10, G9/MANUAL) | DI-01a/b, 36, 46–49, 78, 79, 34, 58, 22, 37a/b, 62, 17, 10, 66, 84, M1–M3 | propofol −25 to −40 % healthy and more in X-E/AS/sepsis; remifentanil HR −15 to −30 %; burns + sux → VF, prevented by Ca; class III TCI Ce ratio ≥ 1.2; no healthy-counterpart arrest (DI-01a, 07, 81) |
| **FU-4 follow-on** (extend `symp`/`setF` to more rows) | DI-01c, 60, 02 (MAP), 79 | dexmedetomidine HR −10–20 % and MAP −5 to −25 % after the load; propofol + remifentanil more than additive |
| **7g** (gamma shape, β-occupancy, LAST sum, desflurane trigger, second gas, antiarrhythmic hooks) | DI-69, 71, 72, 88, 63, 04a, 05, 41, 23, 70, 19, 13a, 61, 14c, 57, 44, 85, 86 | naloxone/flumazenil onset 30–180 s; midazolam nadir 2–7 min; ketamine LOC ≥ 30 s; ephedrine ×0.3–0.7 under β-blockade; LAST additive; desflurane surge on a dial step; FA/FI second-gas rise |
| **7f** (depth for every hypnotic; drive surface; apnoea flag; Mg/Ca from 7c) | DI-69, 03, 89, 25, 90, 51 | thiopental/etomidate LOC and apnoea; Bailey pair SpO₂ < 90 %; flag = breathing; drug Mg potentiates like profile Mg |
| **7c** (sux K from the nm profile) | DI-37c, 37d | denervation + sux K +3–7 |
| **7e / 7a** (nociceptive set-point reset; ketamine via central drive; dexamethasone glucose) | DI-08, 21, 76 | laryngoscopy +20–40 mmHg, labetalol ×0.2–0.8; ketamine falls when depleted |
| **FU-6** | DI-40 | salbutamol bronchodilation in 5–15 min |
| **FU-7 / DV / 7i / 7j** | DI-06, 13a, 14c, 15, 16, 20, 30, 35, 38, 43, 45, 61, 73–75 | designed-but-NE cells with their expected responses |

For each gate the owner runs `node --import ./hooks.mjs cli.ts <ids>` against its branch's worktree and pastes
`report.ts` rows into its gate note next to this run's column (research/12 §7 regression rule).

## 5. Questions for Ali (with the model's numbers)

1. **Chronic β-blockade and vasopressors (D4).** Should a chronically β-blocked patient (metoprolol/bisoprolol, the
   commonest case) respond to ephedrine 10 mg at about half the healthy rise (the tables' ×0.5)? And should adrenaline
   100 µg give unopposed-α hypertension with reflex bradycardia only under NON-selective blockade (propranolol)? Today
   the ephedrine ratio is 1.12, the adrenaline HR rise is +12 in both, and the anaphylaxis rescue ratio is 0.94. If
   yes, the profile needs a selectivity field (β1 / non-selective).
2. **β-blockade and induction (DI-79).** With no reflex tachycardia (HR +5 vs +19), the β-blocked patient's propofol
   fall is the same as the healthy one's (−10.4 vs −10.1 %). Do you teach chronic β-blockade as a post-induction
   hypotension risk (some cohorts say yes, Reich 2005 does not list it)? If yes, the extra fall comes from FU-4's
   output-suppression model, not a separate term.
3. **Laryngoscopy after propofol alone (DI-08).** What pressor response should a 2 mg/kg propofol-only induction show
   at laryngoscopy: +20–40 mmHg / HR +20–30 (the classic teaching), or smaller in the elderly? The model gives
   +2–4 mmHg, so labetalol/opioid blunting cannot be shown.
4. **Onset times of "gamma" drugs (D2).** For naloxone 0.4 mg IV and flumazenil 0.2 mg, is the reversal onset of
   1–2 min (label) the target? Today it is 5 s. Same for midazolam: peak sedation 3–5 min (today 30 s).
5. **Propofol CSHT (Q-7g-1 again, now with numbers).** With a constant plasma target of 3 µg/mL (Hughes's
   definition), the engine's Eleveld gives a 50 % plasma decrement of 3.0 min after 1 h and 5.5 min after 3 h.
   Emergence is at 7.2 and 8.7 min, which is plausible. Fentanyl on the same test gives 18 and 72 min, which matches
   Hughes. Hughes 1992's propofol CSHT is 20–25 min at 3 h. Should we keep Eleveld (the modern model, which gives the
   right emergence times) and teach the short CSHT from it?
6. **Volatile potentiation of rocuronium (DI-51).** 1 MAC sevoflurane prolongs rocuronium's clinical duration by
   +127 % (30.8 → 70 min). Is +30–80 % your experience? The model's divisor is [ENG].
7. **MANUAL and drugs (Q9, DI-M4).** In MANUAL the displayed HR is the instructor's, so esmolol, atropine and ephedrine
   move it by 0, while pressure responds (propofol −21 %, phenylephrine +10 mmHg). Should drugs move the instructor's
   HR in MANUAL, as they move pressure?
8. **Sepsis baseline (DI-10, DI-78).** Warm sepsis on this commit is HR 185, MAP 80, CO 4.7. Noradrenaline
   0.1 µg/kg/min adds +5 mmHg (healthy +26, ratio 0.2), and propofol then falls −15.5 % to MAP 63. Is 0.3–0.85 the
   right noradrenaline-responsiveness band before FU-4's G8 work, or should septic shock need ≥ 0.2 µg/kg/min to move
   MAP 10 mmHg?
9. **Missing drugs worth adding before FU-7 (library).** Glucagon (β-blocked anaphylaxis), a calcium-channel blocker
   (pre-excited AF teaching, DI-15), hydrocortisone, nitroprusside and heparin/protamine. Which are Iranian-practice
   priorities?

## 6. Files and how to re-run

All files are in `research/14-audit-scripts/`. Nothing in the repo was changed.
- `runner.ts`: the arm runner. It loads the engine from `PME_ENGINE`, builds commands, samples the committed state
  read-only every `dt`, and derives rhythm transitions from the sampled rhythm id. Keep that last rule: the
  `rhythmSegment` event fires only for templated AF.
- `spec.ts`: the cell type, contexts, rigs and measure helpers. It carries the `invert` (lower = stronger/faster),
  `hand` (auditor confirmation) and `known` (another stage's pending fix) fields.
- `grade.ts`: automatic grading. `regrade.ts` re-applies the current specs to stored values without re-running.
- `cells-a.ts` … `cells-g.ts`: the cells by family. A–E are the first auditor's, corrected on resume and marked
  "resume fix". F and G were added on resume.
- `cli.ts`: runs the cells and stores them in `out/cells.json`, or in `DI_OUT=<file>` for a concurrent partial run,
  which `merge.ts <file>` folds back in.
- `report.ts`: writes `out/matrix.md`, the §2 tables. `ledger.ts`: writes `out/ledger.md`, the research/12 §4.4
  ledger.
- `hooks.mjs`: the JSON import-attribute shim.

To re-run on another commit:

```
git -C <repo> worktree add --detach <wt> <commit> && (cd <wt> && npx -y pnpm@9.15.9 install --frozen-lockfile)
cd research/14-audit-scripts
PME_ENGINE=<wt>/packages/engine-core/src/index.ts node --import ./hooks.mjs --experimental-strip-types cli.ts all
node --experimental-strip-types report.ts > out/matrix.md && node --experimental-strip-types ledger.ts > out/ledger.md
```

`cli.ts DI-37` re-runs one family prefix; `cli.ts new` runs only the cells not yet stored.
