# Physiology overview

Codes such as FU-4, R45 or 7a in this page are labels of the project's internal records (gate notes and plans); they will be replaced by plain names after this release candidate.

What the engine simulates, organ by organ, and in which mode. This page is derived from the code and the stage gate
notes on `main` at the v1.0.0-rc.1 release; numbers that measure realism are in the
[validation summary](validation-summary.md), and every known miss is in [known-deviations.md](known-deviations.md).

This is a teaching simulator for anaesthesia education. It is not a medical device, it is not clinically validated,
and it is not for diagnostic use (`docs/DESIGN-BRIEF.md` §1, non-goals). Numbers quoted below are the engine's own
measurements against teaching bands, each from the gate note named beside it; a met band is not a clinical claim.

## Two modes over one state

The engine keeps one patient state (L1), synthesises signals from it (L2) and measures them like a monitor (L3). The
L1 state is driven in one of two modes (brief §4.9):

- **MANUAL** — the instructor sets targets (HR, SBP/DBP, SpO2, EtCO2, RR, temperature, …) with ramps, or pins them;
  fixed coupling rules keep dependent channels consistent (e.g. a rhythm's mechanical output, SpO2 lag after an
  airway loss). Drugs and conditions act only where a MANUAL rule exists for them. In the code
  (`grep -rn "mode === 'modeled'" packages/engine-core/src`) the circulation, lung, gas, blood, organ, PK and
  neuromuscular models all run in MANUAL too; MANUAL differs in what drives them:
  - **Circulation:** set-and-hold trackers fit the circuit to the instructor's pressures, then stop after 5–8 s on
    target, "so PEEP/bleeding/drugs/conditions act on top" (`docs/gates/stage-7a.md` §2; `l2/hemo/pipeline.ts`). Drug
    and condition terms on SVR, contractility, venous capacity and PVR therefore act in MANUAL (`l2/circ/model.ts`):
    propofol in a MANUAL hypovolaemic patient falls to a MAP nadir of 35 (`docs/gates/fu-4.md` §2–3).
  - **Rhythm requests from drugs** (adenosine, local-anaesthetic toxicity, antiarrhythmic conversion, the
    repeat-succinylcholine bradyarrhythmia, pre-excited AF) have no mode check (`l2/pk/hooks.ts`); adenosine was
    tested in MANUAL (`docs/gates/stage-7g.md` §2).
  - **Breathing:** the instructor's RR and VT are multiplied by the drug and neuromuscular factors, and an apnoea
    sets RR 0 (`l2/resp/pipeline.ts`; remifentanil apnoea in MANUAL, `docs/gates/stage-7f.md`). Depth and TOF are
    the same in both modes.
  - **Gas targets** (SpO2, EtCO2, temperature) place the model when the instructor changes them (they solve a shunt,
    a dead space, a heat state); lung conditions, MH and cooling then act on top (`l2/resp/pipeline.ts`).
  - **Endocrine:** the conditions' HR rows, stress and fever scale the sinus clock; their SVR, contractility and
    venous terms are held neutral, "the instructor owns the pressures" (`l2/endo/adapters.ts` `writeCirc`).
  - **Brain:** Cushing's response is a MANUAL coupling rule on SBP/DBP and HR (`l2/organs/effects.ts`; check 19 MANUAL
    ΔMAP +41.7, `docs/gates/stage-7d.md`).
  - **Not in MANUAL:** the baroreflex and chemoreflex, every drug's direct HR term (opioid vagotonia, atropine,
    β-blocker bradycardia, inotrope tachycardia), AF rate control, hypoxic myocardial depression and the hypoxic
    arrest, the chemoreflex breathing drive, and the haemoglobin-viscosity term on SVR. HR, SBP/DBP and the gas
    targets otherwise stay where the instructor puts them.
  - **MANUAL cannot show very low pressures:** a MANUAL arterial target of 18/10 mmHg displays about 65/30 (the
    tracker floors it; a recorded miss).
- **MODELED** — a lumped physiology computes the state: the four-chamber circulation with its reflexes and coronary
  balance (7a); two lungs feeding one gas-mixing point with O2/CO2 stores (Stage 3, 7b); blood, acid–base,
  electrolytes and fluids (7c); brain, kidney and liver (7d); endocrine stress, glucose and thermoregulation (7e);
  depth, ventilatory drive and neuromuscular block (7f); compartment PK with effect-site PD for 65 drugs (7g); and
  the integration work that couples them (FU-4: sympatholysis, the emergent arrest, hyperkalaemia, obstructive
  shock, vagal events). The instructor can still pin any variable: a pin overrides the displayed output while the
  model keeps running, and a release blends back to the model's value (brief §4.9).

**Labels on this page:** **both** = the same behaviour in MANUAL and MODELED; **MODELED only** = emerges only from the
MODELED physiology (in MANUAL the instructor must script it); **MANUAL only** = exists only as a MANUAL rule;
**INTERIM** = a stand-in marked `INTERIM` in the code until a later stage replaces it. Every table of ids on this page
has a **Mode** column whose cell starts with one of these four labels. A row labelled **both** names, in its own
cell, any part that is MODELED only.

