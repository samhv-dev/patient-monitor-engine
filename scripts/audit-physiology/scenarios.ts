// FU-4 integration audit scenarios (research/08-physiology-integration-audit.md). Every scenario starts intubated and
// ventilated (ETT, VCV 12 × 600 mL, PEEP 5, FiO2 0.5) at t = 1 s unless it says otherwise, so propofol's 7f airway
// obstruction and hypoxic confounders stay out of the haemodynamic cells; interventions start at t = 300 s (baseline)
// unless stated. Adult 40 y 70 kg M, seed 7.
import { A, VENTED, type Scenario, type Step } from './runner.ts';

const T0 = 300;
const S = (name: string, title: string, steps: Step[], tEnd: number, extra: Partial<Scenario> = {}): Scenario =>
  ({ name, title, mode: 'modeled', steps: [...VENTED, ...steps], tEnd, printEvery: 60, ...extra });
const tamp = (t: number, s = 1): Step => [t, A.cond('tamponade', s), `tamponade ${s}`];
const prop = (t: number, mgkg: number): Step => [t, A.drug('propofol', mgkg, 'mg/kg'), `propofol ${mgkg} mg/kg`];
const peep = (t: number, p: number): Step => [t, A.vent(p, 0.5), `PEEP ${p}`];
const sevo = (t: number, pct = 2): Step => [t, A.vap('sevoflurane', pct, 2), `sevoflurane ${pct} %`];
const bleed = (t: number, ml: number, overS: number): Step => [t, A.bleed(ml, overS), `bleed ${ml} mL / ${overS} s`];
/** Core temperature ramp through 7e's test seam `pinCoreTemp` (no command cools a patient to 28 °C in minutes). */
const coolRamp = (t0: number, from: number, to: number, minutes: number): Step[] =>
  Array.from({ length: minutes + 1 }, (_, i) => [t0 + 60 * i, (e: any) => { e.st.resp.temp.pinCoreTemp = from + ((to - from) * i) / minutes; }, `core → ${(from + ((to - from) * i) / minutes).toFixed(1)} °C`] as Step);

