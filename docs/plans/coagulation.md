# Haemostasis in the engine: the bleeding, transfused patient and the tests that read it — Plan

**STATE OF READINESS (12 November 2026, brief 216; the plan of brief 191).** This is a design document; it contains no
code. Base: `origin/main` 45dc8511, with `origin/coagulation-sources` 386f8f8e (PR 462, the source note) merged in so
the citations resolve. Worktree `scratch/wt-plan-coagulation`, branch `plan-coagulation`.

- **Settled by this plan:**
  - the clinical inventory (§1, 52 rows), every row cited to the source note and either given a piece or put to the
    owner as a question;
  - the state the engine carries (§2.1) and why it is that granularity;
  - which readings are direct and need no new relation: fibrinogen (Clauss), the platelet count, anti-Xa and heparin
    level, FIBTEM A5 (§2.4);
  - eight arithmetic checks in which plain mass balance on the sourced contents reproduces the sources' own
    increments and dilution thresholds (§2.11). These become acceptance tests.
- **The critical path is one missing relation (gap G1, question CQ1):** none of the sources read gives the curve from
  clotting-factor activity to PT seconds or aPTT seconds. PT/INR, aPTT, and with them the reversal pieces (heparin's
  aPTT, warfarin, PCC, the DOACs) wait on it. Fibrinogen, the platelet count, the factor pools, the products, and the
  in-vivo effects of temperature and calcium do not. So the build starts with them (§4).
- **Waits for papers:** the sources reviews C0a–C0d (§4), each on papers the owner supplies (§5.2).
- **Waits for his rulings:** CQ1–CQ12 (§6). CQ1 (the clotting-time relation), CQ2 (diffuse bleeding as volume) and CQ3
  (the hypothermia validation cells) change the structure.

**How to read the citations.** Every clinical statement cites its source as the source note gives it:
- **M45**, **M46**: Miller's Anesthesia 10th ed., ch. 45 (transfusion) and ch. 46 (coagulation), printed page;
- **L1–L22**: the papers of the source note §5a, by table or section; **[ABS]** marks a paper read as abstract only;
- **SN §x**: the section of the source note `docs/research/coagulation-sources.md` that holds the line;
- **NB §x**: the earlier notes on the other chapters (`scratch/191-src/notes-B-other-chapters.md`, in the project's
  scratch folder, not in the repository; see §7 and CQ12): M62 trauma, M58 obstetrics, M50 cardiac, M14 liver,
  S16/S23/S32 Stoelting's Co-Existing Disease 8th ed., D26/D66/D74 Parrillo & Dellinger Critical Care 5th ed.

Number tags follow the project's rule:
- a number with a source has the source beside it;
- a number no source gives is a **named gap** (G1–G18, collected in §2.12) with the paper that would settle it;
- a gap is never filled by a value chosen here. Where the owner allows a marked placeholder (CQ1, CQ2), it is written
  `[GAP-PH: Gn]` in code and shown as such in the model docs.

---

## 1. The clinical inventory

What an anaesthetist meets in a bleeding, transfused patient, from the sources. The columns:
- **Today** is what the engine has;
- **Piece** is where the plan builds it (§4), or the question that decides it (§6).

### 1.1 Normal haemostasis and the test basics

| # | Item | What the sources say | Today | Piece |
|---|---|---|---|---|
| I1 | Balance of procoagulant and counter-regulatory pathways | Endothelium, platelets and plasma proteins play "equally important" roles (M46 p. 1432, SN §1a); counter-regulation by fibrinolysis, TFPI, protein C, serpins (M46 pp. 1435-1436) | nothing | C2, C6 (the state of §2.1) |
| I2 | Factors are liver-made zymogens; VIII and vWF are not liver-made | M46 p. 1434; liver makes all factors except III, IV, VIII and vWF (M14 p. 305, NB §13); D74 p. 1225 differs on VIII | liver's `[FIT]` INR only (`l2/liver/liver.ts:76`) | C2 (synthesis), CQ6 |
| I3 | Platelet life, production, consumption | Lifespan 8-12 days, about 10 % consumed daily, 1.2-1.5 x 10^11 formed daily (M46 p. 1433); 7-10 days (M46 p. 1446): disagreement (SN §1c); about one third sequestered in the spleen, life 9-10 days (S23 p. 482, NB §13) | nothing | C1 |
| I4 | Factor half-lives | Factor VII and protein C 3-6 h, factor II about 60 h (M46 p. 1446); VII 4 h, fibrinogen 4 days (M14 p. 307, NB §13); FVIII about 12 h (L19; S23 p. 480); IX 18-24 h, XIII 11-14 days (S23 pp. 480-482, NB §16); fibrinogen 69.3 h in congenital afibrinogenaemia (L14) | nothing | C2 |
| I5 | PT/INR: what it reads | Extrinsic and common pathway; fibrinogen, II, V, VII, X; more sensitive to VII and X; "factor levels as low as 40% to 50% may not prolong the PT"; INR = (PT/standard PT)^ISI (M46 p. 1441); no printed normal range (SN §2a) | INR from the liver term only | C4 (blocked on G1) |
| I6 | aPTT: what it reads | Intrinsic and common; most sensitive to VIII and IX; levels below 30-40 % detected, some reagents not until below 15 %; laboratory-specific (M46 p. 1441); XII, prekallikrein or HMWK deficiency prolongs the aPTT without bleeding (M46 p. 1434) | absent | C4 (blocked on G1) |
| I7 | By construction 2.5 % of healthy people have an abnormal PT or aPTT | M46 p. 1436 | absent | C12 (ranges), CQ4 |
| I8 | Tests run on recalcified citrated plasma at 37 °C | Low iCa is not shown by the tests (L12 R31 rationale, SN §2a); ACT and viscoelastic assays are warmed to 37 °C, so a hypothermic effect is hidden (M50 p. 1585, NB §17); laboratory tests may be normal despite hypothermic coagulopathy (D66 p. 1115, NB §19); standard tests did not differ in mildly hypothermic patients (L17) | n/a | §3; CQ3 |

### 1.2 Loss, dilution and consumption

| # | Item | What the sources say | Today | Piece |
|---|---|---|---|---|
| I9 | Dilution by crystalloid, colloid and red cells | The most important causes are dilution "by volume administration (e.g., crystalloid, colloid, PRBC)" and the duration of hypotension (M45 p. 1420); colloids dilute like crystalloid (M62 p. 2023, NB §4) | albumin and globulins dilute (`fluids.ts`); no factors | C1, C2 |
| I10 | Which falls first | With plasma-poor red cells and colloid: fibrinogen reaches 1.0 g/L at 142 % of blood volume lost (117-169 %); platelets reach 50 x 10^9/L at 230 % (169-294 %); prothrombin, FV, FVII critical at 201, 229, 236 % (L9 [ABS]); Hirshberg's model: the PT reaches its critical level first (D26 p. 370, NB §18): disagreement, see §2.11 | nothing | C1, C2, C4 (acceptance §2.11) |
| I11 | Whole blood keeps fibrinogen | Fibrinogen "remained unchanged" with whole blood unless DIC (M45 p. 1422, Fig. 45.10) | whole blood moves volume and electrolytes only | C3 |
| I12 | Stored blood loses FV and FVIII | FV and FVIII 50 % and 30 % at 21 days, about 20 % at 35 days; absent from packed cells; "only 5% to 20% of factor V and 30% of factor VIII are needed" (M45 p. 1421) | storage moves K and lactate (`storedComp`) | C3 |
| I13 | Platelets fall less than dilution predicts | Observed counts rarely fall as low as dilution predicts; release from spleen and marrow (M45 pp. 1420-1421, Fig. 45.8) | nothing | C1 (splenic pool) |
| I14 | Platelet thresholds and bleeding | Thrombocytopenia < 150 or a fall > 50 %; surgical bleeding usually not until < 50; spontaneous < 10; < 75 "a reasonably accurate guide" to dilutional bleeding (M45 pp. 1420-1421); bleeding incidence by count (Table 45.10 p. 1409: > 100: 0/21; 75-100: 3/14; 50-75: 7/11; < 50: 5/5) | nothing | C1 (count), C5 (sign), CQ2 |
| I15 | Platelet counts in trauma resuscitation | Normal at admission, "may decrease sharply in the following 1-2 h" (L12 R30 rationale) | nothing | C1, C13 (acceptance) |
| I16 | Consumption, DIC-like syndrome after shock | Hypoxic, acidotic tissue with stagnant flow releases thromboplastin; consumes I, II, V, VIII and platelets; a low in-vivo fibrinogen (< 150 mg/dL) "does not result from a dilutional coagulopathy and strongly suggests DIC" (M45 pp. 1421-1423) | nothing | C7 |
| I17 | DIC | TF/VIIa-driven; trauma, amniotic fluid embolus, malignancy, sepsis, incompatible transfusion; falling platelets, long PT, aPTT and TT, raised FDP; treat the cause (M46 p. 1438); FDPs inhibit coagulation and platelets; fibrinogen is acute-phase (D74 pp. 1223-1224, NB §15); abruption coagulopathy 54 times as likely (M58 p. 1912, NB §10) | nothing; no DIC state (BF-28a/b NE) | C7 |
| I18 | Trauma-induced coagulopathy | APC (inactivates Va, VIIIa, PAI-1), hypoperfusion the stimulus, glycocalyx "auto-heparinization" (M46 pp. 1438-1439); tissue-injury volume is the initiator; shock dose-dependent (D26 p. 371, NB §18); ATC and resuscitation-associated coagulopathy; the RAC predictor is prehospital crystalloid volume (M62 p. 2013, NB §1) | nothing | C6, C7 |
| I19 | Most traumatic bleeding is surgical | Most is large-vessel injury, not TIC; capillary-bed bleeding depends on tissue damage, hypoperfusion and endothelial injury (M62 p. 2013, NB §1) | the card's `bleed` rate | §2.10, CQ2 |
| I20 | Paediatric haemostasis | Children have lower procoagulant proteins and fewer inhibitors (M62 p. 2038, NB §1); citrate risk higher in children (M45 p. 1402) | nothing | CQ10 |