## Device layer (both)

The monitor layer measures the L1 truth the same way in either mode (brief §6).

- **HR:** the last 12 R–R intervals averaged without the longest and shortest (IEC-style; the `philips-like` skin
  uses the plain mean of 12), or the `saadat-like` skin's 8 s time window; falls back to pleth or ABP when the leads are off (§6.1).
- **SpO2 and PR:** a device chain with site delay, averaging and its own pleth peak detector; the displayed SpO2
  keeps falling 10–30 s after ventilation resumes (§4.3, §6.1; coupling rule M5).
- **NIBP:** a cuff state machine (inflate, step-deflate, result with timestamp, or fail) with AUTO and STAT; a failed
  measurement shows `---`, never the last value (§6.3; FU-7.1 b B8, `docs/gates/fu-7.1-b.md`).
- **EtCO2, capnogram and awRR:** sidestream or mainstream sampling with warm-up (§4.4, §6.2).
- **Probe states:** ECG leads, SpO2 site, cuff, transducers (zeroing, damped), CO2 line and temperature probe can be
  attached, off or in artefact (§6.2).
- **Alarms:** an IEC-style priority model with technical alarms, plus the `saadat` sound profile (§6.4, §6.4.1;
  FU-5, `docs/gates/fu-5.md`). The labels are "IEC-style": no compliance with any alarm standard is claimed (§1).
- **Pacer and defibrillator:** capture thresholds, mechanical capture, shock outcome by rule and by state (§6.5;
  FU-7 task 12).
- **12-lead capture:** the last 10 s projected from the vector buffer, with fiducial measurements (§6.6).
- **Trends and event log:** 1 Hz numerics for 8 h; every command, alarm, drug and shock logged (§6.7).

## Rhythms (both)

36 rhythm ids (`RHYTHM_IDS`, `packages/engine-core/src/l2/ecg/rhythms.ts`). Each is a configuration of the atrial
and ventricular clocks, the AV node, an optional focus and an optional pacemaker. Any organised rhythm can be made
pulseless (PEA, the `pulseless` option). VF uses recorded CUDB textures and AF uses recorded MIT-BIH f-wave segments
(`docs/gates/stage-5.md`). In MODELED the circulation drives the sinus-node rate; other rhythms keep their set rate, with AF and
the sensing pacemakers modulated within bounds (`l2/circ/rate-rule.ts`).

| `id` | Rhythm | Mode | Notes |
|---|---|---|---|
| `sinus` | Sinus rhythm | both | rate 20–250 |
| `sinusBrady` | Sinus bradycardia | both | |
| `sinusTachy` | Sinus tachycardia | both | |
| `sinusArrhythmia` | Sinus arrhythmia | both | |
| `sinusPause` | Sinus pause / arrest | both | adenosine's pause on a sinus rhythm |
| `atrialTach` | Atrial tachycardia | both | |
| `mat` | Multifocal atrial tachycardia | both | |
| `afib` | Atrial fibrillation | both | recorded f-waves; AF rate control by drugs is MODELED only |
| `aflutter` | Atrial flutter | both | ratio 2:1, 3:1, 4:1 or variable |
| `svtAvnrt` | SVT (AVNRT) | both | adenosine converts it |
| `svtAvrt` | SVT (AVRT) | both | |
| `wpwSinus` | Sinus with pre-excitation | both | |
| `preexcitedAf` | Pre-excited AF | both | AV-nodal blockers carry a VF hazard (FU-7) |
| `junctionalEscape` | Junctional escape | both | |
| `junctionalAccel` | Accelerated junctional | both | |
| `junctionalTachy` | Junctional tachycardia | both | |
| `avb1` | First-degree AV block | both | |
| `avb2Mobitz1` | Second-degree, Mobitz I | both | |
| `avb2Mobitz2` | Second-degree, Mobitz II | both | |
| `avb2to1` | 2:1 AV block | both | |
| `avbHighGrade` | High-grade AV block | both | 3:1 or 4:1 |
| `avb3Narrow` | Complete block, junctional escape | both | |
| `avb3Wide` | Complete block, ventricular escape | both | |
| `idioventricular` | Idioventricular rhythm | both | |
| `aivr` | Accelerated idioventricular | both | |
| `vtMono` | Monomorphic VT | both | output falls with rate (VT 220 is pulseless, `docs/gates/stage-7a.md`); antiarrhythmic conversion hazard |
| `vtPoly` | Polymorphic VT | both | |
| `torsades` | Torsades de pointes | both | |
| `vfCoarse` | Coarse VF | both | recorded textures; decays towards asystole |
| `vfFine` | Fine VF | both | |
| `asystole` | Asystole | both | |
| `pWaveAsystole` | P-wave asystole | both | adenosine's standstill in AVNRT |
| `agonal` | Agonal rhythm | both | |
| `pacedAAI` | Paced, AAI | both | |
| `pacedVVI` | Paced, VVI | both | |
| `pacedDDD` | Paced, DDD | both | |

