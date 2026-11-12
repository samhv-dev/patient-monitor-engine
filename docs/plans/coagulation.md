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