### 1.3 The lethal triad and calcium

| # | Item | What the sources say | Today | Piece |
|---|---|---|---|---|
| I21 | Hypothermia | "even small decreases in body temperature can significantly impair coagulation factors and platelet function" (M45 p. 1423); pooled normal plasma tested at the stated temperature: PT 11.8 s (37 °C), 12.9 (34), 14.2 (31), 16.6 (28); aPTT 36.0, 39.4, 46.1, 57.2 s (L5 [ABS]); ROTEM 36 to 30 °C (L7 [ABS]); patients at 36.0 °C: TEG at 37 °C differs, re-run at 36 °C differs more (L17) | `coagF` placeholder in `l2/thermal/metabolic.ts:61`, read by nothing | C5 |
| I22 | Hypothermia: platelets | Platelets "quite dysfunctional" below 35 °C (S23 p. 489, NB §17); thrombocytopenia from marrow suppression and splenic and hepatic sequestration (D66 p. 1115; D74 Box 74.1, NB §15, §19) | nothing | C5 (function), C1 (sequestration, gap G9) |
| I23 | Acidosis | Bank-blood pH values (M45 Table 45.4 p. 1403, p. 1423); FVIIa activity falls > 90 % from pH 7.4 to 7.0 (L6 [ABS]); acidosis alone: no TEM effect in human blood in vitro (L7 [ABS]) but in swine bleeding time +47 %, thrombin generation 47 % of control (L8 [ABS]); platelets dysfunctional below pH 7.3 (S23 p. 489) | pH computed (`acid-base.ts`) | C5 |
| I24 | Citrate and ionised calcium | "more than 1 unit of blood every 10 minutes can decrease ionized Ca2+ levels ... do not drop enough to cause bleeding" (M45 p. 1423); keep iCa > 1.0 mmol/L (M62 p. 2024, NB §3); admission iCa < 1.10 in 13.2 % of 30,183 trauma patients, coagulopathy 21.9 vs 13.3 % (L3, an association); calcium salts' content (L12 R31) | citrate and iCa modelled (`solutes.ts:123`); calcium salts exist (`treatments.ts`) | C5 |
| I25 | The fatal combination | Temperature < 34 °C, pH < 7.0, total Ca < 2 mmol/L among 11 variables in patients given ≥ 20 units (M62 p. 2024, NB §2) | n/a | C13 (scenario acceptance) |

### 1.4 Platelet function, fibrinolysis and the haemostatic drugs

| # | Item | What the sources say | Today | Piece |
|---|---|---|---|---|
| I26 | Platelet dysfunction with a normal count | Trauma "platelet exhaustion"; uraemia; CPB lowers GPIb and GPIIb/IIIa; drugs (beta-lactams, nitroprusside, NTG, NO, SSRIs) (M46 pp. 1437-1439) | nothing | C5 (function state), C10 |
| I27 | Antiplatelet drugs | Aspirin half-life 15-20 min, effect for the platelet's life (M46 pp. 1446-1447); clopidogrel stop ≥ 3 days (M50 p. 1591, NB §11); M46 pp. 1445-1446 not read (SN §5d) | nothing | C10 |
| I28 | Fibrinolysis and hyperfibrinolysis | Plasmin from plasminogen by t-PA; TEG LY30 89.4 % in the figure's example (M46 Fig. 46.5C p. 1444); endothelial t-PA release in shock (D26 p. 371, NB §18); with CPB and liver surgery (M46 p. 1439, 1444); mortality "well upward of 50%" in severe trauma (M62 p. 2019, NB §6) | nothing; TXA inert (BF-24 NE) | C6 |
| I29 | Fibrinolysis shutdown | An early hypocoagulable, fibrinolytic phase may be followed by "fibrinolysis shutdown" and hypercoagulability (M46 p. 1438); hypocoagulability may progress to a thrombotic state (D26 p. 371) | nothing | C6 (gap G6) |
| I30 | Tranexamic acid | Competitive inhibitor of plasminogen's lysine site; CRASH-2: bleeding death RR 0.68 within 1 h, 0.79 at 1-3 h, 1.44 after 3 h (M46 p. 1449); dose 1 g over 10 min then 1 g over 8 h (L12 R23; M62 Fig. 62.9); cardiac 10-30 mg/kg then 1-15 mg/kg/h, seizures at 100 mg/kg (M50 pp. 1591, 1612, NB §11); WOMAN (M58 p. 1913, NB §8) | PK row, no PD (`rows-other.ts:106`) | C6 |
| I31 | EACA and aprotinin | EACA load 50-150 mg/kg then 15-25 mg/kg/h; aprotinin a direct plasmin inhibitor, withdrawn then reintroduced (M50 p. 1591, NB §11) | nothing | C6 |
| I32 | Desmopressin | 0.3 mcg/kg in uraemic platelet dysfunction, releases vWF (M46 p. 1438; M45 p. 1409); raises VIII 3-5 times (S23 p. 480, NB §16); 0.3-0.4 mcg/kg over 20-30 min, hypotension (M50 p. 1612) | nothing | C10 |
| I33 | rFVIIa | Half-life 2-2.5 h; off-label use no longer recommended; arterial events RR 1.45 (M46 pp. 1449-1450); activity loss with pH and 33 °C (L6 [ABS]) | nothing | C10 |

### 1.5 Anticoagulants and their reversal

| # | Item | What the sources say | Today | Piece |
|---|---|---|---|---|
| I34 | Unfractionated heparin | Binds antithrombin; thrombin and Xa most sensitive (M50 p. 1584, NB §11); 300-400 U/kg for CPB; ACT > 400-480 s (M46 p. 1447; M50 pp. 1584-1585); 1.5-3.0 U/mL heparin for ACT > 400 s (M50 p. 1615); half-life "short", no number (M46 p. 1442, SN §3b) | nothing (BF-27a NE) | C8 |
| I35 | ACT | Normal 107 ± 13 s; resistant to platelet dysfunction; linear to 600 s; prolonged artefactually by haemodilution and hypothermia (M46 p. 1442); normal 80-120 s (M50 p. 1584); prolonged by thrombocytopenia (M50 Table 50.2, NB §11); devices differ up to 40 % (M50 p. 1615) | nothing | C8 |
| I36 | Protamine | 1 mg per about 100 U heparin (M46 p. 1442); 1-1.3 mg/100 U, keep < 2.6 mg/100 U, above which it inhibits platelets and prolongs the ACT (M50 pp. 1586, 1619, NB §11); heparin rebound within about 1 h (M50 pp. 1588-1589); reaction types I-III, type III pulmonary hypertension and RV failure (M50 pp. 1589-1590) | nothing (BF-27b/c NE) | C8 |
| I37 | Heparin resistance and antithrombin | About 21 % in CPB, treated with FFP or AT concentrate (M46 p. 1447); AT < 60 % a risk factor; AT concentrate to 80-100 % (M50 pp. 1586-1588, NB §11) | nothing | C8 |
| I38 | LMWH, fondaparinux, argatroban, bivalirudin | Enoxaparin only partly reversed by protamine; fondaparinux not reversed (M46 p. 1442, Table 46.5); LMWH 60 % reversible, anti-Xa:IIa about 4:1 (D74 p. 1227, NB §14); argatroban 45 min, prolongs aPTT 1.5-3 times and PT/INR (M46 p. 1447); bivalirudin 25 min (D74 p. 1228-1232) | nothing | C8 |
| I39 | HIT | PF4 rises with heparin; platelets < 100 or < 50 % of baseline; clinical HIT 1-3 % after CPB; bivalirudin for CPB (M50 p. 1589, NB §11); M46 pp. 1439-1441 on HIT not read (SN §5d) | nothing | C8, CQ11 |
| I40 | Warfarin and its reversal | Half-life 40 h, full effect 3-4 days; II about 60 h, VII and protein C 3-6 h; 4-factor PCC plus vitamin K, PCC correction transient because the factors are short-lived; FFP "difficult and often unrealistic" (M46 pp. 1446, 1451); PCC 25/35/50 U/kg by INR, vitamin K 5-10 mg IV (L12 R33); PT prolongs in 24-48 h, II and X take 4-5 days (D74 pp. 1232-1233, NB §14) | nothing | C9 |
| I41 | DOACs and their reversal | Dabigatran: idarucizumab, aPTT not linear until > 200 ng/mL, thrombin time very sensitive (M46 pp. 1447-1448); Xa inhibitors: andexanet, 92 % fall in anti-Xa activity (M46 p. 1448, Table 46.5); half-lives (D74 pp. 1228-1232, NB §14); rivaroxaban with acidosis prolongs CT more than additively (L4) | nothing | C9 |
| I42 | Anti-Xa, heparin level, thrombin time | Anti-Xa not affected by factor deficiencies; heparin concentration insensitive to haemodilution and hypothermia (M46 pp. 1441-1442); high-dose thrombin time tracks heparin (M50 p. 1585) | nothing | C8, C9 |

### 1.6 Patient states

