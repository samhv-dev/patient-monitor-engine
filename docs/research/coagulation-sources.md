# Coagulation in the bleeding surgical patient: source note for a later plan

Status: reading note, no design and no code. Written 12 November 2026 for brief 206. A later piece writes the plan from this note.

Purpose: residents of a teaching simulator manage a bleeding simulated patient and send a coagulation sample; the simulator has no clotting model yet. This note records what the sources say, with the source beside every fact. Nothing is from memory. Where two sources disagree both are shown. Where nothing was found, that is said.

## How to read this note

- **M45** = Miller's Anesthesia, 10th edition (2025), chapter 45 "Patient Blood Management: Transfusion Therapy" (Martinez, Dudley), printed pages 1398 onward. Local PDF `library/sources/miller-10th-2025/Ch45 - Patient Blood Management Transfusion Therapy.pdf`.
- **M46** = the same book, chapter 46 "Patient Blood Management: Coagulation" (Panigrahi, Liu), printed pages 1432-1453. Local PDF `Ch46 - Patient Blood Management Coagulation.pdf`.
- Page numbers are PRINTED page numbers read from the page headers of the text extract. Where a passage crosses a page break both pages are given.
- Papers (L1 to L22) are listed in section 5. Open papers were read as full text through Europe PMC's REST service; a web text has no page numbers, so the table, figure or section of the paper stands in for the page. Papers marked ABSTRACT ONLY were not open: only the published abstract was read, and each is also listed as wanted.
- Figures in "(...)" after a number are the source's own spread (SD, interval) unless stated.
- Previous notes on the trauma, cardiac, obstetric and liver chapters (`scratch/191-src/notes-B-other-chapters.md`: Miller ch. 62, 58, 50, 14, Stoelting, Dellinger, ERC 2025) were not redone. Where this note touches the same ground it adds only what the haemostasis and transfusion chapters themselves say.
- Not found in the two chapters (checked by search of the extracted text): a printed normal range for PT, INR or aPTT; a TXA dose; a vitamin K dose; a PCC dose; a protamine dose beyond the stoichiometric ratio; any coagulation change in pregnancy; the factor content of one unit of plasma, cryoprecipitate or platelets. Section 3 and 5 say where the literature fills some of these.

---

## 1. What an anaesthetist is taught about haemostasis in surgery

### 1a. Normal process, as M46 gives it

| Topic | What the chapter says | Source |
|---|---|---|
| Goal | Limit blood loss after vascular injury, maintain flow, promote revascularisation; endothelium, platelets and plasma proteins play "equally important" roles; a constant balance of procoagulant and counter-regulatory pathways | M46 p. 1432 |
| Endothelium | Antiplatelet (PGI2, NO, CD39 degrading ADP), anticoagulant (thrombomodulin raises protein C activation 1000-fold, endothelial protein C receptor a further 20-fold; heparan sulfate with antithrombin; TFPI) and profibrinolytic (t-PA) | M46 pp. 1432-1433 |
| Platelets | Anuclear, lifespan 8 to 12 days; about 10 % consumed daily for vascular integrity, 1.2-1.5 x 10^11 new platelets formed daily; adhesion (vWF bridge to GPIb), activation (alpha granules: fibrinogen, FV, FVIII, vWF; dense bodies: ADP, ATP, calcium, serotonin), aggregation (GPIIb/IIIa binds fibrinogen) | M46 p. 1433 |
| Cascade | Classic cascade is an oversimplification: deficiency of FXII, prekallikrein or HMWK prolongs the aPTT without bleeding. Factors are mostly liver-made zymogens; each complex needs enzyme, substrate, cofactor and calcium on platelet or microparticle phospholipid, which "functionally confines clot formation to sites of injury" | M46 p. 1434 |
| Initiation and propagation | Extrinsic (tissue factor/VIIa/Ca2+ activating X, also IX) is initiation; intrinsic pathway amplifies and has a minor role in initiation; common pathway: tenase and prothrombinase complexes, thrombin "burst", fibrinopeptides A and B cleaved, FXIIIa cross-links fibrin | M46 pp. 1434-1435 (Fig. 46.1, 46.2 p. 1434-1435) |
| Fibrinogen and FXIII | Reduced concentrations "may promote excess postoperative hemorrhage and transfusion requirements"; concentrates are available | M46 p. 1435 |
| Counter-regulation | Blood flow and haemodilution themselves limit localisation of platelets and factors, "a critical mass ... may fail to coalesce"; four counter-regulators: fibrinolysis, TFPI, protein C system, serpins (antithrombin, heparin cofactor II). Plasmin also degrades FV and FVIII and platelet receptors. Heparin accelerates antithrombin's inhibition of IXa, Xa, XIa, XIIa and thrombin | M46 pp. 1435-1436 (Fig. 46.3 p. 1435) |

### 1b. Clinical situations described in the two chapters

