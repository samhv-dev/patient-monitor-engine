<!-- cells 30 {"TW":4,"WR":4,"TS":8,"MI":9,"IN":2,"PL":3} -->

### 2.1 Induction agents × comorbidity (MODELED)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-01a | | (not in store) | | | | |
| DI-46 | | (not in store) | | | | |
| DI-47 | | (not in store) | | | | |
| DI-48 | | (not in store) | | | | |
| DI-49 | | (not in store) | | | | |
| DI-36 | | (not in store) | | | | |
| DI-79 | | (not in store) | | | | |
| DI-78 | | (not in store) | | | | |
| DI-22 | | (not in store) | | | | |
| DI-80 | P1 | X-A vent, class III bleed · class III haemorrhage → ketamine 1.5 mg/kg vs propofol 2 mg/kg at +11 min | mapPctKet 2.3; mapRiseKet 8.4; mapPctProp -68.1; hrKet 15; arrestKet false | PL: mapPctKet = 2.3 in [-15, 5] [ketamine preserves MAP in haemorrhage while sympathetic reserve lasts (Miller ch. 21; tables §6.3); falls only when catecholamine-depleted]<br>PL: arrestKet = false (expected false) [ketamine induction in class III must not arrest (FU-4 rule)] | **PL** | — · 7g (ketamine indirect arm) |
| DI-66 | | (not in store) | | | | |
| DI-32 | | (not in store) | | | | |
| DI-81 | | (not in store) | | | | |
| DI-82 | | (not in store) | | | | |
| DI-21 | P1 | X-A vent · prolonged septic shock, cold phase (catecholamine-depleted proxy) → ketamine 1 mg/kg | mapPctSeptic 2.2; mapRiseSeptic 5.7; mapPctHealthy 1.4; mapRiseHealthy 6.1; hrSeptic 11; arrest false | PL: mapRiseHealthy = 6.1 in [5, 25] [tables §6.3: ketamine raises MAP 15–25 % through sympathetic drive in a catecholamine-replete patient]<br>WR: mapPctSeptic = 2.2 (expected sign -1) [direct myocardial depression unmasked when catecholamine-depleted (Miller ch. 21; tables §6.3 "direct Ees ×0.9 unmasked")] | **WR** | D9 · 7g combine.ts (ketamine indirect arm) |
| DI-31 | | (not in store) | | | | |
| DI-07 | | (not in store) | | | | |
| DI-06 | | (not in store) | | | | |

### 2.2 Hypnotic × opioid × benzodiazepine × volatile: depth, drive, MAP

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-01b | | (not in store) | | | | |
| DI-01c | | (not in store) | | | | |
| DI-01d | P1 | X-A spontaneous, FiO2 0.5 · awake → propofol 2 mg/kg ± remifentanil 1 µg/kg: apnoea | apnoeaS_both 470; apnoeaS_prop 160; vePctBoth -100; vePctProp -100; paco2Peak 76.1; spo2Min 0 | PL: apnoeaS_both = 470 in [60, 600] [propofol + remifentanil induction: apnoea in nearly all, minutes long (Miller ch. 22)]<br>PL: apnoeaS_prop = 160 in [30, 300] [propofol 2 mg/kg alone: apnoea 30–60 s typical (Miller ch. 21)]<br>HAND TW (automatic PL): propofol 2 mg/kg alone lowers spontaneous VE 76 % but never below 1 L/min (0 s of real apnoea; the 7f flag claims 220 s, DI-89); the pair gives 260 s — the chemoreflex in neuro/spont.ts buffers the drug depression | **TW** | D10 · 7f drive.ts / neuro/spont.ts |
| DI-02 | | (not in store) | | | | |
| DI-03 | P1 | X-A awake spontaneous, room air · awake → fentanyl 2 µg/kg + midazolam 0.05 mg/kg (Bailey 1990) | spo2MinBoth 90; spo2MinFent 94; spo2MinMidaz 95; apnoeaBoth false; apnoeaFent false; apnoeaFlagBoth false; vePctBoth -55.4; vePctFent -42.4; vePctMidaz -22.6; paco2Peak 47.4 | TS: spo2MinBoth = 90 above [70, 89] [Bailey 1990: fentanyl 2 µg/kg + midazolam 0.05 mg/kg → SpO2 < 90 % in 11/12]<br>WR: apnoeaBoth = false (expected true) [Bailey 1990: apnoea in 6/12]<br>PL: spo2MinMidaz = 95 in [93, 100] [Bailey 1990: midazolam alone caused no hypoxaemia] | **WR** | D10 · 7f drive.ts |
| DI-77 | | (not in store) | | | | |
| DI-89 | P1 | X-A spontaneous, FiO2 0.5 · induction apnoea and its recovery → propofol 2 mg/kg + remifentanil 1 µg/kg: 7f apnoea flag vs spontaneous VE | flagSecondsWhileBreathing 165; veWhileFlagged 5.7; apnoeaVeS 470; spo2Min 0; mapMin 65.5; arrest false; anyFlag true | WR: flagSecondsWhileBreathing = 165 (quiet, tol ±0) [one truth: the apnoea flag (neuroMark "apnoea", drive.apnoea) must not stay set while the patient breathes ≥ 3 L/min (research/12 §2.1 IN)] | **WR** | D10 · 7f drive.ts:64 vs neuro/spont.ts (MODELED chemoreflex) |
| DI-30 | | (not in store) | | | | |
| DI-43 | | (not in store) | | | | |