| # | Item | What the sources say | Today | Piece |
|---|---|---|---|---|
| I43 | Liver disease | Reduced synthesis of fibrinogen, II, V, VII, IX, X, XI, XII, protein C, S and AT; low platelets; "rebalanced hemostasis"; "traditional coagulation testing does not correlate with bleeding risk" (M46 pp. 1437-1438); VII falls first, V and fibrinogen late, VIII and vWF normal or raised (D74 p. 1225, NB §13); thrombocytopenia from thrombopoietin and the spleen (M14 pp. 308-309) | `failure` 0-1 and the `[FIT]` INR (`liver.ts:76`) | C2, CQ6 |
| I44 | Pregnancy | Not in M45 or M46 (SN §1b). At term: fibrinogen, VII, VIII, IX, X, XII and vWF up; XI and XIII down; II and V unchanged; AT and protein S down; platelets 0-10 % down; PT and PTT about 20 % shorter (M58 Table 58.4 p. 1889, NB §9); no fibrinogen value at term (NB §21) | the pregnant patient is `later: 'v1.1'` (`apps/demo/src/app/patients.ts:35`) | C14, CQ7 |
| I45 | Postpartum haemorrhage | By fluid before sampling (< 2 L vs > 3.5 L): platelets 181 vs 89, aPTT 29 vs 38 s, fibrinogen 3.9 vs 1.6 g/L (L15); severe PPH 2.63 times as likely per 1 g/L fall in fibrinogen (L11 [ABS]); cryoprecipitate or concentrate early (M58 p. 1913) | no obstetric card | C14 |
| I46 | Cardiopulmonary bypass | Contact activation, platelet activation and fibrinolysis; prime dilution HCTr = (kg x 75 x HCT)/((kg x 75) + PVc) (M50 pp. 1586-1588, 1615, Box 50.12, NB §11) | CPB is an interface that throws (`l2/circ/devices.ts:167`) | CQ8 |
| I47 | Uraemic platelet dysfunction | Prolonged bleeding time; cryoprecipitate, desmopressin (M46 p. 1438) | the renal model has GFR, no uraemic platelet term | C10 |
| I48 | Haemophilia and von Willebrand disease | Mild haemophilia A, vWD and FXIII deficiency can bleed with normal PT/aPTT (M46 p. 1436); vWD prophylaxis if vWF < 50 IU/dL (M58 p. 1909); DDAVP raises VIII 3-5 times (S23 p. 480) | nothing | C10 (patient profiles) |

### 1.7 The products

| # | Item | What the sources say | Today | Piece |
|---|---|---|---|---|
| I49 | Plasma: FFP, PF24, thawed, freeze-dried | "FFP contains only ~70 % the normal level of all clotting factors" (L12 R27 rationale); PF24 slightly less FV, about 25 % less FVIII; thawed up to 5 days (M45 p. 1410); 1 unit raises factors 6-7 % (D74 p. 1225); 15-20 mL/kg raises 20-30 % (S23 p. 479, NB §16); freeze-dried 200-250 mL (M45 p. 1410) | FFP 250 mL with electrolytes and citrate (`params.ts:206`) | C2 (factors in FFP), C3 (variants) |
| I50 | Cryoprecipitate and fibrinogen concentrate | Cryo: FVIII, vWF, fibrinogen, FXIII, fibronectin (M45 p. 1410); 5-donor pool fibrinogen mean 1596 mg, FVIII 499 IU, 236 mL (L1); thaw variation (L2); concentrate 1 g in 50 mL, FXIII 328 IU/dL (L1); 0.06 g/kg raises about 1.4 g/L, Vss 43.8 mL/kg (L14); 3-4 g initially (L12 R29) | absent (BF-26a/b NE) | C3 |
| I51 | Platelets | Pooled from 4-6 donations or apheresis; a 50-mL concentrate has about 70 % of a blood unit's platelets (M45 p. 1408); one concentrate +7-10 x 10^9/L at 1 h (M45 p. 1410); apheresis 3-4 x 10^11, > 30 x 10^9/L (L12 R30); about 50 x 10^9/L per apheresis unit (S23 p. 482); disagreement (SN §1c) | 250 mL of volume and electrolytes only (`params.ts:207`) | C1 (content), CQ5 |
| I52 | PCC, whole blood, cell salvage | PCC: 3-factor lacks VII; some contain heparin, AT, C, S (M46 p. 1450); vial content not in the sources (SN §3b); whole blood unit day 0: platelets 172 ± 29, fibrinogen 2.43 ± 0.5 g/L; platelets 120 after 168 h (L20); fresh vs stored platelet function (M45 pp. 1419-1422); cell salvage with leucocyte filter in obstetrics (M58 pp. 1913-1914); salvage sections of M45 not read (SN §5d) | whole blood is CPD plasma at Hct 0.4 (`params.ts:208`); no PCC; no salvage | C3 (PCC blocked on G11), CQ9 (salvage) |

**Completeness.** The inventory is complete against the sections of M45 and M46 that SN read, and the chapters of NB.
These were not read and are not filled in from memory: M46 pp. 1439-1441 (prothrombotic states, HIT),
pp. 1445-1446 (antiplatelet detail), pp. 1451-1452 (neuraxial); M45's infection, compatibility, reaction (TRALI,
TACO), cell-salvage, acute normovolaemic haemodilution and substitute sections (SN §5d). Each is a sources-review
item in C0d.