## Circulation (Stage 7a)

A circuit of four time-varying-elastance chambers, four valves (stenosis and regurgitant orifice), a pericardium, a
continuous pleural pressure, a systemic 4-element Windkessel with an aorta-to-radial resonator, systemic veins, a
pulmonary artery and two parallel lung beds, integrated at 2 ms (`l2/circ/circuit.ts`). The arterial baroreflex
(vagal and sympathetic limbs), a cardiopulmonary limb, the chemoreflex and the humoral arm (FU-4) are **MODELED
only**; so are the drug HR terms and AF rate control. The coronary supply/demand balance drives ischaemia, ST
depression and contractility in both modes; the RV's own ischaemia and hypoxic depression are MODELED only
(`l2/circ/model.ts`). Devices: IABP and LVAD (both; MANUAL trackers freeze while a device runs). VA-ECMO and
cardiopulmonary bypass are typed but not modelled (below). Profile age bands, sex and a body-size rule set the
circuit (FU-8 A13).

| `id` | Mode | Effect |
|---|---|---|
| `tamponade` | both | pericardial fluid (250 mL × severity by default), accumulation and drainage (FU-4 G6); 200 mL: CVP 15.1, CO −28 % (`docs/gates/stage-7a.md`); compensatory tachycardia MODELED only |
| `pe` | both | PVR by the obstruction fraction, one command for circulation and lungs; massive PE: EtCO2 33 → 17, but SaO2 stays 97.8 % and CVP/MAP 9.3/82 (bands < 90 %, ≥ 15/< 65: recorded misses, `docs/gates/fu-4.md`) |
| `tensionPtx` | both | an alias of the lungs' `ptxTension`: pleural pressure fills through a one-way valve; PEA at +9.75 min (`docs/gates/fu-4.md` S8) |
| `rvInfarct` | both | RV contractility loss; CVP rises only +1.3–1.8 (`docs/gates/stage-7a.md`), and the validation rows miss their bands (CVP 6.9 vs 14–18, PAWP 3.3 vs 8–12, MAP 86 vs 60–70; [known-deviations.md](known-deviations.md)) |
| `hfref` | both | LV Ees ×0.45, dilatation, LVEDP 18; MAP set point 75 and reflex terms MODELED only |
| `hfpef` | both | LV stiffness ×2.5, arterial compliance ×0.7, LVEDP 18 |
| `htn` | both | MAP set point +20 and SVR ×1.2 (MODELED only; in MANUAL the trackers fit SVR to the instructor's pressures), stiffer arteries |
| `as` | both | aortic stenosis by valve area grade, concentric hypertrophy |
| `ar` | both | aortic regurgitation by orifice grade |
| `mr` | both | mitral regurgitation by orifice grade (severe: PAWP 19.4, `docs/gates/stage-7a.md`) |
| `ms` | both | mitral stenosis by valve area grade |
| `tr` | both | tricuspid regurgitation by orifice grade |
| `cad` | both | coronary flow reserve by grade (recent MI: LV Ees ×0.8) |
| `betaBlocked` | both | chronic β-blockade: HR 60, β-agonist response shifted by receptor occupancy (both); blunted reflex HR MODELED only |
| `rvFailure` | both | RV Ees ×0.5 |
| `ph` | both | PVR 3/5/10 Wood units by grade, RV Ees ×1.3–2 (FU-8 A18) |

## Lungs, ventilation and gas exchange (Stage 3, 7b, V, V.1)

Two lung compartments (per-side compliance, resistance, aeration, recruitability) feed one gas-mixing point with
V/Q admixture, shunt, alveolar dead space and hypoxic pulmonary vasoconstriction; O2 and CO2 stores with their own
kinetics give EtCO2 at once and SpO2 late after an airway loss (Stage 3, `docs/gates/stage-3.md`; 7b,
`docs/gates/stage-7b.md`). The capnogram has phases and an α angle (ventilated 105.6°; bronchospasm severity 1:
157.4°, `docs/gates/stage-3.md`). Lung mechanics and gas exchange run in both modes. The chemoreflex breathing drive
(CO2 and O2 response, fatigue, triggering) is **MODELED only** (7f, FU-6); MANUAL scales the instructor's RR/VT.
The ventilator link sends frames in and reads an absolute `lungState` out, on the 7b lungs since V.1
(`docs/gates/stage-V.md`, `docs/gates/stage-v1.md`). Respiratory mechanics readouts (Pplat, ΔP, PEEPi, VD/VT, lung
volumes) are 7k's (`docs/gates/stage-7k.md`). The 32 catalogue conditions (`LUNG_CONDITION_IDS`;
`docs/physiology/stage-7-lung-pathology-catalogue.md`) take a severity; sided ones take L or R. The 7b gate
measured all 32: 23 meet every band, 9 carry recorded misses (`docs/gates/stage-7b.md` §1). INTERIM: the ventilator
link's `anaphylaxis-bronchospasm` and `air-embolism` profiles still set their shock as MANUAL targets
(`packages/ventilator/src/link/profiles.ts`).