export const SCENARIOS: Scenario[] = [
  // ---- A: healthy adult, single interventions --------------------------------------------------------------------
  S('A0-control', 'Healthy, ventilated, no intervention (control for every A/K delta)', [], 1500),
  S('A0b-vt500', 'Healthy on VCV 12 × 500 mL (the demo-style setting): PaCO2 drift, 60 min', [[2, A.vent(5, 0.5, 12, 500), 'VCV 12 × 500']], 3600, { printEvery: 300 }),
  S('A0c-spont', 'Healthy, spontaneous breathing, no airway device (control)', [], 900, { steps: [] }),
  S('A1-propofol2', 'Healthy: propofol 2 mg/kg', [prop(T0, 2)], 1200),
  S('A1b-propofol1', 'Healthy: propofol 1 mg/kg', [prop(T0, 1)], 1200),
  S('A2-sevo2', 'Healthy: sevoflurane 2 % dial, FGF 2 L/min, 20 min', [sevo(T0)], T0 + 1200),
  S('A3-peep15', 'Healthy: PEEP 5 → 15', [peep(T0, 15)], 1200),
  S('A4-bleed500', 'Healthy: bleed 500 mL over 5 min', [bleed(T0, 500, 300)], 1500),
  S('A5-bleed1500', 'Healthy: bleed 1500 mL over 10 min', [bleed(T0, 1500, 600)], 1800),
  S('A6-phenylephrine', 'Healthy: phenylephrine 100 µg', [[T0, A.drug('phenylephrine', 100, 'mcg'), 'phenylephrine 100 µg']], 1200),
  S('A7-ephedrine', 'Healthy: ephedrine 10 mg', [[T0, A.drug('ephedrine', 10, 'mg'), 'ephedrine 10 mg']], 1200),
  S('A8-adrenaline', 'Healthy: adrenaline 100 µg', [[T0, A.drug('epinephrine', 100, 'mcg'), 'epinephrine 100 µg']], 1200),
  S('A9-atropine', 'Healthy: atropine 0.5 mg', [[T0, A.drug('atropine', 0.5, 'mg'), 'atropine 0.5 mg']], 1200),

  // ---- B: severe tamponade ----------------------------------------------------------------------------------------
  S('B0-tamp', 'Tamponade severity 1 alone (control)', [tamp(60)], 2700),
  S('B0s-tamp-spont', 'Tamponade 1, spontaneous breathing, no ventilator (pulsus paradoxus check)', [tamp(60)], 900, { steps: [tamp(60)] }),
  S('B1-tamp-prop1', 'Tamponade 1, +10 min propofol 1 mg/kg', [tamp(60), prop(660, 1)], 1500),
  S('B2-tamp-prop2', 'Tamponade 1, +10 min propofol 2 mg/kg', [tamp(60), prop(660, 2)], 1500),
  S('B3-tamp-peep10', 'Tamponade 1, +10 min PEEP 10', [tamp(60), peep(660, 10)], 1500),
  S('B3b-tamp-peep15', 'Tamponade 1, +10 min PEEP 15', [tamp(60), peep(660, 15)], 1500),
  S('B4-tamp-sevo', 'Tamponade 1, +10 min sevoflurane 2 %', [tamp(60), sevo(660)], 1860),
  S('B5-tamp-bleed1000', 'Tamponade 1, +10 min bleed 1 L over 5 min', [tamp(60), bleed(660, 1000, 300)], 1800),
  S('B6-chain', 'Tamponade 1 → propofol 1 → propofol 1 more (2 total) → PEEP 10 → sevo 2 % → bleed 1 L', [
    tamp(60), prop(660, 1), prop(960, 1), peep(1260, 10), sevo(1560), bleed(2160, 1000, 300)], 3060),
  S('B7-ali', "Ali's playground case: tamponade 1, propofol 2 + 1 mg/kg, PEEP 15, sevo 2 %, bleed 2 L", [
    tamp(60), prop(660, 2), prop(900, 1), peep(1200, 15), sevo(1500), bleed(2100, 2000, 300)], 3000),
  S('B8-tamp08-prop2', 'Tamponade 0.8 (H7 volume, 200 mL), +10 min propofol 2 mg/kg', [tamp(60, 0.8), prop(660, 2)], 1500),

  // ---- C: hypovolaemia --------------------------------------------------------------------------------------------
  S('C0-bleed1500-ctl', 'Bleed 1.5 L over 10 min, no drug (control)', [bleed(60, 1500, 600)], 1800),
  S('C1-bleed-prop2', 'Bleed 1.5 L over 10 min, +5 min propofol 2 mg/kg', [bleed(60, 1500, 600), prop(960, 2)], 1800),
  S('C2-bleed-sevo', 'Bleed 1.5 L over 10 min, +5 min sevoflurane 2 %', [bleed(60, 1500, 600), sevo(960)], 2160),
  S('C3-bleed-neuraxial', 'Bleed 1.5 L, +5 min thermal anaesthesia=neuraxial (the only "neuraxial" switch in the engine)', [bleed(60, 1500, 600), [960, { type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'neuraxial' } }, 'thermal neuraxial']], 1800),
  S('C4-bleed2500', 'Bleed 2.5 L over 10 min (class IV, 50 %), no drug', [bleed(60, 2500, 600)], 2400),

  // ---- D: massive PE ----------------------------------------------------------------------------------------------
  S('D0-pe', 'PE severity 1 (φ 0.8) alone', [[60, A.cond('pe', 1), 'PE 1']], 1800),
  S('D1-pe-prop-peep', 'PE 1, +10 min propofol 2 mg/kg, +5 min PEEP 15', [[60, A.cond('pe', 1), 'PE 1'], prop(660, 2), peep(960, 15)], 1800),
  S('D2-pe-peep15', 'PE 1, +10 min PEEP 15', [[60, A.cond('pe', 1), 'PE 1'], peep(660, 15)], 1500),
  S('D3-pe-both', 'PE via BOTH the circulation condition and 7b lungCondition pe (sev 1)', [[60, A.cond('pe', 1), 'PE 1'], [60, A.lung('pe', 1), 'lung PE 1']], 1200),

  // ---- E: tension pneumothorax ------------------------------------------------------------------------------------
  S('E1-ptx-lung', 'Tension PTX (7b lungCondition ptxTension 1, R) 10 min, then PEEP 15', [[60, A.lung('ptxTension', 1, 'R'), 'ptxTension R 1'], peep(660, 15)], 1500),
  S('E2-ptx-circ', 'Tension PTX (7a condition tensionPtx 1) 10 min, then PEEP 15', [[60, A.cond('tensionPtx', 1), 'tensionPtx 1'], peep(660, 15)], 1500),

  // ---- F: sepsis, anaphylaxis, MH ---------------------------------------------------------------------------------
  S('F0-sepsis', 'Septic shock warm (severity 1, ramp 600 s), control', [[60, A.cond('sepsis', 1, { phase: 'warm' }), 'sepsis 1 warm']], 2400),
  S('F1-sepsis-prop2', 'Septic shock warm, +20 min propofol 2 mg/kg', [[60, A.cond('sepsis', 1, { phase: 'warm' }), 'sepsis 1 warm'], prop(1260, 2)], 2400),
  S('F2-anaph', 'Anaphylaxis severity 1 untreated', [[60, A.cond('anaphylaxis', 1), 'anaphylaxis 1']], 1500),
  S('F3-anaph-peep', 'Anaphylaxis 1, +3 min PEEP 15', [[60, A.cond('anaphylaxis', 1), 'anaphylaxis 1'], peep(240, 15)], 1500),
  S('F4-mh', 'MH (condition mh 1) under sevoflurane 2 %, untreated 45 min', [sevo(60), [120, A.cond('mh', 1), 'MH 1']], 120 + 2700 + 300, { printEvery: 300 }),

  // ---- G: electrolytes, temperature -------------------------------------------------------------------------------
  S('G1-k75', 'Hyperkalaemia K 7.5 (profile)', [], 900, { patient: { blood: { k: 7.5 } } }),
  S('G2-k85', 'Hyperkalaemia K 8.5 (profile)', [], 900, { patient: { blood: { k: 8.5 } } }),
  S('G2b-k95', 'Hyperkalaemia K 9.5 (profile)', [], 900, { patient: { blood: { k: 9.5 } } }),
  S('G3-mtp', 'Bleed 2.5 L then 10 u RBC (35 d) over 10 min, no calcium', [bleed(60, 2500, 600), [720, A.transfusion('rbc', 10, 600, 35), 'RBC 10 u']], 2400),
  S('G3b-sux-burns', 'Burns 1 (profile), succinylcholine 1.5 mg/kg', [[T0, A.drug('succinylcholine', 1.5, 'mg/kg'), 'sux 1.5 mg/kg']], 1500, { patient: { blood: { burns: 1 } } }),
  S('G4-cool28', 'Core cooled 36.8 → 28 °C over 30 min (test seam), held 15 min', coolRamp(T0, 36.8, 28, 30), T0 + 2700, { printEvery: 300 }),

  S('G4b-cool28-gaNmb', 'As G4 under propofol 100 µg/kg/min + rocuronium 0.6 mg/kg (no shivering)', [[T0 - 60, A.infusion('propofol', 100, 'mcg/kg/min'), 'propofol 100 µg/kg/min'], [T0 - 60, A.drug('rocuronium', 0.6, 'mg/kg'), 'roc 0.6 mg/kg'], ...coolRamp(T0, 36.8, 28, 30)], T0 + 2700, { printEvery: 300 }),
  // ---- H: vagal -----------------------------------------------------------------------------------------------------
  S('H1-fent10', 'Fentanyl 10 µg/kg bolus, no atropine', [[T0, A.drug('fentanyl', 10, 'mcg/kg'), 'fentanyl 10 µg/kg']], 1200),
  S('H1b-remi3', 'Remifentanil 3 µg/kg bolus, no atropine', [[T0, A.drug('remifentanil', 3, 'mcg/kg'), 'remifentanil 3 µg/kg']], 1200),
  S('H2-sux-repeat', 'Succinylcholine 1.5 mg/kg, repeat 1 mg/kg at +5 min', [[T0, A.drug('succinylcholine', 1.5, 'mg/kg'), 'sux 1.5 mg/kg'], [T0 + 300, A.drug('succinylcholine', 1, 'mg/kg'), 'sux 1 mg/kg']], 1200),
  S('H3-neo', 'Neostigmine 0.05 mg/kg, no glycopyrrolate', [[T0, A.drug('neostigmine', 0.05, 'mg/kg'), 'neostigmine 0.05 mg/kg']], 1500),

  // ---- I: apnoea ----------------------------------------------------------------------------------------------------
  S('I1-apnoea', 'Propofol 2 + rocuronium 0.6 mg/kg, ventilator OFF (spontaneous start, no airway support), 15 min', [
    [T0, A.ventOff(), 'ventilation none'], prop(T0, 2), [T0, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6 mg/kg']], T0 + 1200),

  // ---- J: overdose --------------------------------------------------------------------------------------------------
  S('J1-od-healthy', 'Propofol 4 mg/kg + remifentanil 2 µg/kg, healthy 40 y', [prop(T0, 4), [T0, A.drug('remifentanil', 2, 'mcg/kg'), 'remi 2 µg/kg']], 1500),
  S('J2-od-80htn', 'Propofol 4 mg/kg + remifentanil 2 µg/kg, 80 y hypertensive', [prop(T0, 4), [T0, A.drug('remifentanil', 2, 'mcg/kg'), 'remi 2 µg/kg']], 1500, { patient: { ageY: 80, weightKg: 70, conditions: [{ id: 'htn' }] } }),
  S('J3-80htn-prop2', 'Propofol 2 mg/kg, 80 y hypertensive', [prop(T0, 2)], 1500, { patient: { ageY: 80, weightKg: 70, conditions: [{ id: 'htn' }] } }),
  S('J4-80htn-ctl', '80 y hypertensive control', [], 1500, { patient: { ageY: 80, weightKg: 70, conditions: [{ id: 'htn' }] } }),

  // ---- K: controls needed for the propofol state-dependence matrix ---------------------------------------------------
  S('K-pe-prop2', 'PE 1, +10 min propofol 2 mg/kg (no PEEP)', [[60, A.cond('pe', 1), 'PE 1'], prop(660, 2)], 1500),
  S('K-ptx-prop2', 'Tension PTX lung 1 R, +10 min propofol 2 mg/kg', [[60, A.lung('ptxTension', 1, 'R'), 'ptxTension R 1'], prop(660, 2)], 1500),
  S('K-ptx-ctl', 'Tension PTX lung 1 R control', [[60, A.lung('ptxTension', 1, 'R'), 'ptxTension R 1']], 1500),
  S('K-80htn-bleed-prop', '80 y HTN, bleed 1 L, +5 min propofol 2', [bleed(60, 1000, 600), prop(960, 2)], 1800, { patient: { ageY: 80, weightKg: 70, conditions: [{ id: 'htn' }] } }),
  S('K-hfref-prop2', 'HFrEF 60 y 80 kg, propofol 2 mg/kg', [prop(T0, 2)], 1500, { patient: { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] } }),
  S('K-hfref-ctl', 'HFrEF control', [], 1500, { patient: { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] } }),
  S('K-ascad-prop2', 'AS + CAD + HTN 75 y, propofol 2 mg/kg', [prop(T0, 2)], 1500, { patient: { ageY: 75, weightKg: 75, conditions: [{ id: 'htn' }, { id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }] } }),
  S('K-ascad-ctl', 'AS + CAD + HTN control', [], 1500, { patient: { ageY: 75, weightKg: 75, conditions: [{ id: 'htn' }, { id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }] } }),

  // ---- L: MANUAL mode -----------------------------------------------------------------------------------------------
  S('L-B0-tamp', 'MANUAL: tamponade 1 alone', [tamp(60)], 1500, { mode: 'manual' }),
  S('L-B6-chain', 'MANUAL: the B6 chain', [tamp(60), prop(660, 1), prop(960, 1), peep(1260, 10), sevo(1560), bleed(2160, 1000, 300)], 3060, { mode: 'manual' }),
  S('L-C0-bleed', 'MANUAL: bleed 1.5 L', [bleed(60, 1500, 600)], 1800, { mode: 'manual' }),
  S('L-C1-bleed-prop2', 'MANUAL: bleed 1.5 L, +5 min propofol 2 mg/kg', [bleed(60, 1500, 600), prop(960, 2)], 1800, { mode: 'manual' }),
  S('L-A1-prop2', 'MANUAL: healthy propofol 2 mg/kg', [prop(T0, 2)], 1200, { mode: 'manual' }),
  S('L-C4-bleed2500', 'MANUAL: bleed 2.5 L', [bleed(60, 2500, 600)], 2400, { mode: 'manual' }),
];

// ---- extra probes (added after the first pass) ------------------------------------------------------------------------
SCENARIOS.push(
  // Ali's case exactly as B7 but with the propofol boluses doubled (does ANY dose collapse tamponade?)
  S('B9-tamp-prop4', 'Tamponade 1, +10 min propofol 4 mg/kg', [tamp(60), prop(660, 4)], 1500),
  // Commanded arrest + CPR: CPP and EtCO2 with CPR, adrenaline; is ROSC emergent?
  S('X1-vf-cpr', 'Commanded VF at 300 s, CPR from 330 s, adrenaline 1 mg at 450 s', [
    [T0, { type: 'setRhythm', rhythm: 'vfCoarse' }, 'VF'], [T0 + 30, A.cpr(true), 'CPR'], [T0 + 150, A.drug('epinephrine', 1, 'mg'), 'adrenaline 1 mg']], T0 + 600, { printEvery: 30 }),
);