The validation cells this work answers are `docs/gates/fu-9/bf-matrix-after.md`: BF-05e, 24, 25a-e, 26a-d, 27a-c and
28a-b (all NE). BF-31 (an ABG reported at 37 °C or corrected to the patient's temperature) is listed with them, but it
is a gas-panel question, not haemostasis. It stays with the lab-panel work.

---

## 2. The mechanisms

### 2.1 The state, and why this granularity

One new module owns haemostasis, `packages/engine-core/src/l2/blood/coag.ts`, stepped inside the blood model's step.
The blood model already moves every volume this needs:
- bleeding removes whole blood (`fluids.ts:122-132`);
- crystalloid, colloid and the transcapillary refill dilute the plasma (`fluids.ts:150`);
- each product arrives with its volume and contents (`params.ts:204-209`, `pipeline.ts:368-372`).

The plasma proteins already ride these paths as masses in the plasma volume: albumin `albG` and globulins `globG`
(`fluids.ts:36-37`). The coagulation proteins are carried the same way. A protein's amount changes only by bleeding,
products, synthesis, clearance and consumption. Its concentration is that amount over the plasma volume, so dilution is
not a separate rule: it is what happens when water enters the plasma. Filtration and urine move water only
(`fluids.ts:147-151`), and fibrinogen's volume of distribution is about the plasma's (Vss 43.8 mL/kg, L14). So nothing
leaks out by those paths, which is the same convention the engine uses for albumin.

| State | Unit | Read by | Why it is carried (what tells it apart) | Sourced test |
|---|---|---|---|---|
| `fibG` fibrinogen | g in plasma | Clauss fibrinogen; FIBTEM A5; PT and aPTT (G1); consumption and fibrinolysis | the first to fall under plasma-poor replacement (L9 [ABS]); cryoprecipitate and concentrate carry only it, among the factors read | §2.11 checks 1, 8 |
| `f2, f5, f7, f10` (factors II, V, VII, X) | activity × plasma mL ("normal-plasma mL") | PT; aPTT (common pathway) | different half-lives (VII 3-6 h, II about 60 h: M46 p. 1446) give the warfarin onset, the transient PCC correction and the liver pattern; V is lost in stored blood (M45 p. 1421); II, VII, X are what PCC carries | §2.11 check 3; Table 45.15 patterns (C4) |
| `f8, f9` (factors VIII, IX) | as above | aPTT | the aPTT's most sensitive factors (M46 p. 1441); VIII is lost in storage, carried by cryoprecipitate (M45 pp. 1410, 1421), raised by desmopressin (S23 p. 480), made outside the liver (M14 p. 305) | PTT ≥ 1.5 x normal with other tests normal means low V and VIII (M45 p. 1422) |
| `vwf` von Willebrand factor | as above | platelet function; VIII's survival; the vWF level (M58 p. 1909) | desmopressin, cryoprecipitate, uraemia, liver disease and vWD act through it (M46 p. 1438; M45 p. 1410; D74 p. 1225; M58 p. 1909) | DDAVP raises VIII 3-5 times (S23 p. 480) |
| `at` antithrombin | as above | heparin's effect; the AT activity | heparin needs it; resistance below 60 %; AT concentrate to 80-100 % (M50 pp. 1586-1588) | heparin resistance cell (C8) |
| `pc` protein C, and its activated share | as above | V and VIII inactivation in TIC; warfarin's early phase | the APC mechanism of TIC (M46 pp. 1438-1439; M62 p. 2013) | V and VIII fall with hypoperfusion before fluids (C6) |
| platelets: circulating `pltC`, splenic `pltS` | number | the platelet count; competence | about one third sit in the spleen (S23 p. 482); observed counts fall less than dilution predicts (M45 Fig. 45.8) | §2.11 checks 2, 6, 7, 9 |
| platelet function `pltF` | 0-1 | competence | dysfunction with a normal count: temperature, pH, drugs, uraemia, CPB, trauma (S23 p. 489; M46 pp. 1437-1439) | C5 |
| fibrinolytic activity `lys`, degradation products `fdp` | rate; amount | fibrinogen loss; D-dimer; LY30/ML | hyperfibrinolysis in trauma, CPB, liver surgery, AFE (M46 pp. 1435-1439, 1444; D26 p. 371) | TXA lowers it (C6) |
| drugs in plasma: heparin, protamine, LMWH, DOACs | U, mg, ng/mL | ACT, aPTT, anti-Xa, TT | each has its own reversal and test (M46 pp. 1442-1448) | C8, C9 |
| synthesis factors: `liverFn` (read) and `vkF` (vitamin-K-dependent synthesis) | 0-1 | II, VII, IX, X, C synthesis | warfarin blocks the gamma-carboxylation of II, VII, IX, X, C, S (M14 p. 305) | warfarin onset (D74 p. 1232) |

**Not carried, with the reason** (each comes in only with a reader that tells it apart):
- **XI and XII** (and prekallikrein, HMWK): the only reader is a prolonged aPTT without bleeding (M46 p. 1434), and the
  only use found is pregnancy's directions (M58 Table 58.4). They join C14 if CQ7 brings pregnancy in.
- **XIII**: no routine test reads it ("FXIII deficiency can bleed with normal values", M46 p. 1436). Cryoprecipitate,
  concentrate and the rescue dose carry it (L1; M50 Fig. 50.12), but nothing in the engine would show it.
- **Protein S, TFPI, tissue-factor amounts, thrombin and the activated species:** no reader among the tests the
  sources describe. The thrombin-generation models that would carry them are not in the sources read.

**Alternatives rejected:**
- **One "factor pool" for all factors (coarser).** It cannot give a long PT with a normal aPTT (warfarin, early liver
  failure: M45 Table 45.15). It cannot tell FFP from PCC from cryoprecipitate, and cannot give the transient PCC
  correction (M46 p. 1451).
- **A thrombin-generation ODE with activated species (finer).** No source read gives its human parameters, and the
  tests would still need a calibration from it to seconds (G1). It would add state no reader distinguishes.

### 2.2 Mass balance of a coagulation protein

For each carried protein `x`, with `A` its amount and `c = A / Vp` its concentration, per blood step:

- **bleeding:** the bled plasma takes `c · bledPlasmaMl`, exactly as `albG` (`fluids.ts:129`);
- **products:** a unit adds `content_x · ml` (§2.6);
- **synthesis and clearance:** `dA/dt = k_x · (S_x · A_x,ref − A)`, with `k_x = ln 2 / t½_x` (§1.1 I4) and `S_x` the
  synthesis factor. `S_x = liverFn` for liver-made factors (§2.8). `S_x = 1` for VIII and vWF (made outside the
  liver, M14 p. 305; CQ6 for D74's other view). The vitamin-K-dependent factors (II, VII, IX, X, C) are multiplied
  by `vkF`. At `S = 1` the steady state is the reference, so a healthy patient does not drift.
- **consumption and lysis:** `− consumption_x − lysis_x` (§2.9).

Half-lives used:
- VII 3-6 h (M46 p. 1446) and 4 h (M14 p. 307): the engine uses M14's single figure, inside M46's range;
- II about 60 h (M46 p. 1446);
- VIII about 12 h (L19; S23 p. 480);
- IX 18-24 h (S23 p. 480);
- fibrinogen 4 days (M14 p. 307), against 69.3 h in congenital afibrinogenaemia (L14). Over a case these differ by
  less than 3 % of the amount.
- protein C 3-6 h (M46 p. 1446).

**Gap G4:** V and X have no half-life in the sources read, and neither has fibrinogen in a bleeding adult (SN §3b).

Over a case of a few hours only VII and protein C turn over noticeably. That is why the warfarin and liver
patterns appear in the order the sources give: VII first (D74 p. 1225; M14 p. 307).

### 2.3 Platelets

- **Pools.** A circulating pool `pltC` and a splenic pool `pltS`, with `pltS = pltC / 2` at rest: one third of
  the total is sequestered (S23 p. 482).
- **Production and life.** Production is `pltTot,ref / life` with life 8-12 days (M46 p. 1433). The engine uses
  10 days, inside both M46's 8-12 and its 7-10 (SN §1c), and S23's 9-10. Clearance is `pltTot / life`.
- **Exchange.** The two pools exchange at a rate. **Gap G8:** the rate is not in the sources. §2.11 check 2 shows
  that fast exchange reproduces Hiippala's interval and no exchange does not. Until G8 is settled, the exchange is
  instantaneous. That is the limit the check supports, not a fitted value, and C1's test states it.
- **Loss and dilution.** Bleeding removes `pltC · out / bloodMl`: platelets leave with WHOLE blood, not with plasma
  (their own path, unlike albumin). Red-cell units dilute the count because they add blood volume without platelets.
- **The count.** `pltC / bloodMl`, as 10^9/L.
- **Function.** `pltF` is the product of a temperature term and a pH term (S23 p. 489 gives the thresholds below
  35 °C and below pH 7.3; **gap G10** for the slope), a drug term (aspirin and clopidogrel, C10), a uraemia term
  (C10) and a trauma "exhaustion" term (M46 p. 1437; **gap G6**). Transfused platelets share the recipient's
  function, because they "rapidly become dysfunctional" in hypothermia or acidosis (S23 p. 489).
- **Hypothermic sequestration.** Hypothermia moves platelets into the spleen and liver (D66 p. 1115). **Gap G9:** no
  magnitude.

### 2.4 How each test reads the state

What the laboratory runs: citrated plasma, recalcified, at 37 °C (§1.1 I8). So the readings of PT, aPTT and the
Clauss fibrinogen depend on the amounts, not on the patient's temperature or calcium. These two separations are
sourced (temperature: M50 p. 1585, D66 p. 1115, L17; calcium: L12 R31). **Gap G16:** no source read says whether
the sample's PT or aPTT carries the patient's acidosis. Because no relation exists, the reading has no pH term,
and that absence is shown in the model docs as G16, not as a finding.

| Reading | From the state | Source |
|---|---|---|
| Fibrinogen (Clauss) | `fibG / Vp` (g/L) | direct; thresholds M45 pp. 1410-1411, Fig. 45.7; M46 p. 1450 |
| Platelet count | `pltC / bloodMl` | direct; thresholds M45 pp. 1409-1421 |
| PT (s) | `fPT(a2, a5, a7, a10, fib)` | **gap G1**; the constraints below |
| INR | `(PT / MNPT)^ISI` | formula M46 p. 1441; **G2** for the reagent's ISI and MNPT |
| aPTT (s) | `fAPTT(a8, a9, a2, a5, a10, fib, heparin, DOAC)` | **gap G1** |
| ACT (s) | `fACT(heparin U/mL, dilution, device temperature, platelets)` | normal 107 ± 13 s (M46 p. 1442) and 80-120 s (M50 p. 1584); 1.5-3.0 U/mL for > 400 s (M50 p. 1615); **gap G3** for the curve |
| Anti-Xa, heparin level | the drug's plasma concentration | direct: "not affected by factor deficiencies" (M46 pp. 1441-1442) |
| Thrombin time | heparin, dabigatran | "very sensitive" to dabigatran (M46 p. 1448); **gap G19** |
| D-dimer / FDP | `fdp` | **gap G7** |
| FIBTEM A5 (mm) | `1.58 + 3.09 · fibrinogen (g/L)` | L13 Fig. 1 (PPH, r = 0.88) |
| Other viscoelastic values | the state, at the device's temperature | **gap G12**; the figure's normal, hypofibrinogenaemic and hyperfibrinolytic examples (M46 Fig. 46.5) are acceptance shapes |
| Bleeding time | not modelled | "not predictive of bleeding, not recommended" (M46 p. 1442): a sourced exclusion |

**Constraints any G1 relation must meet** (they become C4's tests, whatever paper settles G1):
1. Factor levels of 40-50 % may not prolong the PT (M46 p. 1441).
2. The PT is more sensitive to VII and X than to fibrinogen, II and V (M46 p. 1441).
3. The aPTT detects levels below 30-40 % (M46 p. 1441).
4. Normal pooled plasma at 37 °C reads PT 11.8 s and aPTT 36.0 s in L5's laboratory (L5 [ABS]). This is that
   laboratory's anchor, not a universal normal (G2).
5. Tests are "not helpful unless > 1.5 times control"; microvascular bleeding occurred with factors < 20 % of control,
   predicted by a significant PT/PTT prolongation (L22 [ABS]; D26 p. 370).
6. A PTT ≥ 1.5 x normal with other tests normal means low V and VIII (M45 p. 1422).
7. The patterns of M45 Table 45.15: VKA (PT long, aPTT normal or mildly long), early liver failure (PT only),
   end-stage liver, DIC, hyperfibrinolysis.
8. Under plasma-poor replacement, prothrombin, V and VII reach "critical" levels at 201, 229 and 236 % of blood volume
   lost (L9 [ABS]). The level that counts as critical is in the full text only (G1).
9. At term, PT and PTT are about 20 % shorter (M58 p. 1889), with VII, VIII, IX, X up (Table 58.4).

### 2.5 Temperature, pH and calcium act in the patient

These three change how well the patient clots, not what the laboratory reads (§2.4). They enter one output,
`coag.out.competence`, which the instructor view, the debrief and the diffuse-bleeding term read (§2.10). It
replaces the unsourced placeholder `coagF` in `l2/thermal/metabolic.ts:40,61`, which nothing reads today. That
placeholder is deleted, so the two cannot disagree.

- **Temperature.** Clotting slows in the cold, by the ratio of clotting times of normal plasma at the patient's
  temperature to those at 37 °C: PT 1.09 at 34 °C, 1.20 at 31 °C, 1.41 at 28 °C; aPTT 1.09, 1.28, 1.59 (L5 [ABS],
  computed from its means). It is only minimally faster at 39-41 °C (L5). Platelet function falls below 35 °C (S23 p.
  489). This is the mechanism that makes a warmed laboratory value look normal while the patient's clotting is
  impaired (D66 p. 1115).
- **pH.** FVIIa activity falls by more than 90 % from pH 7.4 to 7.0 in vitro (L6 [ABS]). Acidosis alone had no TEM
  effect in human blood in vitro (L7 [ABS]), but in swine pH 7.1 raised bleeding time 47 % and lowered thrombin
  generation to 47 % of control (L8 [ABS]). Platelets fail below pH 7.3 (S23 p. 489). **Gap G13:** these disagree,
  and none is a human in-vivo relation. The pH term is built with the S23 threshold for platelets and G13 for the
  factors.
- **Ionised calcium.** Calcium is a cofactor of every complex (M46 p. 1434). Transfusion at 1 unit per 10 minutes
  lowers iCa but not enough to bleed (M45 p. 1423). Keep iCa > 1.0 mmol/L (M62 p. 2024). L3 is an association across
  patients, not a relation. **Gap G14.** The engine's iCa (`solutes.ts:123`) is the input; the term waits on G14 and
  shows its value meanwhile.
- **The triad together.** In swine, 32 °C plus acidosis gave a bleeding time +72 % and thrombin generation 5.7 % of
  control (L8 [ABS]). The synergy is a reason to make competence a product of the terms, not a sum. Its size is G13.

### 2.6 What each product carries

Volumes are the engine's existing rows (`params.ts:204-209`, from the tables §5b.4). Contents are new, per unit.

| Product (id) | Volume | Coagulation content per unit | Source |
|---|---|---|---|
| Red cells `rbc` | 280 mL | the residual 12 mL of CPD plasma (`RBC_RESIDUAL_SHARE`) carries plasma factors at FFP's level, aged as below; no platelets of use | M45 p. 1421 ("absent from packed cells"); `params.ts:183, 192` |
| FFP `ffp` | 250 mL | every factor about 70 % of normal per mL of unit; read as including fibrinogen (**G17**) | L12 R27 rationale |
| PF24 / thawed plasma (`ffp` with a variant) | 250 mL | FV "slightly less" (**G17**), FVIII about 25 % less than FFP; thawed up to 5 days | M45 p. 1410 |
| Freeze-dried plasma (new) | 200-250 mL | content not stated (**G17**) | M45 p. 1410 |
| Cryoprecipitate, 5-donor pool (new) | mean 236 mL (100-300) | fibrinogen mean 1596 mg (> 700); FVIII mean 499 IU (> 350); vWF and FXIII present, not quantified | L1 Introduction (NHSBT); M45 p. 1410; minimums and thaw variation L2 |
| Fibrinogen concentrate (new) | 50 mL per 1 g vial | 1 g fibrinogen per vial (20 mg/mL); 3.95 g measured in a 4 g dose | L1 |
| Platelets, apheresis (`platelets`) | 250 mL | 3-4 x 10^11 platelets | L12 R30 |
| Platelets, pooled (new variant) | about 50 mL per concentrate | about 70 % of the platelets of a unit of blood per concentrate; 4-6 per pool | M45 p. 1408 |
| Whole blood `wholeBlood` | 500 mL | day 0: platelets 172 ± 29 x 10^9/L, fibrinogen 2.43 ± 0.5 g/L in the unit; platelets 120 at 168 h, fibrinogen unchanged (L20); FV 50 % and FVIII 30 % at 21 days, about 20 % at 35 days (M45 p. 1421); platelet function lower after 24 h at 4 °C (M45 p. 1422) | L20 Tables; M45 pp. 1419-1422 |
| PCC, 3- and 4-factor (new) | dosed in IU/kg (factor IX units) | II, IX, X (3F) and VII (4F); some heparin, AT, C, S; **content per IU of IX: gap G11** | M46 p. 1450; L12 R33 |
| Antithrombin concentrate (new) | dosed to 80-100 % activity | AT | M50 p. 1588 |

The anticoagulant's dilution is counted ONCE. The engine's `ffp.comp` already scales the plasma's albumin by
`1 − CPD_SHARE` (`params.ts:193-197`). L12's "~70 %" is a level measured in the product, so it already contains
that dilution. The factor content is therefore applied per mL of unit as stated, and is not multiplied again.

A factor IU is defined against the activity of normal plasma. **G22:** the definition is cited from the
international standard by C3, not assumed here.

### 2.7 How each drug enters

New drug rows go into the drug model's library. Their PK uses the existing row machinery (`l2/pk/data/`). Their
effect is a term in `coag.ts`.

- **Tranexamic acid.** The row exists (`rows-other.ts:104-106`). It gains a PD target: inhibition of the
  fibrinolytic rate `lys` by occupancy. This is the mechanism M46 p. 1449 states: a competitive inhibitor of
  plasminogen's lysine site. **Gap G6:** the potency (EC50). CRASH-2's late harm (RR 1.44 after 3 h, M46 p. 1449)
  must come from the shutdown phase (I29), not from a time rule.
- **EACA and aprotinin** act on the same target. TXA is "6-10 times more potent" than EACA (M50 p. 1591), so EACA's
  potency is TXA's divided by that sourced ratio. Aprotinin is a direct plasmin inhibitor (M50 p. 1591).
- **Unfractionated heparin.** An amount in plasma (U). Its anticoagulant effect is in proportion to heparin and
  antithrombin together (M50 p. 1584: it needs AT). It is read by the ACT, the aPTT and the anti-Xa. **Gap G3:** its
  elimination half-life ("short", M46 p. 1442).
- **Protamine** binds heparin 1 mg : about 100 U, irreversibly, into a salt without anticoagulant effect (M46 p.
  1442; M50 p. 1619). Neutralisation is therefore a stoichiometric subtraction, not a fitted curve.
  - Excess above 2.6 mg per 100 U inhibits platelets and prolongs the ACT (M50 p. 1586). The threshold is sourced; the
    slope is G3.
  - Rebound within about 1 h (M50 pp. 1588-1589) comes from protein-bound and extravascular heparin returning. That
    is a second heparin compartment, whose rate is G3.
  - The type I and type III reactions are couplings into the circulation (C8, coupling registry rows; magnitudes
    **G21**).
- **LMWH:** anti-Xa to anti-IIa about 4:1, and only 60 % reversible by protamine (D74 p. 1227). **Fondaparinux**
  is not reversed (M46 p. 1442). **Argatroban** and **bivalirudin** have half-lives of 45 and 25 min (M46 p. 1447;
  D74 pp. 1228-1232).
- **Warfarin.** A patient-profile state, `vkF < 1`. Its onset emerges from the half-lives: VII first, so the PT
  rises at 24-48 h, while II and X need 4-5 days (D74 pp. 1232-1233).
  - **Vitamin K** restores `vkF`, IV faster than oral (M46 p. 1451); **G18** for the time course.
  - **PCC** adds II, VII, IX and X, which then decay by their own half-lives, so the correction is transient, as
    M46 p. 1451 states.
- **DOACs.** New PK rows with half-lives (D74 pp. 1228-1232). They act on Xa or thrombin and are read by anti-Xa, TT,
  PT and aPTT (G1, G19).
  - **Idarucizumab** binds dabigatran with 350 times thrombin's affinity: a stoichiometric removal (M46 p. 1448).
  - **Andexanet** lowers anti-Xa activity 92 % (M46 p. 1448).
- **Desmopressin** releases vWF and raises VIII 3-5 times (S23 p. 480; M46 p. 1438). It causes hypotension over
  20-30 min (M50 p. 1612), a coupling into the circulation. **G18** for its time course.
- **rFVIIa:** half-life 2-2.5 h (M46 pp. 1449-1450). Its activity falls with pH and at 33 °C (L6 [ABS]). Its effect
  on the PT is G1.
- **Antiplatelets** set `pltF` for the platelet's life (aspirin, M46 p. 1446). **Calcium** salts already exist
  (`treatments.ts`) and act through iCa (§2.5).

### 2.8 The liver, joined and not duplicated

The liver model keeps what it owns: `liverFn` (`liver.ts:71`). Coagulation reads `organs.liver.liverFn` as `S_x`
for the liver-made factors, AT and protein C (§2.2).

The liver's INR stand-in `s.inr = 1 + 2 · failure` (`liver.ts:76`, marked `[FIT]`, no source) is deleted in C4,
when the PT exists. Its field leaves `LiverState`, `organs/pipeline.ts:261`, `labs.ts:54-66` and `engine.ts:1110`.
Until C4 the panel keeps the stand-in exactly as it is, marked, so no piece shows a blank where an INR was.

**Gap G5 (CQ6).** A uniform `liverFn` cannot reproduce the sources' liver pattern. It gives every liver-made factor
the same steady state. The sources say VII falls first, V and fibrinogen "do not fall much until failure severe",
and VIII and vWF are "normal or raised" (D74 p. 1225). The first follows from the half-lives. The second and third
need a per-factor synthesis reserve that the sources read do not quantify. The same holds for the chronic patient
states of cirrhosis: the lower platelet count from thrombopoietin and the spleen (M14 pp. 308-309; S23 p. 489).
Those are patient-profile baselines, set by the card or the owner (CQ6), not by the liver model.

### 2.9 Consumption, trauma-induced coagulopathy, DIC and fibrinolysis

Four drivers come from the rest of the engine or the card:
- hypoperfusion, from the engine's own O2 delivery and lactate (the duration of hypotension is the cause, M45 p.
  1420);
- tissue injury, a card input, because it is "the key initiator" (D26 p. 371) and the TIC predictor (M62 p. 2013);
- a DIC trigger from a condition: amniotic fluid embolism, abruption, sepsis, haemolytic transfusion reaction (M46 p.
  1438; D74 Box 74.4);
- CPB, if CQ8 brings it in.

What they do:
- **Consumption** of fibrinogen, II, V, VIII and platelets (M45 p. 1421).
- **Activated protein C**, generated by hypoperfusion through thrombomodulin, inactivates V and VIII (M46 pp.
  1438-1439; M62 p. 2013).
- **Fibrinolysis.** t-PA release in shock and tissue injury (D26 p. 371; M46 p. 1436) raises `lys`, which degrades
  fibrinogen, V and VIII (M46 p. 1436) into `fdp`.
- **Glycocalyx shedding** adds a heparin-like anticoagulant, "auto-heparinization" (M46 p. 1439).
- **The shutdown phase** follows (M46 p. 1438).

**Gap G6:** every rate. The sources give mechanisms and directions; the time courses that would set the rates are
in L10 [ABS] and L11 [ABS] (abstracts only) and in Brohi and Cohen (M62 refs 139-141, not read).

C6 and C7 are therefore built mechanism-first, with each rate a named gap. Until the owner rules (CQ1 applies to
these too), the conditions stay inert and say so.

### 2.10 Bleeding: what coagulation changes

Most traumatic bleeding is from large vessels, not coagulopathy (M62 p. 2013). The card's `bleed` rate stays
as it is: surgical bleeding, stopped by surgery. Coagulopathy adds diffuse (microvascular) bleeding.

**What is sourced is the THRESHOLD:**
- platelets: surgical bleeding is rare above 50 x 10^9/L, and below 75 is "a reasonably accurate guide" (M45 pp.
  1420-1421); Table 45.10 gives the incidence by count (M45 p. 1409);
- fibrinogen: below 1.0 g/L is "hemostatically significant" (L9 [ABS]);
- factors: below 20 % of control (D26 p. 370);
- the competence of §2.5.

**What is not sourced is the RATE in mL/min (gap G15).** So C5 builds the sign ("diffuse bleeding present", with
its causes) by mechanism. The volume is put to the owner (CQ2).

### 2.11 Checks: plain mass balance against the sources

Arithmetic on the sourced contents and the engine's own volumes (default adult male: blood volume 70 mL/kg × 70 kg =
4900 mL, Hb 15 g/dL, so Hct 0.45 and plasma about 2.7 L; `params.ts:104, 133-136`). Each becomes a test in the
piece named.

| # | Check | Arithmetic | Against | Result | Piece |
|---|---|---|---|---|---|
| 1 | Fibrinogen under plasma-free replacement | isovolaemic washout `c = c0 · e^(−V/BV)`: 3.7 → 1.0 g/L at ln(3.7) = 131 % of BV | L9 [ABS]: 142 % (117-169) | inside | C1 |
| 2 | Platelets under the same | without a splenic pool 257 → 50 at ln(257/50) = 164 %; with a one-third splenic pool in fast exchange, 1.5 x 164 = 246 % | L9 [ABS]: 230 % (169-294) | without the spleen OUTSIDE (too early); with it inside: the splenic pool is the mechanism (S23 p. 482; M45 Fig. 45.8) | C1 |
| 3 | II, V, VII under the same | e^(−2.01), e^(−2.29), e^(−2.36) = 13, 10, 9 % | L9's "critical" levels (full text only); "< 20 %" (D26 p. 370) | consistent; L9's definition needed (G1) | C2, C4 |
| 4 | One FFP unit | 250 mL × 70 % = 175 normal-plasma mL into about 2.7 L: +6.5 % if the unit's water is shed (the engine's volume receptors shed transfused plasma, `fluids.ts:147`), +5.9 % if retained | D74 p. 1225: 6-7 % per unit | inside when shed, just below when retained | C2 |
| 5 | FFP 15-20 mL/kg (1050-1400 mL) | retained: +20-24 %; shed: +27-36 % | S23 p. 479: 20-30 % | the run's own volumes decide; the test reads the band at the engine's computed volume | C2 |
| 6 | One apheresis unit | 3-4 x 10^11, two thirds circulating, over 4.9 L: +41-54 x 10^9/L (without the spleen +61-82) | > 30 (L12 R30); about 50 (S23 p. 482) | inside with the spleen; the splenic pool again is the mechanism, so no "recovery" constant is needed | C1 |
| 7 | One pooled concentrate | 70 % (M45 p. 1408) of a unit's platelets (L20: 172 x 10^9/L × 0.5 L = 8.6 x 10^10) = 6.0 x 10^10; two thirds over 4.9 L: +8.2 x 10^9/L | M45 p. 1410: 7-10 | inside | C1 |
| 8 | Fibrinogen concentrate and cryoprecipitate | 0.06 g/kg over Vss 43.8 mL/kg = 1.37 g/L; 4 g in 70 kg over 3.07 L = +1.3 g/L; one 5-pool (1.6 g) over 2.7 L = +0.59 g/L; a 10-unit dose (2.14 g, L1) +0.79 g/L | L14: about 1.4 g/L; L12 R29: 3-4 g ≈ 15-20 single cryo units | consistent; the plasma volume is the distribution volume (L14's Vss) | C3 |
| 9 | Platelet steady state | production 1.2-1.5 x 10^11/day × life 8-12 d = 1.0-1.8 x 10^12 in all; two thirds over 4.9 L = 131-245 x 10^9/L | L9's initial 257 ± 89; the < 150 definition (M45 p. 1420) | consistent: the baseline count is the patient's, and production is set from it | C1 |

**Hiippala and Hirshberg disagree** on what falls first (I10). Check 1 against check 3 shows the mechanism decides
it, not a choice. Under plasma-poor red cells with colloid, fibrinogen (1.0 g/L, 27 % of 3.7) is crossed at 131 %,
before factors reach 13 % at 201 %. Hirshberg's "PT first" depends on where the PT's critical level sits (G1). The
C4 tests record both sources and which the relation reproduces.

### 2.12 The gaps, with what would settle each

| Gap | What is missing | What would settle it |
|---|---|---|
| **G1** | Clotting time in seconds (PT, aPTT, TT) from factor activities | No paper on the wanted list is confirmed to hold the curve. Candidates: L9 Hiippala 1995 (critical activities, regressions) and L21 Murray 1988 (per-patient factors with PT and aPTT), both paywalled. Otherwise a factor-dilution study of clotting times, not yet identified (C0a names it) |
| **G2** | The reagent's ISI and MNPT; the reference ranges for PT, aPTT, fibrinogen and platelets | The owner's laboratory (CQ4) |
| **G3** | Heparin's elimination half-life, the ACT slope per U/mL, the protamine excess slope, rebound | Bull et al. J Thorac Cardiovasc Surg 1975;69:674 and 685 (M50 refs 93 and 101, NB §11; DOIs not resolved in this run) |
| **G4** | Half-lives of V and X; fibrinogen's in bleeding adults | not found (SN §3b, §5b); X: the PCC product information (G11) |
| **G5** | Per-factor synthesis reserve in liver disease | D74 refs 51, 56 (not read); CQ6 |
| **G6** | Consumption, APC, fibrinolysis, shutdown and exhaustion rates; TXA potency | L10 Rourke 2012 and L11 Charbit 2007 (time courses; wanted); M62 refs 139-141 (Cohen, Brohi; not read) |
| **G7** | D-dimer/FDP production, units, range | not found; range from the owner's laboratory |
| **G8** | Splenic platelet exchange rate | not identified; M45 Fig. 45.8's source and Miller 1971 (10.1097/00000658-197111000-00010, wanted) |
| **G9** | Hypothermic platelet sequestration | D66 ref 31 (Bokenes 2000, not read) |
| **G10** | Platelet function against temperature and pH, as a slope | L7 Dirkmann 2008 full tables (wanted) |
| **G11** | PCC composition per IU of IX (II, VII, X, C, S, heparin) | the product information of one 4-factor PCC (SN §5b) |
| **G12** | Viscoelastic values from the state (EXTEM CT, A5/A10, MCF; TEG R, K, MA; LY30, ML) | L4 Figures 1-3 (open); L7 (wanted); L16 [ABS]; Davenport 2011 (M62 ref 148) |
| **G13** | Acidosis on human haemostasis in vivo | L8 Martini 2005, L6 Meng 2003, L7 (all wanted) |
| **G14** | Low iCa on haemostasis as a relation | not identified (L3 is an association) |
| **G15** | Diffuse bleeding rate (mL/min) from competence | not identified; CQ2 |
| **G16** | Whether the analyser's PT/aPTT shows the patient's acidosis | not stated in the sources read; L6 and L7 (controlled pH in vitro) are the closest |
| **G17** | Fibrinogen and FV per FFP unit; PF24's FV; freeze-dried plasma content | SN §5b ("factor activity per unit of plasma": not found) |
| **G18** | Vitamin K onset; warfarin dose-to-effect; desmopressin time course | D74 pp. 1224-1233 gives doses, not courses; not identified |
| **G19** | DOAC concentration to TT, PT, aPTT, anti-Xa | M46 p. 1448 gives the non-linearity only; not identified |
| **G20** | Coagulation baselines at term (fibrinogen g/L, factor activities, platelets) | "not searched down" (SN §5b); NB §21 |
| **G21** | Protamine reaction magnitudes and incidence | M50 refs 124-126 (Welsby 2005, Kimmel 1998, 2002; not read) |
| **G22** | The factor IU definition | the international standard, cited by C3 |
| **G23** | Fibrinogen's acute-phase synthesis rise; FDP inhibition in DIC | D74 refs 47, 51 (not read) |

Two numbers in the source note lost a symbol in the web text: L3's INR threshold and the TEG K unit (hand-over 206).
Neither is a parameter of this plan. If a later piece needs one, it confirms it on the PDF first.

Two sources are industry-linked:
- L1, an author team that includes the concentrate maker's group;
- L14, whose sponsor was not checked.

The plan uses them for product content and recovery only, and CQ5 asks the owner whether he accepts that.

---

## 3. What is engine truth and what is a device's reading

- **Engine truth** (state in `coag.ts`, snapshotted with the blood state):
  - the amounts of §2.1, the platelet pools and function, the drug amounts, the competence and the diffuse-bleeding
    sign;
  - the `labs` truth event gains fibrinogen and the platelet count from C1, and PT, INR and aPTT from C4.
- **The laboratory's reading** (an analyser row, `l2/blood/analysers.ts:72`, turnaround 2730 s, Hawkins 2007):
  - computed at the DRAW from the state, at 37 °C, recalcified (§2.4), and frozen with the sample, as today
    (`labs.ts:69-76`);
  - the `coag` panel returns `inr`, `pt`, `aptt`, `fibrinogen` and `platelets` as each lands. An analyte not computed
    yet is absent, never blank (the L10a rule, `learner-action-remote.md` L10a).
- **Point-of-care devices** (C8, C11), each an instrument row with its own turnaround:
  - the ACT;
  - a viscoelastic analyser (TEG or ROTEM) that runs at 37 °C by default (M46 p. 1443). Run at the patient's
    temperature it shows the hypothermic effect (L17). The device's temperature setting is part of the instrument,
    not of the patient.
- **The instructor's view** shows the truth (competence, sign and causes). The resident sees only what was sent
  and returned.

---

## 4. The pieces

Effort is in plan hours. They are **estimates**, not measurements.

**Rules for every piece:**
- Each piece is one PR on `main`, and writes its tests first.
- Every new coupling between modules gets its row in the coupling registry (`packages/engine-core/src/couplings/`,
  `blood.ts` and the module it reaches; `docs/plans/mechanism-tree.md` R1).
- Every new constant carries its source or its gap tag; the model docs regenerate.
- **Validation** means the `run-validation` label: any PR under `packages/engine-core/src/**` that can move a value
  (00-common-rules).
- **Gate for every engine piece:** the common gate, `@pme/engine-core` whole, `@pme/validation`, the validation
  workflow.
- **Must not touch (every piece):**
  - the circulation's own equations (`l2/circ/**`, except a registered coupling input);
  - the drug model's machinery (`l2/pk/*.ts`; new library rows only, in `l2/pk/data/`);
  - the renderer (except C12);
  - another piece's files.

**Goldens.** No piece is expected to move the monitor goldens or the showcase courses:
- C1-C3 add state that nothing outside haemostasis reads;
- diffuse bleeding (C5) acts only as CQ2 rules;
- the circulation couplings (C8, C10) act only when protamine or desmopressin is given, which no card does today.

A piece that does move a golden or a course re-records it IN THE SAME PR. It states the cause commit by commit and
runs a control (the same course on `main`). Adding keys to the 1 Hz `labs` truth event changes recorded event
snapshots; those regenerate in the piece that adds the key, with that cause.

```
C0a sources: clotting-time relation, ranges ──────────────► C4 PT/INR, aPTT ──┬─► C8 heparin, protamine, ACT
C0b sources: rates, triad, viscoelastic ──┐                     ▲              ├─► C9 VKA, PCC, DOACs
C0c sources: heparin, PCC, DOACs ─────────┼────────────────────(C8, C9)       └─► C12 lab view rows (PT/aPTT)
C0d sources: unread sections, pregnancy ──┘
C1 fibrinogen + platelets ─► C2 factor pools + synthesis + liver ─► C3 new products (PCC: G11)
C1 ─► C12 lab view rows (fibrinogen, platelets)
C1 ─► C5 competence + triad + diffuse-bleeding sign ─► C6 fibrinolysis, TXA, TIC ─► C7 consumption, DIC
C5 ─► C10 vWF, desmopressin, rFVIIa, antiplatelets, uraemia
C4 + C5 + C6 ─► C11 viscoelastic instrument          C7 ─► C13 acceptance courses     C0d + v1.1 patient ─► C14 pregnancy
```

**What can start on the owner's word, without any paper:** C1, C2 (its V and X half-lives aside, G4), C3 (PCC and
freeze-dried plasma aside), C5's sourced terms, and C12's fibrinogen and platelet rows. The EEG plan put every sources
review before any build piece (`eeg-clinical-generator.md` §5). Whether that rule applies here, where five pieces need
no paper, is CQ13.

