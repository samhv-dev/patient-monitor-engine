# Gate FU-4 — integration polish (sympatholysis, emergent arrest, hyperkalaemia, obstructive shock, vagal events, clinical scenario suite)

Branch `fu-4-integration-polish`, cut from `origin/main` after FU-3 (PR #23). Plan: `docs/plans/fu-4-integration-polish.md`
(Tasks 0–24, with the R50 review's Phase 2, Tasks 18a–18g), executed in order across four executors (three usage-cap
resumptions); one commit per task (plus the plan's WIP and R45 follow-ups), pushed after each. `origin/main` was merged
five times (the last at `4fe5a7a`); every merge brought docs only (`docs/RESUME.md`). **FU-5, V.1, FU-6 and 8b had not
landed on `main`** at the gate (FU-5's merge-first ruling: §9b); `truth.ts` SKIP_PATH is FU-4's alone
(`hemo.circ.acc`, `hemo.circ.cppAcc`). Every number below was measured on this branch (seed 7 unless stated) unless
marked "plan" or "prototype".

The plan's 129 step boxes are ticked; a tick means the step was executed and measured — the steps that were measured
and NOT landed (Task 10 Step 2, Task 13b, Task 12's Bezold–Jarisch term) are in §6.

Contents: 1 what shipped · 2 the clinical scenario table · 3 the audit before → after and the headline numbers ·
4 the `it.fails` list · 5 exceptions · 6 deviations · 7 coverage-matrix cells · 8 glossary labels · 9 open questions ·
10 verification · 11 screenshots. Appendices: `docs/gates/fu-4/audit-before.md`, `audit-after.md`, `it-fails.md`.

## 1. What shipped

| Task | Gap | Mechanism | Main files | Tests |
|---|---|---|---|---|
| 1 | item 10 | the physiology integration audit as `pnpm run audit:physiology` (79 scenarios, `PME_AUDIT_OUT`) | `scripts/audit-physiology/**`, `package.json`, `.gitignore` | — |
| 2 | G2 | anaesthetic sympatholysis suppresses the delivered sympathetic OUTPUT (`symp` = outF) and resets the set point (`setF`); rows on propofol/sevo/iso | `l2/circ/baroreflex.ts`, `l2/circ/drugs.ts`, `l2/pk/{row,combine}.ts`, rows | `l2/circ/sympathetic-output`; circ-sanity-1 propofol flipped (0.913 → 0.72) — back to `it.fails` in 18e (0.801) |
| 3 | G4 | continuous MAP (`circ.mapNow`, τ 2 s) for 7d/7e; relaxation-phase CPP accumulator; the state event reads the circuit once nothing ejects | `l2/circ/model.ts`, `l2/hemo/pipeline.ts`, `organs/inputs.ts`, `endo/adapters.ts`, `truth.ts` | circ-arrest-state |
| 4 | G1/G4 | the coronary step as the myocardial state: flow share without a floor (MODELED), absolute CPP, basal + E–C demand, the no-beat branch | `l2/circ/coronary.ts` | `l2/circ/coronary-arrest` |
| 5 | G5 | the RV's own coronary balance, `kIschRv` | `coronary.ts`, `model.ts` | `l2/circ/rv-coronary` |
| 6 | G1/G9 | the arrest state machine `arrest.ts`: low flow (kIsch ≤ 0.1), no flow (MAP < 25 for 60 s, MANUAL), hazards, onset draw, pre-arrest bradycardia (K_BRADY), ROSC (CoPP ≥ 15 + recovery 60 s) | `l2/circ/arrest.ts`, `hemo/pipeline.ts` | `l2/circ/arrest`, circ-lowflow-arrest (SLOW_B); FU-3 final-HR flipped |
| 7 | G3 | hyperkalaemia acts: absolute K on the ECG, contractility, SA node, VF/asystole hazard; calcium via `caMem` | `l2/blood/{circ-adapter,pipeline}.ts`, `arrest.ts` | blood-k-rhythm |
| 8 | G8 | hyperthermic VF hazard (> 42 °C) | `arrest.ts` | endo sepsis flips (E-FU4-9) |
| 9 | G6 | tamponade accumulates (`rateMlPerMin`) and drains | `l2/circ/conditions.ts`, `types-circ.ts` | `l2/circ/tamponade-dynamics` |
| 10 | G6 | pulsus paradoxus measured (swing 4/8/12 cmH2O → 3.1/4.9/6.9 mmHg); Step 2 not applied | — | circ-pulsus (S3 `it.fails`) |
| 11 | G6 | one PE event (`condition pe` ≡ `lungCondition pe`, 7a's φ the one PVR source) and one tension-PTX source (alias → 7b `ptxTension`); RV demand on wall stress | `l2/circ/aliases.ts`, `engine.ts`, `data/lung-pathology.ts` | obstructive-aliases |
| 12 | G7 | vagal PD targets `vagalMs` (additive ms) and `muscarinic` occupancy | `l2/pk/{row,combine}.ts`, `l2/circ/drugs.ts` | (rows in 18f) |
| 13 | G7(b) | 13a measured (escape reset already exists; 40 QRS/min needs AV concealment: `it.fails`); 13b applied, measured and NOT landed (ruling 5) | — | escape-reset (`it.fails`), circ-hypoxic-arrest monitor-HR `it.fails` |
| 14 | G10 | propofol's distribution follows cardiac output (V1 × (0.5+0.5q), CL2/CL3 × q; onset transit lag) against 7c's settled co0 | `l2/pk/pipeline.ts`, `engine.ts` (`coRefLpm`) | flow-distribution; Eleveld rig pinned (E-FU4-10) |
| 15/15b | G11 | MODELED ventilation drops the MANUAL EtCO2 fit; ONE exported `physicalDeadSpace()` (ETT bypass 1.1 mL/kg, floor 30 %) | `l2/gas/params.ts`, `l2/resp/pipeline.ts` | `l2/gas/physical-dead-space`; pk-bus VA flip; lung-circ OLV flip |
| 16 | G12 | shivering fades 32 → 30 °C; the core reaches the hazards (`ext.tempC`) | `l2/thermal/thresholds.ts`, `engine.ts` | `l2/thermal/shiver-cutoff` |
| 17 | G4(b) | `LOW_FLOW_TAU_S` 5 → 70 s; AF pulse deficit (the audit's 44 % was a counting artefact; mechanical restitution → 14.1 %) | `l2/gas/params.ts`, `model.ts` | arrest-etco2, af-pulse-deficit |
| 18 | item 1 | forced-air warming at a set air temperature (32/38/43 °C) | `l2/thermal/{environment,heat,params}.ts` | thermal-warmer |
| 18a | F1 (ruling 3) | CPR acts on VOLUME; brainstem withdrawal of the reflex; incomplete release; Starling atria; `DEMAND_VF` | `circuit.ts`, `baroreflex.ts`, `coronary.ts`, `circ/params.ts`, `organs/effects.ts` | circ-lowflow-arrest, hemo-acceptance |
| 18b | F5 (ruling 7) | the untreated PEA decays (rate → idioventricular → asystole hazard); CoPP ≥ 15 suspends it | `arrest.ts` | circ-lowflow-arrest, circ-hypoxic-arrest |
| 18c | F3 (ruling 1) | tension PTX fills through a one-way valve; catalogue value = ceiling | `l2/lung/params.ts`, `resp/pipeline.ts` | tension-ptx (SLOW_B) |
| 18d | F4 (R1) | dead space at the root: MANUAL-only calibration, patient PaCO2, per-patient ventilator defaults; CO2 flow ratio per kg; neonate coronary reference | `resp/pipeline.ts`, `gas/params.ts`, `coronary.ts`, `baroreflex.ts` | vent-infant; neuro-spont re-referenced (E-FU4-17) |
| 18e | F2 (ruling 2) | the HUMORAL arm (AVP/AngII): `h.hum` from unloading (EC50 30, τ 150/600 s, 3 mmHg deadband), `humSvrF`/`humDV0Frac` outside `alpha()` into the ONE shared reservoir; PROPOFOL_SYMP unchanged | `l2/endo/{params,hormones,effects,core,adapters}.ts`, `model.ts` | hormones/adapters unit tests; R45 records |
| 18f | F10 | vagal events reach the circulation (the dropped `vagalMs`, every bolus time, the held rate); seeded repeat-sux draw; stimulus `site` (laryngoscopy / oculocardiac / peritoneal) × (1 − occupancy); the vagal baroreflex limb × (1 − occupancy). The Bezold–Jarisch term was prototyped and WITHDRAWN (§6) | rows, `pk/{hooks,pipeline}.ts`, `model.ts`, `engine.ts`, `types-neuro.ts`, `endo/pipeline.ts` | vagal-events (SLOW_B), sux-repeat (fast) |
| 18g | Request 3 | one `finiteOr()` at `planUntil`'s choke point: throws under `NODE_ENV=test`, clamps + warns once elsewhere | `l2/ecg/rhythm-engine.ts` | nan-guard (fast) |
| 19 | item 2 | stage7e-shots comments; `lp.pPtx` mmHg; soak lactate investigated (no edit) | `apps/demo/**` | — |
| 20 | item 3 | `SLOW_A`/`SLOW_B`, disjoint by Vitest's matcher; CI matrix | `vite.config.ts`, `ci.yml` | gate below |
| 21 | G-FU3 r4 | t25 ventilated; new stress document `t25-apnoea` | `validation/suites/sanity/sanity-docs.ts` | graded below |
| 22 | item 10 | the clinical scenario suite (28 rows) | `test/engine/clinical-suite.test.ts` (SLOW_A) | §2 |
| 23 | item 10 | `fu4.html` evidence page, 9 screenshots, Chromium smoke | `apps/demo/{fu4.html,src/fu4.ts,scripts/fu4-shots.mjs,e2e/fu4.e2e.ts}` | fu4.e2e |
| gate | D3 | `TAU_HYP_S` re-fit to the middle of the moved plateau, 360 → **300 s** | `coronary.ts` | circ-hypoxic-arrest |

## 2. The clinical scenario table (Task 22; audit rig: ETT, VCV 12 × 600, PEEP 5, FiO2 0.5; seed 7; truth values)

| Row | Band (source) | Measured | Verdict | Shot |
|---|---|---|---|---|
| S1 healthy, propofol 2 mg/kg | nadir 60–80 % of base at 2–5 min, \|ΔHR\| ≤ 10, no arrest (Miller ch. 21) | 96 → 75 (**0.784**), ΔHR −1 | pass | 1 |
| S1b same, 15 min | ≥ 85 % of baseline | **0.920** (prototype 0.84) | **flipped** `it.fails` → `it` | |
| S2 sevoflurane 3 % 20 min | MAP −15…−30 %, ΔHR ≤ 10, no arrest (Ebert 1995) | **−14.3 %**, ΔHR −2, none | HR/no-arrest pass; **MAP side `it.fails`** (18e; −21 % on the prototype) | |
| S3 tamponade pulsus | ≥ 10 mmHg (Spodick) | 3.1 (swing 8: 4.9; 12: 6.9) | `it.fails` (circ-pulsus) | |
| S4a tamponade + propofol 2 mg/kg | PEA ≤ 10 min, compensated MAP ≥ 75 (Ali, R53) | MAP 90, HR 104 → **PEA +165 s** | pass | 2 |
| S4b tamponade + propofol 1 mg/kg | MAP < 55 in 3 min, CO −25 % | MAP **59.7**, CO **−15 %** | `it.fails` (Q2) | |
| S5 tamponade PEEP 5 → 10 | CO −20 %, ΔMAP ≥ healthy + 10 | ΔMAP **4.1 vs 1.5**, CO **×0.88** | `it.fails` (Q2) | |
| S6a class III + propofol: MAP < 50 | Johnson 2003; ATLS | 83.5 → **26.6** | pass | |
| S6a no PEA in 5 min (18e) | Russotto 2021 (arrest 3.1 %), Heffner 2013 | **no arrest, no pulseless second** | pass (was PEA +80 s) | |
| S6a nadir 30–50, fall 40–60 % | expected picture (ruling 2) | nadir **26.6–27.0, −68 %** | `it.fails` (Q1, item 19) | |
| S6b propofol peak Ce ratio | ≥ 1.3× healthy (Task 14) | **1.83** | pass | |
| S8 tension PTX, one command | PEA 3–10 min | **+9.75 min** (+10.67 with the withdrawn BJ term) | **flipped** → `it` | 4 |
| S9 massive PE: EtCO2 | falls ≥ 10 | 33 → **17** | pass | |
| S9 SaO2 (truth) | < 90 % at 5 min | **97.8 %** (shown SpO2 97) | `it.fails` (item 15, Ali's band) | |
| S9 CVP / MAP | ≥ 15 / < 65 at 5 min | **9.3 / 82.1** | `it.fails` (Q15) | |
| S9 + propofol 1 mg/kg | PEA ≤ 10 min | PEA **+95 s** | pass | 7 (2 mg/kg) |
| S10 anaphylaxis sev 1 | arrest ≤ 10 min (Ring & Messmer IV) | **+235 s** | pass | |
| S10b + adrenaline 50 µg q2 min | no arrest in 15 min, MAP ≥ 65 | none, MAP **108** | pass (MAP perhaps high: Q7) | |
| S13 VF + CPR q 0.8 | CoPP 15–25 (Paradis 1990) | **25.1–28.8** (18a's 70 s point 23.3) | `it.fails` (drifts above 25 as CPR settles) | 6 |
| S14 80 y HTN + propofol | MAP −30…−45 %, ΔHR ≤ 10 | **−22.9 %**, ΔHR −2 | HR pass; **MAP side `it.fails`** (18e; −31 % on the prototype) | |
| S16 untreated MH | VF/asystole < 60 min, core ≤ 44 °C | VF (hyperthermia) **44.4 min at 42.3 °C** | pass (title now asserted — review F16) | |
| CPR alone after full exsanguination (3 L) | no pulse in 10 min (ruling 3) | pulse at **+175 s** of CPR; HUM_V0 0 → never (CoPP 3.1–3.4) | `it.fails` — **conflict 18e × ruling 3** (§9 item 23) | |
| CPR + 2 L + adrenaline after full exsanguination | pulse ≤ 4 min | **+105 s** | pass | 3b (class IV) |
| 10 min VF + CPR alone | kIsch < 0.9 | max **0.91**, end 0.87 | `it.fails` | |
| MANUAL class III + propofol | no arrest 5 min, MAP < 50 | nadir **35.1**, none | pass | |
| MANUAL tamponade + propofol 1 + 1 | no engine arrest, MAP ≥ 35 (D6) | min **49.6**, none | pass | |
| MANUAL target 18/10 | displayed ≤ 25/15 | displayed **65/30**, MAP 38.0 | `it.fails` (ruling 6, item 21, Q-FU3-4a) | |

Rows in their own files: S7 (circ-lowflow-arrest: class IV PEA at 645 s, HR 169 → min 53 in the last minute; MANUAL
640 s; the untreated PEA reaches asystole; ROSC with CPR + 2 L + adrenaline +113 s), S11 (blood-k-rhythm), S12
(circ-hypoxic-arrest: PEA +6.35 min at `TAU_HYP_S` 300), S15 (vagal-events, §3), the tension PTX course and
decompression (tension-ptx: PPV pPtx 7.7/15.7/19.4 mmHg at +10/+60/+240 s, PEA +10.45 min — the upper edge
`it.fails`; spontaneous no PEA in 15 min; decompression MAP ≥ 65 at +6 s), the 7 kg infant (vent-infant: 20 × 49 mL,
PaCO2 39.0–39.1, EtCO2 34.9, no non-finite value in 30 min, with the NaN guard loud). **The suite's `it.fails` count is
eleven** (S2-MAP, S4b, S5, S6a band, S9 SaO2, S9 CVP/MAP, S13, S14-MAP, CPR-alone, VF kIsch, MANUAL floor) plus S3 in
circ-pulsus; the orchestrator's pre-count (S1b, S3, S4b, S5, S6a %, S9 SpO2) changed because S1b flipped and 18e/18a
produced the new ones — every one carries its number.

## 3. The audit before → after, and the headline numbers

`audit-before.md` = `origin/main` before FU-4; `audit-after.md` = this head (`pnpm run audit:physiology`, 79 scenarios).

**Four-patient propofol 2 mg/kg (Ali's state-dependence table, audit §K):**

| state | before ΔMAP / ΔHR / arrest | after ΔMAP (min MAP) / ΔHR / arrest |
|---|---|---|
| healthy 40 y | −10 % / +17 / no | **−23 %** (74) / +2 / no |
| 80 y hypertensive | −11 % / +12 / no | **−21 %** (96) / −1 / no |
| AS + CAD + HTN 75 y | −11 % / +12 / no | **−21 %** (92) / 0 / no |
| HFrEF 60 y | −10 % / +15 / no | **−21 %** (69) / +2 / no |
| severe tamponade (250 mL) | −16 % / +3 / no | **−79 %** (19) / −61 / **PEA t+170 s** |
| class III (−1.5 L) | −25 % / +6 / no | **−68 %** (27) / −29 / **no arrest** |
| massive PE (φ 0.8) | −16 % / −1 / no | −79 % (16) / −38 / PEA t+60 s |
| septic shock warm | −15 % / 0 / no | −38 % (50) / −59 / no |
| MANUAL healthy / hypovolaemia | −21 % / −30 % | −21 % / −35 % (35) |

The healthy row misses the −25 to −40 % band (Miller) at −21…−23 % because of 18e's humoral arm (D23: the two
sourced targets pull against each other — item 19).

**Ali's tamponade timeline (B7):** compensated at 660 s (MAP 90, HR 105, CVP 17, CO 3.18, CoPP 61) → propofol 2 mg/kg
→ +60 s MAP 50, HR 86, CO 2.53 → +120 s MAP 45, CoPP 25, kIsch 0.74 → **PEA at 830 s (+170 s)** (first MAP < 30 at
810 s) → +180 s MAP 19, CO 0, EtCO2 16 → `agonal` at 960 s → **asystole by 1200 s**; lactate 12.1, pH 6.75 later. The
later steps of Ali's chain are never reached alive (R53).

**Class III + propofol (C1):** bleed 1.5 L over 600 s → compensated at 960 s (MAP 83, HR 119, CO 3.17, lactate 2.2) →
propofol 2 mg/kg → **nadir MAP 26.6 at ≈ +60 s** (CO 1.60, kIsch min 0.81) → 32 at +120 s, 40 at +240 s, 45 at +9 min;
lactate max 4.5; **no arrest, no pulseless beat** (before FU-4's 18e: PEA +80 s). MANUAL: nadir 35.
**CPR CoPP (X1, commanded VF at 300 s, CPR q 1 at 330 s, adrenaline 1 mg at 450 s):** CoPP 26–27 on CPR alone (kIsch
0.69 → 0.81), 33–34 after adrenaline, 29 at 900 s (kIsch 0.97); CPR MAP 49–66, CO 0.95–1.67. Before 18a: 46–52 with
kIsch 1.00. At standard quality (q 0.8, no adrenaline) the suite reads 25.1–28.8 (S13).
**Tension PTX time to PEA:** K-ptx-ctl (lungCondition R, ventilated) asystole at 670 s (**+10.2 min**); E1/E2 (with
PEEP 15 at 660 s) 665 s — identical, so the alias holds; S8 (one command) +9.75 min; tension-ptx rig +10.45 min;
before FU-4: no PEA.
**K / burns / sux:** K 7.5 and 8.5 profiles no arrest; **K 9.5 → VF at 65 s**; **burns + sux 1.5 mg/kg → VF at 525 s
(+225 s)**; CaCl2 1 g first → none in 15 min (Task 7).
**Vagal events (18f; audit H rows and vagal-events):** fentanyl 10 µg/kg **73 → 48** (glycopyrrolate 0.4 mg first: 74,
control 72); remifentanil 3 µg/kg **→ 52**; neostigmine 0.05 mg/kg **→ 46** (after glycopyrrolate 62 — blunted);
repeat succinylcholine seeds 7/8/9 **45 (`junctionalEscape`) / 73 / 73**, atropine first 95/96/96; 40-seed rate adult
**0.40**, child **0.70**; atropine 0.5 mg 73 → 100; oculocardiac traction (1, 60 s) **73 → 45** (glycopyrrolate first
90 → 81, undrugged 73); laryngoscopy (1.5, 30 s) 73 → 57; peritoneal traction 73 → 45. Before: fentanyl −5/min,
repeat sux nothing, no surgical vagal reflex.
**The infant (18d + 18g):** 7 kg, ETT + VCV at its own defaults (20 × 49 mL): PaCO2 39.0–39.1 from 5 to 30 min, EtCO2
34.9, 0 non-finite values, the guard in its loud (test) mode never fired. Before: the engine died at 240 s
("rhythm sinus: next event time is NaN").
**Other arrests after (audit):** class IV 645 s (MANUAL 640 s); anaphylaxis 295 s; MH VF 2785 s; PE alone 1775 s; PE +
propofol 720 s; apnoea (I1) asystole 910 s; t25-apnoea SBP < 30 at 524 s after rocuronium. No arrest: healthy, elderly,
AS+CAD, HFrEF, class I–III (incl. + propofol and + sevoflurane), PEEP, pressors, vagal rows, cooling, warm sepsis.

## 4. The `it.fails` list

`docs/gates/fu-4/it-fails.md` lists all **56** `it.fails` in the repository with file:line and the measured number;
**36 are FU-4's** (added or re-titled with a new number). FU-4's flips (`it.fails` → `it`): circ-sanity-1 propofol
(Task 2; back to `it.fails` in 18e at 0.801, HR side kept as `it`); `pk-bus` VA > 3 L/min (Task 15); FU-3's final HR ≤
130 (Task 6); the 7e sepsis rows warm HR, warm MAP (flipped, back to `it.fails` at 54.0 in 18d, flipped again at 56 in
18e) and cold SVR (Task 15, E-FU4-9); lung-circ OLV share (15b); 5b-child and the blood re-check child (18d); S1b and
S8 (Task 22). New FU-4 `it.fails` with numbers (abridged; the file has the full titles):
arrest-etco2 +2 min 16.5; co2 low-flow 26.0/21.8/20.4 and 24.2 at 30 s (conflict with the orchestrator's update);
circ-hypoxic-arrest organised activity 6–10 min after (0 beats: decayed) and monitor HR < 45 before the arrest (58,
13b not landed); circ-lowflow-arrest ROSC CoPP −0.4–36.6; circ-pulsus 3.1; circ-sanity-1 0.801; the eleven suite rows
(§2); endo-acceptance MH EtCO2 54 and dantrolene +4.0 min; endo-circ warm CO 4.9 and SVR 767; hemo-acceptance CPR
trough 30.6; neuro-engine DI 52; obstructive-aliases SBP 92.8 (18e), CVP 11.5, MAP 78.4, SaO2 97.3; organs-tbi-treatment
ICP drop 30.5 %; **pk-longrun propofol Ce 2.5065 at 6 h (2.5058 at 24 h locally)**; tension-ptx +10.45 min; truth-event
2 101 leaves; escape-reset 60 QRS/min (twice); flow-distribution 1.29.

## 5. Exceptions (all *approved by the orchestrator 2026-09-28*)

- **E-FU4-1** `l2/blood/circ-adapter.ts` 61–64, `l2/blood/pipeline.ts` 178–211 (K term, `ext.kEcg`, absolute ECG K). Used.
- **E-FU4-2** (widened) `organs/inputs.ts` 147, `endo/adapters.ts` 60 and 156 (MAP source; `mapSetMmHg` in,
  `ext.endoHumDV0Frac` out), `endo/{hormones,effects,params,core}.ts` (the humoral arm), `organs/effects.ts` (one line,
  `ext.cbfRel`, Task 18a). Used.
- **E-FU4-3** `truth.ts` 31 (SKIP_PATH `hemo.circ.acc`, `hemo.circ.cppAcc`). Used.
- **E-FU4-4** (extended) `data/lung-pathology.ts` `pe` row loses `pvr` (Task 11); the shunt/V·Q keys were measured sourced
  and NOT changed. Used (pvr only).
- **E-FU4-5** (widened) `l2/resp/pipeline.ts` (the dead-space root, ventilator defaults), `l2/gas/params.ts`
  (`physicalDeadSpace`, `LOW_FLOW_TAU_S`), `l2/thermal/{thresholds,environment,heat,params}.ts`. Used.
- **E-FU4-6** withdrawn (FU-5).
- **E-FU4-7** `engine.ts`: 69–76 (imports), 482 (`coRefLpm`), 560–566 (`tempC`; the hook call with the `outcome` stream
  and `hold`), 751 (the alias pre-step), 769–772 (the stimulus observer, 18f). **`automaticityAt` unused** (13b not landed).
- **E-FU4-8** organs-tbi check 19 rigs re-derived twice (MODELED RR 18 → 15 → 12, MANUAL 18 → 13; treatment rig 18 → 13). Used.
- **E-FU4-9** endo-circ-acceptance sepsis titles/flips (bodies unchanged). Used.
- **E-FU4-10** `pk-acceptance-pk.test.ts` 20 (`pinDistQ = 1`). Used.
- **E-FU4-11** **unused** — 13a found the escape reset already present; 13b was applied, measured and reverted (ruling 5).
- **E-FU4-12** `validation/suites/sanity/sanity-docs.ts` 204–220. Used.
- **E-FU4-13** withdrawn (FU-5).
- **E-FU4-14** **unused** — the file was not edited (the finding is in §6/§9: a water-balance drift, not lactate chemistry).
- **E-FU4-15** `l2/circ/params.ts` 109–120 (CPR constants). `l2/hemo/params.ts` **unused**.
- **E-FU4-16** `l2/lung/params.ts` 67 (valve constants), `RespState` `ptxAcc`/`ptxCeil`. Used.
- **E-FU4-17** `neuro-spont.test.ts` reference re-derived (criterion unchanged). Used.
- **E-FU4-18** (FU-6's Request 3) `l2/ecg/rhythm-engine.ts` 236–263 (`finiteOr`, `nonFiniteIsLoud`) and 282–295 (the
  clamp in `planUntil`). Used; **no clamp fired** in any run of this gate (tests run loud).

## 6. Deviations (every find that was re-anchored, every band that moved, every rig re-derived)

- **18e — the 3 mmHg humoral deadband** (`HUM_DEADBAND_MMHG`), not in the plan: 7e's wiring test asserts the endocrine
  multipliers are exactly 1 at rest, and the continuous MAP sits 0.2–2.1 mmHg under its set point in the first seconds
  (SVR × 1.0003). Measured effect elsewhere: tension-PTX PEA 10.62 (no deadband) vs 10.45 min.
- **18e — R45 records it created:** circ-sanity-1 propofol MAP ratio 0.801 (`it.fails`, HR side `it`); tension-ptx PEA
  +10.45 (+8.65 after 18c; upper edge split out); massive-PE SBP at 3 min 92.8 (88.7); S2 −14.3 %, S14 −22.9 %,
  S6a −68 %; warm-sepsis MAP back in band (56). And the conflict with ruling 3 (§9 item 23).
- **18f — the Bezold–Jarisch (empty-ventricle) term was prototyped and WITHDRAWN** (Task 12 Step 3's prose): 800 ms ×
  (0.35 − EDV/rest)/0.35 moved class IV peak HR 169 → 140 but the tension PTX's PEA from +10.45 to **+16.75 min** (no
  PEA in the 12-min run) by lowering the obstructed heart's demand, and met nothing K_BRADY does not (class IV HR min 53
  in the minute before the arrest). The vagal-events class-IV row asserts the minimum HR (Task 12's wording "falls below
  100"), not the minute's mean (106).
- **18f — stimulus-driven vagal events (UNPROTOTYPED → prototyped here):** sizes as the plan ([ENG]), plus a fatigue τ
  120 s (the reflex fades on sustained traction) so a stimulus left on does not hold a bradycardia forever; `site`
  validated by 7e; `VAGAL_SITES` exported from `types-neuro.ts` (the type test `types-neuro.test.ts` updated for the one
  optional field). The glycopyrrolate-first criterion is "no bradycardia against the undrugged HR" (81 vs 73), as the
  opioid rig's; the residual −10 % from glycopyrrolate's own HR is recorded.
- **18f × Task 14 — pk-longrun:** remifentanil's vagal row lowers HR/CO under TCI and the flow-dependent propofol
  distribution puts Ce at 2.5065 (6 h) / 2.5058 (24 h local) against 2.5 ± 0.005: split out as `it.fails` (a pinned
  `pinDistQ` would be E-FU4-10 extended, not approved).
- **18f** `pk/pipeline.ts` find block re-anchored (Task 14 had inserted the transit-lag comment below the anchor).
- **18g:** the clamp reference is the last processed instant + 1 s (a `planT`-based reference looped at one instant
  and exhausted memory in the first prototype).
- **Task 21 — `t25-apnoea` carries pressures only in its baseline:** the helper's default `setTarget hr 75` HOLDS the
  MODELED rate (FU-2 rate rule), and with it the never-ventilated paralysed patient did not arrest in 29 min (SaO2 0.001
  for 10 min, kIsch 1.00; rocuronium wears off at ≈ 15 min). Without the HR hold: SBP < 30 at 524 s (band 300–1200,
  green). t25-rocuronium-sugammadex's `rr-back` stays red at 0.0 — unchanged from before FU-4 (`state:rr` is the L1
  target, not the effort).
- **Task 22:** S13's rig is standard-quality CPR q 0.8 (the ruling's measured condition, 23.8), not the plan's q 1 (43–46
  before 18a); the CPR-alone rig starts compressions after the 3 L are out (720 s): 18b's finding that CPR into a
  still-bleeding patient restores a pulse.
- **Task 23:** PNGs at `deviceScaleFactor` 0.6 (0.7 gave 62 KB); the page's "pulseless" = a pulseless rhythm or 5
  consecutive non-ejecting `circ` events (a 3-event run was a transient in the PTX course).
- **Task 19 soak:** the 24 h local lactate drift is **0.0141** (band 0.02; 0.0271 before FU-4) — it passes locally now;
  it is monotone and paired with a slow blood-volume loss (bvRel 0.9992 → 0.9939, Hb 15.01 → 15.09 in 22 h), i.e. a
  7c water-balance term, not lactate chemistry. No edit (E-FU4-14 unused); reported for 7c.
- **Gate — `TAU_HYP_S` 360 → 300 s** (D3 (i)–(iii)): the plateau moved after 18e–18g. Scan (whole circ-hypoxic-arrest
  file, seed 16): 180 ✗ (PEA +4.83), 200 5.10, 220 5.83, 260 5.80, 300 6.35, 330 6.63, 360 6.98, 400 7.85, 450 ✗
  (post-arrest window). Plateau 200–400, middle 300: **PEA +6.35 min, margins 1.35 / 7.65 min to 5–14; HR < 40 at +3.00
  min (margin 3.00 to ≤ 6)**. Identical with and without the BJ term.
- Earlier executors' deviations (from their commits): Task 4's interim asphyxia +12.02 min until Task 6; Task 10 Step 2
  not applied (8 cmH2O reached 4.9 mmHg); Task 13b applied/measured/reverted; Task 14 could not extract Johnson 2003 /
  Kazama 2002 numbers (no web access — open item); Task 16 hypothermia lactate 8.6 vs < 8 target; Task 17
  `LOW_FLOW_TAU_S` 70 not 40 (the plan's 40 gave 7.9/1.9) and Stage 3's own low-flow unit bands split into two
  `it.fails` (a conflict for the orchestrator); 18d `CBF_REFLEX_FULL` 0.9 → 0.6 (Astrup 1981; 18a's 0.9 withdrew the
  reflex in hypocapnia, sepsis and raised ICP), the Weissler LVET slope in the coronary reference, and the per-kg CO2
  flow ratio (the infant-crash root).

## 7. Coverage-matrix cells (research/12, R54) — before → after

| Cell (12's id) | Expected human response | Before | After (measured) | Verdict |
|---|---|---|---|---|
| A08-A1 healthy propofol 2 | MAP −25…−40 %, HR ≈ 0 | WR (−10 %, HR +17) | −23 %, ΔHR +2 | **TW** (just short; item 19) |
| A08-J2/J3 elderly HTN, A08-K-as AS+CAD, A08-K-hf HFrEF | larger falls (CM-01 −30…−45 %) | TW (−11 %) | −21 % each | **TW** (18e) |
| A08-C1 class III + propofol | profound hypotension, arrest not the rule | TW (−25 %) then PEA +80 s on the applied tree | nadir 26.6, no arrest | **PL** (nadir 3 mmHg under 30) |
| A08-B1/B2/B9/B8 tamponade + propofol | collapse / PEA | WR (−16 %) | 2 mg/kg PEA +170 s; 1 mg/kg MAP 59.7 | **PL** (2), **TW** (1 mg/kg, Q2) |
| A08-B6/B7 Ali's chain | never reached alive | WR (no arrest) | PEA 830 s | **PL** |
| A08-B0s pulsus | ≥ 10 mmHg | WR | 3.1 | **TW** (Q2) |
| A08-B3/B3b tamponade PEEP | CO −20 % | TW | ×0.88 | **TW** |
| A08-C4 class IV / L-C4 MANUAL | arrest | WR | PEA 645 s / 640 s | **PL** |
| A08-F2/F3 anaphylaxis IV | arrest | WR | PEA 295 / 280 s | **PL** |
| A08-F4 MH untreated | arrest | WR | VF 44.4 min at 42.3 °C | **PL** (Q6) |
| A08-I1 apnoea | hypoxic arrest | WR | asystole 910 s | **PL** |
| A08-X VF + CPR | CoPP CPR-level | WR (79) | 25–29 (q 0.8), 33–34 with adrenaline | **PL** (slightly high; S13 `it.fails`) |
| DV-02 CPR quality | CoPP 15–25 | NM | 25.1–28.8 | **TS** (small) |
| DV-03 exsanguination, CPR alone | no pulse without volume | NM | pulse at +175 s | **WR** — 18e × ruling 3 (item 23) |
| DV-26 asphyxial arrest | oxygenation reverses bradycardia | NM | reversal 7.0 s (FU-3 rig) | PL |
| A10-D6 VF EtCO2 | gradual decay | WR (37 → 1 in 20 s) | 14.5 / 6.6 at +60/+120 s | **PL** (CPR "by +2 min" `it.fails`) |
| A10-B1 sinus 30 + escape | 40 QRS/min | WR | 60 | **WR** (Stage 5 AV concealment — not FU-4's) |
| A10-B3 AF pulse deficit | 10–20 % | IN (44 %) | 14.1 % MODELED / 11.4 % MANUAL | **PL** |
| A08-D0 / A09-G1a massive PE | SpO2 < 90, CVP ≥ 15, MAP < 65 | WR | SaO2 97.8, CVP 9.3, MAP 82.1; PEA 1775 s | **TW** (Q15; Ali's band) |
| A08-E1 / A09-F4 tension PTX | PEA 3–10 min PPV | WR (no PEA) | +9.75–10.45 min; spontaneous none in 15 min | **PL** (edge) |
| A08-G1 / BF-07 hyper-K | sine wave → VF/asystole ≥ 8–9 | WR | K 9.5 VF 65 s; 7.5/8.5 no arrest | **PL** (no AV block / rate of rise — item 20) |
| A08-G3b / DI-37a burns + sux | K +3–7 → arrhythmia | WR | VF +225 s | **PL** |
| A08-G4 awake cooling 28 °C | shivering stops | WR | fades 32 → 30 °C; lactate 8.6 | **PL** (lactate TW) |
| A08-G4b GA cooling 28 °C | AF/VF risk | MI | VF hazard below 28 °C (0 at 28) | **PL** (AF: Q11) |
| ET-02 forced air | plateau near 36 | NM | 60 min Δcore −0.87 (43 °C) vs −1.26 unwarmed | PL |
| A08-H1 / H1b opioids | vagal bradycardia, atropine-reversible | TW (−5/min) | 48 / 52; abolished by glycopyrrolate | **PL** |
| A08-H2 / PD-10 repeat sux | risk, commoner in children | MI | seeded 0.40 adult / 0.70 child; none after atropine | **PL** |
| A08-H3 neostigmine | bradycardia | PL | 46 (glyco 62) | PL |
| SP-07 oculocardiac / SP-06 peritoneal | bradycardia, atropine-abolished | NE | 73 → 45; glyco first 81 | **PL** (new) |
| SP-01 / A09-C1e laryngoscopy | MAP +20–30 %, HR +20 without opioid | TW | vagal dip 73 → 57 then the 7e surge | **TW** (laryngoscopy's vagal size is [ENG]) |
| A09-A1/A2/A2f/A2g/VD×6 dead space | PaCO2 35–45 at 7 mL/kg | WR (PaCO2 60, woman 103) | man 39.4, woman 41.3, child 39.2, infant 39.1, elderly 38.3 | **PL** |
| A09-B5g / PD-11 child | PaCO2 35–42 | WR (55) | 39.2 at 17 × 112 | **PL** |
| PD-12 infant (FU-6 Request 3) | no crash | crash at 240 s | PaCO2 39.1, no non-finite | **PL** |
| A09-B7 MANUAL apnoea | — | MI | unchanged by design (D6) | Ali (Q9) |
| A08-L-B6 / L-B0 MANUAL tamponade | — | WR | no engine arrest, MAP ≥ 49.6 (D6) | **visible, by design** (Q9) |

Cells the audits marked wrong that FU-4 does NOT fix, named: A10-B1 (Stage 5 AV concealment), A08-D0/A09-G1a/c (the
massive PE's hypoxaemia and RV failure — Ali's band, Q15; A09-G1d hyperventilation is FU-6's), DV-03 (the 18e × ruling-3
conflict), A09-B7 and the MANUAL tracker floor (Q9, Q-FU3-4a), DI-13a/DI-25 (amiodarone and calcium have no shock /
NMB path — DV/FU-7), DI-21 ketamine in sepsis (7g), A10 monitor cells (FU-5).

## 8. Glossary labels (research/11, R56)

Labels this stage introduced or uses, in their clinical form: **CoPP** — coronary perfusion pressure (mmHg; every CPR
number above and the `circ` event's `cpp`); **CPP** stays cerebral (7d); **SaO2** — arterial saturation (truth, %) vs
**SpO2** (displayed); **EtCO2**, **PaCO2** (mmHg); **MAP**, **CVP** (mmHg); **kIsch** — "Ischaemia factor" (fraction of
normal contractility left; the flow share, 0–1; engine-only instructor label); **RR** respiratory rate; the interval is
written "R–R". Rhythms: "sinus" written out; **PEA** (pulseless electrical activity), **ROSC** (return of spontaneous
circulation), **VF** (ventricular fibrillation) are used in titles in their standard clinical sense — research/11 has no
rows for them (proposed additions for S9's relabel).

## 9. Open questions (the plan's list, updated)

1–12 (Ali's twelve) stand as written in the plan with these numbers: Q1 healthy −23 % (item 19); Q2 tamponade 1 mg/kg
MAP 59.7, CO −15 %; PEEP 10 CO ×0.88; Q3 onset proportions (unchanged); Q4 class IV HR 169 → min 53 before the arrest;
Q5 (+ item 20); Q6 MH VF 44.4 min at 42.3 °C; Q7 grade IV arrest 235 s, adrenaline MAP 108; Q8 unchanged; Q9 MANUAL
(+ item 21); **Q10 RULED** (18d: man 39.4, woman 41.3); Q11 unchanged; Q12 Ce ratio 1.83 (suite) / 1.29 (unit rig), the
papers' numbers still not extracted.
**13 RULED → 18a** (CoPP 23.3 at 70 s; 25.1–28.8 over minutes; no pulse from CPR alone — until 18e, item 23).
**14 RULED → 18c** (PEA +8.65 → +10.45 with 18e; S8 +9.75). **15** massive PE — S9 SaO2 97.8, CVP 9.3, MAP 82.1.
**16** `TAU_HYP_S` re-scanned at the gate: 300 s, margins 1.35 / 7.65 (§6). **17 RULED → 18b** (exsanguination PEA 484
→ agonal +107 → asystole +260 s). **18 RULED → 17** (AF 14.1 %). **19** the two propofol targets (−23 % healthy vs
class III nadir 26.6): Ali. **20** hyperkalaemia gaps (rate of rise, AV block, calcium generosity): Ali/Q5. **21** MANUAL
18/10 → 65/30 (MAP 38): a test now. **22** the infant: fixed (18d) and guarded (18g).
New:
23. **The humoral arm vs ruling 3 (orchestrator).** 18e's venous term (HUM_V0 × BV in the shared reservoir) is not
    suppressed by the arrest or by brainstem ischaemia, so after full exsanguination CPR alone refills the thorax and
    restores a pulse at +175 s (HUM_V0 0: never, CoPP 3.1–3.4). A flow dependence of the humoral arm (hormones need a
    circulation to be secreted and delivered) is the candidate mechanism — not prototyped here.
24. **The Bezold–Jarisch term** (Task 12 Step 3) withdrawn: it delays obstructive-shock arrests (PTX +16.75 min). Wanted
    at all, and if so gated how?
25. **Validation baselines hold the MODELED rate** (`setTarget hr` in every sanity document's patient block): a held
    instructor rate kept a paralysed, unventilated patient at SaO2 0 for 10 min without an arrest. Should MODELED
    documents send HR targets, and should FU-3's hypoxic arrest act through a held rate?
26. **TCI under low output** (pk-longrun): the pump's population model vs the flow-scaled patient (Ce 2.5065): a feature
    to show, or should the TCI model see the same q?
27. **7c water balance:** the resting 24 h drift (bvRel −0.5 %, Hb +0.08) behind the soak lactate.
28. **Stage 3's low-flow unit bands vs the orchestrator's arrest-EtCO2 update** (Task 17): two `it.fails` until ruled.

## 9b. FU-5 (PR #24) — the orchestrator's merge-first ruling, NOT executed on this branch

The orchestrator ruled at the gate that FU-5 merges first and that this branch merge `origin/fu-5-monitor-fidelity`
(`d1a2175`) before the PR, keep both sides (`truth.ts` SKIP_PATH = the union), meet FU-5's four fidelity tests that
failed on FU-5's trial merge, re-run FU-5's `fidelity-*` slow files and `pnpm audit:monitor`, and record FU-5's
low-flow screenshot's yellow "**CVP -1<0" (the negative chamber volumes of the exsanguination rig, noted in 18a) for the
calibration queue. **The merge of the FU-5 branch was refused by this session's permission system**, so none of that
was done here; the branch's base is `origin/main` at `4fe5a7a`'s merge (docs only). What the next step inherits, as
ruled: (1) EXTREME BRADY cycling every 3.3 s after a latched ASYSTOLE in Ali's tamponade case, and a 1 s SpO2 LOW PERF
cycle in the 3 L bleed — fix only on FU-5's L2 signal-quality / L3 alarm side (the `agonal` rate below the asystole
threshold declared as asystole; LOW PERF hysteresis), else `it.fails` with the cycle counts under an "FU-5 follow-up"
list; (2) the PEA HR reading 4.3 off the electrical rate (the PEA now decays) and the ear-probe desaturation lag 13 s vs
12 s — R45 re-statements under a declared exception with one sentence of reason; (3) the "CVP -1" row to the
calibration queue. Once `#24` is on `main`, `git merge origin/main` brings all of it.

## 10. Verification (at `4fe5a7a` + the S8 flip `93808e7`)

- `pnpm typecheck` (all packages, apps/demo): clean.
- Fast set, all packages (`CI=1 PME_TEST_SET=fast pnpm test`, 454 s wall): engine-core **259 files / 1 149 passed, 1
  skipped**; controller 37 / 215; renderer 24 / 77; skins 18 / 173; audio 10 / 58; ventilator 14 / 88 (incl. the R36
  sweep, 900 s budget); validation 30 files (+1 skipped) / 107 passed, 11 skipped (incl. tick-bench); apps/demo 9 / 141.
- `SLOW_A` (serial, CI=1, 769 s wall): 10 files / 55 tests — 54 passed and S8 failed as an `it.fails` whose band was
  now met (+9.75 min); flipped to `it` in `93808e7` and re-run green. `SLOW_B` (726 s wall): **39 files / 192 passed**.
- Disjointness gate (Task 20, `PME_TEST_SET=slow-a|slow-b|slow npx vitest list --filesOnly`, with the suite file present):
  `comm -12 a b` printed **nothing**; **10 + 39 = 49** files (before the suite existed: 9 + 39 = 48). CI walls: not yet
  measured (the PR's first run records them; D17 estimate ≈ 35 min each).
- e2e (`PW_SYSTEM_CHROME=1 pnpm test:e2e`, Chrome, 630 s): 27 passed, 1 skipped (stage7d shots), 5 failed — the IIFE
  smoke (2) and stage6a-worker (3) need the built bundle; after `pnpm build` (as CI runs it) those 5 pass → **32 passed,
  1 skipped**. The FU-4 smoke: passed (3.5 min).
- `check-notices`: OK (3 governed files). `audit:physiology`: 79 scenarios → `audit-after.md`.
- tick-bench (local, 120 s, loaded machine): **p50 0.56 ms**, p95 0.92, p99 1.31 (CI bound 6 ms; the fast-set test passed).
- Local 24 h: pk-longrun propofol Ce 2.5058 (its `it.fails` holds); organs-soak lactate drift 0.0141 (band 0.02);
  hemo-longrun 24 h passed (234 s wall); **organs-soak 24 h: lactate drift 0.0141 passes, hourly UOP drift 2.68 % fails
  the ±2 % band locally** (the CI 6 h horizon passes in SLOW_A) — the same slow water-balance loss as the lactate
  (item 27); recorded, not fitted.
- Validation documents: t25-rocuronium-sugammadex `rr-back` 0.0 red (unchanged); t25-apnoea `sbp-collapse` 524 s green.

## 11. Evidence screenshots (`docs/gates/fu-4/`, headless system Chrome, 1280 × 640 at scale 0.6, each ≤ 60 KB)

| shot | moment | truth at the shot (panel) | size |
|---|---|---|---|
| `1-induction-3min.png` | healthy, propofol 2 mg/kg at 300 s, +3 min | sinus, MAP 78, CO 4.85, CoPP 64, kIsch 1.00 | 52 KB |
| `2-ali-tamponade-pea.png` | Ali's case: tamponade 1 at 60 s, propofol 2 mg/kg at 660 s | PEA (sinus, pulseless) at 829 s; MAP 19, CO 0, CoPP 2, kIsch 0.09 — organised ECG, flat ABP | 44 KB |
| `3a-classIV-pea.png` | class IV (2.5 L / 10 min), 60 s after the arrest | arrest 748 s; `agonal`, MAP 4, kIsch 0.02 | 42 KB |
| `3b-classIV-rosc.png` | CPR + 2 L + adrenaline 1 mg | pulse back at 926 s: sinus, MAP 121, CO 5.06, CoPP 78, kIsch 0.78 | 58 KB |
| `4-tension-ptx-pea.png` | tension PTX (one command) at 60 s | asystole at 772 s (+11.9 min on the page's ×4 run; the suite's +9.75 is the engine's own pulseless flag); MAP 36, kIsch 0.32 | 45 KB |
| `5a-burns-sux-sine.png` | burns 1, sux 1.5 mg/kg at 300 s, +200 s | sine-wave morphology, still perfusing (MAP 89) | 51 KB |
| `5b-burns-sux-vf.png` | the same, VF | VF at 522 s | 49 KB |
| `6-vf-cpr.png` | VF at 60 s, CPR q 1 from 90 s | compression artefact on the ECG, CPR ABP 91/46, CoPP 27, kIsch 0.75 | 59 KB |
| `7-pe-propofol-pea.png` | massive PE at 60 s, propofol 2 mg/kg at 660 s | PEA → `agonal` at 1107 s; MAP 19, CoPP 3 | 42 KB |

The pleth staying drawn and SpO2 99 shown during a PEA is the pulse-oximeter dropout FU-5 owns (G14 moved to FU-5).