### 2.3 Neuromuscular block: volatile potentiation, reversal, Mg/Ca, succinylcholine hazards

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-50 | | (not in store) | | | | |
| DI-51 | P1 | X-A vent, sevoflurane ≈ 1 MAC · GA volatile maintenance → rocuronium 0.6 mg/kg under sevoflurane vs TIVA (potentiation) | macAtDose 1.1; t25_volatile 71; t25_tiva 30.7; prolongPct 131.5 | TS: prolongPct = 131.5 above [25, 80] [potent volatiles at ≈ 1 MAC prolong non-depolarising block ≈ 30–50 % vs propofol (Miller ch. 24; 7f interactions.ts EC50 ÷ (1 + 0.5·MAC))] | **TS** | D13 · 7f interactions.ts |
| DI-17 | | (not in store) | | | | |
| DI-52 | | (not in store) | | | | |
| DI-29 | | (not in store) | | | | |
| DI-45 | P2 | X-A vent · GA → sugammadex 16 mg/kg (rare marked bradycardia / anaphylaxis) | hrDown 0; mapPct 0; minutesToT1_10 1.83 | PL: minutesToT1_10 = 1.83 in [0.6, 2] [sugammadex 16 mg/kg 3 min after rocuronium 1.2: T1 10 % in 1.2 min (label; 7g gate 1.80)]<br>WR: hrDown = 0 above [-30, -5] [marked bradycardia is a recognised (rare) sugammadex reaction — the MISSING mechanism is the point of the cell (Miller ch. 24; MHRA)]<br>HAND MI (automatic WR): the sugammadex row has pd: [] (rows-cardiovascular.ts:18): no bradycardia or anaphylaxis path exists — a missing mechanism, not an opposite sign | **MI** | D15 · FU-7 (no sugammadex cardiac/anaphylaxis hazard) |
| DI-53 | | (not in store) | | | | |
| DI-25 | P2 | X-A vent, Mg loaded (profile 2.5 mmol/L) · therapeutic hypermagnesaemia → rocuronium 0.6 mg/kg; calcium chloride 1 g | t25_mg 42.5; t25_normal 30.7; prolongPct 38.6; t25_mgThenCa 42.5; caShortensMin 0 | PL: prolongPct = 38.6 in [20, 90] [magnesium potentiates non-depolarisers: vecuronium ED50 −25 % after 40 mg/kg (Miller ch. 24 p. 698)]<br>WR: caShortensMin = 0 (expected sign -1) [calcium antagonises the magnesium potentiation (Miller ch. 24) — the Mg + Ca arm minus the Mg arm]<br>HAND MI (automatic WR): the magnesium potentiation is right (+39 %); calcium has no NMB term — 7f ec50Multipliers (neuro/interactions.ts:23–45) reads profile Mg, volatile MAC, temperature and nm profile only | **MI** | D12 · 7f interactions.ts (calcium has no NMB path) |
| DI-90 | P2 | X-A vent · magnesium sulfate 60 mg/kg (pre-eclampsia / analgesia load) → rocuronium 0.6 mg/kg after the Mg load vs alone | mgPeak 2.1; t25_mgDrug 30.8; t25_normal 30.7; prolongPct 0.5; mapPct -8.3 | TW: prolongPct = 0.5 below [20, 90] [magnesium sulfate potentiates non-depolarisers (Miller ch. 24 p. 698: vecuronium ED50 −25 % after 40 mg/kg); DI-25 gives +39 % from the profile Mg]<br>HAND IN (automatic TW): blood Mg reaches 2.1 mmol/L but rocuronium is unchanged (+0.5 %), while the profile Mg 2.5 of DI-25 prolongs it +39 %: 7f reads the profile field only (neuro/pipeline.ts:186), not 7c blood.out.mg — two commands for one state disagree | **IN** | D12 · 7f interactions.ts ← 7c blood Mg |
| DI-37a | | (not in store) | | | | |
| DI-37b | | (not in store) | | | | |
| DI-37c | P1 | X-A vent, nm profile denervation · denervation (upregulated receptors) → succinylcholine 1.5 mg/kg | dk 0.5; kPeak 4.7; t1Min 0; arrest false | TW: dk = 0.5 below [3, 7] [Miller ch. 24: denervation/immobilisation gives the same K surge as burns]<br>HAND IN (automatic TW): two commands for one disease disagree: neuroProfile nm "burn"/"denervation" (7f, neuro/pipeline.ts:118) changes the NMB response but not the succinylcholine K⁺ rise, which only profile blood.burns (7c) drives | **IN** | D6 · 7c (burns severity is the only K path; the 7f nm profile does not reach it) |
| DI-37d | | (not in store) | | | | |