| `id` | Mode | Effect |
|---|---|---|
| `ph` | both | pulmonary hypertension: PVR, alveolar dead space, diffusion; PEEP lowers BP |
| `bronchospasm` | both | resistance ×(1 + 5·sev^1.5), slow compartment, auto-PEEP, steep capnogram |
| `asthma` | both | chronic grades to acute severe: resistance, gas trapping, compliance |
| `anaphylaxis` | both | the respiratory component (bronchospasm by grade I–V); the circulation part is under Endocrine below |
| `copd` | both | resistance, gas trapping, V/Q, PVR; chronic hypercapnia by GOLD grade (resting PaCO2 set to 40/40/45/55; GOLD 4 measured 50.5, `docs/gates/stage-fu-9b.md`) |
| `ards` | both | low compliance, atelectasis and consolidation, recruitability, shunt, PEEP response |
| `ild` | both | stiff small lungs, diffusion limit, shunt |
| `ssc` | both | systemic sclerosis: ILD with a stiff chest wall |
| `chestWall` | both | kyphoscoliosis: chest-wall restriction |
| `obesity` | both | chest wall, low FRC, induction atelectasis by BMI class |
| `pneumonia` | both | sided consolidation, HPV, shunt |
| `atelectasis` | both | sided lobar collapse |
| `pulmOedema` | both | lung water shunt, compliance, resistance |
| `effusion` | both | sided compression atelectasis, pleural pressure |
| `ptxSimple` | both | sided lung collapse |
| `ptxTension` | both | sided pleural pressure through a one-way valve (FU-4 18c), obstructive shock |
| `haemothorax` | both | sided compression atelectasis, pleural pressure |
| `pe` | both | alveolar dead space, shunt, bronchoconstriction (the circulation part above) |
| `fatEmbolism` | both | fat embolism / cement syndrome: PVR, dead space (BCIS grades) |
| `vae` | both | venous air embolism: PVR, dead space |
| `aspiration` | both | sided resistance, compliance, shunt |
| `olv` | both | one-lung ventilation: perfusion share, HPV |
| `endobronchial` | both | right mainstem intubation |
| `bpf` | both | bronchopleural fistula: leak fraction |
| `airwayObstruction` | both | tracheal or tube obstruction: resistance |
| `cf` | both | cystic fibrosis: resistance, plugging, V/Q |
| `nmWeakness` | both (spontaneous-effort part MODELED only) | weak spontaneous breathing through the drive's maximal pressure and CO2 response; in MANUAL only its chest-wall and atelectasis terms act |
| `diaphragmParalysis` | both | sided atelectasis and FRC; the weaker spontaneous effort is MODELED only |
| `pregnancy` | both | respiratory only: FRC ×0.8 at term, chest wall, PVR (no obstetric physiology) |
| `neonatalRds` | both | respiratory mechanics only; on the adult rig the shunt misses its band, 0.16 vs 0.2–0.4 (`docs/gates/stage-7b.md`) |
| `covidPneumonitis` | both | L to H phenotype: compliance, shunt, HPV |
| `smokeInhalation` | both | lower-airway component: resistance, V/Q, dead space |

## Blood, acid–base, electrolytes and fluids (Stage 7c)

Oxygen dissociation curve feeding the lungs' mixing point; Stewart acid–base with dynamic SID and a bounded pH
solver; Na, K, Cl, iCa, Mg; lactate from the O2 deficit, cleared by the liver; haemoglobin, haemorrhage and
transfusion (cold units cool the core; massive transfusion raises K and lowers iCa); crystalloid kinetics (1 L
Ringer's lactate: 51.5 % retained at the end of the infusion) with capillary leak (`docs/gates/stage-7c.md`). All run in both modes: class III haemorrhage gives lactate
4.3 and pH 7.23 at 30 min (7c §1); hyperkalaemia acts on the ECG, contractility and the arrest hazard (FU-4 G3).
FU-9 added fluid expansion and filtration, citrate, albumin, alkalosis, osmolality and intra-abdominal pressure
(`docs/gates/fu-9.md`). The SVR effect of blood viscosity is MODELED only (`l2/blood/pipeline.ts`).

| `id` | Mode | Effect |
|---|---|---|
| `burns` | both | succinylcholine K surge up to +6.5 (burns + sux: K 7.7 at 4 min, `docs/gates/stage-7c.md`); non-depolariser resistance; capillary leak |
| `dka` | both | ketoacid load: AG 27, HCO3 8.6, pH 7.08 at severity 0.8 (7c); the respiratory compensation is MODELED only |

## Brain, kidney, liver (Stage 7d)

Brain: Monro–Kellie pressure–volume, CSF with a finite reserve, autoregulation, CO2/O2 reactivity, drug CMRO2 and
vasodilation, ICP/CPP/CBF/PbtO2/SjvO2, Cushing's response with both triggers, osmotherapy, head-up and herniation;
a 125 Hz ICP channel. Kidney: renal perfusion → GFR → urine output, ported from Pulse's renal circuit. Liver: lactate
and drug clearance (`docs/gates/stage-7d.md` §1). All three run in both modes; with MODELED the brain reads the
circulation's own flows (`l2/organs/inputs.ts`).

| `id` | Mode | Effect |
|---|---|---|
| `tbi` | both | raised ICP, Cushing's response (MANUAL: coupling rule on SBP/DBP and HR; MODELED: SVR plus the baroreflex's bradycardia) |
| `hepaticFailure` | both | lower lactate and drug clearance |
| `aki` | both | lower GFR and urine output |