### C0a: Sources review — the clotting-time relation and the reference ranges (8 h; no code)

- **Purpose:** settle G1, and G2 where the owner's laboratory gives it.
- **Reads:**
  - L9 and L21 in full, when the owner supplies them;
  - a factor-dilution study of PT and aPTT, which the review names. None is named here from memory;
  - the owner's laboratory's ISI, MNPT and ranges.
- **Output:** a section in `docs/research/coagulation-sources.md` giving the relation in words, with pages, and how
  it meets the nine constraints of §2.4. If no source supports a relation, the review says so and C4 stays blocked.
- **Gate:** docs test. **Validation:** no.

### C0b: Sources review — consumption, the triad and the viscoelastic relations (12 h; no code)

- **Purpose:** settle G6, G10, G12 and G13.
- **Reads:**
  - L10 and L11 (time courses);
  - L7 and L8 (temperature and pH tables), L6;
  - L4's figures;
  - Davenport 2011, and Brohi and Cohen (M62 refs 139-141, 148).
- **Output:** the same note, its own section.
- **Gate:** docs test. **Validation:** no.

### C0c: Sources review — heparin, PCC, DOACs, protamine reactions (8 h; no code)

- **Purpose:** settle G3, G11, G18, G19 and G21.
- **Reads:**
  - Bull 1975 (both papers);
  - one 4-factor PCC's product information;
  - the DOAC labels' test sections;
  - Welsby 2005 and Kimmel 1998 and 2002.