### 2.4 Vasopressors and inotropes × β-blockade × volatile × acidosis × sepsis; stimulus

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-04a | P1 | betaBlocked vs X-A · GA ventilated → ephedrine 10 mg | mapRiseBB 9; mapRiseXA 8.1; ratio 1.11; hrRiseBB 3; hrRiseXA 2 | PL: mapRiseXA = 8.1 in [8, 25] [tables §6.2: ephedrine 10 mg MAP/SVR +10–15 %, HR +10–15 %]<br>TS: ratio = 1.11 above [0.3, 0.7] [tables §1.5 / §7 17b: ephedrine response ×0.5 when chronically β-blocked] | **TS** | D4 · 7g combine.ts betaBlunt |
| DI-04b | | (not in store) | | | | |
| DI-04c | | (not in store) | | | | |
| DI-05 | P2 | betaBlocked vs X-A · GA ventilated → adrenaline 100 µg IV | mapRiseBB 33.6; mapRiseXA 30.5; excessPct 3.1; hrMinBB 1; hrMaxBB 12; hrMaxXA 12 | PL: excessPct = 3.1 (sign 1, tol 2) [unopposed α under non-selective β-blockade: a larger pressor response (Miller ch. 14)]<br>WR: hrMinBB = 1 (expected sign -1) [reflex bradycardia accompanies the unopposed α rise (Miller ch. 14)] | **WR** | D4 · 7g combine.ts |
| DI-55 | | (not in store) | | | | |
| DI-56 | | (not in store) | | | | |
| DI-57 | P1 | X-A vent, class II bleed · class II haemorrhage → ephedrine 10 mg ×3 at 5-min intervals (tachyphylaxis) | rise1 7; rise2 2.6; rise3 1.8; ratio21 0.37; ratio31 0.26 | PL: rise1 = 7 in [5, 30] [ephedrine 10 mg raises MAP 10–15 % (tables §6.2)]<br>TS: ratio21 = 0.37 below [0.4, 0.95] (lower = stronger/faster) [tachyphylaxis: each repeat ×0.7 (tables §6.2; 7g gate SVR increments 0.120/0.029/0.012)] | **TS** | D15 · 7g tachy() |
| DI-09 | | (not in store) | | | | |
| DI-10 | | (not in store) | | | | |
| DI-83 | P2 | betaBlocked / septic warm vs X-A · chronic β-blockade; septic shock → dobutamine 5 µg/kg/min | coPctXA 13.5; coPctBB 8.6; coPctSeptic 10.2; ratioBB 0.64; ratioSeptic 0.76; hrXA 4; hrBB 3 | PL: ratioBB = 0.64 in [0.2, 0.8] [β-blockade shifts the dobutamine dose–response right (competitive; Miller ch. 14; tables decision 7 EC50 shift)]<br>PL: ratioSeptic = 0.76 in [0.3, 0.9] [β-adrenergic hyporesponsiveness in septic shock (tables §5e vasoResp; Levy 2018)] | **PL** | — · 7g combine.ts (betaOcc, vasoResp) |
| DI-12 | | (not in store) | | | | |
| DI-11 | | (not in store) | | | | |
| DI-41 | P1 | betaBlocked vs X-A · anaphylaxis grade III (7e condition) → adrenaline 100 µg ×2 | mapNadirBB 4.2; dMapEpiBB 97.4; dMapEpiXA 98.7; resistanceRatio 0.99; arrestBB true; arrestXA true; arrestUntreated true | TS: resistanceRatio = 0.99 above [0.2, 0.8] [adrenaline resistance in β-blocked anaphylaxis (AAGBI/Resuscitation Council guidance; glucagon is the named rescue — absent here)]<br>TS: dMapEpiXA = 98.7 above [10, 60] [adrenaline 50–100 µg restores pressure in grade III anaphylaxis (AAGBI)] | **TS** | D4 · 7g / 7e |
| DI-08 | | (not in store) | | | | |