## Endocrine, thermal and system conditions (Stage 7e)

Stress hormones (catecholamines, cortisol, the humoral AVP/angiotensin arm of FU-4), glucose and insulin, ketones,
thyroid, and thermoregulation: anaesthesia-induced hypothermia (unwarmed GA −0.93 / −1.26 °C at 30 / 60 min),
forced-air and fluid warming, shivering, MH (`docs/gates/stage-7e.md`). In MANUAL their HR terms act on the sinus
clock; their SVR, contractility and venous terms act in MODELED only (`l2/endo/adapters.ts`).

| `id` | Mode | Effect |
|---|---|---|
| `mh` | both | rising VCO2 and EtCO2 (63 mmHg at 10 min), core +1.17 °C at 15 min, K 6.0, HR 75 → 141 at 20 min; dantrolene turns it (7e) |
| `sepsis` | both | HR, fever awake and glucose (MANUAL: HR 120, core 38.76 °C, glucose 169, 7e); the vasodilatory shock is MODELED only; in the engine tests warm CO (5.0 vs 7–9 L/min) and warm SVR (861 vs 500–700) miss, and the validation document reads MAP 87 against 55–60 (its heart rate is held by the runner); no fever under GA; not fit for teaching (below) |
| `anaphylaxis` | both | HR, capillary leak and bronchospasm; the vasoplegic shock (grade III MAP 94 → 62, epinephrine rescue) is MODELED only |
| `sirs` | both | HR and metabolic rate; vasoplegia MODELED only |
| `hypermetabolic` | both | VO2 up to ×3, heat, HR (serotonin syndrome, NMS) |
| `thyroidStorm` | both | core 38.60 °C, VO2 ×1.57, HR 135 awake at 2 h (7e); SVR ×0.60 MODELED only; no fever under GA |

## Depth of anaesthesia, drive and neuromuscular block (Stage 7f)

- **Depth index (both):** from one hypnotic-potency and one opioid-potency output (FU-7); propofol Ce 3 / 4 µg/mL →
  DI 47.7 / 37.7, 1.0 MAC → 42.0; a cold core lowers MAC (7e) (`docs/gates/stage-7f.md`).
- **Ventilatory drive:** drug depression of the drive acts in both modes (MANUAL: multipliers on the instructor's
  RR/VT, apnoea at RR 0; MODELED: on the chemoreflex). The CO2 response itself (e.g. Winter's compensation of a
  metabolic acidosis, PaCO2 29.4 at HCO3 13.6) is **MODELED only** (7f Task 13).
- **Neuromuscular block (both):** effect sites for thumb and diaphragm, TOF and PTC, interactions with volatiles
  (+13 % against 20–45 %, a recorded miss), temperature, magnesium, potassium and myasthenia, reversal by sugammadex and neostigmine (7f; FU-9 B1).

## Drugs (Stage 7g)

PK models: Eleveld, Schnider and Marsh (propofol, with TCI to plasma or effect site), Minto (remifentanil), Shafer
(fentanyl), Gepts (sufentanil); a dose-response time course for the other boluses and infusions; per-kg rate
equivalents for vasoactive infusions; volatile uptake (FA/FI) with MAC by age; neuromuscular effect sites; and
"blood" rows whose dose enters 7c's chemistry. Effect-site PD with Hill curves combines by drug class
(`l2/pk/`). Engine Eleveld equals the standalone model to < 5·10⁻⁷ (`docs/gates/stage-7g.md` §2). The PK runs in both
modes. **MANUAL column, by default:** the drug's circulation terms (SVR, contractility, venous capacity, PVR) act on
top of the held targets; its direct HR term and every reflex response do not. 65 ids (`DRUG_IDS`).

