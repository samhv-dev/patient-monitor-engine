# 11 — Capability inventory, gap table and clinical glossary (R54–R59)

*Written 2026-09-28 against repo `main` 9dc6d4d (read-only). Inventory and design only: no engine code was changed.
Author: capability-inventory agent. Companion: `12-coverage-matrix.md` (the R54 audit design).*

This file has three jobs.

1. **Inventory** (§2): every truth/state/measurement parameter the engine has, grouped by system, with its engine key,
   unit, where it is surfaced, who owns it (MODELED physiology, MANUAL instructor target, or an input), and which stage
   built it.
2. **Gap table** (§3): Ali's R54–R59 list (respiratory mechanics and lung volumes, labs and coagulation, pregnancy,
   and what the list implies) marked **present / internal-only / missing**.
3. **Glossary** (§5): for every surfaced parameter, the clinical abbreviation, full name, unit, adult normal range
   (child and pregnancy where they differ), the vendor/textbook convention, and the current label. **R56 makes this
   glossary the single source for every UI label** (monitor, console, ventilator, labs, docs, scenario authoring).

---

## 0. Headline

- **The engine computes far more than it shows, and shows most of it under engine names.** A fully instrumented
  ventilated patient under propofol/sevoflurane/rocuronium/remifentanil produces **1,863 console leaves**: 1,087
  visible and 776 hidden as machinery. Of the 1,087 visible leaves, **903 (83 %) are labelled with the raw field
  name** (`es`, `gv`, `pf`, `cpLp`, `hbfRel`, `uop1hMlKgH`…). Only 184 have a curated label, and most of those are
  per-lung-unit rows.
- The **clinical displays** are small. The monitor has 19 tile types and 33 numeric ids. The lab panel has 16 rows (ABG
  style). The ventilator panel (the Hamilton port, reached only through the link page) has 6 numerics. There is an
  endocrine glucose line and a drug table. Everything else (CO, SV, SVR, EF, SvO2, DO2, VO2, shunt, compliance, FRC,
  dead space, ICP physiology, GFR, INR, hormones) lives only in the developer console.