| Situation | What the chapters say | Source |
|---|---|---|
| Dilution by fluids | Major blood loss starts a consumptive coagulopathy from tissue hypoperfusion (raised protein C); "of which the most important are the dilution of coagulation factors by volume administration (e.g., crystalloid, colloid, PRBC), and the duration of hypotension and hypoperfusion". A well-perfused patient not hypotensive for more than about 1 hour "may tolerate administration of multiple units of blood without developing a coagulopathy"; a hypotensive patient who has received many RBC units develops a coagulopathy resembling DIC | M45 p. 1420 |
| Dilution: which component falls first | With packed red cells (little plasma) fibrinogen falls significantly, but "fibrinogen levels remained unchanged" with whole blood unless DIC was present (Murray 1988, Fig. 45.10, solid lines per patient) | M45 p. 1422 and Fig. 45.10 p. 1423 |
| Loss with bleeding, platelets | Thrombocytopenia defined as <150 x 10^9/L or a fall of more than 50 %; surgical bleeding usually not until <50 x 10^9/L, spontaneous bleeding <10 x 10^9/L; counts fell <100 x 10^9/L after 10-15 units in wounded soldiers; <75 x 10^9/L "a reasonably accurate guide" to dilutional bleeding (Miller 1971); observed counts rarely fall as low as dilution predicts (Fig. 45.8) because platelets may be released from spleen and marrow; acute dilutional thrombocytopenia bleeds at a higher count than chronic thrombocytopenia (chronic counts above 15 x 10^9/L often tolerated) | M45 pp. 1420-1421, Fig. 45.8 p. 1421, Table 45.10 p. 1409 |
| Loss with bleeding, fibrinogen and FV, FVIII | Fibrinogen is "critical for effective clot formation". FV and FVIII fall in stored whole blood to 50 % and 30 % of normal at 21 days and about 20 % at 35 days, and are absent from packed cells; but "only 5% to 20% of factor V and 30% of factor VIII are needed for adequate hemostasis during surgery" and they "rarely decrease below those levels" in massive transfusion | M45 p. 1421 |
| Consumption (DIC-like syndrome) | Hypoxic acidotic tissue with stagnant flow releases thromboplastin (directly or through the protein C pathway), t-PA release causes fibrinolysis, TNF and endotoxin activate coagulation; consumes I, II, V, VIII and platelets. DIC "is likely with thrombocytopenia, hypofibrinogenemia, and lysis of the clot"; a low in-vivo fibrinogen (<150 mg/dL) "does not result from a dilutional coagulopathy and strongly suggests DIC" (stated for whole-blood replacement) | M45 pp. 1421-1422, p. 1423 |
| DIC (M46) | Tissue factor/VIIa-driven; causes include trauma, amniotic fluid embolus, malignancy, sepsis, incompatible transfusion; falling platelets, prolonged PT, aPTT and thrombin time, raised soluble fibrin and degradation products; both a clinical and a laboratory diagnosis; chronic DIC may have near-normal screening tests; treat the cause, transfuse selectively, heparin "controversial", antifibrinolytics "generally contraindicated" | M46 p. 1438 |
| Low platelets and platelet dysfunction | Dysfunction with a normal count after trauma: hypofunction to ADP, arachidonic acid, collagen before resuscitation ("platelet exhaustion"); uraemic dysfunction (prolonged bleeding time; cryoprecipitate, desmopressin 0.3 mcg/kg); CPB downregulates GPIb and GPIIb/IIIa; drugs (beta-lactams, nitroprusside, NTG, NO, SSRIs) | M46 pp. 1437-1439 |
| Low calcium with citrate | Banked blood is anticoagulated with citrate that binds Ca2+. "Infusion of more than 1 unit of blood every 10 minutes can decrease ionized Ca2+ levels. Even at these infusion rates, ionized calcium levels do not drop enough to cause bleeding." Risk raised in children, hyperventilation, liver disease and transplantation. Citrate also adds to later bicarbonate and alkalosis | M45 p. 1402, p. 1423 |
| Low temperature | Cold stored blood lowers the recipient's temperature; "even small decreases in body temperature can significantly impair coagulation factors and platelet function"; blood warmers have lower and upper limits (for example 33 and 43 C); hypothermia during CPB lowers platelet aggregation, factor production and enzyme activity. ACT is artefactually prolonged by hypothermia and by haemodilution; heparin concentration monitors are not | M45 p. 1423; M46 p. 1438, p. 1442 |
| Acidosis | Bank blood: CPD pH about 5.5, mixed with fresh blood pH 7.4 falls to 7.1, bank blood about 6.9 after 21 days, PCO2 150-220 mm Hg; whole-blood pH 7.55 at day 0 to 6.73 at day 35 (packed cells 6.71). The chapters link acidosis with TIC but give no clotting-test numbers | M45 p. 1423, Table 45.4 p. 1403; M46 p. 1438 |
| Fibrinolysis | Plasmin from plasminogen via t-PA or urokinase, accelerated by fibrin; hyperfibrinolysis detected by TEG (Fig. 46.5C: LY30 89.4 %, MA 7.7 mm); in TIC an early hypocoagulable, fibrinolytic phase may be followed by "fibrinolysis shutdown" and hypercoagulability in which antifibrinolytics "may increase risk of venous thromboembolism"; hyperfibrinolysis also with CPB and in liver surgery | M46 pp. 1435-1436, p. 1438, p. 1439, p. 1444 |
| Trauma-induced coagulopathy | Independent acute coagulopathy besides acidosis, hypothermia and dilution; activated protein C primary (inhibits Va, VIIIa and PAI-1), hypoperfusion the stimulus; glycocalyx shedding (syndecan-1, heparan sulfate) causes "auto-heparinization"; CRASH-2 | M46 pp. 1438-1439 |
| Heparin and reversal | UFH binds antithrombin; "full reversibility with protamine"; 1 mg protamine inhibits about 1 mg (about 100 units) heparin; enoxaparin only partly reversed by protamine (does not abolish anti-Xa); fondaparinux not reversed (pentasaccharide too short); heparin resistance (antithrombin deficiency) about 21 % in CPB, treated with FFP or antithrombin concentrate | M46 p. 1442, p. 1447, Table 46.5 p. 1453 |
| Warfarin | Half-life 40 h; full effect 3-4 days; factor II half-life about 60 h, factor VII and protein C 3-6 h. Reversal: 4-factor PCC plus vitamin K (PCC correction transient because the administered factors are short-lived); FFP "difficult and often unrealistic" because of the volume needed to raise vitamin K dependent factors by 50 % | M46 p. 1446, p. 1451 |
| DOACs and reversal | Dabigatran: idarucizumab (affinity 350 times thrombin's, median time to haemostasis 2.5 h); factor Xa inhibitors: andexanet alfa (92 % reduction of anti-Xa activity; 10 % thrombotic events at 30 days (34/352)); supportive care first; reserve reversal for life-threatening bleeding | M46 p. 1448, pp. 1452-1453, Table 46.5 p. 1453 |
| Liver disease | Reduced synthesis of fibrinogen, II, V, VII, IX, X, XI, XII and of protein C, S and antithrombin; low platelets; but "rebalanced hemostasis": thrombin generation equivalent to healthy; raised vWF, lowered ADAMTS13; TAFI low but PAI-1 high; "traditional coagulation testing does not correlate with bleeding risk", so TEG or ROTEM are used | M46 pp. 1437-1438 |
| Pregnancy | **Not described in M45 or M46** (search of both extracts: pregnancy appears only as a risk for thrombosis, as a relative contraindication to thrombolytics, with anti-Xa monitoring and LMWH preference, and with WOMAN). See the literature, section 4 | M46 pp. 1448-1449 (mentions only) |
| Massive transfusion | San Francisco protocol (Fig. 45.7): thresholds INR >2.0 (>1.7 for bleeding near eye, brain, airway), platelets <75,000, fibrinogen <100 mg/dL, Hct <30 %; give 4 FFP and 6 packs of platelets when coagulopathic; FFP:platelets:RBC 1:1:1 meaning one unit plasma and one-sixth unit of platelets per unit RBC; whole-blood era: significant thrombocytopenia usually only after 15-20 units, "FFP was not usually required as a separate component"; PROPPR 1:1:1 vs 1:1:2 no mortality difference at 24 h or 30 days; PROMMTT early high ratios linked to lower mortality | M45 p. 1420, Fig. 45.7 p. 1420; M45 p. 1411 |
| Whole blood | Fresh (defined variously: stored at 1-6 C within 8 h and used within 24 h; or stored <48 h at 2-5 C); "the difference between 1 hour and 2 days of storage can be tremendous"; whole blood stored 24 h at 4 C "has less hemostatic effects" than blood <6 h old because of lower platelet aggregability; Vietnam and Iraq experience; one unit of fresh whole blood as effective as 8 to 10 platelet units (Lavee) | M45 pp. 1419-1420, p. 1422 |

### 1c. Statements in M45/M46 that disagree with each other or with the literature in this note

| Item | Statement A | Statement B |
|---|---|---|
| Platelet increment per concentrate | One platelet concentrate raises the count by about 7-10 x 10^9/L at 1 h in a 70-kg adult; 10 units raise it by 100 x 10^9/L (M45 p. 1410) | "approximately 10 units of platelet concentrates are required to increase the platelet count by 10 x 10^9/L" (M45 p. 1422). The European trauma guideline: one apheresis pack (about 3-4 x 10^11 platelets) "should increase the platelet count by >30 x 10^9/L" (L12, R30) |
| Platelet life | 8-12 days (M46 p. 1433) | 7-10 days (M46 p. 1446, aspirin discussion) |
| Fibrinogen in whole blood vs in trauma | "this coagulation factor does not decrease in whole blood" (M45 p. 1422) | Trauma fibrinogen is low on admission and linked to injury severity, shock and prehospital fluid (L10, abstract) |
| Acidosis alone and clotting | Not quantified in M45/M46 | Human whole blood in vitro: no significant effect at normal temperature (L7); swine: acidosis alone raised bleeding time 47 % and cut thrombin generation to 47 % of control at 4 min (L8) |

---

## 2. Laboratory tests and what moves them

### 2a. Tests, ranges and what the chapters say

| Test | Stated normal / threshold / relation | Source |
|---|---|---|
| PT / INR | Extrinsic + common pathway; sensitive to fibrinogen, II, V, VII, X; INR = (patient PT / standard PT)^ISI, standard PT = geometric mean of normals. "More sensitive at detecting decreases in factors VII and X than levels of fibrinogen and factors II and V"; "factor levels as low as 40% to 50% may not prolong the PT". No numeric normal range printed | M46 p. 1441 |
| aPTT | Intrinsic + common; most sensitive to VIII and IX; factor levels below 30-40 % of normal are detectable, but some reagents not prolonged until below 15 % for some factors; no INR equivalent, laboratory-specific ranges, not comparable between laboratories. No numeric normal range printed | M46 p. 1441 |
| PT/aPTT as screening | By construction 2.5 % of healthy individuals have an abnormal PT or aPTT; mild haemophilia A, vWD and FXIII deficiency can bleed with normal values | M46 p. 1436 |
| Fibrinogen | Treat below 150 mg/dL (ASA, rarely indicated above 150 in non-obstetric patients); cryoprecipitate when <80-100 mg/dL with excessive bleeding; obstetric bleeding despite >150 mg/dL; massive-transfusion algorithm threshold <100 mg/dL; "fibrinogen concentrate if major bleeding is accompanied by hypofibrinogenemia (<=1.5 g/L) or signs of functional fibrinogen deficit on viscoelastic testing" | M45 pp. 1410-1411, Fig. 45.7 p. 1420; M46 p. 1450 |
| Platelet count | Above 100 x 10^9/L "commonly" associated with normal haemostasis (stated as somewhat arbitrary); prophylactic transfusion rarely needed above 100, usually below 50 (ASA 2015); neurosurgery target 100; severe thrombocytopenia <20 x 10^9/L with bleeding needs platelets; bleeding incidence vs count (Table 45.10: >100,000: 0/21; 75-100,000: 3/14; 50-75,000: 7/11; <50,000: 5/5) | M46 p. 1442; M45 pp. 1409-1410, Table 45.10 p. 1409 |
| ACT | Normal 107 +/- 13 s; measures intrinsic + common pathway; "somewhat resistant to platelet dysfunction and thrombocytopenia"; linear to 600 s; prolonged artefactually by haemodilution and hypothermia; cardiac-surgery heparin 300-400 U/kg, ACT above 400-480 s "usually considered safe" to start CPB | M46 p. 1442, p. 1447 |
| Heparin concentration | Protamine titration; insensitive to haemodilution and hypothermia; but does not measure effect (antithrombin deficiency not detected) | M46 p. 1442 |
| Anti-Xa | Not affected by factor deficiencies, factor inhibitors or lupus anticoagulant; poorly standardised; needed for unpredictable drug levels (renal failure, pregnancy, weight <50 or >80 kg) | M46 pp. 1441-1442, p. 1447 |
| Bleeding time | Not predictive of bleeding, not recommended as screening | M46 p. 1442 |
| TEG | 0.35 mL whole blood, 37 C, kaolin. R = time to initial clot (prolonged by factor deficiency or heparin); MA = clot strength (decreased by platelet dysfunction/count or low fibrinogen); alpha angle and K = rate of clot formation | M46 pp. 1443-1444 |
| TEG, printed example values with the figure's own reference ranges (kaolin, TEG 5000) | Normal: R 5.8 min (5-10), K 1.9 (1-3), alpha 65.2 deg (53-72), MA 55.9 mm (50-70), G 6.3K d/sc (4.5K-11.0K), EPL 0 (0-15 %), LY30 0 (0-8 %). Hypofibrinogenaemia: R 9.2, K 9.1, alpha 31.1, MA 30.9 mm, G 2.2K. Hyperfibrinolysis: R 5.9, K not reached, alpha 24.4, MA 7.7 mm, G 0.4K, EPL and LY30 89.4 % | M46 Fig. 46.5 p. 1444 |
| ROTEM | Coagulation time, alpha angle (clot formation time), MCF, lysis time; EXTEM A5/CA5 below 35 mm predicted massive transfusion (Davenport; detection 77 %, false positive 13 %: from the trauma chapter, see notes-B) | M46 p. 1443; notes-B (M62 p. 2013) |
| Viscoelastic tests in practice | Reduce blood administration when used within an algorithm; limited by lack of specificity; run at 37 C | M46 p. 1443 |
| Laboratory pattern table (Hunt, NEJM 2014) | Vitamin K deficiency / VKA: PT prolonged, aPTT normal or mildly prolonged, fibrinogen and platelets unaffected. Aspirin / thienopyridines: only bleeding time. Early liver failure: PT only; end-stage: PT, aPTT prolonged, fibrinogen low, D-dimer up, platelets down. DIC: PT, aPTT prolonged, fibrinogen low, D-dimer up, platelets down, fragmented red cells. Hyperfibrinolysis: PT, aPTT prolonged, fibrinogen low, D-dimer very high, platelets unaffected | M45 Table 45.15 p. 1422 |
| Transfusion triggers in the coagulopathy algorithm | Diffuse bleeding: exclude surgical bleeding, correct hypothermia, immediate PT, PTT, fibrinogen, platelets; low platelets: 5-10 units of platelets, consider DDAVP; high PT/PTT with normal platelets and fibrinogen: FFP; high PT/PTT with low platelets and fibrinogen: cryoprecipitate plus platelets, work up DIC. FFP when INR >2 (absent heparin), or when more than one blood volume (about 70 mL/kg) is transfused and tests are unavailable. If PTT >=1.5 x normal with other tests normal: low V and VIII, give FFP or cryoprecipitate | M45 Fig. 45.11 p. 1424, p. 1410, p. 1422 |
| Test relations that the chapters state | Citrated samples are recalcified for testing, so tests do not show the effect of low ionised calcium (this statement is from L12, not from M45/M46); aPTT prolongation by argatroban (target 1.5-3 times baseline), dabigatran (aPTT not linear until >200 ng/mL; thrombin time very sensitive, dilute thrombin time or ecarin time linear); argatroban also prolongs PT/INR; INR not calibrated for non-warfarin deficiency | M46 p. 1447, p. 1448 |

### 2b. Relations between factor level, dilution or condition and a test result (from the literature)

| Relation | Number | Source |
|---|---|---|
| PT and aPTT vs temperature, factors all normal (pooled normal plasma, tested at stated temperature) | PT 11.8 s (37 C), 12.9 (34 C), 14.2 (31 C), 16.6 (28 C); aPTT 36.0 s (37 C), 39.4 (34 C), 46.1 (31 C), 57.2 (28 C); only minimally shortened at 39-41 C | L5 (abstract), Rohrer 1992 |
| FIBTEM A5 vs Clauss fibrinogen, postpartum haemorrhage | A5 = 1.58 + 3.09 x fibrinogen (g/L), r = 0.88; A5 11 mm corresponds to 3.05 g/L, A5 7.8 mm to 2 g/L | L13, Fig. 1, Results |
| In-vitro dilution of term pregnant blood with Plasma-Lyte | EXTEM CT prolonged from 65 % dilution; FIBTEM A5 began to fall at 35 % dilution and median A5 <12 mm at 55 % dilution; EXTEM CT >80 s at 80 % | L16 (abstract) |
| Fluid volume and tests in severe PPH | See section 4 | L15 |
| Ionised calcium and routine tests | The tests are run after recalcification; the guideline states they do not show the effect of low iCa | L12, R31 rationale |

---

## 3. Products and drugs

### 3a. What one unit or dose contains and what it raises

| Product | Stated content / effect | Source |
|---|---|---|
| Red cells, whole blood (storage) | CPDA-1 at 1-6 C; day 0 to day 35 whole blood: pH 7.55 to 6.73, plasma K 4.2 to 17.2 mEq/L (packed cells 76.0), 2,3-DPG 13.2 to 1.0 umol/mL; stored 21 days: K 19-50 mEq/L in unit but net gain to the recipient about 10 mEq/L; clinically significant hyperkalaemia needs banked blood at >=120 mL/min | M45 Table 45.4 p. 1403; p. 1423 |
| Plasma (FFP, PF24, thawed) | Frozen within 8 h or 24 h (PF24); contains all plasma proteins; V and VIII decline in storage; PF24 has slightly less FV and about 25 % less FVIII; thawed plasma 1-6 C for up to 5 days; "FFP contains only ~70 % the normal level of all clotting factors" (guideline); FFP "has a variable amount of fibrinogen and other factors"; no consistent correction of clot function or factor concentrations after FFP in a prospective cohort of bleeding trauma patients. Volume and units per dose: not stated in M45; 4 units (San Francisco protocol) or 2 units (prehospital trial) | M45 p. 1410, Fig. 45.7 p. 1420; L12, R27 rationale |
| Freeze-dried plasma | Reconstituted with 200-250 mL sterile water, usable within a minute, room-temperature storage 2 years | M45 p. 1410 |
| Cryoprecipitate | Contains FVIII:C, vWF, fibrinogen, FXIII, fibronectin; infuse at >=200 mL/h and finish within 6 h of thawing. NHSBT pool of 5 donations: fibrinogen >700 mg (mean 1596 mg), FVIII >350 IU (mean 499 IU), volume 100-300 mL (mean 236 mL), "wide variation" between units | M45 p. 1410; L1, Introduction |
| Cryoprecipitate, measured | 6 bags tested: fibrinogen 4.83 g/L; a "standard dose" of 10 units (two 5-donor pools) held 2.14 g fibrinogen and varied by more than 1 g | L1, Results |
| Cryoprecipitate, manufacturing variation | Pool of 5 from homogenous plasma: fibrinogen 1,824 mg (water-bath thaw) vs 2,554 mg (24 h refrigerator thaw); 2,956 vs 3,180 mg (24 vs 36 h); 2,483 vs 2,893 mg (24 vs 48 h); FVIII 709 vs 601 IU; national minimum for a 5-pool 750 mg fibrinogen and 400 IU FVIII | L2, Tables 1-2, Methods |
| Fibrinogen concentrate | One tested product: 19.73 g/L, standard dose 4 g, 3.95 g measured per dose (varied by 0.2 g); 1 g vial reconstituted in 50 mL = 20 mg/mL; FXIII 328 IU/dL | L1 |
| Fibrinogen concentrate, stated rise | Afibrinogenaemic adults: 0.06 g/kg raised plasma fibrinogen about 1.4 g/L (incremental recovery 23.3 g/L per g/kg); in bleeding surgical patients concentrate raised plasma fibrinogen by 0.78 g/L vs 0.35 g/L for cryoprecipitate (FORMA-05, as quoted in L1). The European trauma guideline: initial 3-4 g, "equivalent to 15-20 single donor units of cryoprecipitate"; 2 g empirically to mimic 1:1 for the first 4 units RBC | L14, Table "PK parameters"; L1 Discussion; L12, R29 |
| Platelets | Pooled from 4-6 donations or one apheresis donor; 1 platelet concentrate raises the count by about 7-10 x 10^9/L at 1 h in a 70-kg adult (see 1c for the disagreement); a 50-mL concentrate has about 70 % of the platelets of a unit of blood; one apheresis pack about 3-4 x 10^11 platelets and should raise the count by >30 x 10^9/L; guideline dose 4-8 single units or one apheresis pack | M45 pp. 1408, 1410, p. 1422; L12, R30 |
| Whole blood | One typed, crossmatched unit that has not been cooled "retains most of the factors of normal in vivo blood"; a low-titre O whole-blood unit from healthy donors measured at day 0: platelets 172 +/- 29 x 10^9/L, fibrinogen 2.43 +/- 0.5 g/L, INR 1.16, Hb 12.97 g/dL; after 168 h cold storage platelets 120 +/- 28 x 10^9/L, fibrinogen unchanged (these are values inside an anticoagulated unit, not patient values) | M45 p. 1419; L20, Tables |
| PCC | 3-factor lacks significant FVII; 4-factor includes FVII; FEIBA contains activated FVII; some products contain heparin, antithrombin, protein C and S; FDA-approved for VKA reversal; low volume lowers TACO risk. **Units per vial or factor content: not stated in the sources read** (guideline dosing is in U/kg: 25-50 U/kg; 25 U/kg if INR 2-4, 35 U/kg if 4-6, 50 U/kg if >6) | M46 p. 1450; L12, R33 |
| PCC vs FFP for VKA reversal | Effective haemostasis 90 % vs 75 %, fluid overload 3 % vs 13 %, thromboembolic events 7 % vs 8 % (RCT, 4-factor PCC); meta-analysis of 19 studies: thromboembolic complications 2.5 % (PCC) vs 6.4 % (FFP) | M46 p. 1452; L12, R33 rationale |
| Vitamin K | IV acts faster than SC or oral; guideline: 5-10 mg IV with PCC (less may not fully correct INR, more than 10 mg can delay re-warfarinisation) | M46 p. 1451; L12, R33 |
| Calcium | Calcium chloride 10 mL of 10 % = 270 mg elemental Ca; calcium gluconate 10 mL of 10 % = 90 mg; CaCl2 preferred, especially in poor liver function; each unit of RBC or FFP carries about 3 g citrate normally cleared by the liver to bicarbonate within minutes | L12, R31 rationale |
| rFVIIa | Half-life 2-2.5 h; off-label use no longer recommended; arterial events RR 1.45 (1.02-2.05); activity falls over 90 % when pH falls 7.4 to 7.0 and about 20 % (FVIIa/TF) at 33 C (in vitro) | M46 pp. 1449-1450; L6 (abstract) |
| Tranexamic acid | Lysine analogue, competitively inhibits the plasminogen binding site and fibrin binding of plasminogen. CRASH-2: all-cause mortality 14.5 % vs 16 %, death due to bleeding 4.9 % vs 5.8 %; relative risk of death from bleeding <=1 h 0.68 (0.57-0.82), 1-3 h 0.79 (0.64-0.97), >3 h 1.44 (1.12-1.84); surgical meta-analysis transfusion risk ratio 0.62 (0.58-0.65), Cochrane 39 % fewer transfusions; seizures at high dose (GABA-A). WOMAN: reduced death due to bleeding in PPH, especially within 3 h. **Dose not given in M46.** Guideline dose: 1 g over 10 min then 1 g over 8 h, within 3 h | M46 p. 1449; L12, R23 |
| Heparin / protamine | Cardiac surgery heparin 300-400 U/kg; protamine 1 mg per about 100 U heparin; heparin half-life "short" (no number given); retrospective chemosaturation series: protamine:heparin ratios used 0.3-1 mg per U, a 10 % higher protamine dose was associated with a 3 % lower aPTT and 4 % higher fibrinogen | M46 p. 1442, p. 1447; L18 |
| Desmopressin | 0.3 mcg/kg in uraemic platelet dysfunction; releases vWF; consider in excessive bleeding or suspected platelet dysfunction (ASA) | M46 p. 1438; M45 p. 1409 |
| Factor half-lives found | Warfarin 40 h; factor II about 60 h; factor VII and protein C 3-6 h; rFVIIa 2-2.5 h; argatroban 45 min; fondaparinux 17-21 h; aspirin 15-20 min (platelet effect lasts the platelet life); FVIII about 12 h (free FVIII about 2 h); fibrinogen concentrate in afibrinogenaemia 69.3 h in adults (59.2 h overall); administered FVII about 6 h | M46 pp. 1446-1447, 1449; L19; L14; L12, R33 |

### 3b. Gaps in this section

Not found anywhere in the sources read: a stated half-life of unfractionated heparin in minutes; the volume and fibrinogen content of one unit of FFP; the factor-IX units per vial of PCC; the platelet content or rise from one single unit in the trauma setting measured in bleeding patients; a stated fibrinogen half-life in a bleeding patient (only in congenital afibrinogenaemia, L14).

---

## 4. Measured time courses and magnitudes from clinical papers

| Topic | Measurement | Source |
|---|---|---|
| Surgical blood loss replaced by plasma-poor red cells and colloid (60 patients, mean loss 65 +/- 41 % of blood volume) | Platelets initial 257 +/- 89 x 10^3/mm3, regression reached 50 x 10^3 at 230 % of blood volume lost (CI 169-294 %). Fibrinogen initial 3.7 +/- 1.1 g/L, "hemostatically significant" 1.0 g/L reached at 142 % lost (117-169 %). Prothrombin, FV, FVII reached critical levels at 201 %, 229 %, 236 % lost. Fibrinogen deficiency develops before any other abnormality | L9 (abstract), Hiippala 1995 |
| Packed-cell replacement, 12 patients | After each 0.3 blood volume lost: significant falls in platelets, fibrinogen, FV, FVIII, FIX; PT and aPTT above control in 9 of 12 before 1 blood volume was replaced, yet none of those 9 bled more; in 4 of 7 with more than 1 volume replaced bleeding increased, with platelets <100,000/mm3 in all 4 (abstract truncated by the database) | L21, Murray 1988 |
| Massive transfusion with stored modified whole blood, 27 patients | Platelet count fell in proportion to units transfused; FV and FVIII correlated poorly (85 % of variation from other causes); other factors unrelated to units; 8 bled (5 dilutional thrombocytopenia, 3 DIC); platelet count the most useful predictor; BT, PT, PTT not helpful unless >1.5 times control; platelet counts as high as 100,000 may be needed for surgical wounds | L22, Counts 1979 (abstract) |
| Platelet counts in the first hours of trauma resuscitation | Normal at admission but "may decrease sharply in the following 1-2 h of haemostatic resuscitation and decline continuously thereafter" | L12, R30 rationale |
| Trauma fibrinogen | Admission fibrinogen lower with higher ISS, shock and prehospital fluid; supplementation during transfusion "maintained but did not augment" fibrinogen; no numbers in the abstract | L10 (abstract) |
| Severe postpartum haemorrhage, 1038 women, by fluid given before sampling (<2 L vs >3.5 L), earliest phase | Hb 10.1 vs 8.1 g/dL; platelets 181 vs 89 x 10^9/L; aPTT 29 vs 38 s; fibrinogen 3.9 vs 1.6 g/L | L15, Abstract |
| PPH, 128 women, serial tests at 0, 1, 2, 4, 24 h | Severe PPH had lower fibrinogen, FV, antithrombin and protein C and longer PT from H0 to H4; risk of severe PPH 2.63 times per 1 g/L fall in fibrinogen at H0; fibrinogen >4 g/L negative predictive value 79 %, <=2 g/L positive predictive value 100 % | L11 (abstract), Charbit 2007 |
| Term pregnant blood diluted in vitro with Plasma-Lyte | EXTEM CT prolonged at 65 % dilution; FIBTEM A5 falls from 35 % dilution, <12 mm at 55 % | L16 (abstract) |
| Temperature, standard tests (plasma, factors normal) | See 2b | L5 |
| Temperature, whole blood ROTEM, healthy volunteers, normal pH, 36 C to 30 C | ExTEM CT 65 to 85 s; ExTEM CFT 105 to 187 s; InTEM CT 181 to 226 s; InTEM CFT 101 to 175 s; ExTEM alpha 65.6 to 58 deg; InTEM alpha 70.5 to 60.2 deg; InTEM MCF 56.9 to 52.7 mm | L7 (abstract) |
| Temperature, patients | Passive-warmed mildly hypothermic thoracic surgery patients (core 36.0 +/- 0.8 C vs 36.9 +/- 0.5 C): MA 59.4 vs 64.2 mm, alpha 70.4 vs 74.9 deg, ACT 122.2 vs 117.3 s, K 1.9 vs 1.3 min (TEG at 37 C); re-running the same samples at about 36 C made ACT 128.1 s, K 2.4 min, MA 57.0 mm, alpha 67.4 deg; standard tests did not differ | L17, Results |
| pH | pH 7.4 to 7.0 reduced FVIIa activity by >90 % and FVIIa/TF by >60 % (in vitro); acidosis alone no significant TEM effect at normothermia in volunteers (L7) but swine pH 7.1 raised splenic bleeding time 47 %, lowered fibrinogen 18 %, thrombin generation at 4 min to 47 % of control; with 32 C bleeding time +72 %, thrombin generation 5.7 % of control | L6, L7, L8 (abstracts) |
| pH, in vitro with rivaroxaban | Acidosis prolonged CT and CFT but did not by itself reduce alpha angle; rivaroxaban plus pH 6.8 or 7.0 prolonged CT more than additive (p=0.003); EXTEM values by pH are in figures, not in text | L4, Results, Discussion |
| Ionised calcium | Trauma admission iCa <1.10 mmol/L in 13.2 % of 30,183 patients; coagulopathy (PTT >=40 s and/or INR >=1.4, sign to verify) 21.9 % vs 13.3 % in normocalcaemia vs 31.9 % in hypercalcaemia (>=1.30); iCa <0.90: coagulopathy 48.8 %, transfusion 47.5 %, mortality 36.3 %; guideline: normal 1.1-1.3 mmol/L; a 0.1 unit pH rise lowers iCa by about 0.05 mmol/L | L3, Table 1, Fig. 2; L12, R31 |
| Fibrinogen half-life and recovery | 69.3 h in adults with congenital afibrinogenaemia; 0.06 g/kg raises about 1.4 g/L; Vss 43.8 mL/kg | L14 |
| Factor half-lives | See 3a | |
| Whole blood storage | Platelets 172 to 120 x 10^9/L over 168 h; factors unchanged | L20 |

---

## 5. Papers, what was searched, what could not be read

### 5a. Papers read (the L numbers used above)

| No. | Reference | DOI | Read as |
|---|---|---|---|
| L1 | Differences in coagulation-relevant parameters: cryoprecipitate and a human fibrinogen concentrate. PLoS One 2023 | 10.1371/journal.pone.0290571 | Open full text. One author team includes the concentrate manufacturer's research group: treat the content ratios as a comparison done by an interested party |
| L2 | Effect of water bath versus refrigerator thaw on cryoprecipitate fibrinogen and factor VIII content. Transfus Med Hemother 2025 | 10.1159/000540089 | Open full text |
| L3 | Trauma-induced disturbances in ionized calcium levels correlate parabolically with coagulopathy, transfusion, and mortality. Crit Care 2023 | 10.1186/s13054-023-04541-3 | Open full text |
| L4 | Synergistic effects of rivaroxaban and hypothermia or acidosis on coagulation initiation measured with ROTEM. Thromb J 2024 | 10.1186/s12959-024-00661-0 | Open full text |
| L5 | Rohrer MJ, Natale AM. Effect of hypothermia on the coagulation cascade. Crit Care Med 1992;20:1402-5 | 10.1097/00003246-199210000-00007 | Abstract only |
| L6 | Meng ZH, Wolberg AS, Monroe DM, Hoffman M. The effect of temperature and pH on the activity of factor VIIa. J Trauma 2003;55:886-91 | 10.1097/01.ta.0000066184.20808.a5 | Abstract only |
| L7 | Dirkmann D, Hanke AA, Gorlinger K, Peters J. Hypothermia and acidosis synergistically impair coagulation in human whole blood. Anesth Analg 2008;106:1627-32 | 10.1213/ane.0b013e31817340ad | Abstract only |
| L8 | Martini WZ, Pusateri AE, Uscilowicz JM, Delgado AV, Holcomb JB. Independent contributions of hypothermia and acidosis to coagulopathy in swine. J Trauma 2005;58:1002-10 | 10.1097/01.ta.0000156246.53383.9f | Abstract only |
| L9 | Hiippala ST, Myllyla GJ, Vahtera EM. Hemostatic factors and replacement of major blood loss with plasma-poor red cell concentrates. Anesth Analg 1995;81:360-5 | 10.1097/00000539-199508000-00026 | Abstract only |
| L10 | Rourke C, Curry N, Khan S, et al. Fibrinogen levels during trauma hemorrhage, response to replacement therapy, and association with patient outcomes. J Thromb Haemost 2012;10:1342-51 | 10.1111/j.1538-7836.2012.04752.x | Abstract only |
| L11 | Charbit B, Mandelbrot L, Samain E, et al. The decrease of fibrinogen is an early predictor of the severity of postpartum hemorrhage. J Thromb Haemost 2007;5:266-73 | 10.1111/j.1538-7836.2007.02297.x | Abstract only |
| L12 | Rossaint R, et al. The European guideline on management of major bleeding and coagulopathy following trauma: sixth edition. Crit Care 2023;27:80 | 10.1186/s13054-023-04327-7 | Open full text. Recommendations R23, R26-R33 read; R34 (factor Xa inhibitors) not read in the 6th edition |
| L13 | Relationship between the dual platelet-inhibited ROTEM Sigma FIBTEM assay and Clauss fibrinogen during postpartum haemorrhage. Anaesthesia 2025 | 10.1111/anae.16455 | Open full text |
| L14 | Population pharmacokinetics of a triple-secured fibrinogen concentrate administered to afibrinogenaemic patients. Br J Clin Pharmacol 2020 | 10.1111/bcp.14147 | Open full text. A study of a fibrinogen concentrate product in congenital afibrinogenaemia (sponsor statement not checked) |
| L15 | Association between fluid management and dilutional coagulopathy in severe postpartum haemorrhage: a nationwide retrospective cohort study. BMC Pregnancy Childbirth 2018 | 10.1186/s12884-018-2021-9 | Open full text |
| L16 | The effects of hemodilution in vitro on coagulation in term parturients using thromboelastometry. J Clin Transl Sci (conference abstract "4402") | no DOI found in Europe PMC (PMCID PMC8823515) | Open abstract only; a pilot |
| L17 | Temperature effect on coagulation function in mild hypothermic patients undergoing thoracic surgeries: TEG versus standard tests. Perioper Med 2024 | 10.1186/s13741-024-00405-8 | Open full text |
| L18 | Effects of protamine reversal on coagulation parameters after high-dose heparin administration in percutaneous hepatic chemosaturation. Clin Pract 2025 | 10.3390/clinpract15020038 | Open full text |
| L19 | Plasma clearance of coagulation factor VIII and extension of its half-life for the therapy of hemophilia A. Int J Mol Sci 2023 | 10.3390/ijms24108584 | Open full text, only the half-life statements read |
| L20 | Coagulation and platelet function in cold-stored whole blood on missions in a helicopter emergency medical service. Acta Anaesthesiol Scand 2025 | 10.1111/aas.14568 | Open full text |
| L21 | Murray DJ, Olson J, Strauss R, Tinker JH. Coagulation changes during packed red cell replacement of major blood loss. Anesthesiology 1988;69:839-45 | 10.1097/00000542-198812000-00007 | Abstract only (truncated in the database) |
| L22 | Counts RB, Haisch C, Simon TL, et al. Hemostasis in massively transfused trauma patients. Ann Surg 1979;190:91-9 | 10.1097/00000658-197907000-00020 | Abstract only |

All DOIs L5-L11 and L21-L22 were resolved through Crossref to the same title, journal, volume and pages. The other DOIs come from Europe PMC's record of the open full text.

### 5b. Papers wanted (full text not open)

| Reference | DOI | Why |
|---|---|---|
| L5 Rohrer 1992 | 10.1097/00003246-199210000-00007 | The primary measurement of PT and aPTT against temperature; the abstract gives the means but the sample and method need the full text. Not open |
| L7 Dirkmann 2008 | 10.1213/ane.0b013e31817340ad | Full ROTEM tables by pH and temperature (abstract gives the 36 vs 30 C cells only). Not open |
| L8 Martini 2005 | 10.1097/01.ta.0000156246.53383.9f | Swine acidosis/hypothermia: full tables of PT, TEG, thrombin generation. Not open |
| L6 Meng 2003 | 10.1097/01.ta.0000066184.20808.a5 | Activity curves of FVIIa against pH and temperature. Not open |
| L9 Hiippala 1995 | 10.1097/00000539-199508000-00026 | The numeric "critical" activities used for prothrombin, FV, FVII and the regression equations; best single source for how fibrinogen, platelets and factors fall with replacement of loss by plasma-poor cells. Not open |
| L21 Murray 1988 | 10.1097/00000542-198812000-00007 | Per-patient series (the data behind M45 Fig. 45.10): fibrinogen, platelets, FV, FVIII, FIX per 0.3 blood volume. Not open |
| L22 Counts 1979 | 10.1097/00000658-197907000-00020 | Platelet vs units of stored modified whole blood. Not open |
| L10 Rourke 2012 | 10.1111/j.1538-7836.2012.04752.x | Time course of fibrinogen across transfusion of every 4 units of RBC, and the ROTEM relations, in trauma. Not open |
| L11 Charbit 2007 | 10.1111/j.1538-7836.2007.02297.x | Time course of fibrinogen, FV, antithrombin, protein C and PT in the first 24 h of PPH. Not open |
| Miller RD, Robbins TO, Tong MJ, Barton SL. Coagulation defects associated with massive blood transfusions. Ann Surg 1971;174:794-801 | 10.1097/00000658-197111000-00010 | Source of M45 Table 45.10 (platelet count and bleeding). DOI resolved through Crossref. Not opened |
| Baseline coagulation values in normal late pregnancy (fibrinogen, factors, platelets) | not searched down | None of M45, M46 or the papers read gives them (the PPH papers give values only during bleeding) |
| Heparin half-life and dose-response in minutes, protamine neutralisation curve | not found | M46 gives only the 1 mg per 100 U ratio |
| PCC product composition (factor IX units and the other factors per vial) | not found | Needs the product information of one 4-factor PCC |
| Factor activity per unit of plasma (II, V, VII, VIII, IX, X, fibrinogen) | not found | M45 gives only a few storage changes; L12 gives "about 70 %" of normal |
| Fibrinogen half-life in bleeding adults | not found | Only the congenital afibrinogenaemia value (L14) was found |
| Figures 1-3 of L4 (Thromb J 2024) | 10.1186/s12959-024-00661-0 | The EXTEM CT/CFT/alpha by temperature and pH are in the figures, not in the web text |

### 5c. What was searched

Europe PMC REST search (title-field queries, open access flag where stated), run on 12 November 2026. The wording followed the clinical question:

- fibrinogen with dilution, haemodilution, major blood loss, massive transfusion; fibrinogen in postpartum haemorrhage; fibrinogen half-life, plasma recovery, increment;
- hypothermia with coagulation and acidosis or pH; temperature with clot, coagulation, thromboelastography; temperature and pH with factor VIIa; independent contributions of hypothermia and acidosis;
- ionised calcium with trauma, transfusion, haemorrhage;
- dilution and coagulation, ROTEM, fibrinogen; "dilutional coagulopathy";
- half-life with coagulation factor, factor VII, factor VIII, fibrinogen;
- guidelines on bleeding after major trauma and on severe perioperative bleeding (the ESAIC guideline on severe perioperative bleeding was found only as a paywalled 2017 first update; it was not read);
- protamine dosing with heparin; cryoprecipitate with fibrinogen or dose; fibrinogen concentrate with plasma fibrinogen or dose; thromboelastometry with fibrinogen correlation;
- cold-stored or low-titre whole blood content; prothrombin complex concentrate composition (results listed, none read); frozen plasma factor levels (results listed, none read);
- direct title lookups for the six abstracts and for Miller 1971, Murray 1988 and Counts 1979.

Crossref was used to resolve the DOIs listed in 5a. The 2013 (third) edition of the European trauma guideline came up in the search and was skimmed for recommendations, then set aside in favour of the 2023 sixth edition; nothing from it is cited here.

### 5d. What could not be read

- Full text of L5-L11, L21 and L22 (paywalled): abstracts only.
- The numeric parts of figures (L4 Figures 1-3; M45 Figures 45.8 and 45.10; M46 none).
- The Miller chapter pages were read from a text extraction of the PDF; table layouts were checked against the text but the images of the pages were not viewed. Where a symbol (greater-than or less-than) was lost in extraction the note says so (L3 INR threshold).
- Chapters 45 and 46 sections not read because they do not concern coagulation in bleeding: M46 prothrombotic and inherited thrombotic states, HIT (pp. 1439-1441), antiplatelet pharmacology detail (pp. 1445-1446), neuraxial and stent management (pp. 1451-1452 other than Table 46.4); M45 infection, immunology, compatibility testing, haemolytic, TRALI and TACO sections, cell salvage, acute normovolaemic haemodilution, blood substitutes.

### 5e. Downloads

None. No file was downloaded into `library/sources/papers/coagulation/`. Open full texts were read through Europe PMC's text service and not saved as files in the repository; working extracts sit in the project's scratch folder (`scratch/206-src`, `scratch/206-lit`), not in the repository.

### 5f. Anything refused

Nothing was refused and no safeguard ended a request during this run. The hand-over 191 records that earlier sub-agents were stopped on this subject; none of this reading was passed to a sub-agent.