| `id` | Class | Mode | MODELED | MANUAL |
|---|---|---|---|---|
| `propofol` | hypnotic | both | depth, drive, SVR/contractility/venous fall, sympatholysis and set-point reset (FU-4) | all but the sympatholysis and reflex terms |
| `ketamine` | dissociative | both | depth, sympathomimetic drive via 7e, direct myocardial depression, bronchodilation | depth, bronchodilation, depression, HR via 7e; the pressor part is MODELED only |
| `etomidate` | hypnotic | both | depth, small SVR fall, cortisol suppression (FU-10 A6) | same |
| `thiopental` | hypnotic | both | depth, SVR/contractility fall, HR rise | default |
| `midazolam` | benzodiazepine | both | sedation, drive with opioids, SVR/venous fall | same |
| `dexmedetomidine` | α2 agonist | both | SVR change, bradycardia | default (no bradycardia) |
| `fentanyl` | opioid | both | analgesia, drive, vagal bradycardia (10 µg/kg: 73 → 48, FU-4), SVR/venous fall | default (no bradycardia) |
| `remifentanil` | opioid | both | as fentanyl; separate ventilatory effect site | default (no bradycardia) |
| `sufentanil` | opioid | both | as fentanyl | default (no bradycardia) |
| `morphine` | opioid | both | analgesia, drive, histamine vasodilation (FU-7) | same |
| `sevoflurane` | volatile | both | uptake, MAC, depth, SVR/contractility, HR-arm depression, HPV inhibition, bronchodilation | default |
| `isoflurane` | volatile | both | as sevoflurane, HR rise | default |
| `desflurane` | volatile | both | as sevoflurane; cerebral vasodilation | default |
| `n2o` | volatile | both | MAC fraction, second-gas effect, SVR and PVR rise | same |
| `rocuronium` | neuromuscular blocker | both | TOF 0 at 1.32 min, T1 25 % at 30.0 min after 0.6 mg/kg (7f) | same |
| `vecuronium` | neuromuscular blocker | both | TOF course | same |
| `cisatracurium` | neuromuscular blocker | both | TOF course | same |
| `atracurium` | neuromuscular blocker | both | TOF course, histamine | same |
| `mivacurium` | neuromuscular blocker | both | TOF course, histamine | same |
| `succinylcholine` | depolariser | both | phase I block, K rise, seeded repeat-dose bradyarrhythmia | same (a rhythm request) |
| `sugammadex` | reversal | both | TOFR 0.9 in 2.11 min from TOF 2 (7g) | default |
| `neostigmine` | anticholinesterase | both | reversal with a ceiling, bradycardia | reversal (no bradycardia) |
| `glycopyrrolate` | anticholinergic | both (HR rise MODELED only) | HR rise, blocks vagal events | only prevents the repeat-succinylcholine bradyarrhythmia |
| `atropine` | anticholinergic | both (HR rise MODELED only) | HR rise (0.5 mg: 73 → 100, FU-4) | as glycopyrrolate |
| `phenylephrine` | α1 agonist | both | SVR, PVR, venoconstriction, reflex bradycardia | default (no reflex) |
| `ephedrine` | mixed adrenergic | both | SVR, venoconstriction, indirect drive via 7e, tachyphylaxis | default; HR via 7e |
| `norepinephrine` | α1/β1 agonist | both | SVR, contractility, venoconstriction, PVR | default |
| `epinephrine` | mixed adrenergic | both | HR, contractility, SVR, bronchodilation, K shift, glucose | all but the direct HR term |
| `vasopressin` | vasopressor | both | SVR | same |
| `dobutamine` | β agonist | both | contractility, HR, SVR fall (CO band missed, NR-7g-2) | default |
| `milrinone` | PDE3 inhibitor | both | contractility, SVR/PVR fall, HR | default |
| `dopamine` | mixed adrenergic | both | HR, contractility, SVR | default |
| `nitroglycerin` | vasodilator | both | venodilation, SVR/PVR fall, HPV inhibition | default (no reflex tachycardia) |
| `nitroprusside` | vasodilator | both | SVR/PVR fall, HPV inhibition | default |
| `hydralazine` | vasodilator | both | SVR fall | default |
| `esmolol` | β1 blocker | both | HR and contractility fall, AV-nodal block, β occupancy | contractility, blunts 7e's HR surge |
| `labetalol` | α/β blocker | both | as esmolol, SVR fall | as esmolol |
| `metoprolol` | β1 blocker | both | as esmolol | as esmolol |
| `glucagon` | metabolic | both | HR, contractility, glucose | default |
| `amiodarone` | antiarrhythmic | both | VT/AF conversion hazard, AF rate control, HR and SVR fall | conversion, SVR |
| `procainamide` | antiarrhythmic | both | VT conversion hazard, SVR/contractility fall | default plus conversion |
| `verapamil` | antiarrhythmic | both | AV-nodal block (AF rate), pre-excited AF hazard, SVR/contractility | default plus the pre-excited AF hazard |
| `adenosine` | adenosine | both | AVNRT → standstill → sinus (6 mg: sinus at 23.5 s, 7g) | same |
| `calciumChloride` | electrolyte | both | iCa; membrane stabilisation (QRS 126 → 93 ms in hyperkalaemia, 7c) | same |
| `calciumGluconate` | electrolyte | both | as calcium chloride | same |
| `potassiumChloride` | electrolyte | both | infused in mmol into 7c's potassium pool (FU-7.1 a A5) | same |
| `sodiumBicarbonate` | electrolyte | both | SID, HCO3, pH | same |
| `insulinDextrose` | metabolic | both | K shift, glucose | same |
| `magnesium` | electrolyte | both | SVR fall, bronchodilation, block potentiation (+11 % against 20–90 %, a recorded miss) | same |
| `salbutamol` | β2 agonist | both | bronchodilation, K shift, HR | default |
| `insulin` | metabolic | both | glucose, K shift, ketone clearance (FU-10) | same |
| `dextrose` | metabolic | both | glucose | same |
| `dantrolene` | MH treatment | both | ends MH activity: EtCO2 turns at +6.0 min (7e) | same |
| `furosemide` | diuretic | both | diuresis, venodilation | same |
| `mannitol` | osmotic | both | osmolality, ICP | same |
| `hypertonicSaline` | osmotic | both | Na, osmolality, ICP | same |
| `naloxone` | opioid antagonist | both | reverses opioid drive (breathing at +0.1 s, 7f) | same |
| `flumazenil` | benzodiazepine antagonist | both | reverses benzodiazepine | same |
| `lidocaine` | local anaesthetic | both | toxicity, VT conversion hazard, antinociception, myocardial depression | same |
| `bupivacaine` | local anaesthetic | both | toxicity: seizure, bradycardia, VF (225 mg in 70 kg: VF at 78 s, 7g) | same |
| `ropivacaine` | local anaesthetic | both | toxicity, by potency-weighted dose (FU-7) | same |
| `lipidEmulsion` | lipid | both | lowers the free local-anaesthetic level (×0.681 at 240 s, 7g) | same |
| `tranexamicAcid` | placeholder | both | PK and dose log only; no effect (coagulation is not modelled) | same |
| `ondansetron` | placeholder | both | QTc prolongation, no arrhythmia hazard | same |
| `dexamethasone` | placeholder | both | glucose rise over 1–2 h | same |