### 2.5 Vasodilators × preload-dependent states; histamine; α2

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-33 | | (not in store) | | | | |
| DI-34 | | (not in store) | | | | |
| DI-58 | | (not in store) | | | | |
| DI-59 | | (not in store) | | | | |
| DI-42 | P2 | X-A vent · GA → morphine 10 mg IV fast (histamine) | mapPct -3.5; mapMin 92.4; nadirS 380; hrUp 14; hrDown 0; coPct -9.1; svrPct -8.5; arrest false; histamineBusSeen see report (bus.airway.histamine has no consumer) | TW: mapPct = -3.5 above [-25, -8] [tables §6.3 / Miller ch. 22: fast morphine 10 mg lowers SVR 10–20 % through histamine release]<br>PL: hrUp = 14 in [3, 25] [histamine-mediated hypotension raises HR (Miller ch. 22)] | **TW** | D15 · 7g (histamine published, nothing consumes it) |
| DI-60 | P2 | X-A vent, dexmedetomidine · GA adjunct → dexmedetomidine 1 µg/kg over 10 min then 0.5 µg/kg/h | mapEarly -2.1; mapLatePct -5.6; hrLate -3; apnoea false | TW: hrLate = -3 above [-30, -6] [tables §6.3: dexmedetomidine HR −10–20 %]<br>PL: mapLatePct = -5.6 in [-25, -5] [tables §6.3: SVR −10–20 % after the load]<br>WR: mapEarly = -2.1 (expected sign 1) [tables §6.3: biphasic — SVR +15 % during a fast load (noted as "not modelled in v1")]<br>HAND MI (automatic WR): the early pressor phase is declared "not modelled in v1" in the row (rows-anaesthetic.ts:81): missing, not reversed; the HR fall is also too weak (−1 vs −10–20 %) | **MI** | D1 · 7g rows-anaesthetic.ts |
| DI-35 | | (not in store) | | | | |