- **Gap table** (§3 has the item lists; counts are items):

  | group | present | internal-only | missing | total |
  |---|---|---|---|---|
  | A. Respiratory mechanics and lung volumes (Ali's 24 items) | 4 | 10 | 10 | 24 |
  | A′. Mechanics extras the list implies (P0.1, RCexp, loops, Pes…) | 6 | 4 | 3 | 13 |
  | B. Labs: ABG/VBG, CBC, chemistry, LFTs, glucose, coagulation, TEG/ROTEM | 18 | 8 | 32 | 58 |
  | C. Pregnancy (R59) | 1 | 7 | 27 | 35 |
  | D. Other implied capabilities (PFT device, lab turnaround, CO/SvO2 monitoring, PPV, positioning…) | 1 | 7 | 11 | 19 |
  | **total** | **30** | **36** | **83** | **149** |

  "Present" means shown on a clinical display (monitor, ventilator panel, lab panel, drug/endocrine panel) under a
  label a clinician reads. "Internal-only" means the value exists in the truth tree, in an event, or in code, but only
  the developer console (or nothing) shows it. "Missing" means no code computes it. Where a missing value is a
  one-line derivation of existing internals (VD/VT, Cdyn, ERV, VC, P/F, A–a, Hct) the table says so.
- **Glossary** (§5): **294 entries**. 225 name an existing quantity and 69 are new labels for the R57/R58/R59 items
  and the §3 gaps. Of the 225 current labels:
  - **90 (40 %) would not be recognised by a resident**: a raw engine key, engine jargon, a wrong or missing unit,
    or a word that means something else on a ward.
  - **74 are recognisable but non-standard, ambiguous or incomplete.**
  - **61 are already conventional.**

  Five collisions must be resolved in the labels before any relabel:
  - **CPP** is both cerebral perfusion pressure (`mon.cpp`) and coronary perfusion pressure (`ev.circ.cpp`); use
    CPP and CoPP.
  - **PI** is both the SpO2 perfusion index and the LVAD pulsatility index.
  - **SR** is both suppression ratio and sinus rhythm.
  - **RR** is both respiratory rate and the R–R interval.
  - The lab panel's **SO2** is fractional (it includes COHb and MetHb), not the functional SaO2 a resident reads.
- Findings made while taking the inventory (§4) include: the lab panel drops Mg and osmolality that the engine
  computes; the scenario schema cannot express the endocrine profile (diabetes, thyroid, adrenal) or pregnancy weeks;
  the organ module thinks the patient is under GA while the lung module does not (R4 of audit 09, seen in the dump);
  the kidney flags **oliguria at 150 s** of a healthy run (a 60-min window read at start-up); monitor tile extras
  (PPV, T2/ΔT, BS%, SQI, EMG, PACE, PVCs) are declared in the skins and never computed.

---

## 1. Method

- **Code read.** `packages/engine-core/src/types*.ts` (the 12 public type files), the L1/L2/L3 modules they point to,
  `apps/demo/src/physiology-console/{organs,meta,flatten,model}.ts` (the 7x console's grouping, labels and folding),
  `packages/skins` (tile/lane ids, per-skin tiles), `packages/renderer` (tile units, lab/endo/drug panels, lanes),
  `packages/ventilator` + `apps/demo/src/vent/hamilton-ui.ts` (ventilator numerics), `packages/controller`
  (`pme-scenario/1` schema, model inputs), `docs/physiology/stage-7-parameter-tables.md` (the R22 profile layer and
  the §7 sanity list), `docs/validation/`, and the three audits (research/08, 09, 10).
- **Live dump.** `research/11-inventory-scripts/dump.ts` builds the console's own `ConsoleModel` against a MODELED
  engine (40 y, 70 kg man, every sensor attached, ETT + VCV 12 × 500 PEEP 5 FiO2 0.5, Foley, TOF and depth on, NIBP
  auto, propofol 2 mg/kg, rocuronium 0.6 mg/kg, sevoflurane 2 % at 2 L/min, remifentanil 0.1 µg/kg/min, ABG + VBG sent
  at 60 s) for 150 s. It then writes every leaf with the console's group, internal flag, label and unit
  (`leaves-ventilated-ga.tsv`; `leaves-devices.tsv` adds IABP and the transcutaneous pacer). The truth tree was
  1,565 leaves, not truncated (cap 2,100). The run needs no worktree: `hooks.mjs` maps `@pme/*` to `packages/*/src`.
  Rerun: `cd research/11-inventory-scripts && node --import ./hooks.mjs dump.ts full > leaves.tsv` (Node ≥ 24; about 2 s).
- **Surfacing codes** used in §2:

  | code | where a user sees it |
  |---|---|
  | **TILE** | monitor numeric tile (skin `TileParam`, `alarm-view.ts` `TILE_NUMERICS`) |
  | **WAVE** | monitor waveform lane |
  | **XTRA** | tile "extra" declared in a skin JSON (implemented only for PR, MEAN, EtCO2/AWRR, TOF/PTC, SR) |
  | **LAB** | renderer lab panel (`lab-panel.ts`, 16 rows) and the `labResult` event after the turnaround |
  | **ENDO** | renderer endocrine panel (`endo-panel.ts`: GLU for all; stress, adrenaline, cortisol, MH, Tperiph for the instructor) |
  | **DRUG** | renderer drug panel (`drug-panel.ts`: Cp, Ce, pump, total, decrement time; volatile line) |
  | **VENT** | ventilator panel (`@pme/ventilator`, Hamilton-style page; reached through the link page, not the monitor) |
  | **DEV** | header device text (defib energy/charging/sync, pacer mode/rate/mA) |
  | **CON-C** | physiology console, curated label (`meta.ts` CURATED/LUNG) |
  | **CON-R** | physiology console, visible, **raw field name as its label** |
  | **CON-I** | physiology console, "internals" only |
  | **EV** | an engine event field, not drawn by any panel |
  | **CODE** | a constant or a function-local value, not in truth |

- **Ownership:** **MOD** = computed by the physiology in both modes (reflex-free in MANUAL). **MAN** = an L1
  `StateVar` the instructor can pin/ramp (`setTarget`/`pin`: hr, sbp, dbp, cvp, papSys, papDia, pawp, spo2, pi, rr,
  vt, etco2, fio2, shunt, tempCore, contractility, svr, k, qtc, volumeStatus, paceThresholdMa). In MODELED these are
  `modeled`, or `override` for etco2/rr/spo2, which the gas model then owns. **FAC** = controller `setFactor`
  (hrFactor, svrFactor, contractilityFactor, vo2Factor, vco2Factor). **IN** = a profile or event input. **DEV** =
  device state.
- **Stage** = the stage that built it (1 ECG; 2 haemodynamics/NIBP/lines; 3 respiration/gas/temperature/capnography;
  4b device/alarms; 5 rhythm library; 7a circulation; 7b lungs; 7c blood; 7d brain/kidney/liver; 7e endocrine/thermal;
  7f NMB/depth/drive; 7g PK/PD; 7x console; V ventilator; FU-n follow-ups).

---

## 2. Inventory by system

Key paths are the console's (`mon.<id>` = monitor numeric, `ev.<type>.<field>` = event field, anything else = the truth
tree). `#` = side index (0 L, 1 R); `@` = mechanical unit (0/1 L fast/slow, 2/3 R fast/slow). The raw units are the
engine's. Where the console rescales (SVR ×1333.22 to dyn·s·cm⁻⁵, fractions ×100 to %), the note says so.

### 2.1 Monitor numerics and waveforms (L3 device layer; what the bedside monitor shows)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `mon.hr` | heart rate (ECG-derived, QRS detector) | bpm | TILE HR, CON-C | MOD/MAN (`hr`) | 1, 4b |
| `mon.pr` | pulse rate (from pleth or ABP) | bpm | XTRA "PR" in SpO2 tile, CON-C | MOD | 2 |
| `mon.spo2` | SpO2 (averaged, site-delayed) | % | TILE SpO2, CON-C | MOD/MAN (`spo2`) | 2, 3 |
| `mon.pi` | perfusion index | % | XTRA "PI" (saadat-like), PressureTile "PI" (stage pages), CON-C | MOD/MAN (`pi`) | 2 |
| `mon.abpSys/Dia/Mean` | invasive arterial pressure S/D/M | mmHg | TILE ART / IBP1, WAVE ABP, CON-C "ABP sys…" | MOD/MAN (`sbp`,`dbp`) | 2 |
| `mon.cvpMean` | central venous pressure | mmHg | TILE CVP / IBP2, WAVE CVP, CON-C | MOD/MAN (`cvp`) | 2 |
| `mon.papSys/Dia/Mean` | pulmonary artery pressure S/D/M | mmHg | TILE PAP / IBP3, WAVE PAP, CON-C | MOD/MAN (`papSys`,`papDia`) | 2 |
| (wedge) `ev.state.values.pawp` | pulmonary artery wedge pressure | mmHg | WAVE PAP during `line wedge`; CON-R `pawp` | MOD/MAN (`pawp`) | 2 |
| `mon.nibpSys/Dia/Mean` | oscillometric NIBP S/D/M | mmHg | TILE NIBP (+ MEAN, time), CON-C | MOD | 2 |
| `ev.nibp.cuffMmHg`, `.phase` | cuff pressure during a cycle, phase | mmHg | TILE NIBP while inflating; CON-R | DEV | 2 |
| `mon.etco2` | end-tidal CO2 (sidestream/mainstream, 10 s max window) | mmHg | TILE CO2 (EtCO2), WAVE CO2, CON-C | MOD/MAN (`etco2`) | 3 |
| `mon.imco2` | inspired minimum CO2 | mmHg | CON-R `imco2` (declared XTRA "FiCO2" on saadat-like: not drawn) | MOD | 3 |
| `mon.awrr` | airway (CO2-derived) respiratory rate | /min | XTRA "AWRR" in CO2 tile, CON-R `awrr` | MOD | 3 |
| `mon.rr` | impedance respiratory rate | /min ("rpm" on tile) | TILE RR, WAVE RESP, CON-C | MOD/MAN (`rr`) | 3 |
| `mon.tempCore` | temperature T1 (oesophageal probe) | °C | TILE TEMP, CON-C "Temp core" | MOD/MAN (`tempCore`) | 3 |
| `mon.tempSite` | temperature T2 at the chosen site | °C | CON-R `tempSite` (XTRA "T2"/"DT" declared, not drawn) | MOD | 3 |
| `mon.stII` | ST deviation, lead II | mV | TILE ST (when configured) | MOD | 4b, 5 |
| `mon.qtc` | corrected QT | ms | CON-C | MOD/MAN (`qtc`) | 4b |
| `mon.tofCount`, `mon.tofRatio`, `mon.ptc` | train-of-four count, ratio, post-tetanic count | —, %, — | TILE NMT (TOF, PTC), CON-R | MOD | 7f, FU-3 |
| `mon.di` | processed-EEG depth index (BIS-like, 0–100) | — | TILE BFA, CON-R `di` | MOD | 7f |
| `mon.sr` | burst-suppression ratio | % | XTRA "SR" in BFA tile, CON-R `sr` | MOD | 7f |
| `mon.mac` | end-tidal MAC multiple (Σ Fet/MACage) | MAC | CON-R `mac` (no tile) | MOD | 7f |
| `mon.etAa` | end-tidal anaesthetic agent | % | CON-R `etAa` (no agent tile yet) | MOD | 7f |
| `mon.icpMean`, `mon.cpp` | intracranial pressure; **cerebral** perfusion pressure | mmHg | TILE ICP (ICP + CPP), WAVE ICP, CON-R | MOD | 7d |
| `mon.pbto2` | brain tissue O2 tension | mmHg | TILE PbtO2, CON-R | MOD | 7d |
| `mon.uop` | urine output, rolling 60 min | mL/h | TILE UO, CON-R | MOD | 7d |
| ECG channels `ecgI…V6` | 12 leads (+ `vcgX/Y/Z`) | mV | WAVE ECG1–3, 12-lead capture | MOD (rhythm) / MAN (`setRhythm`) | 1, 5 |
| `pleth`, `co2`, `resp` channels | plethysmogram, capnogram, impedance respiration | a.u., mmHg, a.u. | WAVE PLETH, CO2, RESP | MOD | 2, 3 |
| teaching channels `lvp lvv lap rap rvp pat` | LV pressure and volume, LA, RA, RV pressure, PA pressure truth | mmHg, mL | WAVE (stage 7a PV-loop page, `pv` sensor) | MOD | 7a |
| alarms (`alarm`, `alarmStatus`) | physiological/technical alarms, limits, latching | — | header bar, lamp, tile flash | DEV | 4b |

### 2.2 Circulation (Stage 2 + 7a; truth)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `ev.circ.co` | cardiac output (forward) | L/min | CON-C "CO" | MOD | 7a |
| `ev.circ.sv`, `ev.circ.svRv` | LV stroke volume, RV stroke volume | mL | CON-C | MOD | 7a |
| `ev.circ.ef` | LV ejection fraction | fraction (console ×100) | CON-C "EF" | MOD | 7a |
| `ev.circ.lvedv`, `lvesv`, `lvedp`, `lvsp` | LV end-diastolic/-systolic volume, LVEDP, LV systolic pressure | mL, mmHg | CON-C | MOD | 7a |
| `ev.circ.svr`, `ev.circ.pvr` | systemic and pulmonary vascular resistance | mmHg·s/mL (console ×1333 → dyn·s·cm⁻⁵) | CON-C | MOD/MAN (`svr`) | 7a |
| `ev.circ.pmsf` | mean systemic filling pressure | mmHg | CON-C "Pmsf" | MOD | 7a |
| `ev.circ.cpp` | **coronary** perfusion pressure (aortic diastolic − LVEDP, last beat) | mmHg | CON-C "Coronary perfusion pressure" | MOD | 7a |
| `ev.circ.supplyDemand`, `kIsch` | myocardial O2 supply/demand ratio; ischaemia factor | —, — | CON-C | MOD | 7a |
| `ev.circ.iabp.{ratio,augmentation}`, `ev.circ.lvad.{rpm,flowLpm,pi,powerW,suction}` | IABP and LVAD summaries | —, mmHg; rpm, L/min, —, W | CON-R | DEV/MOD | 7a |
| `hemo.circ.p.*` (`rSys`, `eesLv`, `eesRv`, `aLv`, `betaLv/Rv`, `cArt`, `cPa`, `cPv`, `cSv`, `v0*`, valve `r/k/eroa`, `pvrL/R`, `periA`, `periLambda`, …) | the live circuit parameters (resistances, elastances, compliances, unstressed volumes, valve areas, pericardium) | model units | CON-C for rSys/Ees; others CON-R | MOD (+ profile IN) | 7a |
| `hemo.circOut.{pAo,pLv,pLa,pRa,pRv,pPa,pPaRoot,pPv,pSv,pRad,pIt,pPeri}` | instantaneous chamber/vessel pressures incl. radial, intrathoracic (pleural) and pericardial | mmHg | CON-R (phase value, never highlighted) | MOD | 7a |
| `hemo.circOut.{qAv,qMv,qTv,qPv,qSys,qVr,qPvla,qLungL,qLungR,qVad}` | instantaneous flows (valves, systemic, venous return, per lung, VAD) | mL/s | CON-R | MOD | 7a |
| `hemo.circ.baro.{set,es,ev,mapLp,cpLp,cpSet,offT}`, `hemo.circ.chemo.*` | baroreflex set point, sympathetic/vagal efferents, filtered MAP, cardiopulmonary limb; chemoreflex inputs | mmHg, a.u. | CON-R | MOD | 7a |
| `hemo.circ.cor.*` | coronary model (ratio, kIsch, ischaemic time, ST drive) | — | CON-R | MOD | 7a |
| `hemo.circ.ext.*` (`drug.{svr,ees,v0Frac,gv,gvHr,hr,pvr}`, `endo*F`, `kChem`, `pPtx`, `pvrLung*`, `vFluid`, `avNodeBlock`, `betaAgonistU`) | cross-stage multipliers acting on the circuit (drug, endocrine, chemistry, pneumothorax, tamponade fluid) | × / mmHg / mL | CON-R | MOD | 7a/7c/7e/7g |
| `hemo.circ.man.*`, `hemo.circ.mapSetPinned` | MANUAL tracker state | — | CON-R | MAN | 7a |
| `hemo.circ.hrModel`, `hemo.circ.qFwd`, `hemo.circ.vol.*` | model HR, forward flow, volume ramps | bpm, mL/s | CON-C / CON-R | MOD | 7a |
| `ev.state.values.{sbp,dbp,hr,cvp,pawp,papSys,papDia,svr,contractility,volumeStatus}` | L1 truth of the MANUAL variables | mmHg, bpm, × | CON-C (SBP/DBP/HR "truth") / CON-R | MAN/MOD | 2 |
| `ev.beat.mech.{svMl,lvetMs,perfused,kSV}` | per-beat SV, LV ejection time, perfused flag | mL, ms | CON-R | MOD | 2 |
| **absent** | cardiac index, SVI, SVV, PPV, SPV, dP/dt, CPO, ScvO2 | — | — | — | — |

### 2.3 Rhythm and ECG (Stages 1, 5, 5.1)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `rhythm.id` (+ `ev.state.rhythm.{id,rateBpm}`) | current rhythm (36 ids: sinus family, atrial, SVT, AV blocks, ventricular, arrest, paced) | — | ECG waveform; CON-R | MAN (`setRhythm`) / MOD (engine-initiated: adenosine, LAST→VF, Mg on torsades, FU-4 arrest pathway) | 1, 5 |
| `ev.beat.{origin,qrsMs,qtMs,prMs,template}` | beat origin, QRS, QT, PR, template | ms | CON-R | MOD | 1, 5 |
| `mods.*` (`k`, `qtc`, `bbb`, `axisDeg`, `st`, `tInversion`, `lvh`, `longQT`, `brugada1`, `digoxin`, `alternans`, `lowVoltage`, `rsa`, `hrvScale`, `pvc`/`pac`/`pjc`, `tcp`, `tempC`, `ischaemicDepressionMv`, `artefact.*`) | ECG morphology modifiers and artefacts | mixed | CON-C for `mods.k`; rest CON-R | MAN (`setModifiers`) + MOD deltas (K, temp, ischaemia) | 1, 5 |
| `rhythm.{planT,escapeNextT,ectopyCount,…}` | scheduler | s | CON-R / CON-I | MOD | 5 |

### 2.4 Respiration, gas exchange and ventilation (Stages 3, 7b, V)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `resp.o2.pao2`, `resp.o2.sa`, `resp.o2.fa` | PaO2, SaO2 (fraction), alveolar O2 fraction | mmHg, —, — | CON-C | MOD/MAN (`spo2` drives in MANUAL) | 3 |
| `resp.co2.pf`, `resp.co2.ps`, `resp.co2.flow` | PaCO2 (fast/slow stores), CO2 flow factor | mmHg | CON-C "PaCO₂ (pf)" / CON-R | MOD/MAN (`etco2`) | 3 |
| `resp.etco2`, `ev.breath.etco2True` | true end-tidal CO2 before the sampler | mmHg | CON-C / CON-R | MOD | 3 |
| `resp.shunt`, `ev.lungState.shunt`, `ev.lungState.vqAdmixture` | shunt fraction (Qs/Qt); low-V/Q admixture | fraction | CON-C (×100) / CON-R | MOD/MAN (`shunt`) | 3, 7b |
| `resp.lung.co2.{pv,g,e,riseIII,faCo2,pA.@}` | PvCO2, EtCO2/PaCO2 ratio, CO2 elimination efficiency, capnogram phase III rise, FACO2, per-unit PACO2 | mmHg, — | CON-C | MOD | 7b |
| `resp.lung.o2.{pao2,sa,cv,fa.#}` | lung-model PaO2, SaO2, CvO2, per-side FAO2 | mmHg, —, mL/L | CON-C | MOD | 7b |
| `resp.pat.{vo2,vco2}` | VO2, VCO2 | mL/min | CON-R | MOD/FAC | 3 |
| `resp.vaLpm`, `resp.spont.{rr,vt,ve,paco2Set,paco2Rest,fatigue}` | alveolar ventilation; spontaneous RR, VT, VE, PaCO2 set point, fatigue | L/min, /min, mL | CON-R | MOD | 3, 7f |
| `ev.breath.{kind,vtMl,tiS,teS}` | last breath: kind, VT, Ti, Te | mL, s | CON-R | MOD | 3 |
| `resp.driver.{source,airway,severity,fico2,preox,gastricN,cleft,ataxia}` | ventilation source, airway state, rebreathing FiCO2, preoxygenation, gastric breaths, curare cleft | — | CON-R | IN/MOD | 3 |
| `resp.driver.vent.{rr,vt,peep,ie}` + `l1.coupled.fio2` | engine's own ventilator settings (VCV) | /min, mL, cmH2O, —, fraction | CON-R (devices group) | IN | 3 |
| `ev.anaesthesia.drive.*`, `neuro.resp.*` | opioid/hypnotic drive depression, apnoea, obstruction, NMB VT multiplier | — | CON-R | MOD | 7f |
| `blood.lung.evlwi` | extravascular lung water index | mL/kg | CON-R | MOD | 7c/7b |
| ventilator (`@pme/ventilator` `Measured`) `PIP`, `PLAT`, `autoPEEP`, `Pmean`, `VTE`, `MV`, `RR`, `P01` | ventilator-measured Ppeak, Pplat (insp hold), PEEPi (exp hold), mean Paw, VTe, MVe, fTotal, P0.1 | cmH2O, mL, L/min, /min | VENT tiles: fTotal, VTE, Ppeak, ExpMinVol, Pmean, P0.1 (spont modes); `Cstat`, `Raw`, `VT` on the lung canvas; `RSB`, `%Spont`, `Oxygen`, `PEEP` bars. **PLAT and autoPEEP are measured but not tiled** | MOD (vent physics) | V |
| ventilator settings (`VentConfig`: mode VC/PC/PRVC/PSV/PAV, peep, rate, itime, fio2, vt, pc, ps, cycleOff, trigger, pmax, riseTime, pavAssist, …) | ventilator controls | — | VENT controls | IN | V |

### 2.5 Respiratory mechanics and lung volumes (Stage 7b lung model; truth)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `ev.lungState.complianceMlPerCmH2O` | respiratory-system compliance (model parameter, static) | mL/cmH2O | CON-C "Compliance" | MOD (+ condition IN) | 3, 7b |
| `ev.lungState.chestWallComplianceMlPerCmH2O`, `resp.lung.lp.ccw` | chest-wall compliance | mL/cmH2O | CON-C / CON-R | MOD | 7b |
| `resp.lung.lp.side.#.cL`, `ev.lungState.lungs.#.complianceMlPerCmH2O` | per-lung compliance | mL/cmH2O | CON-C | MOD | 7b |
| `ev.lungState.resistanceCmH2OPerLps`, `resistanceExpCmH2OPerLps`, `lp.rTube`, `lp.side.#.rLung`, `mp.units.@.{rIn,rEx}` | airway resistance (insp/exp), tube resistance, per-lung, per-unit | cmH2O·s/L | CON-C / CON-R | MOD | 3, 7b |
| `resp.lung.tauBar`, `lungs.#.tauS`, `tauSlowS`, `fSlow` | expiratory time constant (τE, "RCexp"); slow-unit fraction | s | CON-C | MOD | 7b |
| `resp.lung.peepTot`, `ev.lungState.autoPeepCmH2O`, `autoPeepTendency` | total PEEP, auto-PEEP (PEEPi) | cmH2O | CON-C "Total PEEP" / CON-R | MOD | 7b |
| `resp.lung.pInsp` | end-inspiratory alveolar pressure (≈ Pplat) | cmH2O | CON-C "End-inspiratory alveolar pressure" | MOD | 7b |
| `resp.lung.mech.{paw,pcar,v.@,q.@}` | airway-opening and carina pressure, unit volumes and flows (instantaneous; **no Ppeak leaf**) | cmH2O, mL, mL/s | CON-C (phase values) | MOD | 7b |
| `l2/lung/measure.ts` `Breath{ppeak,pplat,peepTot,autoPeep,cstat,rInsp,drivingP}` | ventilator-style hold measurements | cmH2O, mL/cmH2O | **CODE only** (reference runs; not called at runtime) | — | 7b |
| `hemo.circOut.pIt`, `resp.lung.lp.tIt`, `lp.pPtx`, `resp.circPtx` | intrathoracic (pleural) pressure; airway→pleura transmission; pneumothorax pressure | mmHg; —; **mmHg labelled cmH₂O** (known FU-4 item) | CON-R / CON-C | MOD | 7a, 7b |
| Venegas curve `l2/lung/venegas.ts` | transpulmonary pressure for a volume (function) | cmH2O | CODE only | — | 7b |
| `resp.pat.deadSpaceMl` | anatomical dead space (2.2 mL/kg IBW) | mL | CON-R | MOD | 3 |
| apparatus dead space (`apparatusDeadSpaceMl`) | ETT/HME/Y-piece | mL | CODE only | MOD | 3 |
| `resp.co2.vdExtraMl` | **calibration dead space** added at t = 0 to match EtCO2 36 (audit 09 R1; not physiology) | mL | CON-R `vdExtraMl` | MOD (artefact) | 3 |
| `resp.lung.lp.side.#.vdAlv` | alveolar dead-space fraction per side | fraction | CON-C "alveolar dead space" (%) | MOD | 7b |
| `ev.lungState.deadSpaceMl` | total (physiological) dead space = anat + apparatus + vdExtra | mL | CON-C "Dead space" | MOD | 3 |
| `resp.pat.frcMl`, `resp.pat.frcGaMl`, `resp.lung.frcGaMl`, `ev.lungState.frcMl`, `lp.frcMult` | FRC awake / under GA (by the `thermal` switch), multiplier | mL | CON-C "FRC", "FRC (anaesthetised)" | MOD (IN switch) | 3, 7b |
| `TLC_ML_KG` 80, `RV_ML_KG` 16 (`l2/lung/params.ts`) | TLC and RV per kg IBW (unit P–V range) | mL/kg | CODE constants | — | 7b |
| `resp.lung.{aer.#,rec.*,perf.*,hpv.*}`, `ev.lungState.{atelectasisFrac,recruitableFrac,leakFraction}` | aeration, atelectasis, recruitment, perfusion share, HPV activation, leak | fraction | CON-C | MOD | 7b |
| `resp.lung.mp.units.@.sig.{a,b,c,d}` | per-unit Venegas P–V sigmoid | mL, cmH2O | CON-C | MOD | 7b |
| `lp.ibwKg` | ideal (predicted) body weight | kg | CON-C | IN | 3 |

### 2.6 Blood, acid–base, electrolytes, O2 transport, fluids (Stage 7c)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `ev.labs.values.*` (1 Hz truth) / `ev.labResult.values.*` (after turnaround) | pH, pco2, po2, hco3, be, so2 (fractional), cohb, methb, lactate, na, k, cl, iCa, mg, hb, glucose, ag, osm | mmHg, mmol/L, %, g/dL, mg/dL | LAB (16 rows: **mg and osm are not drawn**); CON-R | MOD | 7c |
| `lab` event `{panel:'abg'|'vbg', turnaroundS 30–3600, default 120}` | send ABG or VBG; VBG = **mixed-venous** (PvCO2 from VCO2/Q, PvO2 from SvO2) | s | LAB | IN | 7c |
| `blood.core.ab.{ph,hco3,be,atot,atBound}` | acid–base state (Stewart) | —, mmol/L | CON-R | MOD | 7c |
| `blood.out.{na,k,cl,iCa,mg,lactate,hb,ag,osm,albGL,albuminGL,cop,bvRel,hbfRel,dkaSeverity,kEcg}` | published chemistry, colloid osmotic pressure, relative blood volume | mmol/L, g/dL, g/L, mmHg | CON-R | MOD (+ profile IN `blood`) | 7c |
| `blood.core.o2.{cao2,do2,vo2,er,svo2,demand,deficit}` | CaO2, DO2, VO2, O2 extraction ratio, SvO2, O2 debt | mL/L, mL/min, — | CON-R | MOD | 7c |
| `blood.core.odc.{hb,dpgMmolL,cohb,methb,ph}` | ODC inputs (2,3-DPG, dyshaemoglobins) | — | CON-R | MOD/IN | 7c |
| `blood.core.fl.{vp,visf,vicf,albG,hbG,colloidG,jFilt,refill,sigma,kfMult}` | plasma, ISF and ICF volumes; capillary filtration and refill | mL, mL/s | CON-R | MOD | 7c |
| `blood.core.bledMl` | cumulative blood loss | mL | CON-R | MOD | 7c |
| `blood.core.renal.excretion.*`, `uopAboveBasalMlH` | renal solute excretion | mmol | CON-R | MOD | 7c |
| `blood.keto` (hidden), `metabolic` event | ketoacids, mineral acid load | mmol/L | CON-I | IN/MOD | 7c |
| transfusion `{rbc, ffp, platelets, wholeBlood}` | products as **volume + electrolytes/citrate only** (no clotting factor, no platelet count) | units | EV | IN | 7c |
| **absent** | Hct, WBC, platelet count, urea, creatinine, bilirubin, AST/ALT, ALP, GGT, troponin, BNP, PT, aPTT, fibrinogen, ACT, D-dimer, anti-Xa, TEG, ROTEM, phosphate as a variable | — | — | — | — |

### 2.7 Temperature (Stage 3 thermal + 7e)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `resp.temp.tc`, `resp.temp.tp`, `resp.temp.ta` | core, peripheral and ambient temperature | °C | CON-C "Core temp (model)" / CON-R | MOD/MAN (`tempCore`) | 3 |
| `resp.temp.sites.{oesophageal,nasopharyngeal,tympanic,bladder,rectal,axilla}` | site temperatures | °C | TILE TEMP (T1 = oesophageal; T2 = site) / CON-R | MOD | 3 |
| `resp.temp.{anaesthesia,warming,exposure,fluidWarmer,iv.*,airMs,feverShift,setShift,mh,dantE,nmb,depth}` | thermal state and inputs | — | CON-R | IN/MOD | 3, 7e |
| `ev.endo.{shivering,sweating,vasoconstricted,tempPeriphC}` | thermoregulatory effectors | — | ENDO (instructor) / CON-R | MOD | 7e |
| `endo.cascade.{stage,shiverLevel,coagF,clearanceF,macF,hrF}` | hypothermia cascade (incl. a **coagulation placeholder** `coagF`, −10 %/°C below 35) | × | CON-R | MOD | 7e |

### 2.8 Brain (Stage 7d)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `ev.organs.brain.icp`, `.cpp`, `.mapHead` | ICP, **cerebral** perfusion pressure, MAP at head level | mmHg | TILE ICP (with sensor), CON-R | MOD | 7d |
| `.cbf`, `.cbvMl`, `.cmro2`, `.elastance` | CBF (relative to 50 mL/100 g/min), cerebral blood volume, CMRO2 (relative), intracranial elastance | ×, mL, ×, mmHg/mL | CON-R | MOD | 7d |
| `.pbto2`, `.sjvo2` | brain tissue PO2, jugular bulb saturation | mmHg, fraction | TILE PbtO2 / CON-R | MOD | 7d |
| `.state`, `.cushing`, `organs.brain.{herniated,cush.*}` | normal / raised ICP / Cushing / herniated; Cushing drive | — | CON-R | MOD | 7d |
| `organs.brain.{mass,massRate,oedema,headUpDeg,csfDisp}` | haematoma volume and growth, oedema, head-up angle, CSF displaced | mL, mL/min, °, mL | CON-R | IN/MOD | 7d |
| `ev.anaesthesia.outputs.pupilMm` | pupil diameter | mm | CON-R | MOD | 7f |
| **absent** | GCS, pupil reactivity/asymmetry, seizures as a clinical state (bus `cns.seizure` flag only), EEG waveform, SSEP/MEP, NIRS rSO2 | — | — | — | — |

### 2.9 Kidney (Stage 7d)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `ev.organs.kidney.{rbf,gfr,gfrRel}` | renal blood flow, GFR | mL/min | CON-R | MOD | 7d |
| `.{uopMlKgH,uop1hMlKgH,cumMl,bagMl,bladderMl}` | urine output (instant, 1 h), cumulative, urometer bag, bladder volume | mL/kg/h, mL | TILE UO (mL/h) / CON-R | MOD | 7d |
| `.oliguria`, `.akiStage` | oliguria flag, KDIGO stage (UO criterion only) | bool, 0–3 | CON-R | MOD | 7d |
| `organs.iap` | intra-abdominal pressure | mmHg | CON-C | IN | 7d |
| `organs.renal.{ang,pgc,vNh,furoE,furoPlasma,mannitolG,timeScale}` | angiotensin drive, glomerular capillary pressure, natriuresis, diuretic state | — | CON-R | MOD | 7d |
| **absent** | serum creatinine, urea, urine Na/osm, FeNa, creatinine clearance, KDIGO creatinine criterion, dialysis/CRRT | — | — | — | — |

### 2.10 Liver and metabolism (Stage 7d, 7e)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `ev.organs.liver.{hbfRel,kLacPerH,lactate,liverFn,tempF,inr}` | hepatic blood flow (relative), lactate clearance constant, lactate, liver-function index, temperature factor, **INR placeholder** (`1 + 2·failure`, used by no model) | ×, /h, mmol/L, —, —, — | CON-R | MOD | 7d |
| `organs.liver.{failure,glucoseF}` | hepatic failure severity; hepatic glucose output factor | — | CON-R | IN/MOD | 7d, 7e |
| `ev.endo.{glucoseMgDl,glucoseMmolL,insulinUuMl}` | blood glucose, insulin | mg/dL, mmol/L, µU/mL | ENDO "GLU … mmol/L (… mg/dL)"; LAB glucose / CON-R | MOD | 7e |
| **absent** | bilirubin, transaminases, ammonia, albumin synthesis over time, drug hepatic clearance tied to `liverFn` beyond 7g's HBF term | — | — | — | — |

### 2.11 Endocrine and stress (Stage 7e)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `ev.endo.{epinephrinePgMl,norepinephrinePgMl,cortisolNmolL,stressIndex,mhActivity}` | plasma adrenaline, noradrenaline, cortisol; stress index; MH activity | pg/mL, nmol/L, — | ENDO (instructor: stress, epi, cortisol, MH) / CON-R | MOD | 7e |
| `endo.core.cond.{sepsis,sirs,anaph,hypermet,storm}.{cur,target}`, `cond.vasoResp` | condition severities and catecholamine responsiveness | — | CON-R | IN/MOD | 7e |
| `endo.core.glucose.*`, `endo.core.hormones.*` | glucose/insulin model, hormone states | — | CON-R | MOD | 7e |
| profile `endo {diabetes, thyroid, adrenalInsufficiency}` | endocrine comorbidity | — | IN (engine API only; **not in `pme-scenario/1`**) | IN | 7e |

### 2.12 Neuromuscular block, depth, drive (Stage 7f)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `ev.anaesthesia.{di,sr,mac,macBrain,macEff,etPct.*}` | depth index, suppression ratio, MAC (end-tidal / brain / opioid-adjusted), end-tidal % per agent | —, %, MAC, % | TILE BFA (DI, SR) / CON-R | MOD | 7f |
| `ev.anaesthesia.tof.{count,ratio,ptc,t1}`, `ev.tof.*` | TOF count, ratio, PTC, T1 height; last train | —, fraction, —, fraction | TILE NMT / CON-R | MOD | 7f |
| `ev.anaesthesia.block.{thumb,dia}` | fractional block at adductor pollicis and diaphragm | fraction | CON-R | MOD | 7f |
| `ev.anaesthesia.{conscious,awarenessRisk,movement,stress}`, `outputs.{antinoc,nmb,cmro2Mult,mapSetShiftMmHg,thermoDepth,pupilMm}` | consciousness, awareness risk, movement, antinociception, set-point shift | — | CON-R | MOD | 7f |
| `ev.neuroMark.kind` | fasciculation, movement, awareness, emergence, LOC, apnoea, breathing, recurarisation, MH trigger | — | EV / CON-R | MOD | 7f |
| `neuro.profile.{nm,mgMmolL,mhSusceptible}` | NM profile (normal, myasthenia, Lambert–Eaton, burn, denervation), Mg, MH susceptibility | — | CON-R | IN | 7f |

### 2.13 Drugs (Stage 7g; 58 library rows)

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `ev.drugs.drugs.<id>.{cp,ce,rate,rateUnit,tci,totalAmount,decrement50Min}` | plasma and effect-site concentration, pump rate, TCI target, total given, context-sensitive 50 % decrement time | drug unit | DRUG / CON-R | MOD | 7g |
| `ev.drugs.volatile.{agent,dialPct,fgfLpm,fi,fa,brain,macAge,macFrac,n2oFrac}`, `macTotal` | vaporiser dial, FGF, inspired/alveolar fraction, brain partial pressure, age-adjusted MAC, MAC fraction, N2O | %, L/min | DRUG / CON-R | IN/MOD | 7g |
| `pk.bus.agents.<id>.{plasma,brain,vent,nmj,dia,cumulativeMgPerKg,sgxBoundFrac}` | concentrations at each effect site | drug unit | CON-R | MOD | 7g |
| `pk.bus.{cns.*,airway.*,antagonist.*,avNodeBlock,hpvInhibit,metabolic.*}` | class-level effects published to other stages | — | CON-R | MOD | 7g |
| library classes (7g rows) | hypnotics (propofol, etomidate, thiopental, ketamine, midazolam, dexmedetomidine), opioids (fentanyl, morphine, remifentanil, sufentanil), volatiles + N2O, NMBs (rocuronium, vecuronium, cisatracurium, succinylcholine), reversal (neostigmine, sugammadex, glycopyrrolate, atropine, naloxone, flumazenil), vasoactives (adrenaline, noradrenaline, phenylephrine, ephedrine, dopamine, dobutamine, vasopressin, milrinone), β-blockers (esmolol, labetalol, metoprolol), vasodilators (GTN, hydralazine), amiodarone, adenosine, lidocaine/bupivacaine/ropivacaine, lipid emulsion, electrolytes (Ca chloride/gluconate, Mg, bicarbonate), insulin/dextrose, furosemide, mannitol, hypertonic saline, dantrolene, salbutamol; **placeholders with no PD**: dexamethasone, ondansetron, tranexamic acid | — | — | IN | 7g |
| **absent** | heparin, protamine, fibrinogen concentrate, PCC, cryoprecipitate, desmopressin, oxytocin/carbetocin, ergometrine, carboprost, terbutaline/nifedipine/atosiban, hydrocortisone, calcium-channel blockers, nitroprusside, digoxin, antibiotics (anaphylaxis triggers), paracetamol/NSAIDs | — | — | — | — |

### 2.14 Devices

| engine key | quantity | unit | surfaced | owner | stage |
|---|---|---|---|---|---|
| `dev.defib.{energyJ,state,sync,syncArmed,shocks,readyAt,preselect}` | defibrillator | J | DEV header / CON-R | DEV | 4b |
| `dev.pacer.{mode,ratePpm,mA,paused,fault}`, `mods.tcp.*`, `ev.state.values.paceThresholdMa` | transcutaneous pacer; capture threshold | ppm, mA | DEV header / CON-R | DEV/MAN | 4b |
| implanted pacing rhythms `pacedAAI/VVI/DDD` + `PacerOpts` | lower rate, AV delay, faults | ppm, ms | ECG | MAN | 5 |
| `hemo.cpr.{active,rate,quality}` | CPR (rate, quality 0–1.2, 30:2 or continuous) | /min | CON-R | IN | 2, 3.1 |
| `hemo.iabp.*`, `hemo.iabpAug` | IABP ratio, timing offsets, balloon volume, augmentation | ms, mL, mmHg | CON-R | DEV | 7a |
| `hemo.lvad.*` | LVAD speed, flow, pulsatility index, power, suction | rpm, L/min, —, W | CON-R | DEV | 7a |
| `hemo.lines`, `attachSensor` | line states (zero, flush, damp, level, wedge, disconnect), sensor sites | — | monitor behaviour | DEV | 2 |
| **absent** | ICD, ECMO (VA/VV), CRRT, TEG/ROTEM analyser, PFT/spirometer, CTG, NIRS, cardiac-output monitor (thermodilution/pulse contour) | — | — | — | — |

### 2.15 Patient profile, conditions and interventions (inputs)

| input | values | stage |
|---|---|---|
| `PatientProfile` | ageY, sex, weightKg, heightCm, baseline StateVars, rhythm, sensors, `blood` (hb, na, k, cl, iCa, mg, lactate, albumin, hco3, dpg, cohb, methb, burns), `endo` (diabetes, thyroid, adrenal), `neuro` (nm, cholinesterase, MH, Mg), `conditions` (7a: hfref, hfpef, htn, as, ar, mr, ms, tr, cad, betaBlocked, rvFailure, ph; 7d: tbi, hepaticFailure, aki), `lungConditions` (32 ids incl. pregnancy) | 2–7f |
| circulation events (7a) | condition tamponade / pe / tensionPtx / rvInfarct (severity); fluid; bleed; drug (5 legacy ids) | 7a |
| lung events (7b) | `lungCondition` (32 ids: ph, bronchospasm, asthma, anaphylaxis, copd, ards, ild, ssc, chestWall, obesity, pneumonia, atelectasis, pulmOedema, effusion, ptxSimple, ptxTension, haemothorax, pe, fatEmbolism, vae, aspiration, olv, endobronchial, bpf, airwayObstruction, cf, nmWeakness, diaphragmParalysis, pregnancy, neonatalRds, covidPneumonitis, smokeInhalation), `mainstem`, `recruit` | 7b |
| respiratory events (3) | airway state (patent, obstructed, apnoea, disconnected, oesophageal, endobronchial, bronchospasm), ventilation source (spontaneous, BVM, ventilator, none; rr, vt, fio2, peep, ie, fico2, effort), preoxygenate, condition `mh`, `thermal` (anaesthesia none/general/neuraxial, warming, ambient) | 3 |
| blood events (7c) | fluid (saline, RL, balanced, albumin 5 %, gelatin, D5W, glycine), bleed, transfusion (RBC, FFP, platelets, whole blood; storage days, warmed), metabolic (ketoacids, acid load), condition burns / dka, lab | 7c |
| endocrine events (7e) | stimulus (0–2), condition sepsis (phases) / anaphylaxis / sirs / hypermetabolic / thyroidStorm, meal, thermal7e (exposure, air speed, fluid warmer, HME) | 7e |
| organ events (7d) | brain (mass, growth, oedema), position (head-up °), renal (catheter, bag, KDIGO time scale, IAP), condition tbi / hepaticFailure / aki | 7d |
| neuro events (7f) | airwayDevice (none, ETT, SGA), neuroProfile; TOF and depth devices | 7f |
| PK events (7g) | drug (bolus/infusion), infusion (pump), tci (plasma/effect), vaporiser | 7g |
| device events | defib, pacer, IABP, LVAD, NIBP, alarm, monitor skin/age band, ECG lead/filter, line events, CPR | 2, 4b, 7a |
| controller | `setFactor` hrFactor / svrFactor / contractilityFactor / vo2Factor / vco2Factor; scenario state machine (`pme-scenario/1`) | 6a, 6b |
| **absent inputs** | pregnancy weeks as a profile field, patient position other than head-up (lateral, prone, lithotomy, Trendelenburg, left tilt), neuraxial block level, surgical stimulus types beyond one intensity, pneumoperitoneum as a surgical event (IAP exists), cross-clamp, cement/fat embolism timing, laryngospasm condition, ECMO/CPB | — |

---

## 3. Gap table against Ali's list (R54–R59)

**P** = present (a clinical display shows it), **I** = internal-only (truth/console/event/code, no clinical display),
**M** = missing (no code computes it). "Derivable" means one line from existing internals. The **owner** column names
the stage the revised order (R54–R59) gives it: **7k** respiratory mechanics (R57, after FU-6), **7i** blood chemistry
and coagulation (R58), **7j** obstetric (R59), **S9** clinical UI and naming (R55/R56), **7h** devices (v1.1).

### A. Respiratory mechanics and lung volumes (Ali's 24 items; R57)

| # | item | status | where it is / what is missing | owner |
|---|---|---|---|---|
| A1 | Ppeak (peak inspiratory pressure) | **P** | VENT tile "Ppeak" (`Measured.PIP`), but **only on the ventilator-link page**. The engine's own VCV has no Ppeak leaf, only the instantaneous `resp.lung.mech.paw`. Audit 09 had to sample it at 10 Hz | 7k |
| A2 | Pplat (plateau pressure) | I | `resp.lung.pInsp` ("End-inspiratory alveolar pressure"); `Measured.PLAT` (insp hold) is measured but only feeds the Cstat text; `measure.ts` pplat is code-only | 7k |
| A3 | PEEP (set) | **P** | VENT bar "PEEP"; `resp.driver.vent.peep` | — |
| A4 | auto-PEEP (PEEPi) / total PEEP | I | `resp.lung.peepTot` ("Total PEEP"), `ev.lungState.autoPeepCmH2O`; ventilator `Measured.autoPEEP` raises the `intrinsicPeep` alarm only | 7k |
| A5 | driving pressure ΔP | I | `measure.ts` `drivingP` (reference runs only); derivable = Pplat − PEEPtot | 7k |
| A6 | transpulmonary pressure PL (with an oesophageal-pressure estimate) | I | pleural pressure `hemo.circOut.pIt` (mmHg) and transmission `lp.tIt` exist; the Venegas curve computes PL internally; there is no PL value and no Pes estimate | 7k |
| A7 | static compliance Cstat | **P** | VENT lung canvas "Cstat" = VTE/(PLAT − PEEP); the engine's `complianceMlPerCmH2O` is a model parameter, not a measurement | 7k |
| A8 | dynamic compliance Cdyn | M | derivable VT/(Ppeak − PEEPtot) | 7k |
| A9 | airway resistance (Raw, Rinsp/Rexp) | **P** | VENT canvas "Raw" shows the configured (link-updated) value; engine `resistanceCmH2OPerLps`, `resistanceExpCmH2OPerLps` internal | 7k |
| A10 | VD anatomical | I | `resp.pat.deadSpaceMl` (2.2 mL/kg IBW); the ETT does not replace it (audit 09 R1) | FU-4 G11 / 7k |
| A11 | VD alveolar | I | `lp.side.#.vdAlv` (fraction of alveolar ventilation), no mL value | 7k |
| A12 | VD physiological | I | `ev.lungState.deadSpaceMl` = anatomical + apparatus + **the t = 0 calibration `vdExtraMl`** (not physiology) | FU-4 G11 / 7k |
| A13 | VD/VT (Bohr/Enghoff) | M | derivable from A12/VT, or properly (Enghoff) from PaCO2 and mixed-expired PECO2, which the capnogram model does not compute | 7k |
| A14 | FRC | I | `resp.pat.frcMl`, `frcGaMl`, `ev.lungState.frcMl`; set by the hidden `thermal` switch (audit 09 R4) | FU-6 / 7k |
| A15 | ERV | M | derivable FRC − RV | 7k |
| A16 | RV (residual volume) | I | constant `RV_ML_KG = 16` (the unit P–V range); no disease effect (COPD air trapping, obesity) | 7k |
| A17 | TLC | I | constant `TLC_ML_KG = 80`; no restriction effect (ILD, chest wall, obesity, pregnancy) | 7k |
| A18 | VC | M | derivable TLC − RV once A16/A17 are per-patient states | 7k |
| A19 | IC | M | derivable TLC − FRC | 7k |
| A20 | FEV1 | M | needs a forced-expiration model (effort-independent flow limitation; the ventilator port has an `efl` expiratory-flow-limitation option with `pcrit`, not used by the engine) | 7k / 7h PFT |
| A21 | FVC | M | as A20 | 7k / 7h |
| A22 | FEV1/FVC | M | as A20; obstruction < 0.7 (or < LLN) vs restriction (TLC < 80 % predicted) | 7k / 7h |
| A23 | PEF | M | as A20 | 7k / 7h |
| A24 | closing capacity | M | the tables §1.1 note (CC > FRC supine from ≈ 44 y) is not coded; needed for age/obesity/pregnancy atelectasis and desaturation | 7k |

**Count A: P 4 · I 10 · M 10 (24).** Only A1, A3, A7 and A9 reach a clinical screen, and all four do so only on the
ventilator-link page.

### A′. Mechanics extras the list implies

| # | item | status | note | owner |
|---|---|---|---|---|
| A′1 | P0.1 (occlusion pressure) | **P** | VENT tile in spontaneous modes | — |
| A′2 | Pmean (mean airway pressure) | **P** | VENT tile | — |
| A′3 | VTe, MVe, fTotal | **P** | VENT tiles; engine `ev.breath.vtMl`, `resp.spont.ve` internal | — |
| A′4 | RSBI (f/VT) | **P** | VENT bar "RSB" | — |
| A′5 | inspiratory/expiratory hold manoeuvres | **P** | ventilator `hold` (insp/exp) | — |
| A′6 | Pmus / work of breathing | **P** | VENT Pmus trace option (`showPmus`); engine effort only | — |
| A′7 | expiratory time constant RCexp (τE) | I | `resp.lung.tauBar` | 7k |
| A′8 | shunt fraction Qs/Qt | I | `resp.shunt`, `lungs.#.shunt` | S9 |
| A′9 | lung vs chest-wall compliance (CL, Ccw) | I | `lp.side.#.cL`, `lp.ccw` | 7k |
| A′10 | expiratory flow limitation (dynamic airway collapse) | I | ventilator `efl/pcrit` model only | 7k |
| A′11 | Paw and flow waveforms/tiles on the **monitor** (anaesthesia-workstation style; research/05 names `awp`/`awf` lanes) | M | — | S9 |
| A′12 | oesophageal manometry channel (Pes) | M | R57 asks for an estimate | 7k |
| A′13 | P–V and flow–volume loops | M | the ventilator draws Paw/Flow/Volume against time only | 7k / 7h |

**Count A′: P 6 · I 4 · M 3 (13).**

### B. Labs and coagulation (R58)

| # | item | status | where / note | owner |
|---|---|---|---|---|
| B1–B16 | pH, PCO2, PO2, HCO3, BE, SO2, COHb, MetHb, lactate, Na, K, Cl, iCa, Hb, glucose, AG | **P** (16) | LAB rows with reference flags; values from `labPanel()` | — |
| B17 | Mg | I | in `LabPanel` and the event, **not drawn** by `lab-panel.ts` | S9 |
| B18 | osmolality | I | as B17 | S9 |
| B19 | VBG | **P** | `panel:'vbg'` = **mixed venous** (PvCO2 = PaCO2 + VCO2/(Q·4.5); PvO2 from SvO2) | — |
| B20 | SvO2 | **P** | as the VBG SO2 (`blood.core.o2.svo2`) | — |
| B21 | ScvO2 | M | no central-venous sample distinct from mixed venous (normal ScvO2 ≈ SvO2 + 2–5 %, reverses in shock) | 7i |
| B22 | peripheral venous gas | M | the only VBG is mixed venous | 7i |
| B23 | P/F ratio | M | derivable PaO2/FiO2 | 7i / S9 |
| B24 | A–a gradient (PAO2 by the alveolar gas equation) | M | derivable | 7i / S9 |
| B25 | report context: FiO2, patient temperature (α-stat vs pH-stat), sample site, time drawn | M | `drawnAt` exists; the rest does not | 7i |
| B26 | Hct | M | derivable (Hb × ≈ 3, or from `fl.vp` and red-cell volume) | 7i |
| B27 | WBC | M | — | 7i |
| B28 | platelet count | M | platelets exist only as a transfused **volume** | 7i |
| B29 | urea / BUN | M | — | 7i |
| B30 | creatinine | M | GFR exists (`ev.organs.kidney.gfr`); no creatinine kinetics, so KDIGO uses only the UO criterion | 7i |
| B31 | albumin | I | `blood.out.albuminGL` | 7i / S9 |
| B32 | phosphate | I | constant `NORMAL.piMmolL` in the Stewart solver | 7i |
| B33 | colloid osmotic pressure | I | `blood.out.cop` | S9 |
| B34 | ketones (β-hydroxybutyrate) | I | `blood.keto` (hidden) | 7i |
| B35 | troponin | M | the coronary model has `kIsch`/ischaemic time to drive it | 7i |
| B36 | BNP / NT-proBNP | M | LVEDP/wall stress exist to drive it | 7i |
| B37 | bilirubin | M | — | 7i |
| B38 | AST / ALT | M | `liverFn` exists to drive it | 7i |
| B39 | ALP / GGT | M | — | 7i |
| B40 | ammonia | M | — | 7i |
| B41 | PT / INR | I | `ev.organs.liver.inr` = 1 + 2·failure, **a placeholder read by no model** (no dilution, temperature, factor effect) | 7i |
| B42 | aPTT | M | heparin is not in the drug library | 7i |
| B43 | fibrinogen (Clauss) | M | — | 7i |
| B44 | ACT | M | — | 7i |
| B45 | D-dimer | M | — | 7i |
| B46 | anti-Xa | M | — | 7i |
| B47 | coagulation modifiers (temperature, acidosis, iCa, dilution) | I | only `endo.cascade.coagF` (temperature, −10 %/°C below 35 °C, read by nothing) | 7i |
| B48–B52 | TEG: R, K, α-angle, MA, LY30 | M (5) | — | 7i |
| B53–B57 | ROTEM: CT, CFT, A10, MCF, ML (ML/LI30) | M (5) | — | 7i |
| B58 | assay channels: TEG kaolin/rapid/heparinase/functional fibrinogen; ROTEM EXTEM/INTEM/FIBTEM/HEPTEM/APTEM | M | — | 7i |

**Count B: P 18 · I 8 · M 32 (58).**

### C. Pregnancy (R59)

| # | item | status | where / note | owner |
|---|---|---|---|---|
| C0 | pregnancy selectable on the patient | **P** | `lungConditions: [{id:'pregnancy', severity}]` in the engine profile and `pme-scenario/1` | — |
| C1 | gestational age / trimester input | I | only as the lung severity grades (T1 0.33, T2 0.67, term 1); the tables' `pregnancyWeeks` field is not in `PatientProfile` | 7j |
| C2 | CO +40 % | M | the `pregnancy` condition is lung mechanics only (audit 09 R10) | 7j |
| C3 | HR +15 | M | — | 7j |
| C4 | SVR −25–30 % (BP nadir mid-pregnancy) | M | — | 7j |
| C5 | blood/plasma volume +45 % | M | — | 7j |
| C6 | dilutional anaemia (Hb 11.5–12) | M | settable by hand (`blood.hb`), not linked to pregnancy | 7j |
| C7 | lower COP (oedema threshold) | M | — | 7j |
| C8 | PaCO2 30–32 (progesterone; MV +40–50 %) | M | the lung row's own pitfall text says EtCO2 40 is hypoventilation, but the drive set point stays 40 (audit 09: PaCO2 41.7) | 7j |
| C9 | compensatory HCO3 18–22 | M | — | 7j |
| C10 | ODC right shift (P50 ↑) | M | — | 7j |
| C11 | FRC −20 % | I | lung row `frc` ×0.8 at term | — |
| C12 | chest-wall compliance ×0.7 (Crs ×0.85) | I | lung row | — |
| C13 | airway resistance ×1.2 (mucosal oedema) | I | lung row | — |
| C14 | PVR ×0.8 | I | lung row | — |
| C15 | induction atelectasis ↑ | I | lung row `atel` +0.03 | — |
| C16 | VO2 +20–30 % | M | apnoea to SpO2 90 % 5.6 min with GA (expected ≈ 3–4; audit 09 B4) | 7j |
| C17 | closing capacity > FRC supine | M | see A24 | 7k/7j |
| C18 | aortocaval compression by position (supine vs left tilt) | M | the only `position` input is head-up degrees | 7j |
| C19 | MAC reduction (−25–40 %) | M | — | 7j |
| C20 | hypercoagulability (fibrinogen 4–6 g/L, factors ↑) | M | no coagulation model (B) | 7i/7j |
| C21 | airway difficulty and aspiration risk | I | generic `aspiration` lung condition exists; no difficult-airway state | 7j |
| C22 | uterine blood flow (pressure-passive, no autoregulation) | M | — | 7j |
| C23 | fetal heart rate baseline | M | — | 7j |
| C24 | FHR variability and decelerations tied to maternal MAP, SaO2 and uterine tone | M | — | 7j |
| C25 | uterine tone / contractions (tocodynamometry) | M | — | 7j |
| C26 | CTG as a device (FHR + toco traces, paper speed 1 or 3 cm/min) | M | — | 7j / 7h |
| C27 | uterotonics: oxytocin, carbetocin, ergometrine, carboprost (their haemodynamics: oxytocin hypotension/tachycardia, ergometrine hypertension, carboprost bronchospasm) | M | none in the 7g library | 7j |
| C28 | tocolytics and magnesium (terbutaline, nifedipine, atosiban; MgSO4 seizure prophylaxis, toxicity: reflexes, respiratory depression, NMB potentiation) | M | MgSO4 exists (7g/7c: NMB potentiation, torsades), no obstetric effect or toxicity levels | 7j |
| C29 | pre-eclampsia / eclampsia / HELLP | M | — | 7j |
| C30 | PPH from uterine atony (bleed responding to uterotonics) | M | generic `bleed` only | 7j |
| C31 | amniotic fluid embolism | M | — | 7j |
| C32 | neuraxial block (level, sympathectomy, Bezold–Jarisch, high spinal) | M | `thermal.anaesthesia:'neuraxial'` changes thermoregulation only (audit 08 C3) | 7j (and FU for non-obstetric neuraxial) |
| C33 | caesarean sequence (delivery, placental autotransfusion 300–500 mL, uterine exteriorisation) | M | — | 7j |
| C34 | pregnancy reference ranges on the lab panel (Hb, platelets, fibrinogen, creatinine, HCO3, PaCO2) | M | — | 7j/7i |

**Count C: P 1 · I 7 · M 27 (35).**

### D. Other capabilities the list implies

| # | item | status | where / note | owner |
|---|---|---|---|---|
| D1 | lab turnaround time | **P** | ABG/VBG `turnaroundS` 30–3600 s (default 120 s); `labResult` carries `drawnAt` | — |
| D2 | per-test turnaround (POC ≈ 1–2 min; central lab 30–60 min; TEG/ROTEM curve growing live over 10–30 min) | M | — | 7i |
| D3 | PFT / spirometry device (flow–volume loop, FEV1/FVC, DLCO optional) | M | R57 names it as 7h | 7h |
| D4 | cardiac-output monitor on the monitor (CO/CI, SV/SVI, SVR/SVRI; thermodilution or pulse contour) | I | CO/SV/SVR in the `circ` event only | S9 / 7h |
| D5 | continuous SvO2 / ScvO2 oximetry numeric | I | `blood.core.o2.svo2` | S9 |
| D6 | PPV / SVV numeric | M | the saadat-like skin declares the "PPV" extra; nothing computes it (R45(b)'s PPV > 13 % criterion is computed inside tests only) | S9 / FU-5 |
| D7 | T2 and ΔT display | I | `mon.tempSite` computed; extras "T2"/"DT" declared, not drawn | FU-5 |
| D8 | FiCO2 display | I | `mon.imco2` computed; the "FiCO2" extra is not drawn | FU-5 |
| D9 | agent gas tile (Et/Fi agent, MAC, N2O, O2) | I | `mon.etAa`, `mon.mac`, 7g `fi/fa` exist; no AGENTS tile although the colour key exists | S9 |
| D10 | FiO2/EtO2 gas numerics | M | FiO2 is a setting; no inspired/expired O2 measurement | S9 |
| D11 | Paw/flow on the monitor | M | = A′11 | S9 |
| D12 | NIRS cerebral oximetry (rSO2) | M | `sjvo2`/`cbf` exist to drive it | 7h |
| D13 | neuro exam panel: pupils (size/reactivity), GCS/sedation score | I | `outputs.pupilMm` only | S9 |
| D14 | ECMO (VA/VV) | M | tables §8.5 rows | 7h |
| D15 | ICD | M | tables §8.3 rows | 7h |
| D16 | CRRT / dialysis | M | — | 7h |
| D17 | positioning: lateral, prone, Trendelenburg, reverse Trendelenburg, lithotomy, beach-chair, left tilt | M | only head-up degrees (brain/ICP) | FU-7+ |
| D18 | laryngospasm as a condition | M | proxied by `obstructed` (audit 09 E2) | FU-6 |
| D19 | surgical stimulus classes (incision, traction, sternotomy, pneumoperitoneum, tourniquet, cross-clamp, cement) | I | one `stimulus` intensity 0–2; IAP exists as a kidney input | FU-7+ |

**Count D: P 1 · I 7 · M 11 (19).**

### Gap totals

| group | P | I | M | total |
|---|---|---|---|---|
| A mechanics & volumes | 4 | 10 | 10 | 24 |
| A′ mechanics extras | 6 | 4 | 3 | 13 |
| B labs & coagulation | 18 | 8 | 32 | 58 |
| C pregnancy | 1 | 7 | 27 | 35 |
| D other implied | 1 | 7 | 11 | 19 |
| **total** | **30** | **36** | **83** | **149** |

---

## 4. Findings made while taking the inventory

These are side observations, not audit verdicts. Each is small and belongs to the stage named.

1. **Two clinical collisions in engine keys.**
   - `mon.cpp` is **cerebral** perfusion pressure (MAP at head level − ICP). `ev.circ.cpp` is **coronary** perfusion
     pressure (aortic diastolic − LVEDP, last beat). Only the console's curated label keeps them apart. The glossary
     fixes the labels: CPP is cerebral (the monitor/neurocritical-care convention), and the coronary one is CoPP. The
     keys can stay. (S9)
   - `ev.circ.lvad.pi` is the LVAD **pulsatility index**, while `mon.pi` is the SpO2 **perfusion
     index**. Label the LVAD one "PI (LVAD)" or "PuI". (S9)
2. **The lab panel hides two values the engine reports.** `LabPanel` carries Mg and osmolality, but `lab-panel.ts`
   draws 16 rows without them. Its "SO2" is **fractional** (`100·S·(1 − COHb − MetHb)`), which a co-oximeter labels
   FO2Hb. A resident reads "SO2" as functional sO2/SaO2. (S9/7i)
3. **The VBG is mixed venous, not peripheral.** Its SO2 is SvO2. That suits PA-catheter teaching but is not the
   ward VBG (peripheral venous) or the ScvO2 of sepsis bundles. (7i)
4. **The scenario schema cannot express parts of the engine profile.** `ScenarioProfile` passes `conditions` and
   `lungConditions`, and the patient passes `blood`/`neuro`, but there is **no `endo`** block (diabetes type 1/2,
   hypo/hyperthyroid, adrenal insufficiency). A diabetic or hypothyroid comorbidity profile can therefore not be
   authored as a scenario, and neither can `pregnancyWeeks`. This blocks the comorbidity audit runs in
   `12-coverage-matrix.md` unless they use the engine API directly. (6b follow-up or 7j)
5. **The "anaesthetised" state disagrees between modules in one run.** Propofol + sevoflurane + rocuronium, no
   `thermal` event: `organs.view.anaesthesia = "general"` (7d derives it from drugs), while
   `resp.temp.anaesthesia = "none"` and `resp.lung.frcGaMl = 2100` = the awake FRC (the lung/thermal modules wait
   for the hidden switch). This is audit 09's R4, seen directly in the dump. (FU-6)
6. **The oliguria flag fires 150 s into a healthy run.** `ev.organs.kidney.oliguria` is the rolling-60-min UOP
   < 0.5 mL/kg/h, and at 150 s the window holds 2.5 min of data (UOP under GA 0.44 mL/kg/h). The UO tile's
   "OLIGURIA" status reads the same number. KDIGO oliguria needs ≥ 6 h (or the teaching time-scale). Gate the flag on
   a full window. (FU-5 or 7d follow-up)
7. **Skin tile extras declared but never computed:** PPV (IBP1), T2 and DT (TEMP), BS%, SQI and EMG (BFA), PACE, ST
   and PVCs (HR), FiCO2 (CO2 on saadat-like). Audit 10 M11 lists part of this. Only PR, MEAN, EtCO2/AWRR, TOF/PTC and
   SR are drawn. (FU-5)
8. **Computed monitor numerics with no tile:** `mac` and `etAa` (no AGENTS tile, although `AGENTS` is a colour key),
   `imco2`, `tempSite`, `qtc`. (S9)
9. **The liver's INR is a placeholder** (`1 + 2·failure`) and nothing reads it. The temperature cascade's `coagF`
   placeholder is also read by nothing. FFP/platelet transfusions carry volume, Na and citrate but no clotting factor
   and no platelets. Stage 7i starts from zero on coagulation. (7i)
10. **Unit mislabels:** `lp.pPtx` is mmHg but shown as cmH₂O (known, FU-4 housekeeping). The RR tile unit is "rpm"
    (GE/Mindray use rpm; Philips uses "rpm" or "/min", so it is acceptable per skin). CaO2 is carried in **mL/L**
    (207.6), while clinicians read mL/dL (20.8). `ev.circ.ef` is a fraction (the console scales it). `resp.o2.sa` and
    `blood.core.o2.svo2` are fractions, and the console scales only the first. (S9)
11. **The calibration dead space is visible as if it were physiology** (`resp.co2.vdExtraMl` 60.6 mL). It should
    leave truth once FU-4 G11 removes the MODELED calibration. (FU-4)
12. **Surfaced inputs with no clinical meaning:** the MANUAL variables `contractility` and `volumeStatus` and the
    controller factors appear under "Controls" with raw names. They need instructor labels ("Contractility (×
    baseline)", "Volume status (× baseline)") rather than clinical abbreviations. (S9)

---

## 5. Glossary (R56): engine key → clinical label

**How to use it.** The **Label** column is what every UI shows (monitor tile, console row, lab panel, ventilator
panel, docs, scenario editor). The **Name** column is the tooltip/long form. Skins may swap a label for its listed
**vendor alias**, and for nothing else. Normal ranges are **adult, at rest, sea level** unless marked. **Child** (4 y
unless stated) and **Preg** (term) columns give only the values that differ. Ranges are textbook-level teaching
values, not calibration bands: the engine's evidence bands stay in the parameter tables.

**Convention sources** (short keys): **Phil** = Philips IntelliVue (research/01 §IntelliVue list, research/05 [S1]);
**GE** = GE CARESCAPE; **Mr** = Mindray BeneVision; **Dr** = Dräger Infinity; **NK** = Nihon Kohden; **Sa** = Saadat
Alborz B9 (research/06); **Ham** = Hamilton ventilators (the `@pme/ventilator` port); **Miller**, **Barash**, **West**
(*Respiratory Physiology*), **Nunn**; **ATS/ERS** (2005/2022 spirometry and lung-volume standards); **KDIGO** 2012;
**BTF** (Brain Trauma Foundation 4th ed.); **ARDSnet**; **ATLS**; **Werfen** (ROTEM) and **Haemonetics** (TEG)
manufacturer ranges. GE/Mr/Dr/NK labels come from general vendor usage and were not re-checked against manuals in this
pass. They are marked "(usage)", and research/05's vendor study (R55) should confirm them.

**Flag** = the current label: **✗** a resident would not recognise it (raw engine key, engine jargon, wrong or missing
unit, or a ward meaning that differs); **~** recognisable but non-standard, ambiguous or incomplete; **✓** already
conventional; **new** = no current label (planned by R57/R58/R59 or a gap in §3).

### 5.1 Monitor numerics and tiles

| # | engine key | Label | Name | Unit | Adult normal | Child / Preg | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `mon.hr` | HR | Heart rate (ECG) | bpm | 60–100 | child 80–120; neonate 100–160 / Preg +10–20 | all vendors | HR | ✓ |
| 2 | `mon.pr` | PR | Pulse rate (from SpO2 or ART; name the source) | bpm | = HR (pulse deficit in AF) | as HR | GE/Mr/Sa "PR"; Phil "Pulse" | PR | ✓ |
| 3 | `mon.spo2` | SpO₂ | Peripheral O2 saturation (pulse oximetry) | % | 95–100 | neonate pre-ductal ≥ 90 after 10 min | all | SpO₂ | ✓ |
| 4 | `mon.pi` | PI | Perfusion index (pulsatile/non-pulsatile IR absorbance) | % | typical 1–10 (device range 0.02–20) | — | Masimo/Mr/Sa "PI"; Phil "Perf" | PI | ✓ |
| 5 | `mon.abpSys` | ART S | Invasive arterial pressure, systolic | mmHg | 90–140 | child 90–110 / Preg −5–10 mid-gestation | GE/Mr/Dr/NK/Sa "ART"; Phil "ABP" | ABP sys (console); tile "ART"/"IBP1" | ~ |
| 6 | `mon.abpDia` | ART D | Invasive arterial pressure, diastolic | mmHg | 60–90 | child 55–70 | as 5 | ABP dia | ~ |
| 7 | `mon.abpMean` | ART M (MAP) | Mean arterial pressure (invasive) | mmHg | 70–105 | child 60–75 / Preg 75–90 | as 5; "MAP" in textbooks | ABP mean | ~ |
| 8 | `mon.cvpMean` | CVP | Central venous pressure (mean) | mmHg | 2–8 (spontaneous) | — | all | CVP | ✓ |
| 9 | `mon.papSys` | PAP S | Pulmonary artery pressure, systolic | mmHg | 15–30 | — | Phil "PAP"; GE/Mr "PA" (usage) | PAP sys | ✓ |
| 10 | `mon.papDia` | PAP D | Pulmonary artery pressure, diastolic | mmHg | 4–12 | — | as 9 | PAP dia | ✓ |
| 11 | `mon.papMean` | mPAP | Mean pulmonary artery pressure | mmHg | 10–20 (PH > 20, ESC/ERS 2022) | — | textbooks "mPAP" | PAP mean | ~ |
| 12 | `ev.state.values.pawp` | PAWP | Pulmonary artery wedge (occlusion) pressure | mmHg | 6–12 | — | "PCWP" common alias; Phil "PAWP" | `pawp` | ✗ |
| 13 | `mon.nibpSys/Dia/Mean` | NIBP S/D/M | Non-invasive (oscillometric) blood pressure | mmHg | as ART | as ART | GE/Mr/NK/Sa "NIBP"; Phil/Dr "NBP" | NIBP sys/dia/mean | ✓ |
| 14 | `ev.nibp.cuffMmHg` | Cuff | NIBP cuff pressure during inflation | mmHg | — | — | Phil shows cuff pressure in the tile | `cuffMmHg` | ✗ |
| 15 | `mon.etco2` | EtCO₂ | End-tidal CO2 partial pressure | mmHg | 35–45 (PaCO2 − 2 to 5) | Preg 28–32 | GE/Mr/Sa "EtCO₂"; Phil "etCO₂" | EtCO₂ | ✓ |
| 16 | `mon.imco2` | FiCO₂ | Inspired (minimum) CO2 | mmHg | 0 (< 2) | — | GE/Mr/Sa "FiCO₂"; Phil "imCO₂" | `imco2` | ✗ |
| 17 | `mon.awrr` | awRR | Airway respiratory rate (from the CO2/flow signal) | /min | 12–20 | child 20–30; neonate 30–60 | Phil/Mr "awRR"; Sa "AWRR" | `awrr` | ✗ |
| 18 | `mon.rr` | RR | Respiratory rate (impedance) | /min (skins may show rpm) | 12–20 | as 17 | all "RR"; unit rpm (GE/Mr) or /min | RR; tile unit "rpm" | ✓ |
| 19 | `mon.tempCore` | T1 (Tcore) | Temperature 1 — core (oesophageal probe) | °C | 36.5–37.5 | — | GE/Mr/Sa "T1"; Phil "Tcore"/"Tesoph" | Temp core | ~ |
| 20 | `mon.tempSite` | T2 (site) | Temperature 2 at the chosen site: Tnaso, Ttymp, Tblad, Trect, Taxil | °C | site-dependent (axilla −0.5 to −1) | — | GE/Mr/Sa "T2"; Phil by site | `tempSite` | ✗ |
| 21 | (derived) | ΔT (TD) | Core–site temperature difference | °C | < 2 | — | Sa "DT"; Mr "TD" | — (extra declared, not drawn) | new |
| 22 | `mon.stII` | ST-II | ST-segment deviation, lead II (J + 60/80 ms) | mm or mV (1 mm = 0.1 mV) | ±0.1 mV (≥ 0.1 mV depression = ischaemia) | — | Phil "ST-II"; GE/Mr "ST II" | tile "ST" (mV) | ~ |
| 23 | `mon.qtc` | QTc | Corrected QT interval (state the formula: Bazett/Fridericia) | ms | < 450 M, < 460 F (> 500 high risk) | child < 450 | Phil "QTc" | QTc | ✓ |
| 24 | `mon.tofCount` | TOF count | Train-of-four count | 0–4 | 4 (no block) | — | Phil "TOF-Cnt"; GE NMT "Count" | `tofCount` (tile "NMT") | ✗ |
| 25 | `mon.tofRatio` | TOFR | Train-of-four ratio T4/T1 | % | ≥ 90 % = adequate recovery | — | Phil "TOF-Ratio"; GE "TOF%" | `tofRatio` | ✗ |
| 26 | `mon.ptc` | PTC | Post-tetanic count | 0–20 | n/a (used at TOF 0) | — | Phil/GE "PTC" | `ptc` | ~ |
| 27 | `mon.di` | DoA index (BIS/qCON/PSI/BFI per skin) | Processed-EEG depth-of-anaesthesia index | 0–100 | awake > 90; GA 40–60 | — | Medtronic "BIS"; GE "SE/RE" (Entropy); Masimo "PSi"; Sa "BFI" | `di`; tile "BFA" | ✗ |
| 28 | `mon.sr` | SR | Burst-suppression ratio | % | 0 | — | BIS "SR"; Sa "BS%" | `sr` | ✗ |
| 29 | `mon.mac` | MAC | Minimum alveolar concentration multiple (end-tidal, age-adjusted, Σ agents incl. N2O) | MAC | GA 0.7–1.3; MAC-awake 0.3–0.4 | Preg 1 MAC is 25–40 % lower | Phil/GE/Dr "MAC" (agent module) | `mac` | ✗ |
| 30 | `mon.etAa` | EtAA (EtSEV/EtISO/EtDES) | End-tidal anaesthetic agent concentration | % | agent-specific (1 MAC at 40 y: sevo 2.0, iso 1.15, des 6.0) | child MAC higher | Phil "etSEV"; GE "EtSev" (usage) | `etAa` | ✗ |
| 31 | `mon.icpMean` | ICP | Intracranial pressure (mean) | mmHg | 5–15 (treat > 22, BTF) | infant 1.5–6; child 3–7 | all | `icpMean` (tile ICP) | ~ |
| 32 | `mon.cpp` | CPP | **Cerebral** perfusion pressure = MAP − ICP | mmHg | 60–80 (TBI target 60–70) | child 40–50 (age-dependent) | Phil/Sa "CPP" with ICP | `cpp` | ~ (collides with `ev.circ.cpp`) |
| 33 | `mon.pbto2` | PbtO₂ | Brain tissue O2 tension | mmHg | 20–35 (treat < 20) | — | Licox "PbtO₂" | PbtO2 | ✓ |
| 34 | `mon.uop` | UO | Urine output (rolling 60 min) | mL/h (and mL/kg/h) | ≥ 0.5 mL/kg/h | child ≥ 1; infant ≥ 1–2 mL/kg/h | ICU charts "UO" | `uop`; tile "UO" | ~ |
| 35 | (derived) | PPV | Pulse-pressure variation | % | < 13 % (fluid-responsive > 13 on VT ≥ 8 mL/kg) | — | Phil/GE/Mr "PPV" | — (extra declared) | new |
| 36 | (derived) | SVV | Stroke-volume variation | % | < 10–13 % | — | pulse-contour devices | — | new |
| 37 | `mon.hr` source | HR source | Where HR comes from (ECG / ART / SpO2) | — | — | — | Sa AUTO relabels to "PR" | — | new |

### 5.2 Waveform lanes

| # | channel | Label | Name | Unit | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|
| 38 | `ecgI…V6` | I, II, III, aVR, aVL, aVF, V1–V6 | ECG leads | mV | all | ECG1–3 lanes (lead names) | ✓ |
| 39 | `abp` | ART | Arterial pressure waveform | mmHg | GE/Mr/Dr/Sa "ART"; Phil "ABP" | "ABP" (lane) / "ART" (skin) | ~ |
| 40 | `cvp` | CVP | Central venous pressure waveform | mmHg | all | CVP | ✓ |
| 41 | `pap` | PAP | Pulmonary artery pressure waveform (wedge trace when inflated) | mmHg | Phil "PAP"; GE/Mr "PA" | PAP | ✓ |
| 42 | `pleth` | Pleth | Plethysmogram (SpO2) | a.u. | all | Pleth | ✓ |
| 43 | `co2` | CO₂ | Capnogram | mmHg | all | CO2 | ✓ |
| 44 | `resp` | Resp | Impedance respiration | a.u. | all "RESP" | RESP | ✓ |
| 45 | `icp` | ICP | ICP waveform (P1/P2/P3) | mmHg | all | ICP | ✓ |
| 46 | `lvp` | LVP | Left-ventricular pressure (teaching) | mmHg | Sa "LVP" | `lvp` | ~ |
| 47 | `lvv` | LV volume | Left-ventricular volume (PV-loop teaching) | mL | textbooks | `lvv` | ✗ |
| 48 | `lap`, `rap`, `rvp` | LAP, RAP, RVP | Left atrial, right atrial, right ventricular pressure | mmHg | Sa "LAP/RAP/RVP" | `lap`/`rap`/`rvp` | ~ |
| 49 | `pat` | PAP (true) | Pulmonary artery pressure without the catheter transfer function (teaching) | mmHg | — | `pat` | ✗ |
| 50 | (new) | Paw, Flow, Vol | Airway pressure, flow, volume (anaesthesia-workstation lanes) | cmH₂O, L/min, mL | Ham/Dräger "Paw/Flow/Vol" | only on the ventilator page | new |


### 5.3 Haemodynamics (truth, console, future CO monitor)

| # | engine key | Label | Name | Unit (display) | Adult normal | Child / Preg | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|---|
| 51 | `ev.circ.co` | CO | Cardiac output | L/min | 4–8 | child ≈ 2.5–3.5 / Preg +30–50 % | all ("C.O." Phil) | CO | ✓ |
| 52 | (derived) | CI | Cardiac index = CO/BSA | L/min/m² | 2.5–4.0 | — | all | — | new |
| 53 | `ev.circ.sv` | SV | Stroke volume (LV) | mL | 60–100 | — | all | SV | ✓ |
| 54 | (derived) | SVI | Stroke volume index | mL/m² | 33–47 | — | all | — | new |
| 55 | `ev.circ.svRv` | RVSV | Right-ventricular stroke volume | mL | = SV | — | textbooks | SV (RV) | ~ |
| 56 | `ev.circ.ef` | LVEF | Left-ventricular ejection fraction | % | 55–70 (≥ 50) | — | echo | EF (×100) | ✓ |
| 57 | `ev.circ.lvedv` | LVEDV | LV end-diastolic volume | mL | 65–150 | — | echo | LVEDV | ✓ |
| 58 | `ev.circ.lvesv` | LVESV | LV end-systolic volume | mL | 20–60 | — | echo | LVESV | ✓ |
| 59 | `ev.circ.lvedp` | LVEDP | LV end-diastolic pressure | mmHg | 4–12 | — | cath lab | LVEDP | ✓ |
| 60 | `ev.circ.lvsp` | LVSP | LV peak systolic pressure | mmHg | 90–140 (= SBP without AS) | — | cath lab | LV systolic | ~ |
| 61 | `ev.circ.svr` | SVR | Systemic vascular resistance | dyn·s·cm⁻⁵ (WU alternative) | 800–1,200 (10–15 WU) | Preg −25–30 % | all | SVR | ✓ |
| 62 | (derived) | SVRI | SVR index | dyn·s·cm⁻⁵·m² | 1,970–2,390 | — | PAC | — | new |
| 63 | `ev.circ.pvr` | PVR | Pulmonary vascular resistance | dyn·s·cm⁻⁵ (WU) | 40–160 (< 2 WU) | Preg ×0.8 | all | PVR | ✓ |
| 64 | `ev.circ.pmsf` | Pmsf | Mean systemic filling pressure | mmHg | ≈ 7–20 (method-dependent) | — | Guyton; physiology texts | Pmsf | ✓ |
| 65 | `ev.circ.cpp` | CoPP | **Coronary** perfusion pressure = aortic diastolic − LVEDP | mmHg | 50–80; CPR ≥ 15–20 for ROSC (Paradis) | — | textbooks write "CPP", which collides with 32: use CoPP | Coronary perfusion pressure | ~ (collision) |
| 66 | `ev.circ.supplyDemand` | Myocardial O2 supply/demand | Coronary supply/demand ratio (EVR-like, DPTI/TTI analogue) | ratio | > 1 (EVR ≥ 0.7 in Buckberg's terms) | — | Buckberg EVR | Coronary supply/demand | ~ |
| 67 | `ev.circ.kIsch` | Ischaemia factor | Fraction of normal contractility left by ischaemia (model) | 0–1 | 1 | — | engine-only; keep as an instructor label | Ischaemia factor | ~ |
| 68 | `hemo.circ.p.rSys` | SVR (model) | Model systemic resistance (the parameter behind 61) | mmHg·s/mL | ≈ 0.85–1.05 | — | engine | R systemic (model) | ~ |
| 69 | `hemo.circ.p.eesLv`, `eesRv` | Ees LV / Ees RV | End-systolic elastance (contractility) | mmHg/mL | LV 2–3; RV 0.5–0.8 | — | Suga/Sagawa | Ees LV / Ees RV | ✓ |
| 70 | `hemo.circ.p.cArt` | Ca (arterial compliance) | Total arterial compliance | mL/mmHg | 1.2–2.0 | elderly ≈ 0.6–0.9 | physiology texts | `cArt` | ✗ |
| 71 | `hemo.circ.p.v0Sv`, `cSv` | Vu, Cv | Unstressed venous volume; venous compliance | mL; mL/mmHg | Vu ≈ 70 % of blood volume; Cv 100–130 | — | Guyton/Magder | `v0Sv`, `cSv` | ✗ |
| 72 | `hemo.circ.p.{av,mv,tv,pv}.eroa` | EROA | Effective regurgitant orifice area (per valve) | cm² | 0 | — | echo (ASE) | `eroa` | ✗ |
| 73 | `hemo.circ.p.av.r` etc. | Valve resistance | Model valve resistance (AS/MS: use AVA/MVA and mean gradient) | mmHg·s/mL | — | — | echo reports AVA (cm²) and mean gradient (mmHg) | `r`, `k` | ✗ |
| 74 | `hemo.circOut.pAo` | Aortic pressure | Central aortic pressure | mmHg | ≈ radial − 0–10 systolic | — | textbooks | `pAo` | ✗ |
| 75 | `hemo.circOut.pRad` | Radial pressure | Radial artery pressure (the ART site) | mmHg | as ART | — | — | `pRad` | ✗ |
| 76 | `hemo.circOut.pLa` | LAP | Left atrial pressure | mmHg | 4–12 | — | Sa "LAP" | `pLa` | ✗ |
| 77 | `hemo.circOut.pRa` | RAP | Right atrial pressure | mmHg | 2–8 (≈ CVP) | — | Sa "RAP" | `pRa` | ✗ |
| 78 | `hemo.circOut.pRv` | RVP | Right-ventricular pressure | mmHg | 15–30 / 0–8 | — | Sa "RVP" | `pRv` | ✗ |
| 79 | `hemo.circOut.pLv` | LVP | Left-ventricular pressure | mmHg | 90–140 / 4–12 | — | Sa "LVP" | `pLv` | ✗ |
| 80 | `hemo.circOut.pPa`, `pPaRoot` | PAP (model) | Pulmonary artery pressure (distal / root) | mmHg | as 9–11 | — | — | `pPa`, `pPaRoot` | ✗ |
| 81 | `hemo.circOut.pPv` | Ppv (≈ PAWP) | Pulmonary venous pressure | mmHg | 6–12 | — | West zones | `pPv` | ✗ |
| 82 | `hemo.circOut.pSv` | Psv | Systemic venous (reservoir) pressure (≈ Pmsf at no flow) | mmHg | ≈ 10–15 | — | Guyton | `pSv` | ✗ |
| 83 | `hemo.circOut.pIt` | Ppl (pleural) | Intrathoracic (pleural) pressure | mmHg (show cmH₂O too) | −3 to −8 cmH₂O (end-exp, spont); + under PPV | — | West | `pIt` | ✗ |
| 84 | `hemo.circOut.pPeri` | Ppericardial | Pericardial pressure | mmHg | ≈ 0 to −3 (tamponade ≥ RAP) | — | Barash | `pPeri` | ✗ |
| 85 | `hemo.circOut.qSys`, `qVr`, `qAv…` | Q̇ (flows) | Systemic flow, venous return, valve flows | mL/s | — | — | engine (teaching) | `qSys`, `qVr`… | ✗ |
| 86 | `hemo.circOut.qLungL/R` | Q̇ L/R lung | Pulmonary blood flow per lung | mL/s (show % of CO) | L 45 %, R 55 % supine | — | West | `qLungL/R` | ✗ |
| 87 | `hemo.circ.baro.set` | Baroreflex set point | MAP the baroreflex defends | mmHg | 85–95 awake; GA −10–20 % | — | physiology | `set` | ✗ |
| 88 | `hemo.circ.baro.es`, `ev` | Sympathetic / vagal tone | Baroreflex efferent activity (model units) | a.u. | — | — | engine (instructor) | `es`, `ev` | ✗ |
| 89 | `hemo.circ.ext.drug.*` | Drug effect on SVR / Ees / venous tone / reflex gain / HR | Pharmacodynamic multipliers | × | 1 | — | engine (instructor) | `svr`, `ees`, `v0Frac`, `gv`, `gvHr`, `hr` | ✗ |
| 90 | `ev.state.values.contractility`, `volumeStatus` | Contractility (×), Volume status (×) | MANUAL instructor inputs | × baseline | 1 | — | instructor only | `contractility`, `volumeStatus` | ✗ |
| 91 | `ev.beat.mech.lvetMs` | LVET | Left-ventricular ejection time | ms | 250–320 (HR-dependent) | — | Weissler | `lvetMs` | ✗ |
| 92 | `ev.circ.iabp.augmentation` | Diastolic augmentation | IABP augmented diastolic pressure | mmHg | > unassisted SBP | — | IABP consoles "Aug" | `augmentation` | ✗ |
| 93 | (derived) | SPV / dSBP | Systolic pressure variation | mmHg | < 10 | — | anaesthesia texts | — | new |
| 94 | (derived) | CPO | Cardiac power output = MAP·CO/451 | W | ≈ 1.0 (shock < 0.6) | — | cardiogenic-shock texts | — | new |

### 5.4 Oxygen transport

| # | engine key | Label | Name | Unit (display) | Adult normal | Child / Preg | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|---|
| 95 | `blood.core.o2.cao2` | CaO₂ | Arterial O2 content | **mL/dL** (engine mL/L ÷ 10) | 18–21 mL/dL | Preg lower (Hb 11.5) | textbooks | `cao2` (mL/L) | ✗ |
| 96 | `resp.lung.o2.cv` | CvO₂ | Mixed-venous O2 content | mL/dL (engine mL/L) | 14–16 | — | textbooks | CvO₂ (mL/L) | ~ |
| 97 | `blood.core.o2.do2` | DO₂ | O2 delivery = CO·CaO2 | mL/min (DO2I mL/min/m²) | 950–1,150 (DO2I 500–600) | — | textbooks | `do2` | ✗ |
| 98 | `blood.core.o2.vo2`, `resp.pat.vo2` | VO₂ | O2 consumption | mL/min | 200–250 (3.5 mL/kg/min) | child 5–7 mL/kg/min / Preg +20–30 % | textbooks | `vo2` | ✗ |
| 99 | `blood.core.o2.er` | O₂ER | O2 extraction ratio = VO2/DO2 | % | 22–30 | — | textbooks | `er` | ✗ |
| 100 | `blood.core.o2.svo2` | SvO₂ | Mixed-venous O2 saturation | % (engine fraction) | 65–75 | — | PAC oximetry ("SvO₂" all vendors) | `svo2` (fraction) | ✗ |
| 101 | (new) | ScvO₂ | Central-venous O2 saturation | % | 70–80 (SvO2 + 2–5) | — | sepsis bundles | — | new |
| 102 | `blood.core.o2.deficit` | O₂ debt | Accumulated O2 deficit (model) | mL | 0 | — | shock physiology | `deficit` | ✗ |
| 103 | `blood.core.odc.dpgMmolL` | 2,3-DPG | Red-cell 2,3-diphosphoglycerate | mmol/L | 4–5 | — | textbooks | `dpgMmolL` | ~ |
| 104 | (new) | P50 | PO2 at 50 % saturation | mmHg | 26–27 | Preg ≈ 30; neonate ≈ 19 | textbooks | — | new |


### 5.5 Gas exchange and ventilation

| # | engine key | Label | Name | Unit | Adult normal | Child / Preg | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|---|
| 105 | `resp.o2.pao2` | PaO₂ | Arterial O2 tension | mmHg | 80–100 on air (≈ 100 − age/3) | Preg 100–105 | textbooks | PaO₂ | ✓ |
| 106 | `resp.o2.sa` | SaO₂ | Arterial O2 saturation (functional) | % | 95–99 | — | textbooks | SaO₂ | ✓ |
| 107 | `resp.o2.fa` | FAO₂ | Alveolar O2 fraction | % | ≈ 14 on air | — | West | FAO₂ | ~ |
| 108 | (derived) | PAO₂ | Alveolar O2 tension (alveolar gas equation) | mmHg | ≈ 100 on air | — | West | — | new |
| 109 | (derived) | A–a DO₂ | Alveolar–arterial O2 gradient | mmHg | 5–15 on air (≈ age/4 + 4) | — | West | — | new |
| 110 | (derived) | P/F | PaO2/FiO2 ratio | mmHg | > 400 (ARDS ≤ 300, Berlin) | — | ARDSnet/Berlin | — | new |
| 111 | `resp.co2.pf` | PaCO₂ | Arterial CO2 tension | mmHg | 35–45 | Preg 28–32 | textbooks | PaCO₂ (pf) | ~ |
| 112 | `resp.etco2`, `ev.breath.etco2True` | EtCO₂ (true) | End-tidal CO2 before the sampler (truth) | mmHg | 35–45 | Preg 28–32 | — | EtCO₂ (model) / `etco2True` | ~ |
| 113 | `resp.lung.co2.pv` | PvCO₂ | Mixed-venous CO2 tension | mmHg | 41–51 (PaCO2 + 4–6) | — | textbooks | PvCO₂ | ✓ |
| 114 | `resp.lung.co2.g` | EtCO₂/PaCO₂ | End-tidal to arterial CO2 ratio | — | 0.9–1.0 | — | — | EtCO₂/PaCO₂ | ~ |
| 115 | (derived) | Pa–EtCO₂ | Arterial–end-tidal CO2 gradient | mmHg | 2–5 | — | Miller (capnography) | — | new |
| 116 | `resp.lung.co2.faCo2` | FACO₂ | Alveolar CO2 fraction | % | ≈ 5.6 | — | West | FACO₂ | ~ |
| 117 | `resp.lung.co2.riseIII` | Phase III slope | Capnogram alveolar-plateau rise | mmHg (per breath) or mmHg/s | < 2–3 mmHg | — | capnography texts | Capnogram phase III rise | ~ |
| 118 | `resp.lung.co2.e` | CO₂ elimination efficiency | Model CO2-elimination factor | — | 1 | — | engine | CO₂ elimination efficiency | ~ |
| 119 | `resp.shunt`, `ev.lungState.shunt` | Qs/Qt (shunt) | Shunt fraction | % | 2–5 awake; 8–10 under GA | neonate 5–10 | textbooks | Shunt / Shunt (lung) | ~ |
| 120 | `ev.lungState.vqAdmixture`, `lp.side.#.vqLow` | Venous admixture (low V/Q) | FiO2-responsive admixture from low-V/Q units | % | ≈ 2 | — | West | `vqAdmixture` / "low V/Q admixture" | ~ |
| 121 | `resp.pat.vco2` | VCO₂ | CO2 production | mL/min | ≈ 200 (RQ 0.8) | child 4–5 mL/kg/min / Preg ↑ | textbooks | `vco2` | ✗ |
| 122 | `resp.vaLpm` | V̇A | Alveolar ventilation | L/min | 4–5 | Preg ↑ 50–70 % | West | `vaLpm` | ✗ |
| 123 | `resp.spont.ve` | V̇E (MV) | Minute ventilation (spontaneous) | L/min | 5–8 | Preg +40–50 % | all "MV" | `ve` | ✗ |
| 124 | `resp.spont.rr` | RR (spont) | Spontaneous respiratory rate (truth) | /min | 12–20 | child 20–30 | — | `rr` | ~ |
| 125 | `resp.spont.vt`, `ev.breath.vtMl` | VT | Tidal volume | mL (and mL/kg PBW) | 6–8 mL/kg PBW | Preg ↑ 30–40 % | all | `vt` / `vtMl` | ~ |
| 126 | `resp.spont.paco2Set` | PaCO₂ set point | Chemoreflex PaCO2 target | mmHg | ≈ 40 | Preg 30–32 | physiology | `paco2Set` | ✗ |
| 127 | `resp.spont.fatigue` | Respiratory muscle fatigue | Fatigue factor (model) | 0–1 | 1 (none) | — | engine | `fatigue` | ✗ |
| 128 | `ev.breath.tiS`, `teS` | Ti, Te | Inspiratory and expiratory time | s | Ti 1–1.5; I:E 1:2 | — | Ham "Ti"; "I:E" | `tiS`, `teS` | ✗ |
| 129 | `resp.driver.vent.{rr,vt,peep,ie}` | f set, VT set, PEEP, I:E | Ventilator settings (engine VCV) | /min, mL, cmH₂O, ratio | — | — | Ham/Dräger | `rr`, `vt`, `peep`, `ie` | ~ |
| 130 | `l1.coupled.fio2`, `ev.state.values.fio2` | FiO₂ | Inspired O2 fraction | % (engine fraction) | 21 % air | — | all | `fio2` (fraction) | ✗ |
| 131 | `resp.driver.fico2` | FiCO₂ (source) | Inspired CO2 from rebreathing (input) | mmHg | 0 | — | — | `fico2` | ✗ |
| 132 | `resp.driver.source` | Ventilation mode | Spontaneous / BVM / ventilator / none | — | — | — | clinical words | `source` | ✗ |
| 133 | `resp.driver.airway` | Airway state | Patent / obstructed / apnoea / disconnected / oesophageal / endobronchial / bronchospasm | — | — | — | clinical words | `airway` | ~ |
| 134 | `ev.anaesthesia.drive.{opioidDep,hypnoticDep,veRest,apnoea,obstruction}` | Respiratory drive (opioid / hypnotic depression, resting V̇E fraction, apnoea, upper-airway obstruction) | Drug effect on ventilatory drive | fraction | 0 / 1 | — | engine (instructor) | `opioidDep`… | ✗ |
| 135 | `blood.lung.evlwi` | EVLWI | Extravascular lung water index | mL/kg | 3–7 (oedema > 10) | — | PiCCO | `evlwi` | ~ |
| 136 | `lp.ibwKg` | PBW | Predicted (ideal) body weight | kg | Devine | — | ARDSnet "PBW" | Ideal body weight | ~ |
| 137 | `Measured.VTE` | VTe | Expired tidal volume (ventilator) | mL | 6–8 mL/kg PBW | — | Ham "VTE" | VTE | ✓ |
| 138 | `Measured.MV` | MVe | Expired minute volume | L/min | 5–8 | — | Ham "ExpMinVol" | ExpMinVol | ~ |
| 139 | `Measured.RR` | fTotal | Total breath rate (ventilator) | /min | 12–20 | — | Ham "fTotal" | fTotal | ✓ |
| 140 | `Measured.P01` | P0.1 | Airway occlusion pressure at 100 ms | cmH₂O | 1–4 (> 3.5 high drive) | — | Ham "P0.1" | P0.1 | ✓ |
| 141 | (VENT) RSB | RSBI | Rapid shallow breathing index f/VT | breaths/min/L | < 105 | — | Yang–Tobin | RSB | ~ |
| 142 | (VENT) Oxygen | FiO₂ (set) | Set O2 concentration | % | — | — | Ham "Oxygen" | Oxygen | ~ |

### 5.6 Respiratory mechanics and lung volumes (R57; many planned)

| # | engine key | Label | Name | Unit | Adult normal | Child / Preg | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|---|
| 143 | `Measured.PIP` (VENT); engine: new | Ppeak | Peak inspiratory pressure | cmH₂O | < 30–35 | — | Ham "Ppeak"; Dräger "Ppeak"/"PIP" | Ppeak (VENT) / none (engine) | ✓/new |
| 144 | `resp.lung.pInsp`; `Measured.PLAT` | Pplat | Plateau pressure (end-inspiratory hold) | cmH₂O | < 30 (lung-protective ≤ 28–30) | — | ARDSnet; Ham "Pplateau" | End-inspiratory alveolar pressure | ~ |
| 145 | `resp.driver.vent.peep` | PEEP | Set positive end-expiratory pressure | cmH₂O | 5–15 | — | all | `peep` / "PEEP" (VENT) | ✓ |
| 146 | `resp.lung.peepTot` | PEEPtot | Total PEEP (end-expiratory hold) | cmH₂O | = PEEP | — | Ham "PEEPtot"/"Total PEEP" | Total PEEP | ✓ |
| 147 | `ev.lungState.autoPeepCmH2O`; `Measured.autoPEEP` | PEEPi (auto-PEEP) | Intrinsic PEEP = PEEPtot − PEEP | cmH₂O | 0 | — | Ham "AutoPEEP"; textbooks "PEEPi" | `autoPeepCmH2O` | ✗ |
| 148 | (derived; `measure.ts` drivingP) | ΔP | Driving pressure = Pplat − PEEPtot | cmH₂O | < 15 (≤ 13 target) | — | Amato 2015 "ΔP"/"DP" | — | new |
| 149 | (new) | PL | Transpulmonary pressure = Paw − Ppl (Pes-based; end-insp and end-exp) | cmH₂O | end-insp < 20–25; end-exp 0 to +2 | Preg/obese: Ppl higher | Talmor/Chiumello | — | new |
| 150 | (new) | Pes | Oesophageal pressure (estimate of Ppl) | cmH₂O | ≈ −5 to +5 supine | — | oesophageal manometry | — | new |
| 151 | `ev.lungState.complianceMlPerCmH2O`; VENT Cstat | Cstat (Crs) | Static respiratory-system compliance = VT/(Pplat − PEEPtot) | mL/cmH₂O | 50–80 intubated (≈ 100 awake) | child 1–1.5 mL/cmH₂O/kg / Preg ×0.85 | Ham "Cstat" | Compliance | ~ |
| 152 | (new) | Cdyn | Dynamic compliance = VT/(Ppeak − PEEPtot) | mL/cmH₂O | 40–70 | — | textbooks | — | new |
| 153 | `resp.lung.lp.side.#.cL` | CL | Lung compliance (per side) | mL/cmH₂O | ≈ 100–200 (both lungs, awake) | — | West | L/R lung compliance | ~ |
| 154 | `ev.lungState.chestWallComplianceMlPerCmH2O`, `lp.ccw` | Ccw | Chest-wall compliance | mL/cmH₂O | ≈ 200 | Preg ×0.7 | West | Chest-wall compliance / `chestWallComplianceMlPerCmH2O` | ~ |
| 155 | `ev.lungState.resistanceCmH2OPerLps`, `resistanceExpCmH2OPerLps` | Raw (Rinsp / Rexp) | Airway resistance incl. tube | cmH₂O·s/L | 2–3 unintubated; 8–12 with ETT | child higher | Ham "Rinsp"/"Rexp"; textbooks "Raw" | Resistance / `resistanceExpCmH2OPerLps` | ~ |
| 156 | `resp.lung.lp.rTube` | RETT | Endotracheal-tube resistance | cmH₂O·s/L | 4–8 (7.0–8.0 mm tube) | — | textbooks | Tube resistance | ✓ |
| 157 | `resp.lung.tauBar` | RCexp (τE) | Expiratory time constant | s | 0.4–0.7 intubated | — | Ham "RCexp" | Expiratory τ | ~ |
| 158 | `resp.lung.mech.paw` | Paw | Airway pressure (instantaneous) | cmH₂O | — | — | all | Airway-opening pressure | ~ |
| 159 | `resp.lung.mech.pcar` | Ptrach | Tracheal (carinal) pressure | cmH₂O | — | — | textbooks | Carina pressure | ~ |
| 160 | `Measured.Pmean` | Pmean | Mean airway pressure | cmH₂O | 5–15 | — | Ham "Pmean" | Pmean | ✓ |
| 161 | `resp.pat.deadSpaceMl` | VD anat | Anatomical dead space | mL (mL/kg PBW) | ≈ 150 (2.2 mL/kg) | child relatively larger with apparatus | Fowler | `deadSpaceMl` | ✗ |
| 162 | (new; code-only) | VD app | Apparatus dead space (HME, Y-piece, catheter mount) | mL | 30–100 | child: large fraction of VT | textbooks | — | new |
| 163 | `lp.side.#.vdAlv` | VD alv | Alveolar dead space | mL (engine fraction of VA) | ≈ 0 healthy | — | West | "alveolar dead space" (%) | ~ |
| 164 | `ev.lungState.deadSpaceMl` | VD phys | Physiological dead space (Bohr–Enghoff) | mL | ≈ 150–200 | — | West | Dead space | ~ |
| 165 | (new) | VD/VT | Dead-space fraction | ratio | 0.2–0.35 spont; 0.3–0.45 ventilated | — | Enghoff | — | new |
| 166 | `ev.lungState.frcMl`, `resp.pat.frcMl`, `frcGaMl` | FRC | Functional residual capacity | mL (mL/kg) | 2.0–2.5 L supine (30 mL/kg); −20 % under GA | child 30 mL/kg / Preg −20 % | ATS/ERS | FRC / FRC (anaesthetised) | ✓ |
| 167 | (new; constant) | RV | Residual volume | mL | ≈ 1.2 L (16–20 mL/kg) | — | ATS/ERS | — (constant `RV_ML_KG`) | new |
| 168 | (new; constant) | TLC | Total lung capacity | mL | ≈ 6 L (80 mL/kg) | — | ATS/ERS | — (constant `TLC_ML_KG`) | new |
| 169 | (new) | ERV | Expiratory reserve volume = FRC − RV | mL | ≈ 1.0–1.2 L | Preg −20 % | ATS/ERS | — | new |
| 170 | (new) | IC | Inspiratory capacity = TLC − FRC | mL | ≈ 3.5 L | Preg ↑ | ATS/ERS | — | new |
| 171 | (new) | VC (SVC) | Vital capacity = TLC − RV | mL | ≈ 4.5–5 L (60–70 mL/kg) | — | ATS/ERS | — | new |
| 172 | (new) | FVC | Forced vital capacity | L (% predicted) | ≥ 80 % predicted (≥ LLN) | — | ATS/ERS 2022 | — | new |
| 173 | (new) | FEV₁ | Forced expiratory volume in 1 s | L (% predicted) | ≥ 80 % predicted | — | ATS/ERS | — | new |
| 174 | (new) | FEV₁/FVC | Tiffeneau ratio | ratio | ≥ 0.70 (≥ LLN) | — | GOLD/ATS | — | new |
| 175 | (new) | PEF | Peak expiratory flow | L/min | 400–600 | — | ATS/ERS | — | new |
| 176 | (new) | CC | Closing capacity | mL | ≈ FRC supine at 44 y, upright at 66 y | Preg: CC > FRC supine | Nunn | — | new |
| 177 | `ev.lungState.atelectasisFrac`, `resp.lung.rec.*` | Atelectasis (%) | Non-aerated lung fraction | % | 0 awake; 5–10 after induction | obese/Preg ↑ | Hedenstierna | `atelectasisFrac` / "induction atelectasis" | ~ |


### 5.7 Labs: blood gas, chemistry, haematology, coagulation, viscoelastic (R58)

Current keys are `ev.labs.values.<k>` / `ev.labResult.values.<k>` (LAB panel label in the "current" column).

| # | engine key | Label | Name | Unit | Adult normal | Child / Preg | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|---|
| 178 | `ph` | pH | Arterial (or venous) pH | — | 7.35–7.45 (venous ≈ 0.03 lower) | Preg 7.40–7.46 | blood-gas analysers | pH | ✓ |
| 179 | `pco2` | PaCO₂ / PvCO₂ | CO2 tension (a = arterial, v = venous) | mmHg (kPa option) | 35–45 | Preg 28–32 | analysers print "pCO₂" with the sample type | PCO2 | ~ |
| 180 | `po2` | PaO₂ / PvO₂ | O2 tension | mmHg | 80–100 on air; venous 35–45 | — | as 179 | PO2 | ~ |
| 181 | `hco3` | HCO₃⁻ | Bicarbonate (actual; standard HCO₃ optional) | mmol/L | 22–26 | Preg 18–22 | analysers "cHCO₃⁻(P)" | HCO3 | ✓ |
| 182 | `be` | BE (SBE) | Base excess (standard, extracellular) | mmol/L | −2 to +2 | Preg −2 to −4 | analysers "cBase(Ecf)" | BE | ✓ |
| 183 | `so2` | FO₂Hb (or sO₂) | **Fractional** oxyhaemoglobin (the engine value); show functional sO₂ separately | % | FO₂Hb 94–98; sO₂ 95–99 | — | co-oximeters print both | SO2 | ✗ |
| 184 | `cohb` | COHb | Carboxyhaemoglobin | % | < 1.5 (smokers up to 10) | — | co-oximetry | COHb | ✓ |
| 185 | `methb` | MetHb | Methaemoglobin | % | < 1.5 | — | co-oximetry | MetHb | ✓ |
| 186 | `lactate` | Lactate | Blood lactate | mmol/L | 0.5–2.0 | — | all | Lactate | ✓ |
| 187 | `na` | Na⁺ | Sodium | mmol/L | 135–145 | Preg 130–140 | all | Na | ✓ |
| 188 | `k` | K⁺ | Potassium | mmol/L | 3.5–5.0 | — | all | K | ✓ |
| 189 | `cl` | Cl⁻ | Chloride | mmol/L | 98–107 | — | all | Cl | ✓ |
| 190 | `iCa` | iCa²⁺ | Ionised calcium | mmol/L | 1.15–1.30 | — | analysers "cCa²⁺" | iCa | ✓ |
| 191 | `mg` | Mg²⁺ | Magnesium (total; ionised 0.45–0.6) | mmol/L | 0.7–1.0 (MgSO4 therapeutic 2–3.5) | — | — | not drawn | new |
| 192 | `hb` | Hb | Haemoglobin | g/dL (g/L option) | M 13.5–17.5; F 12–15.5 | child 11–13.5 / Preg ≥ 11 (T2 ≥ 10.5) | all | Hb | ✓ |
| 193 | `glucose` | Glucose | Blood glucose | mmol/L and mg/dL | 3.9–7.8 (70–140 mg/dL) | neonate > 2.6 | all | Glucose (mg/dL) / GLU (mmol/L) | ~ |
| 194 | `ag` | AG | Anion gap (Na − Cl − HCO3) | mmol/L | 8–12 (without K); correct for albumin | — | all | AG | ✓ |
| 195 | `osm` | Osm | Measured/calculated osmolality | mOsm/kg | 275–295 | Preg ≈ 280 | all | not drawn | new |
| 196 | (derived) | Hct | Haematocrit | % | M 40–52; F 36–48 | Preg 32–36 | all | — | new |
| 197 | (new) | WBC | White-cell count | ×10⁹/L | 4–11 | Preg up to 15 | CBC | — | new |
| 198 | (new) | Plt | Platelet count | ×10⁹/L | 150–400 | Preg ≥ 100 (gestational thrombocytopenia) | CBC | — | new |
| 199 | (new) | Urea (BUN) | Urea | mmol/L (mg/dL BUN) | 2.5–7.8 (BUN 7–20) | Preg ↓ | chemistry | — | new |
| 200 | (new) | Creat | Creatinine | µmol/L (mg/dL) | 60–110 (0.6–1.2) | Preg 35–70 (0.4–0.8) | chemistry; KDIGO | — | new |
| 201 | `blood.out.albuminGL` | Alb | Albumin | g/L | 35–50 | Preg 28–37 | chemistry | `albuminGL` | ✗ |
| 202 | `blood.out.cop` | COP | Colloid osmotic (oncotic) pressure | mmHg | 22–28 | Preg 21–22 | textbooks | `cop` | ✗ |
| 203 | `blood.keto` | BHB | β-hydroxybutyrate (ketones) | mmol/L | < 0.6 (DKA > 3) | — | chemistry | hidden | new |
| 204 | (new) | cTn | Cardiac troponin (hs) | ng/L | < 99th centile of the assay | — | chemistry | — | new |
| 205 | (new) | BNP / NT-proBNP | Natriuretic peptide | pg/mL | BNP < 100; NT-proBNP < 125 (age-dependent) | — | chemistry | — | new |
| 206 | (new) | Bili | Total bilirubin | µmol/L | 5–21 | — | LFT | — | new |
| 207 | (new) | ALT / AST | Transaminases | U/L | ALT 7–56; AST 10–40 | — | LFT | — | new |
| 208 | (new) | ALP / GGT | Cholestatic enzymes | U/L | ALP 44–147; GGT 9–48 | Preg ALP ↑ (placental) | LFT | — | new |
| 209 | (new) | NH₃ | Ammonia | µmol/L | 15–45 | — | chemistry | — | new |
| 210 | `ev.organs.liver.inr` | INR | International normalised ratio (PT) | — (PT s) | 0.8–1.2 (PT 11–13.5 s) | Preg slightly ↓ | coagulation | `inr` (placeholder) | ✗ |
| 211 | (new) | aPTT | Activated partial thromboplastin time | s | 25–35 | Preg ↓ | coagulation | — | new |
| 212 | (new) | Fib | Fibrinogen (Clauss) | g/L | 2–4 | Preg 4–6 (< 2 in PPH predicts severity) | coagulation | — | new |
| 213 | (new) | ACT | Activated clotting time | s | 80–130 (CPB > 400–480) | — | point of care | — | new |
| 214 | (new) | D-dimer | Fibrin degradation (D-dimer) | mg/L FEU | < 0.5 | Preg ↑ by trimester | coagulation | — | new |
| 215 | (new) | Anti-Xa | Heparin anti-Xa activity | IU/mL | therapeutic UFH 0.3–0.7 | — | coagulation | — | new |
| 216 | (new) | R | TEG reaction time (to 2 mm) | min | 5–10 (kaolin) | Preg shorter | Haemonetics TEG | — | new |
| 217 | (new) | K | TEG kinetics time (2 → 20 mm) | min | 1–3 | — | TEG | — | new |
| 218 | (new) | α | TEG/ROTEM α-angle | ° | 53–72 (TEG kaolin) | Preg ↑ | TEG/ROTEM | — | new |
| 219 | (new) | MA | TEG maximum amplitude | mm | 50–70 | Preg ↑ | TEG | — | new |
| 220 | (new) | LY30 | TEG lysis 30 min after MA | % | 0–8 | — | TEG | — | new |
| 221 | (new) | CT | ROTEM clotting time (EXTEM / INTEM / FIBTEM / HEPTEM / APTEM) | s | EXTEM 38–79; INTEM 100–240 | — | Werfen ROTEM | — | new |
| 222 | (new) | CFT | ROTEM clot formation time | s | EXTEM 34–159 | — | ROTEM | — | new |
| 223 | (new) | A10 (A5) | ROTEM amplitude at 10 (5) min | mm | EXTEM 43–65; FIBTEM 7–23 | Preg FIBTEM ↑ | ROTEM | — | new |
| 224 | (new) | MCF | ROTEM maximum clot firmness | mm | EXTEM 50–72; FIBTEM 9–25 | — | ROTEM | — | new |
| 225 | (new) | ML (LI30) | ROTEM maximum lysis (lysis index at 30 min) | % | ML < 15 | — | ROTEM | — | new |
| 226 | `drawnAt`, `turnaroundS` | Drawn / Reported | Sample time and result time | clock | POC 1–2 min; lab 30–60 min | — | lab systems | `drawnAt` | ✗ |


### 5.8 Temperature and thermoregulation

| # | engine key | Label | Name | Unit | Adult normal | Child / Preg | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|---|
| 227 | `resp.temp.tc` | Tcore | Core temperature (truth) | °C | 36.5–37.5 | — | textbooks | Core temp (model) | ~ |
| 228 | `resp.temp.tp`, `ev.endo.tempPeriphC` | Tperiph | Peripheral (skin/compartment) temperature | °C | 30–35 (core–periph 2–4) | — | Phil "Tperi" | `tp` / `tempPeriphC` / "Tp" | ✗ |
| 229 | `resp.temp.ta` | Troom | Ambient temperature | °C | 20–24 (theatre) | neonate: thermoneutral 32–34 | — | `ta` | ✗ |
| 230 | `resp.temp.sites.*` | Toes, Tnaso, Ttymp, Tblad, Trect, Taxil | Site temperatures | °C | axilla ≈ core − 0.5–1; rectal ≈ core + 0.2 | — | Phil site labels | `oesophageal`, `nasopharyngeal`… | ~ |
| 231 | `ev.endo.{shivering,sweating,vasoconstricted}` | Shivering / Sweating / Vasoconstricted | Thermoregulatory responses | yes/no | thresholds shift under GA (Sessler) | — | clinical words | as keys | ~ |
| 232 | `endo.cascade.stage` | Hypothermia stage | Mild (32–35) / moderate (28–32) / severe (< 28) | — | — | — | ERC/Swiss staging | `stage` | ✗ |

### 5.9 Brain

| # | engine key | Label | Name | Unit | Adult normal | Child / Preg | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|---|
| 233 | `ev.organs.brain.icp` | ICP | Intracranial pressure (truth) | mmHg | 5–15 | infant 1.5–6 | BTF | `icp` | ~ |
| 234 | `ev.organs.brain.cpp` | CPP | Cerebral perfusion pressure (truth) | mmHg | 60–80 | — | BTF | `cpp` | ~ |
| 235 | `ev.organs.brain.mapHead` | MAP (tragus) | MAP referenced at the external auditory meatus | mmHg | MAP − 0.77·head-height (cm) | — | neuro-anaesthesia practice | `mapHead` | ✗ |
| 236 | `ev.organs.brain.cbf` | CBF | Cerebral blood flow | mL/100 g/min (engine × 50) | 50 (40–60) | child 70–100 | textbooks | `cbf` (relative) | ✗ |
| 237 | `ev.organs.brain.cbvMl` | CBV | Cerebral blood volume | mL | ≈ 50 (3–4 mL/100 g) | — | textbooks | `cbvMl` | ~ |
| 238 | `ev.organs.brain.cmro2` | CMRO₂ | Cerebral metabolic rate for O2 | mL/100 g/min (engine relative) | 3.0–3.5 | child ≈ 5 | textbooks | `cmro2` (relative) | ✗ |
| 239 | `ev.organs.brain.sjvo2` | SjvO₂ | Jugular bulb venous O2 saturation | % (engine fraction) | 55–75 | — | neurocritical care | `sjvo2` | ~ |
| 240 | `ev.organs.brain.elastance` | Intracranial elastance | ΔP/ΔV (inverse compliance) | mmHg/mL | low at normal ICP (PVI ≈ 25 mL) | — | Marmarou | `elastance` | ~ |
| 241 | `ev.organs.brain.state` | ICP state | Normal / raised ICP / Cushing response / herniation | — | — | — | clinical words | `state` values raisedIcp, cushing… | ~ |
| 242 | `organs.brain.headUpDeg` | Head-up (HOB) | Head-of-bed elevation | ° | 30 in TBI | — | nursing/ICU | `headUpDeg` | ✗ |
| 243 | `organs.brain.{mass,oedema}` | Haematoma / oedema volume | Intracranial mass volume | mL | 0 | — | radiology | `mass`, `oedema` | ✗ |
| 244 | `ev.anaesthesia.outputs.pupilMm` | Pupils | Pupil diameter (add reactivity, symmetry) | mm | 2–4 (light) | — | GCS/neuro obs | `pupilMm` | ✗ |

### 5.10 Kidney

| # | engine key | Label | Name | Unit | Adult normal | Child / Preg | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|---|
| 245 | `ev.organs.kidney.uopMlKgH`, `uop1hMlKgH` | UO | Urine output (instant, last hour) | mL/kg/h | ≥ 0.5 | child ≥ 1 | KDIGO | `uopMlKgH` / `uop1hMlKgH` | ✗ |
| 246 | `ev.organs.kidney.cumMl`, `bagMl` | UO total / Urometer | Cumulative urine; bag volume | mL | — | — | fluid chart | `cumMl` / `bagMl` | ✗ |
| 247 | `ev.organs.kidney.rbf` | RBF | Renal blood flow (engine 552 mL/min at rest under GA: check the definition against the normal) | mL/min | 1,000–1,200 (≈ 20 % of CO) | Preg +50 % | textbooks | `rbf` | ✗ |
| 248 | `ev.organs.kidney.gfr` | GFR | Glomerular filtration rate | mL/min (mL/min/1.73 m²) | 90–120 | Preg +50 % | KDIGO | `gfr` | ~ |
| 249 | `ev.organs.kidney.akiStage` | AKI stage (KDIGO) | KDIGO stage 0–3 (UO criterion only until creatinine exists) | 0–3 | 0 | — | KDIGO | `akiStage` | ~ |
| 250 | `ev.organs.kidney.oliguria` | Oliguria | UO < 0.5 mL/kg/h (≥ 6 h for KDIGO) | yes/no | no | child < 1 | KDIGO | `oliguria` | ~ |
| 251 | `ev.organs.kidney.bladderMl` | Bladder volume | Bladder urine volume (no catheter) | mL | < 400–500 | — | bladder scan | `bladderMl` | ~ |
| 252 | `organs.iap` | IAP | Intra-abdominal pressure | mmHg | 0–5 (IAH ≥ 12; ACS > 20 + organ failure) | Preg ↑ | WSACS | Intra-abdominal pressure | ✓ |

### 5.11 Liver, metabolism and endocrine

| # | engine key | Label | Name | Unit | Adult normal | Child / Preg | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|---|
| 253 | `ev.organs.liver.hbfRel` | HBF | Hepatic blood flow (engine relative) | L/min (× baseline) | ≈ 1.5 (25 % of CO) | — | textbooks | `hbfRel` | ✗ |
| 254 | `ev.organs.liver.kLacPerH` | Lactate clearance | Hepatic lactate clearance constant | /h (show t½) | t½ ≈ 20–30 min | — | textbooks (clearance %) | `kLacPerH` | ✗ |
| 255 | `ev.organs.liver.liverFn` | Liver function | Liver synthetic/metabolic function index (model) | 0–1 | 1 | — | engine; label as MELD/Child–Pugh-like only when the labs exist | `liverFn` | ✗ |
| 256 | `ev.endo.glucoseMmolL/MgDl` | Glucose | Blood glucose (truth) | mmol/L (mg/dL) | 3.9–7.8 | — | all | GLU (ENDO) | ~ |
| 257 | `ev.endo.insulinUuMl` | Insulin | Plasma insulin | µU/mL (mU/L) | fasting 2–20 | Preg ↑ (insulin resistance) | chemistry | `insulinUuMl` | ✗ |
| 258 | `ev.endo.epinephrinePgMl` | Adrenaline | Plasma adrenaline (epinephrine) | pg/mL | < 50–100 at rest | — | chemistry | `epinephrinePgMl` / "epi" | ✗ |
| 259 | `ev.endo.norepinephrinePgMl` | Noradrenaline | Plasma noradrenaline | pg/mL | 100–400 at rest | — | chemistry | `norepinephrinePgMl` | ✗ |
| 260 | `ev.endo.cortisolNmolL` | Cortisol | Plasma cortisol | nmol/L | 140–690 (morning) | Preg ↑ | chemistry | `cortisolNmolL` / "cortisol" | ~ |
| 261 | `ev.endo.stressIndex` | Stress response | Surgical stress index (model; instructor) | 0–1 | 0 | — | engine | `stressIndex` / "stress" | ✗ |
| 262 | `ev.endo.mhActivity` | MH activity | Malignant hyperthermia crisis activity (instructor) | 0–1 | 0 | — | engine | `mhActivity` / "MH" | ~ |

### 5.12 Neuromuscular block, depth and consciousness

| # | engine key | Label | Name | Unit | Normal / target | Child / Preg | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|---|
| 263 | `ev.anaesthesia.tof.t1` | T1 | First-twitch height (% control) | % | 100 | — | NMT monitors | `t1` | ✗ |
| 264 | `ev.anaesthesia.block.thumb`, `.dia` | Block (AP / diaphragm) | Fractional receptor block at adductor pollicis and diaphragm | % | 0 | — | teaching | `thumb`, `dia` | ✗ |
| 265 | `ev.anaesthesia.macBrain`, `macEff` | MAC (brain), MAC (opioid-adjusted) | Brain partial-pressure MAC; effective MAC after opioid reduction | MAC | — | — | teaching | `macBrain`, `macEff` | ✗ |
| 266 | `ev.anaesthesia.etPct.<agent>` | EtSEV / EtISO / EtDES / EtN₂O | End-tidal agent per agent | % | — | — | Phil/GE agent labels | `sevoflurane` (key only) | ✗ |
| 267 | `ev.anaesthesia.conscious`, `awarenessRisk`, `movement` | Consciousness / Awareness risk / Movement | Clinical state flags | yes/no | — | — | clinical words | as keys | ~ |
| 268 | `ev.anaesthesia.outputs.antinoc` | Antinociception | Opioid/hypnotic antinociception level (model; the analgesia monitors NOL/ANI/SPI are its clinical cousins) | 0–1 | — | — | engine | `antinoc` | ✗ |
| 269 | `ev.neuroMark.kind` | Event | Fasciculation, movement, awareness, emergence, loss of consciousness, apnoea, breathing, recurarisation, MH trigger | — | — | — | clinical words | camelCase ids | ~ |

### 5.13 Drugs and anaesthetic gases

| # | engine key | Label | Name | Unit | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|
| 270 | `ev.drugs.drugs.<id>.cp` | Cp | Plasma concentration | drug unit (µg/mL propofol; ng/mL opioids, NMBs) | TCI pumps "Cp" | Cp | ✓ |
| 271 | `ev.drugs.drugs.<id>.ce` | Ce | Effect-site concentration | drug unit | TCI pumps "Ce" | Ce | ✓ |
| 272 | `.rate`, `.tci` | Rate / Target | Infusion rate; TCI target (plasma or effect, model name) | per row | TCI pumps | rate / tci | ✓ |
| 273 | `.totalAmount` | Total | Cumulative dose | mg, µg | anaesthesia record | total | ✓ |
| 274 | `.decrement50Min` | CSHT (50 %) | Context-sensitive half-time (time for Cp to fall 50 % if stopped now) | min | Hughes 1992 "CSHT" | `decrement50Min` / "dec50" | ✗ |
| 275 | `ev.drugs.volatile.{fi,fa}` | Fi / Fet (agent) | Inspired and end-tidal (alveolar) agent fraction | % | agent monitor "Fi/Et" | FI / FA | ~ |
| 276 | `ev.drugs.volatile.{dialPct,fgfLpm}` | Dial / FGF | Vaporiser setting; fresh gas flow | %, L/min | anaesthesia machine | dial / FGF | ✓ |
| 277 | `ev.drugs.volatile.macAge` | MAC (age) | Age-adjusted 1 MAC of the agent | % | Mapleson 1996 | age MAC | ~ |
| 278 | `pk.bus.agents.<id>.{nmj,dia,vent}` | Ce (NMJ / diaphragm / ventilatory) | Site-specific effect-site concentrations | drug unit | teaching | `nmj`, `dia`, `vent` | ✗ |
| 279 | `pk.bus.cns.*`, `pk.bus.airway.*`, `hpvInhibit`, `avNodeBlock` | Drug effects (CNS, bronchodilation, histamine, HPV inhibition, AV-node block) | Class-level effects (instructor) | fraction | engine | raw keys | ✗ |

### 5.14 Devices and resuscitation

| # | engine key | Label | Name | Unit | Normal / typical | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|
| 280 | `dev.defib.energyJ`, `state`, `sync`, `shocks` | Energy / Charging–Ready / SYNC / Shocks | Defibrillator | J | biphasic adult 120–200; child 2–4 J/kg | defibrillators | header text "120 J READY SYNC" | ✓ |
| 281 | `dev.pacer.{mode,ratePpm,mA}` | Pacer mode / Rate / Output | Transcutaneous pacer | ppm, mA | rate 60–80; capture typically 40–80 mA | defibrillators ("PACER … ppm … mA") | header text | ✓ |
| 282 | `ev.state.values.paceThresholdMa` | Capture threshold | Current needed for electrical capture | mA | 40–80 | — | `paceThresholdMa` | ✗ |
| 283 | `hemo.cpr.{rate,quality}` | CPR rate / quality | Compression rate; depth/recoil quality (model 0–1.2) | /min, — | 100–120/min, depth 5–6 cm, CCF > 60 % | ERC/AHA | `rate`, `quality` | ~ |
| 284 | `hemo.iabp.{ratio,volumeMl,inflateOffsetMs,deflateOffsetMs}` | IABP ratio / Balloon volume / Timing | Intra-aortic balloon pump | 1:1–1:3, mL, ms | 40 mL balloon | IABP consoles | raw keys | ✗ |
| 285 | `hemo.lvad.{rpm,…}`, `ev.circ.lvad.{flowLpm,pi,powerW,suction}` | Speed / Flow / PI (LVAD) / Power / Suction | Continuous-flow LVAD | rpm, L/min, —, W | HM3 speed 5,000–6,000; flow 4–6; power 4–5 W | LVAD controllers | raw keys (`pi` collides with SpO2 PI) | ✗ |
| 286 | `resp.driver.preox` | Preoxygenation | Face-mask preoxygenation (FiO2, duration) | —, s | 3 min tidal or 8 deep breaths | Miller | `preox` | ✗ |

### 5.15 Obstetric (R59; all planned)

| # | proposed key | Label | Name | Unit | Normal (term) | Convention | Current label | Flag |
|---|---|---|---|---|---|---|---|---|
| 287 | `profile.pregnancyWeeks` | GA (weeks) | Gestational age | weeks | 37–42 term | obstetrics | — (lung severity only) | new |
| 288 | fetal HR | FHR | Fetal heart rate baseline | bpm | 110–160 | NICE/FIGO CTG | — | new |
| 289 | FHR variability | Variability | Baseline variability | bpm | 5–25 | FIGO | — | new |
| 290 | decelerations | Decels (early / late / variable / prolonged) | FHR decelerations | — | none or early | FIGO | — | new |
| 291 | uterine pressure | Toco (UA) | Uterine activity / contractions | mmHg or a.u.; /10 min | ≤ 5 per 10 min | CTG | — | new |
| 292 | uterine blood flow | UBF | Uterine blood flow | mL/min | ≈ 700–800 at term (≈ 10 % of CO) | obstetric physiology | — | new |
| 293 | aortocaval | Tilt / position | Left lateral tilt; supine hypotension | ° | ≥ 15° left tilt | obstetric anaesthesia | — | new |
| 294 | neuraxial level | Block height | Sensory block level (dermatome) | T-level | T4 for caesarean | obstetric anaesthesia | — | new |


### 5.16 Rules for the glossary's use (proposed for Ali's review, R56)

1. **One label per quantity, everywhere.** The console's `meta.ts` CURATED map, the renderer tile headers, the lab
   panel rows, the ventilator page, the scenario editor and the docs all read this table (Stage 9 generates a
   `glossary.ts` from it). Any label not in the table is a bug.
2. **Vendor aliases are skin data.** ART/ABP, NIBP/NBP, PR/Pulse, PI/Perf, FiCO₂/imCO₂, awRR/AWRR, T1/Tcore and
   DoA index (BIS/SE-RE/PSi/BFI) come from the skin. The engine key never changes.
3. **Collisions are resolved by the label, not the key:**
   - CPP = cerebral; CoPP = coronary.
   - PI = perfusion index; "PI (LVAD)" = pulsatility index.
   - SR = suppression ratio on the depth tile only; the rhythm is never abbreviated "SR".
   - RR = respiratory rate; the R–R interval is written "R–R".
   - The lab SO₂ becomes FO₂Hb (fractional), with functional sO₂ beside it.
4. **Units are clinical units at display time:**
   - Fractions show as % (SaO₂, SvO₂, SjvO₂, FiO₂, EF, shunt, VD/VT).
   - CaO₂ shows in mL/dL; SVR/PVR in dyn·s·cm⁻⁵ (WU on request); pressures in mmHg; airway pressures in cmH₂O,
     with pleural pressure in both units.
   - CO₂ can show in mmHg, kPa or %V per skin; glucose in mmol/L with mg/dL beside it; Hb in g/dL (g/L per locale).
   - Relative engine values (`cbf`, `cmro2`, `hbfRel`) show in absolute clinical units via their stated reference
     (CBF 50 mL/100 g/min, CMRO₂ 3.3, HBF 1.5 L/min), or they stay instructor-only.
5. **Engine internals stay internal.** About 800 of the 1,087 visible console leaves are model parameters, integrator
   state or cross-stage multipliers (the unit sigmoids, `baro.*`, `ext.*`, the drug bus). They get an **"Engine"**
   label style (monospace key, no abbreviation) under a collapsed "Model internals" section, never a clinical-looking
   name. Items 67, 68, 85, 88, 89, 118, 127, 134, 261, 268, 279 are the ones to keep for instructors, labelled as
   model quantities.
6. **Normal ranges come from this table, per age band and pregnancy.** The lab panel's hard-coded ranges
   (`lab-panel.ts`) and the skins' alarm limits cite this table or research/06.

---

## 6. Files

- `research/11-capability-inventory-and-glossary.md` — this file.
- `research/11-inventory-scripts/dump.ts`, `hooks.mjs` — the read-only live dump (Node ≥ 24).
- `research/11-inventory-scripts/leaves-ventilated-ga.tsv` — the 1,863 console leaves of the instrumented GA run,
  with group, visibility, value, current label and unit (the raw material for §2 and the flags in §5).
- `research/11-inventory-scripts/leaves-devices.tsv` — the same run with IABP and a transcutaneous pacer.
- `research/12-coverage-matrix.md` — the R54 coverage-audit design that uses this inventory.