- **Gate:** docs test. **Validation:** no.

### C0d: Sources review — the unread sections and pregnancy (8 h; no code)

- **Purpose:** read what §1's completeness note lists as unread:
  - M46 pp. 1439-1441 (thrombotic states, HIT), pp. 1445-1446 and pp. 1451-1452;
  - M45's reaction, salvage, ANH and compatibility sections.

  Add any inventory row they bring. Settle G4, G17, G20, G22 and G23.
- **Gate:** docs test. **Validation:** no.

### C1: Fibrinogen and platelets: state, loss, dilution, products, and the two readings (12 h; validation)

- **Purpose:** the first readings a resident can trust: fibrinogen and the platelet count.
- **Depends on:** nothing outstanding (CQ5 for FFP's fibrinogen; until it is ruled, FFP carries none and says so).
- **Files:**
  - `l2/blood/coag.ts` and test (new);
  - `l2/blood/pipeline.ts` (step coag after the fluids; the bled and given volumes are already returned,
    `fluids.ts:114`);
  - `l2/blood/params.ts` (product contents: whole blood L20, apheresis and pooled platelets);
  - `l2/blood/labs.ts` (the two analytes);
  - `types-blood.ts`;
  - `couplings/blood.ts`;
  - snapshot restore.
- **Tests first:**
  - a healthy patient holds fibrinogen and platelets for 24 h (production = clearance);
  - §2.11 checks 1, 2, 6, 7 and 9, each with its source band;
  - a bleed removes platelets with whole blood, and red cells dilute the count;
  - whole blood stored 168 h carries 120 x 10^9/L platelets and unchanged fibrinogen (L20);
  - the `coag` panel returns `fibrinogen` and `platelets` and still the liver's `inr`;
  - snapshot and restore keep the state.
- **Acceptance:**
  - BF-05e and BF-25b/c rows report fibrinogen and platelets (their INR part waits for C4);
  - monitor goldens unchanged (control: `main`).

### C2: The factor pools, synthesis and the liver join (10 h; validation)

- **Depends on:** C1.
- **Files:** `coag.ts`, `params.ts` (FFP 70 %, the RBC residual plasma, storage losses of V and VIII), reading
  `organs.liver.liverFn` (a registered coupling).
- **Tests first:**
  - the steady state at `liverFn = 1`;
  - §2.11 checks 3, 4 and 5;
  - whole blood at 21 days carries V 50 % and VIII 30 % (M45 p. 1421);
  - liver failure lowers VII first, in time order (D74 p. 1225; half-lives §2.2);
  - VIII does not fall with liver failure (M14 p. 305).
- **G4:** V and X need a half-life for their synthesis term. Until G4 is settled, the term is marked as CQ1 rules.
- No new reading: the activities appear in the instructor's truth only.

### C3: The new products (10 h; validation)

- **Depends on:** C2.
- **Files:**
  - `params.ts` (cryoprecipitate pool, fibrinogen concentrate, pooled platelets, PF24 or thawed plasma, freeze-dried
    plasma, AT concentrate, PCC 3F and 4F);
  - the `transfusion` command's product list and units (`pipeline.ts:304-307`);
  - the concentrates as drug-library rows dosed in g or IU/kg;
  - the scenario schema's product enum.
- **Tests first:**
  - §2.11 check 8;
  - a 5-pool cryoprecipitate carries 1596 mg fibrinogen and 499 IU FVIII (L1);
  - PCC raises II, IX, X (and VII for 4F) and the rise then decays by each half-life (M46 p. 1451; content G11:
    PCC is BLOCKED until C0c, and the row says so);
  - freeze-dried plasma waits on G17.
- **Acceptance:** BF-26a/b/c/d accept their products (their FIBTEM/EXTEM targeting waits for C11).

### C4: PT, INR and aPTT (10 h; validation; BLOCKED on C0a / G1 and CQ4)

- **Depends on:** C2, C0a.
- **Files:**
  - `coag.ts` (the readings);
  - `labs.ts`, `types-blood.ts`;
  - `l2/liver/liver.ts:44, 49, 76` and `organs/pipeline.ts:261` (the stand-in INR deleted);
  - `engine.ts:1110`.
- **Tests first:**
  - the nine constraints of §2.4;
  - the M45 Table 45.15 patterns;
  - normal plasma reads the laboratory's normal (CQ4);
  - the INR formula (M46 p. 1441);
  - no `[FIT]` INR remains;
  - the PT and aPTT of a sample drawn at 33 °C equal those drawn at 37 °C (§2.4, I8). CQ3 decides how BF-25a and
    25e read.
- **Acceptance:** BF-05e and BF-25a.

### C5: Haemostatic competence, the lethal triad and the diffuse-bleeding sign (12 h; validation)

- **Depends on:** C1 (C2 for the factor term).
- **Files:**
  - `coag.ts`;
  - `l2/thermal/metabolic.ts:40, 61` (`coagF` deleted) and `l2/endo/pipeline.ts:21` (its neutral entry);
  - registered couplings from the core temperature, `blood.core.ab.ph` and iCa.
- **Tests first:**
  - the temperature ratio at 34, 31 and 28 °C equals L5's (§2.5);
  - platelet function falls below 35 °C and below pH 7.3 (S23 p. 489);
  - the pH factor term and the iCa term show their gaps (G13, G14) and do not move until ruled;
  - the sign appears at the sourced thresholds (§2.10) and names its causes;
  - nothing in the circulation moves unless CQ2 rules that it does.
- **Acceptance:** BF-25e (as CQ3 rules).

### C6: Fibrinolysis, the antifibrinolytics and trauma-induced coagulopathy (14 h; validation; rates on C0b)

- **Depends on:** C2, C5, C0b.
- **Files:**
  - `coag.ts`;
  - `l2/pk/data/rows-other.ts:104-106` (TXA's PD target on THIS row, as its comment requires), new EACA and
    aprotinin rows;
  - the card's tissue-injury input (the scenario schema).
- **Tests first:**
  - `lys` degrades fibrinogen, V and VIII (M46 p. 1436);
  - TXA lowers `lys` by occupancy, and EACA does so at its sourced potency ratio (M50 p. 1591);
  - APC lowers V and VIII with hypoperfusion before any fluid (D26 p. 371; M62 p. 2013);
  - a late dose in the shutdown phase brings no benefit (the CRASH-2 direction, M46 p. 1449);
  - each rate carries G6.
- **Acceptance:** BF-24.

### C7: Consumption and DIC (10 h; validation)

- **Depends on:** C6.
- **Files:** `coag.ts`; the condition command's ids (`pipeline.ts:320-324`: AFE, abruption, sepsis-driven DIC,
  haemolytic reaction); the D-dimer reading (G7).
- **Tests first:**
  - consumption lowers I, II, V, VIII and platelets (M45 p. 1421);
  - whole-blood replacement keeps fibrinogen unless DIC (M45 p. 1422);
  - the DIC pattern of Table 45.15;
  - an in-vivo fibrinogen < 150 mg/dL under whole-blood replacement appears only with consumption (M45 p. 1423).
- **Acceptance:** BF-28a/b.

### C8: Heparin, protamine, the ACT and the other parenteral anticoagulants (16 h; validation; on C0c)

- **Depends on:** C4 (aPTT), C0c (G3, G21).
- **Files:**
  - `coag.ts`;
  - new drug rows: UFH, protamine, LMWH, fondaparinux, argatroban, bivalirudin, AT;
  - the ACT instrument row (`analysers.ts`);
  - registered couplings from protamine to the circulation (type I hypotension, type III pulmonary vasoconstriction,
    M50 pp. 1589-1590).
- **Tests first:**
  - 300 U/kg gives an ACT > 480 s at 1.5-3.0 U/mL (M50 pp. 1584, 1615);
  - protamine 1 mg per 100 U returns the ACT to baseline (M46 p. 1442; M50 p. 1619);
  - > 2.6 mg/100 U prolongs the ACT (M50 p. 1586);
  - rebound within about 1 h (M50 p. 1588);
  - heparin resistance with AT < 60 % and its correction by AT concentrate (M50 pp. 1586-1588);
  - LMWH only 60 % reversed (D74 p. 1227);
  - fondaparinux not reversed (M46 p. 1442).
- **HIT** as CQ11 rules.
- **Acceptance:** BF-27a/b/c.

### C9: Warfarin, vitamin K, PCC, the DOACs and their reversal (14 h; validation; on C0c)

- **Depends on:** C3 (PCC), C4, C0c.
- **Files:** `coag.ts` (`vkF`); new rows: vitamin K, the DOACs, idarucizumab, andexanet; anti-Xa and TT readings.
- **Tests first:**
  - a warfarin profile has a long PT with a normal or mildly long aPTT (Table 45.15);
  - its PT rises at 24-48 h and II and X take 4-5 days (D74 p. 1232);
  - PCC at 25/35/50 U/kg (L12 R33) corrects the INR transiently;
  - vitamin K holds the correction (M46 p. 1451);
  - idarucizumab removes dabigatran (M46 p. 1448);
  - andexanet lowers anti-Xa 92 % (M46 p. 1448).

### C10: vWF, desmopressin, rFVIIa, antiplatelet drugs, uraemia, haemophilia and vWD (10 h; validation)

- **Depends on:** C5.
- **Tests first:**
  - desmopressin raises VIII 3-5 times (S23 p. 480), with its hypotension as a registered coupling (M50 p. 1612);
  - aspirin's platelet effect lasts the platelet life (M46 p. 1446);
  - rFVIIa's activity falls at pH 7.0 and 33 °C (L6 [ABS]);
  - the haemophilia A and vWD profiles bleed with normal PT and aPTT where M46 p. 1436 says they can.
- **Gap G24:** the uraemic platelet term from the renal model's urea has no relation in the sources read (M46 p.
  1438 gives the mechanism only).