### 2.6 Antiarrhythmics, anticholinergics and rhythm

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-13a | P1 | X-A vent, VF arrest with CPR · VF → amiodarone 300 mg during CPR | rhythmsWithAmio 5s sinus,305s vfCoarse; rhythmsWithout 5s sinus,305s vfCoarse; etco2CPR 21.6; mapCPR 53.8; amioCe 2; stillVF vfCoarse | PL: amioCe = 2 (sign 1, tol 0) [the drug must reach an effect site during CPR (ALS 2021: amiodarone 300 mg after the third shock)]<br>HAND MI (automatic PL): amiodarone reaches its site (Ce 2 ref units) but nothing reads it during VF: the shock outcome context (l3/defib-pacer/outcome.ts:41–72) has only rhythm class, energy, VF duration and R-on-T — no antiarrhythmic, adrenaline, K⁺ or perfusion term | **MI** | D7 · DV/FU-7 (shock outcome has no drug or myocardial term) |
| DI-13b | | (not in store) | | | | |
| DI-14a | | (not in store) | | | | |
| DI-14b | | (not in store) | | | | |
| DI-14c | P2 | X-A vent, pre-excited AF · WPW with AF → adenosine 6 mg (may accelerate) | rhythms 1s sinus,301s preexcitedAf; hrChange 15; hrDrop 0; vfSeen false | PL: hrChange = 15 (sign 1, tol 5) [AV-nodal block in pre-excited AF can accelerate the accessory-pathway conduction (ALS; Miller ch. 25 arrhythmia) — a teaching hazard]<br>HAND MI (automatic PL): the adenosine hook (pk/hooks.ts:31) acts only on AV-node-dependent SVT, atrial rhythms and sinus; preexcitedAf is outside it and no accessory-pathway conduction exists | **MI** | D7 · FU-7 (no accessory-pathway hazard) |
| DI-61 | P1 | X-A vent, monomorphic VT with a pulse · VT 150/min → lidocaine 1.5 mg/kg vs amiodarone 150 mg | rhythmsLido 5s sinus,305s vtMono; rhythmsAmio 5s sinus,305s vtMono; lidoConverted false; amioConverted false; eitherConverted false; mapPctLido -0.2; mapPctAmio -5.9; lidoCe 2.3 | WR: eitherConverted = false (expected true) [lidocaine or amiodarone terminates a share of stable monomorphic VT (ALS; PROCAMIO) — no conversion hook exists: MI by hand]<br>PL: mapPctAmio = -5.9 in [-25, 0] [tables §6.2: amiodarone lowers SVR 10–20 % (hypotension on rapid injection)]<br>HAND MI (automatic WR): pk/hooks.ts has conversion paths for adenosine, LAST and magnesium only (lines 31–64); amiodarone/lidocaine carry no rhythm effect beyond the AV-node occupancy | **MI** | D7 · FU-7 (no antiarrhythmic → rhythm conversion except adenosine/Mg) |
| DI-54 | | (not in store) | | | | |
| DI-18 | | (not in store) | | | | |
| DI-62 | | (not in store) | | | | |
| DI-63 | P2 | X-A vent · GA → atropine 0.5 mg vs glycopyrrolate 0.4 mg (onset/offset) | atropinePeak 27; atropinePeakS 30; atropineAt30min 20; glycoPeak 18; glycoPeakS 30; glycoAt30min 17 | PL: atropinePeak = 27 in [15, 45] [tables §6.2: atropine 0.5–1 mg HR +20–40, onset < 1 min]<br>PL: atropinePeakS = 30 in [10, 180] [atropine onset < 1 min, peak ≈ 1 min (tables §6.2)]<br>TS: glycoPeakS = 30 below [60, 600] (lower = stronger/faster) [glycopyrrolate onset 2–3 min (tables §6.2)]<br>PL: glycoPeak = 18 in [8, 25] [tables §6.2: glycopyrrolate HR +10–20] | **TS** | D2 · 7g rows-cardiovascular.ts |
| DI-15 | | (not in store) | | | | |
| DI-16 | | (not in store) | | | | |

### 2.7 LAST, electrolytes, metabolic, MH, bronchospasm, brain, kidney

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-23 | P2 | X-A vent · after a bupivacaine block dose → lidocaine 1.5 mg/kg IV on top of bupivacaine 100 mg (additive toxicity) | cnsBoth 0.9; cnsBupiOnly 0.9; cvBoth 0.5; cvBupiOnly 0.5; cnsExcess 0; mapPct -6.7 | WR: cnsExcess = 0 (expected sign 1) [local-anaesthetic toxicity is additive between agents (ASRA 2020; Miller ch. 25): lidocaine on top of bupivacaine must raise the CNS effect]<br>HAND TW (automatic WR): lidocaine adds nothing to bupivacaine (CNS effect 0.9 vs 0.9): pk/pipeline.ts:384–385 takes the maximum over agents, so toxicity is not additive — an interaction that is too weak, not a reversed one | **TW** | D14 · 7g pipeline (cnsE/cvE take the MAXIMUM, not the sum) |
| DI-24 | | (not in store) | | | | |
| DI-26 | | (not in store) | | | | |
| DI-27 | | (not in store) | | | | |
| DI-28 | | (not in store) | | | | |
| DI-64 | | (not in store) | | | | |
| DI-65 | | (not in store) | | | | |
| DI-40 | | (not in store) | | | | |
| DI-39 | | (not in store) | | | | |
| DI-38 | | (not in store) | | | | |