## Integration and state dependence (FU-4)

From `docs/gates/fu-4.md`. These behaviours come from the reflexes, the arrest model and the humoral arm, so they
are **MODELED only** unless marked; the MANUAL rows of the suite are listed.

- **State-dependent drug effects (MODELED only):** anaesthetic sympatholysis suppresses the delivered sympathetic
  output (G2). Propofol 2 mg/kg: healthy MAP −23 % (just short of the −25…−40 % band, a recorded miss), severe tamponade −79 %
  with PEA at +170 s, class III −68 % with no arrest (nadir 26.6 against 30–50, a recorded miss), massive PE PEA at
  +60 s (§3). MANUAL: healthy −21 %, hypovolaemia −35 % (nadir 35).
- **Low-flow arrest:** an arrest state machine declares low flow, no flow (MAP < 25 for 60 s) and hazards, with
  pre-arrest bradycardia, an untreated PEA that decays to asystole, and ROSC at CoPP ≥ 15 (G1, G9, 18b). The low-flow
  and no-flow declaration runs in both modes; the hypoxic arrest is MODELED only (`l2/hemo/pipeline.ts`). Class IV
  haemorrhage: PEA at 645 s (MANUAL 640 s).
- **Tamponade, PEEP and anaesthetic coupling:** compensated tamponade (MAP 90, HR 105) → propofol 2 mg/kg → PEA at
  +170 s → asystole by 1200 s. Tamponade with PEEP 5 → 10 misses its CO band (×0.88) and is a recorded miss.
- **Hyperkalaemia, vagal events, obstructive shock:** K 9.5 → VF at 65 s; burns + succinylcholine → VF at +225 s;
  oculocardiac traction 73 → 45; one command each for PE and tension pneumothorax.