### C11: The viscoelastic instrument (14 h; validation; on C0b)

- **Depends on:** C4, C5, C6, C0b.
- **Files:** a point-of-care instrument row with its own turnaround; the device temperature setting (37 °C default,
  M46 p. 1443); the scenario schema's sample kind.
- **Tests first:**
  - FIBTEM A5 = 1.58 + 3.09 x fibrinogen (L13);
  - the instrument at 37 °C hides hypothermia, and at the patient's temperature shows it (L17);
  - the normal, hypofibrinogenaemic and hyperfibrinolytic shapes of M46 Fig. 46.5;
  - every other value carries G12 until C0b.
- **Acceptance:** BF-25d; BF-26a-d targeting.

### C12: The lab view's coagulation rows (6 h; no validation; e2e)

- **Depends on:** C1 for fibrinogen and platelets; C4 for PT, INR and aPTT; CQ4 for the ranges.
- **Files:** `packages/renderer/src/lab-panel.ts` (rows with range and source, critical values from the Kost list or
  the owner's laboratory); `apps/demo/src/app/remote/labs.ts`; e2e cases.
- **Gate:** common, renderer, demo unit, the e2e that touches the lab view.

### C13: Acceptance courses from the clinical papers (8 h; validation)

- **Depends on:** C7.
- **The courses:**
  - Hiippala's plasma-poor replacement to 230 % (L9 [ABS]: fibrinogen 1.0 at 142 %, platelets 50 at 230 %);
  - Murray's falls per 0.3 blood volume (L21 [ABS]);
  - the trauma platelet fall in the first 1-2 h (L12 R30);
  - the PPH strata by fluid (L15);
  - the RAC crystalloid strata (M62 p. 2013);
  - the fatal-combination variables (M62 p. 2024).
- **The rule for each course:** every course's band is its source's own. A band is never widened to the engine.

### C14: Pregnancy (8 h; validation; BLOCKED on the v1.1 pregnant patient, G20 and CQ7)

- **Purpose:** the term baseline:
  - fibrinogen, VII, VIII, IX, X, XII and vWF up; XI and XIII down; AT and protein S down; platelets 0-10 % down;
    PT and PTT about 20 % shorter (M58 Table 58.4, p. 1889);
  - the obstetric conditions (abruption, AFE: C7);
  - the PPH course (L15, L11).
- **Values at term are G20.**

### Hours

| Piece | h | Piece | h |
|---|---|---|---|
| C0a | 8 | C7 | 10 |
| C0b | 12 | C8 | 16 |
| C0c | 8 | C9 | 14 |
| C0d | 8 | C10 | 10 |
| C1 | 12 | C11 | 14 |
| C2 | 10 | C12 | 6 |
| C3 | 10 | C13 | 8 |
| C4 | 10 | C14 | 8 |
| C5 | 12 | | |
| C6 | 14 | **total** | **190** (sources reviews 36, build 154) |

The learner-remote plan sized this as L10c at 12 h (`learner-action-remote.md` L10c), and said it "may need its own
plan". This plan replaces L10c: L10c's mechanism is C1 + C2 + C4 here, 32 h.