### 2.8 Disposition: TCI and flow, CSHT, onset/offset, antagonists, volatiles, placeholders

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-84 | | (not in store) | | | | |
| DI-67 | | (not in store) | | | | |
| DI-44 | | (not in store) | | | | |
| DI-85 | | (not in store) | | | | |
| DI-86 | | (not in store) | | | | |
| DI-68 | | (not in store) | | | | |
| DI-88 | P2 | X-A vent / spontaneous · GA / sedation → time to peak effect: fentanyl 2 µg/kg, remifentanil 1 µg/kg, midazolam 0.05 mg/kg, rocuronium 1.2 mg/kg | fentTtpeS 215; remiTtpeS 85; midazDiNadirS 70; midazCePeakS 180; roc12OnsetS 45 | PL: fentTtpeS = 215 in [180, 270] [fentanyl time to peak effect 3.6 min (Shafer & Varvel 1991; Miller ch. 22)]<br>PL: remiTtpeS = 85 in [60, 120] [remifentanil TTPE 1.4–1.6 min (Minto 1997)]<br>TS: midazDiNadirS = 70 below [120, 420] (lower = stronger/faster) [midazolam: T½ke0 2–3 min, peak 3–5 min (Miller ch. 21 p. 532)]<br>PL: roc12OnsetS = 45 in [45, 90] [rocuronium 1.2 mg/kg: maximum block ≈ 1.0 min (label; Miller ch. 24)] | **TS** | D2 · 7g models / 7f nmb |
| DI-69 | P1 | X-A vent · GA → onset/offset of each induction agent (time to the MAP nadir and to recovery) | propLocS 55; thioLocS null; etomLocS null; ketLocS 5; propEmergenceS 460; thioEmergenceS 0; etomEmergenceS 0; ketEmergenceS 295; mapPctThio -20.3; mapPctEtom -1.8; mapPctKet 2.7; hrKet 8 | PL: propLocS = 55 in [20, 120] [propofol TTPE 90–100 s, loss of consciousness in one arm–brain circulation (Miller ch. 21 p. 515)]<br>WR: thioEmergenceS = 0 below [240, 900] [thiopental: awakening 5–10 min by redistribution (Miller ch. 21 Table 21.1)]<br>WR: etomEmergenceS = 0 below [150, 600] [etomidate: duration 3–5 min after 0.3 mg/kg (Miller ch. 21 p. 541)]<br>PL: mapPctThio = -20.3 in [-35, -12] [tables §6.3: thiopental SVR −20 %, Ees −15 %]<br>PL: hrKet = 8 in [8, 35] [tables §6.3: ketamine HR +15–20 %]<br>HAND MI (automatic WR): thiopental and etomidate never produce unconsciousness: 7f depth() reads only propofol, volatile, midazolam and ketamine (neuro/depth.ts:71, :80), although 7g publishes both in uHyp (combine.ts:88); ketamine LOC at 5 s is too fast (gamma shape) | **MI** | D2, D3 · 7f depth.ts (+7g gamma shapes) |
| DI-71 | P1 | X-A spontaneous · opioid overdose (fentanyl 5 µg/kg, air) → naloxone 0.4 mg | apnoeaSecondsNoNaloxone 0; apnoeaSecondsNaloxone 0; spo2MinNoNaloxone 87; spo2MinNaloxone 87; veRecoveryPct 240.4; reversalS 5 | PL: veRecoveryPct = 240.4 (sign 1, tol 5) [naloxone 0.4 mg reverses opioid ventilatory depression in 1–2 min (label; 7g gate: antagonist.opioid ≥ 1.4)]<br>TS: reversalS = 5 below [30, 180] (lower = stronger/faster) [naloxone IV onset 1–2 min (label; Miller ch. 22)] | **TS** | D2, D10 · 7g antagonists / 7f drive |
| DI-72 | P2 | X-A spontaneous · benzodiazepine oversedation (midazolam 0.15 mg/kg) → flumazenil 0.2 mg ×2 | diMinNoFlum 47; diAfterFlum 90; diDelta 22; conscRecoveredS 5; spo2Min 0 | PL: diDelta = 22 (sign 1, tol 2) [flumazenil reverses benzodiazepine sedation within 1–2 min (label; 7g decision 6 competitive antagonism)]<br>TS: conscRecoveredS = 5 below [30, 180] (lower = stronger/faster) [flumazenil onset 1–2 min (label)] | **TS** | D2 · 7g antagonists |
| DI-87 | | (not in store) | | | | |
| DI-70 | P2 | X-A vent · GA volatile → desflurane step 3 % → 12 % (sympathetic surge) vs sevoflurane step | macBeforeDes 0.4; macAfterDes 1.1; hrSurgeDes 1; mapSurgeDes 0; hrSevoStep -6; mapPctSevoStep -18.2 | TW: hrSurgeDes = 1 below [8, 35] [tables §6.3: a rapid desflurane rise above 1 MAC gives HR +20–30 %, MAP +20 % for 2–4 min]<br>PL: mapPctSevoStep = -18.2 (sign -1, tol 2) [a sevoflurane step deepens the hypotension instead (tables §6.3 Malan 1995)] | **TW** | D13 · 7g pipeline.ts desSurge |
| DI-19 | P2 | X-A vent · GA induction with a volatile → sevoflurane 2 % with 66 % N2O vs without (second-gas effect) | faFi5min_n2o 0.8; faFi5min_air 0.8; macBrain10min_n2o 1.2; macBrain10min_air 0.7; faN2o10min 52.7; secondGasDelta 0 | WR: secondGasDelta = 0 (expected sign 1) [concentration/second-gas effect: N2O uptake speeds the volatile FA/FI rise (Miller ch. 19 uptake and distribution)]<br>PL: macBrain10min_n2o = 1.2 in [1, 1.6] [sevo 2 % ≈ 0.8 MAC + 66 % N2O ≈ 0.63 MAC: total > 1 MAC (tables §6.3; MAC N2O 104 %)]<br>HAND MI (automatic WR): the two agents step independently (pipeline.ts:357–358, volatile.ts): no concentrating or second-gas term exists; the N2O MAC adds correctly (macBrain 1.1 vs 0.7) | **MI** | D13 · 7g volatile.ts (no shared alveolar uptake between agents) |
| DI-20 | | (not in store) | | | | |
| DI-73 | P2 | X-A vent, class III bleed · haemorrhage → tranexamic acid 1 g (placeholder row) | txaCe 1; hbDelta 0; mapDelta 0; bvRelDelta 0 | PL: txaCe = 1 (sign 1, tol 0) [the row exists and takes a dose (7g library), but has no PD: CRASH-2 mortality benefit works through bleeding, which needs 7i coagulation]<br>PL: hbDelta = 0 (quiet, tol ±0.05) [no effect is expected on today's main — the cell records the missing mechanism (R58 / 7i)] | **PL** | D15 · 7i (coagulation and fibrinolysis) |
| DI-74 | | (not in store) | | | | |
| DI-75 | | (not in store) | | | | |
| DI-76 | P2 | X-A vent · GA → dexamethasone 8 mg and ondansetron 4 mg (placeholder rows: quiet checks) | gluDelta 0; mapDelta 0; hrDelta 0 | WR: gluDelta = 0 below [10, 60] [dexamethasone 8 mg raises glucose ≈ 1–2 mmol/L over an hour (Miller ch. 47; Hans 2006) — the row is declared "no monitor effect in v1"]<br>PL: hrDelta = 0 (quiet, tol ±3) [ondansetron: no HR effect expected; its QTc prolongation is not modelled (row comment)]<br>HAND MI (automatic WR): the dexamethasone row is a declared placeholder (rows-other.ts:66, pd: []): the glucose rise is missing, not reversed | **MI** | D15 · 7e (glucose) / FU-7 (QTc) |

### 2.9 MANUAL subset (direction-only; Q9 open)

| cell | tier | context · state → intervention | measured (control-subtracted unless named) | graded items: value vs expected [source] | verdict | gap · owner |
|---|---|---|---|---|---|---|
| DI-M1 | | (not in store) | | | | |
| DI-M2 | | (not in store) | | | | |
| DI-M3 | | (not in store) | | | | |
| DI-M4 | | (not in store) | | | | |