- **Clinical scenario suite:** 28 rows (S1–S16 and the CPR and MANUAL rows); eleven are recorded misses plus the
  pulsus row. The table with every number is in [known-deviations.md](known-deviations.md#clinical-scenario-suite-results-fu-4).

## Later follow-ups (FU-5 to FU-11, 7k, FU-7.1, Stage 10)

| Stage | What changed (gate note) | Mode |
|---|---|---|
| FU-5 | monitor fidelity: signal quality, alarm semantics, technical alarms, NIBP, skins (`fu-5.md`) | both (device layer) |
| FU-6 | respiratory integration: induction apnoea, obstruction, trigger, pregnancy and child baselines, volatile HPV, inspired CO2 (`fu-6.md`) | the drive and triggering parts MODELED only |
| FU-7 | drug layer: onset chain, one hypnotic and one opioid potency, β occupancy, indirect sympathomimetics, stimulus surge, conversion hazards, histamine (`fu-7.md`) | the surge's set-point reset MODELED only |
| FU-8 A | arrest and AF monitor honesty, coronary timing, one body-size rule, IABP timing, PEA carries the arrest state, PH grade → PVR (`fu-8-part-a.md`) | the PEA arrest state MODELED only |
| FU-8 B | resting (tonic) sympathetic share, drug-library items, sensor state, perfusion index, pacing pain (`stage-fu-8b.md`) | tonic share and skin tone MODELED only |
| FU-9 A, C | blood, fluids, acid–base and kidney: expansion, filtration, citrate, leak, albumin, potassium, mannitol, osmolality, intra-abdominal pressure (`fu-9.md`) | both |
| FU-9 B | hypokalaemia potentiates rocuronium; COPD carries chronic hypercapnia (`stage-fu-9b.md`) | both |
| FU-10 A | endocrine and thermal: MH triggers, neuraxial and surgical heat loss, etomidate cortisol, adrenal insufficiency, ketogenesis; fever under GA not reached (sepsis 36.60 °C, thyroid storm 36.34 °C against ≥ 38.5: recorded misses) (`stage-fu-10.md`) | both; adrenal haemodynamics MODELED only |
| 7k | respiratory mechanics and lung-volume readouts, one owner per quantity (`stage-7k.md`) | both |
| FU-7.1 a | blockers dosed in mg/kg, opioid–hypnotic vascular synergy (weaker than its band: 1.16× against 1.7–2.1×), first effort after a blocker, potassium chloride (`fu-7.1-a.md`) | both |
| FU-7.1 b | acidosis blunts the surge, venous reservoir kept in arrest (tamponade ROSC after drainage +200 s), breath VT, COPD first gas, failed cuff shows `---` (`fu-7.1-b.md`) | both |
| FU-11 a–d | hardening: relay, audio, snapshots and one timeline, command boundary, second-screen learner monitor; no physiology (`fu-11-a.md` … `fu-11-d.md`) | both |
| Stage 10 | time control: ×8 and a paced 5- or 2-minute fast-forward; no physiology (`stage-10.md`) | both |

## Not modelled in this release

- **No decompensation or reflex-collapse model:** the autonomic hub, the perfusion floor and decompensation moved to
  v2.0; an awake patient who loses half the blood volume settles at a mean pressure of about 63 mmHg and never
  arrests (`docs/roadmap/v1.0-remaining.md`; `docs/roadmap/v2.0/evidence/cardiac-reflexes-audit.md` F1, F2: no
  bradycardic phase). No reflex can take the sinus rate below 30/min or stop the heart (no vasovagal, spinal or
  oculocardiac asystole), and vagal events lower the heart rate without lowering the blood pressure.
- **No neuraxial (spinal/epidural) block haemodynamics:** a neuraxial block changes only heat balance (and the
  kidney's anaesthesia flag); there is no sympathectomy, no hypotension or bradycardia from the block, and local
  anaesthetics can be given only intravenously (other routes are refused). The validation document for a term spinal
  cannot be measured.
- **No sepsis model fit for teaching:** the `sepsis` id exists (7e) but its MODELED shock misses its bands
  (`packages/engine-core/test/engine/endo-circ-acceptance.test.ts`; [known-deviations.md](known-deviations.md)), the
  septic and thyrotoxic patient under GA stays afebrile (36.60 / 36.34 °C, recorded misses in
  `packages/engine-core/test/engine/fu10-fever.test.ts`), and lactate in sepsis is v2.0 work
  (`docs/roadmap/v1.0-remaining.md`). No sepsis scenario ships.
- **Pulsus paradoxus is not reproduced:** 3.1 mmHg against ≥ 10 in tamponade (`docs/gates/fu-4.md` S3); the
  follow-up that would address it (FU-7.1 c) was never started.
- **Adults only:** no paediatric or obstetric physiology (`docs/roadmap/v1.0-remaining.md`, moved to v2.0). The age
  bands, the `pregnancy` and `neonatalRds` lung ids and the child baselines scale size, lungs, resting values and
  reflex gains; they are not validated as paediatric or obstetric teaching cases.
- **Heart-rate response in the validation documents:** the documents that expect the heart rate to change read
  75 bpm because the validation runner holds the baseline rate (a harness defect); 27 validation rows are outside
  their band and the blind realism review has not been run ([validation summary](validation-summary.md)).
- **VA-ECMO and cardiopulmonary bypass:** typed in `l2/circ/devices.ts` but no event drives them.
- **Lundberg A/B waves:** the ICP waveform has P1/P2/P3 and the respiratory component only
  (`docs/plans/stage-7d-organs.md`, decision 15).
- **Coagulation, and laboratory tests beyond the ABG/VBG panel** (tranexamic acid has no effect): v2.0
  (`docs/roadmap/README.md`).
- **Endocrine and thermal Part B** (the remaining cells): v2.0 (`docs/roadmap/v1.0-remaining.md`).
- **From the brief's v2 candidates** (`docs/DESIGN-BRIEF.md` §1): Pulse as a backend, multi-patient engines and
  consoles, hardware and manikin bridges, volumetric capnography and ventilator loops on the monitor, interop exports.
  Also not in v1: bit-identical replay across devices, vendor trade dress.
- **Not a medical device:** no clinical validation, no alarm-standard compliance claim, not for diagnostic use.
