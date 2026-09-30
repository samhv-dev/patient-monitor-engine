// Respiratory integration audit scenarios (research/09-respiratory-integration-audit.md §2). MODELED unless the name
// ends in "-man". Adult 40 y 70 kg 175 cm male unless stated. T0 = the first intervention after a baseline.
import { A, VENTED, type Scenario, type Step } from './runner.ts';

const T0 = 300;
const S = (name: string, title: string, steps: Step[], tEnd: number, o: Partial<Scenario> = {}): Scenario => ({ name, title, steps, tEnd, ...o });
const prop = (t: number, mgkg = 2): Step => [t, A.drug('propofol', mgkg, 'mg/kg'), `propofol ${mgkg} mg/kg`];
const roc = (t: number, mgkg = 0.6): Step => [t, A.drug('rocuronium', mgkg, 'mg/kg'), `rocuronium ${mgkg} mg/kg`];
const GA: Step = [1, A.thermal({ anaesthesia: 'general' }), 'thermal GA'];
/** Preoxygenate on a face mask (spontaneous, FiO2 1 for `s` s), then induce + paralyse and leave apnoeic (source none). */
const preoxApnoea = (tPre: number, s: number, fio2 = 1): Step[] => [
  [tPre, A.preox(fio2, s), `preoxygenate FiO2 ${fio2} ${s} s`], prop(tPre + s), roc(tPre + s), [tPre + s, A.none(), 'apnoea (source none, airway open)'],
];
const CHILD = { ageY: 4, weightKg: 16, heightCm: 102 };
const OBESE = { weightKg: 127, heightCm: 175 };
const PREG = { sex: 'F', weightKg: 70, heightCm: 165, lungConditions: [{ id: 'pregnancy', severity: 1 }] };

export const SCENARIOS: Scenario[] = [
  // ---- A. baselines ----
  S('A1-spont-awake', 'Awake, spontaneous, room air, 30 min', [], 1800, { printEvery: 300 }),
  S('A1-spont-awake-man', 'Awake, spontaneous, room air, 30 min (MANUAL)', [], 1800, { printEvery: 300, mode: 'manual' }),
  S('A2-vent-12x500', 'ETT + VCV 12 × 500, PEEP 5, FiO2 0.5 from 1 s, 60 min (no thermal GA)', VENTED(), 3600, { printEvery: 600 }),
  S('A2b-vent-12x500-ga', 'As A2 with thermal anaesthesia general (VO2/VCO2 × 0.85)', [...VENTED(), GA], 3600, { printEvery: 600 }),
  S('A2c-vent-12x500-vd0', 'As A2, what-if: MANUAL-calibration dead space vdExtra poked to 0 at 2 s', [...VENTED(), [2, (e: any) => { e.st.resp.co2.vdExtraMl = 0; }, 'poke vdExtraMl = 0']], 3600, { printEvery: 600 }),
  S('A2d-vent-12x600', 'ETT + VCV 12 × 600, 60 min', VENTED({ vtMl: 600 }), 3600, { printEvery: 600 }),
  S('A2e-vent-12x500-man', 'As A2 (MANUAL)', VENTED(), 3600, { printEvery: 600, mode: 'manual' }),
  S('A3-fio2-steps-spont', 'Spontaneous awake: FiO2 0.21 → 0.4 (T0) → 1.0 (T0+600)', [[T0, A.spont({ fio2: 0.4 }), 'FiO2 0.4'], [T0 + 600, A.spont({ fio2: 1 }), 'FiO2 1.0']], T0 + 1200, { printEvery: 120 }),
  S('A3b-fio2-steps-vent', 'VCV 12 × 600 + GA: FiO2 0.21 (60 s) → 0.4 (T0) → 1.0 (T0+600)', [[1, A.device('ett')], [1, A.vent({ vtMl: 600, fio2: 0.21 })], GA, [T0, A.vent({ vtMl: 600, fio2: 0.4 }), 'FiO2 0.4'], [T0 + 600, A.vent({ vtMl: 600, fio2: 1 }), 'FiO2 1.0']], T0 + 1200, { printEvery: 120 }),
  S('A4-preox-3min', 'Preoxygenation FiO2 1 by face mask, tidal breathing, 5 min', [[60, A.preox(1, 300), 'preox FiO2 1.0']], 420, { printEvery: 30, dt: 5 }),
  // ---- B. apnoea ----
  S('B1-apnoea-preox-adult', 'Adult: preox 3 min, propofol + roc, apnoea with open airway', preoxApnoea(60, 180), 1500, { printEvery: 60 }),
  S('B2-apnoea-roomair-adult', 'Adult: room air, propofol + roc, apnoea', [prop(60), roc(60), [60, A.none(), 'apnoea']], 900, { printEvery: 30 }),
  S('B3-apnoea-preox-obese', 'Obese 127 kg / 175 cm: preox 3 min, apnoea', preoxApnoea(60, 180), 1200, { printEvery: 30, patient: OBESE }),
  S('B4-apnoea-preox-pregnant', 'Term pregnancy (lung pregnancy 1, F 70 kg): preox 3 min, apnoea', preoxApnoea(60, 180), 1200, { printEvery: 30, patient: PREG }),
  S('B5-apnoea-preox-child', 'Child 4 y 16 kg: preox 3 min, apnoea (main, before V.1 Task 1)', preoxApnoea(60, 180), 900, { printEvery: 30, patient: CHILD }),
  S('B6-child-baseline', 'Child 4 y 16 kg: awake spontaneous room air baseline', [], 900, { printEvery: 150, patient: CHILD }),
  S('B6-child-baseline-man', 'Child 4 y 16 kg: awake spontaneous room air baseline (MANUAL)', [], 900, { printEvery: 150, patient: CHILD, mode: 'manual' }),
  S('B7-apnoea-preox-adult-man', 'As B1 (MANUAL)', preoxApnoea(60, 180), 1500, { printEvery: 60, mode: 'manual' }),
  // B, with the 'thermal anaesthesia general' switch the calibrated rigs send (FRC awake → GA, VO2 × 0.85)
  S('B1g-apnoea-preox-adult-ga', 'As B1 with thermal GA from 1 s', [GA, ...preoxApnoea(60, 180)], 1500, { printEvery: 60 }),
  S('B3g-apnoea-preox-obese-ga', 'As B3 with thermal GA', [GA, ...preoxApnoea(60, 180)], 1200, { printEvery: 30, patient: OBESE }),
  S('B4g-apnoea-preox-pregnant-ga', 'As B4 with thermal GA', [GA, ...preoxApnoea(60, 180)], 1200, { printEvery: 30, patient: PREG }),
  S('B5g-apnoea-preox-child-ga', 'As B5 with thermal GA', [GA, ...preoxApnoea(60, 180)], 900, { printEvery: 30, patient: CHILD }),
  S('B8-female-baseline', 'Non-pregnant female 70 kg 165 cm, awake baseline (pregnancy control)', [], 600, { printEvery: 120, patient: { sex: 'F', weightKg: 70, heightCm: 165 } }),
  S('Dp-roc-tofr', 'Probe: propofol infusion + roc 0.6 on VCV; TOFR time course', [...VENTED({ vtMl: 600 }), [60, A.infusion('propofol', 100, 'mcg/kg/min'), 'propofol 100'], roc(60)], 5400, { printEvery: 300 }),
];

// ---- C. induction sequence ----
// awake room air → face-mask preox FiO2 1 (3 min) → propofol 2 + roc 0.6 (T0 = 300) → nothing for 3 min → BVM
// 12 × 500 FiO2 1 (480) → laryngoscopy stimulus 1.5 + ETT (600) → VCV 12 × 500 PEEP 5 FiO2 0.5 (630) → stimulus 0 (660)
const induction = (preox: boolean): Step[] => [
  ...(preox ? [[120, A.preox(1, 180), 'preox FiO2 1 × 180 s'] as Step] : []),
  prop(T0), roc(T0), [480, A.bvm(12, 500, 1), 'BVM 12 × 500 FiO2 1'], [600, A.stim(1.5), 'laryngoscopy stimulus 1.5'], [600, A.device('ett'), 'ETT'],
  [630, A.vent({ fio2: 0.5 }), 'VCV 12 × 500 PEEP 5 FiO2 0.5'], [660, A.stim(0), 'stimulus 0'],
];
SCENARIOS.push(
  S('C1-induction-preox', 'Induction: preox, propofol + roc, 3 min no ventilation, BVM, laryngoscopy + ETT, ventilator', induction(true), 1800, { printEvery: 60, dt: 5 }),
  S('C2-induction-roomair', 'As C1 without preoxygenation', induction(false), 1800, { printEvery: 60, dt: 5 }),
  S('C3-induction-preox-ga', 'As C1 with the thermal GA switch at T0', [...induction(true), [T0, A.thermal({ anaesthesia: 'general' }), 'thermal GA']], 1800, { printEvery: 60, dt: 5 }),
  S('C4-propofol-only-spont', 'Propofol 2 mg/kg alone, spontaneous, natural airway, room air (drive + obstruction)', [prop(T0)], 1500, { printEvery: 30 }),
  S('C4b-propofol-only-spont-sga', 'Propofol 2 mg/kg alone, spontaneous via SGA (no obstruction), room air', [[1, A.device('sga')], prop(T0)], 1500, { printEvery: 30 }),
  S('C5-induction-man', 'As C1 (MANUAL)', induction(true), 1800, { printEvery: 60, mode: 'manual' }),
);

// ---- D. opioid / volatile spontaneous ventilation ----
SCENARIOS.push(
  S('D1-remi-titration', 'Awake spontaneous, natural airway, room air: remifentanil 0.05 → 0.1 → 0.2 µg/kg/min (10 min each), stop, naloxone 0.1 mg × 2',
    [[T0, A.infusion('remifentanil', 0.05, 'mcg/kg/min'), 'remi 0.05'], [T0 + 600, A.infusion('remifentanil', 0.1, 'mcg/kg/min'), 'remi 0.1'],
     [T0 + 1200, A.infusion('remifentanil', 0.2, 'mcg/kg/min'), 'remi 0.2'], [T0 + 1800, A.drug('naloxone', 0.1, 'mg'), 'naloxone 0.1 mg'], [T0 + 1920, A.drug('naloxone', 0.1, 'mg'), 'naloxone 0.1 mg']], T0 + 2700, { printEvery: 60 }),
  S('D1b-remi-titration-sga', 'As D1 via SGA (drive only, no upper-airway obstruction), FiO2 0.5', [[1, A.device('sga')], [1, A.spont({ fio2: 0.5 })],
     [T0, A.infusion('remifentanil', 0.05, 'mcg/kg/min'), 'remi 0.05'], [T0 + 600, A.infusion('remifentanil', 0.1, 'mcg/kg/min'), 'remi 0.1'],
     [T0 + 1200, A.infusion('remifentanil', 0.2, 'mcg/kg/min'), 'remi 0.2'], [T0 + 1800, A.drug('naloxone', 0.1, 'mg'), 'naloxone 0.1 mg'], [T0 + 1920, A.drug('naloxone', 0.1, 'mg'), 'naloxone 0.1 mg']], T0 + 2700, { printEvery: 60 }),
  S('D2-sevo-spont-sga', 'SGA, spontaneous, FiO2 0.5: propofol 2 mg/kg then sevoflurane 2 % → 3 % → 4 % (15 min each, FGF 6)',
    [[1, A.device('sga')], [1, A.spont({ fio2: 0.5 })], prop(T0), [T0 + 60, A.vap('sevoflurane', 2, 6), 'sevo 2 %'], [T0 + 960, A.vap('sevoflurane', 3, 6), 'sevo 3 %'], [T0 + 1860, A.vap('sevoflurane', 4, 6), 'sevo 4 %']], T0 + 2760, { printEvery: 60 }),
  S('D3-extubation-residual', 'Propofol infusion + roc 0.6 on VCV; propofol off at 3900; extubate (no device, spontaneous, FiO2 0.4) at 4350 (TOFR ≈ 0.6)',
    [...VENTED({ vtMl: 600 }), [60, A.infusion('propofol', 100, 'mcg/kg/min'), 'propofol 100'], roc(60), [3900, A.infusion('propofol', 0, 'mcg/kg/min'), 'propofol off'],
     [4350, A.device('none'), 'extubate'], [4350, A.spont({ fio2: 0.4 }), 'spontaneous FiO2 0.4']], 5700, { printEvery: 60 }),
  S('D4-remi-hypercapnia-hypoxia', 'Interaction: SGA, remi 0.1 + propofol 50 µg/kg/min, room air, then FiO2 0.5 (hypoxic drive removed), then stimulus 1.5',
    [[1, A.device('sga')], [T0, A.infusion('remifentanil', 0.1, 'mcg/kg/min'), 'remi 0.1'], [T0, A.infusion('propofol', 50, 'mcg/kg/min'), 'propofol 50'],
     [T0 + 900, A.spont({ fio2: 0.5 }), 'FiO2 0.5'], [T0 + 1500, A.stim(1.5), 'stimulus 1.5 (pain)'], [T0 + 1800, A.stim(0), 'stimulus 0']], T0 + 2100, { printEvery: 60 }),
);

// ---- E. airway obstruction / bronchospasm / circuit events (ventilated rig: GA switch, VCV 12 × 500 PEEP 5 FiO2 0.5,
// propofol 100 µg/kg/min + roc 0.6 at 1 s) ----
const RIG = (o: { rr?: number; vtMl?: number; peep?: number; fio2?: number } = {}): Step[] => [
  [1, A.device('ett')], [1, A.vent(o)], GA, [1, A.infusion('propofol', 100, 'mcg/kg/min'), 'propofol 100'], roc(1),
];
const E0 = 600;
SCENARIOS.push(
  S('E1-bronchospasm-airway', 'Airway `bronchospasm` severity 1 at 600 s (Stage 3 event); salbutamol 250 µg IV at 900; adrenaline 50 µg at 1200; airway patent at 1500',
    [...RIG(), [E0, A.airway('bronchospasm', 1), 'bronchospasm 1'], [900, A.drug('salbutamol', 250, 'mcg'), 'salbutamol 250 µg'], [1200, A.drug('epinephrine', 50, 'mcg'), 'adrenaline 50 µg'], [1500, A.airway('patent'), 'airway patent']], 1800, { printEvery: 60, fine: true }),
  S('E1b-bronchospasm-lung', 'lungCondition `bronchospasm` 1 at 600; salbutamol 250 µg at 900; sevoflurane 2 % at 1000; adrenaline 50 µg at 1200',
    [...RIG(), [E0, A.lung('bronchospasm', 1), 'lung bronchospasm 1'], [900, A.drug('salbutamol', 250, 'mcg'), 'salbutamol 250 µg'], [1000, A.vap('sevoflurane', 2, 6), 'sevo 2 %'], [1200, A.drug('epinephrine', 50, 'mcg'), 'adrenaline 50 µg']], 1800, { printEvery: 60, fine: true }),
  S('E1c-asthma-severe', 'lungCondition `asthma` 1 at 600 on VCV 12 × 500 → RR 8 at 1200', [...RIG(), [E0, A.lung('asthma', 1), 'asthma 1'], [1200, A.vent({ rr: 8 }), 'RR 8']], 1800, { printEvery: 60, fine: true }),
  S('E2-laryngospasm-proxy', 'Awake → propofol 1 mg/kg, natural airway; airway `obstructed` (complete) 60 s at 600, then patent', [prop(E0 - 120, 1), [E0, A.airway('obstructed'), 'obstructed'], [E0 + 60, A.airway('patent'), 'patent']], 1500, { printEvery: 30, fine: true }),
  S('E2b-laryngospasm-3min', 'As E2 with 180 s of complete obstruction', [prop(E0 - 120, 1), [E0, A.airway('obstructed'), 'obstructed'], [E0 + 180, A.airway('patent'), 'patent']], 1500, { printEvery: 30, fine: true }),
  S('E3-ett-kink', 'Ventilated rig: airway `obstructed` (kinked tube) at 600 for 120 s', [...RIG(), [E0, A.airway('obstructed'), 'kink'], [E0 + 120, A.airway('patent'), 'unkink']], 1200, { printEvery: 30, fine: true, dt: 5 }),
  S('E4-endobronchial', 'Ventilated rig: airway `endobronchial` (right mainstem) at 600; patent at 1500', [...RIG(), [E0, A.airway('endobronchial'), 'endobronchial'], [1500, A.airway('patent'), 'withdrawn']], 1800, { printEvery: 60, fine: true }),
  S('E4b-endobronchial-fio2-03', 'As E4 at FiO2 0.3', [...RIG({ fio2: 0.3 }), [E0, A.airway('endobronchial'), 'endobronchial'], [1500, A.airway('patent'), 'withdrawn']], 1800, { printEvery: 60, fine: true }),
  S('E5-disconnect', 'Ventilated rig: airway `disconnected` at 600 for 240 s', [...RIG(), [E0, A.airway('disconnected'), 'disconnect'], [E0 + 240, A.airway('patent'), 'reconnect']], 1200, { printEvery: 30, dt: 5 }),
  S('E6-oesophageal', 'Induction (preox, propofol + roc), oesophageal tube + VCV at 360 s, recognised at 600 (ETT, patent)',
    [[60, A.preox(1, 180)], prop(240), roc(240), [240, A.none(), 'apnoea'], [360, A.device('ett')], [360, A.airway('oesophageal'), 'oesophageal'], [360, A.vent({ fio2: 1 }), 'VCV FiO2 1'], [600, A.airway('patent'), 'reintubated']], 1200, { printEvery: 30, dt: 5 }),
);

// ---- F. ventilator settings across conditions ----
SCENARIOS.push(
  S('F1-ards-peep', 'ARDS severe (lung ards 1) on VCV 420 × 20, FiO2 0.8: PEEP 5 → 10 (900) → 15 (1500) → recruit 40 × 30 s (2100) → PEEP 15 → 5 (2700)',
    [...RIG({ rr: 20, vtMl: 420, peep: 5, fio2: 0.8 }), [60, A.lung('ards', 1), 'ARDS 1'], [900, A.vent({ rr: 20, vtMl: 420, peep: 10, fio2: 0.8 }), 'PEEP 10'], [1500, A.vent({ rr: 20, vtMl: 420, peep: 15, fio2: 0.8 }), 'PEEP 15'],
     [2100, A.recruit(40, 30), 'recruit 40 × 30 s'], [2700, A.vent({ rr: 20, vtMl: 420, peep: 5, fio2: 0.8 }), 'PEEP 5 (derecruit)']], 3300, { printEvery: 60, fine: true }),
  S('F2-copd-rr', 'COPD severe (lung copd 1), VCV 500 × 10 → 16 (900) → 24 (1500) → 30 (2100) → disconnect 30 s (2700)',
    [...RIG({ rr: 10 }), [60, A.lung('copd', 1), 'COPD 1'], [900, A.vent({ rr: 16 }), 'RR 16'], [1500, A.vent({ rr: 24 }), 'RR 24'], [2100, A.vent({ rr: 30 }), 'RR 30'],
     [2700, A.airway('disconnected'), 'disconnect'], [2730, A.airway('patent'), 'reconnect']], 3000, { printEvery: 60, fine: true }),
  S('F3-olv', 'OLV: 2-lung FiO2 1 VCV 500 × 12, lung olv 1 (right collapsed, left ventilated) at 600, VT 350 × 16; sevoflurane 2 % at 1800',
    [...RIG({ fio2: 1 }), [E0, A.lung('olv', 1, 'R'), 'OLV (right non-ventilated)'], [E0, A.vent({ rr: 16, vtMl: 350, fio2: 1 }), 'VT 350 × 16'], [1800, A.vap('sevoflurane', 2, 2), 'sevo 2 %']], 3000, { printEvery: 60, fine: true }),
  S('F3b-olv-mainstem', 'OLV via `mainstem left` (right lung not ventilated) at 600, VT 350 × 16, FiO2 1', [...RIG({ fio2: 1 }), [E0, A.mainstem('left'), 'mainstem left'], [E0, A.vent({ rr: 16, vtMl: 350, fio2: 1 }), 'VT 350 × 16']], 2400, { printEvery: 60, fine: true }),
  S('F4-tension-ptx-7b', 'Ventilated rig: lungCondition ptxTension 1 R at 600', [...RIG(), [E0, A.lung('ptxTension', 1, 'R'), 'tension PTX R (7b)']], 1500, { printEvery: 30, fine: true }),
  S('F4b-tension-ptx-7a', 'Ventilated rig: condition tensionPtx 1 at 600 (7a)', [...RIG(), [E0, A.cond('tensionPtx', 1), 'tensionPtx (7a)']], 1500, { printEvery: 30, fine: true }),
  S('F5-peep-hypovolaemia', 'Ventilated rig: bleed 1.5 L / 10 min at 300; PEEP 5 → 15 at 1200', [...RIG(), [300, A.bleed(1500, 600), 'bleed 1.5 L'], [1200, A.vent({ peep: 15 }), 'PEEP 15']], 1800, { printEvery: 60, fine: true }),
  S('F5b-peep-healthy', 'Ventilated rig: PEEP 5 → 15 at 1200', [...RIG(), [1200, A.vent({ peep: 15 }), 'PEEP 15']], 1800, { printEvery: 60, fine: true }),
  S('F6-permissive-hypercapnia', 'Ventilated rig: VT 500 → 300 (RR 12) at 600 for 40 min', [...RIG(), [E0, A.vent({ vtMl: 300 }), 'VT 300']], 3000, { printEvery: 120 }),
);

// ---- G. gas-exchange coupling ----
const pinT = (t: number, c: number): Step => [t, (e: any) => { e.st.resp.temp.pinCoreTemp = c; }, `core pinned ${c} °C (7e test seam)`];
SCENARIOS.push(
  S('G1a-pe-7a', 'Ventilated rig: 7a condition pe 1 at 600', [...RIG(), [E0, A.cond('pe', 1), 'pe (7a) 1']], 1500, { printEvery: 60 }),
  S('G1b-pe-7b', 'Ventilated rig: 7b lungCondition pe 1 at 600', [...RIG(), [E0, A.lung('pe', 1), 'pe (7b) 1']], 1500, { printEvery: 60 }),
  S('G1c-pe-both', 'Ventilated rig: both pe conditions at 600', [...RIG(), [E0, A.cond('pe', 1), 'pe (7a) 1'], [E0, A.lung('pe', 1), 'pe (7b) 1']], 1500, { printEvery: 60 }),
  S('G1d-pe-7b-spont', 'Awake spontaneous: 7b lungCondition pe 1 at 600 (drive response)', [[E0, A.lung('pe', 1), 'pe (7b) 1']], 1500, { printEvery: 60 }),
  S('G2-anaemia-hb5', 'Profile Hb 5 g/dL, awake spontaneous, room air', [], 1200, { printEvery: 300, patient: { blood: { hb: 5 } } }),
  S('G2b-anaemia-hb5-vent', 'Profile Hb 5, ventilated rig', RIG(), 1800, { printEvery: 300, patient: { blood: { hb: 5 } } }),
  S('G2c-hb15-control', 'Profile Hb 15 control, awake', [], 600, { printEvery: 300, patient: { blood: { hb: 15 } } }),
  S('G3-cohb30', 'Profile COHb 30 %, awake room air → FiO2 1.0 (spontaneous) at 600', [[E0, A.spont({ fio2: 1 }), 'FiO2 1.0']], 4200, { printEvery: 600, patient: { blood: { cohb: 0.3 } } }),
  S('G3b-methb30', 'Profile MetHb 30 %, awake room air', [], 900, { printEvery: 300, patient: { blood: { methb: 0.3 } } }),
  S('G4-hypothermia-32', 'Ventilated rig (FiO2 0.3), core pinned 36.8 → 34 (600) → 32 (1200) → 30 (1800)', [...RIG({ fio2: 0.3 }), pinT(1, 36.8), pinT(600, 34), pinT(1200, 32), pinT(1800, 30)], 2400, { printEvery: 300 }),
  S('G5-metacid-spont', 'Awake spontaneous: HCl 250 mmol over 10 min at 300 (metabolic acidosis → Kussmaul)', [[T0, { type: 'applyEvent', event: { kind: 'metabolic', acidMmol: 250, overS: 600 } }, "acid 250 mmol"]], 2700, { printEvery: 300 }),
  S('G5b-metacid-vent', 'Ventilated rig: same acid load (no compensation)', [...RIG(), [T0, { type: 'applyEvent', event: { kind: 'metabolic', acidMmol: 250, overS: 600 } }, "acid 250 mmol"]], 2700, { printEvery: 300 }),
  S('G6-cpr', 'Ventilated rig: VF at 600, CPR q 1 at 630, q 0.4 at 900, q 1 at 1080, sinus (ROSC) at 1260', [...RIG(), [E0, A.rhythm('vfCoarse'), 'VF'], [630, A.cpr(true, 1), 'CPR q 1'], [900, A.cpr(true, 0.4), 'CPR q 0.4'], [1080, A.cpr(true, 1), 'CPR q 1'], [1260, A.rhythm('sinus'), 'ROSC (sinus)'], [1260, A.cpr(false), 'CPR off']], 1800, { printEvery: 30, dt: 5 }),
  S('G7-bleed-etco2', 'Ventilated rig: bleed 2.5 L over 10 min at 600 (EtCO2 vs CO)', [...RIG(), [E0, A.bleed(2500, 600), 'bleed 2.5 L']], 2100, { printEvery: 60 }),
  S('G7b-tamponade-etco2', 'Ventilated rig: tamponade 1 at 600', [...RIG(), [E0, A.cond('tamponade', 1), 'tamponade 1']], 1500, { printEvery: 60 }),
  S('F4c-tension-ptx-both', 'Ventilated rig: 7a tensionPtx 1 AND 7b ptxTension 1 R at 600', [...RIG(), [E0, A.cond('tensionPtx', 1), 'tensionPtx (7a)'], [E0, A.lung('ptxTension', 1, 'R'), 'ptxTension R (7b)']], 1200, { printEvery: 60 }),
  S('H1-rebreathing-fico2', 'Ventilated rig: FiCO2 8 mmHg (ventilation.fico2) at 600 for 20 min', [...RIG(), [E0, { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, fico2: 8 } }, 'FiCO2 8']], 1800, { printEvery: 120 }),
  S('I1-anaesthesia-vco2', 'Ventilated rig WITHOUT the thermal GA switch (propofol + roc only): VCO2/FRC state', [[1, A.device('ett')], [1, A.vent()], [1, A.infusion('propofol', 100, 'mcg/kg/min'), 'propofol 100'], roc(1)], 2400, { printEvery: 600 }),
);
SCENARIOS.push(
  S('A2f-female-vent-7mlkg', 'Female 60 kg 165 cm (IBW 57): ETT + VCV 12 × 400 (7 mL/kg IBW), PEEP 5, FiO2 0.5, thermal GA', [[1, A.device('ett')], [1, A.vent({ vtMl: 400 })], GA], 2400, { printEvery: 300, patient: { sex: 'F', weightKg: 60, heightCm: 165 } }),
  S('A2g-male-vent-7mlkg', 'Male 70 kg: ETT + VCV 12 × 490 (7 mL/kg IBW), thermal GA', [[1, A.device('ett')], [1, A.vent({ vtMl: 490 })], GA], 2400, { printEvery: 300 }),
);

// ---- I. double-counting checks (same disease through two commands) ----
SCENARIOS.push(
  S('I2a-anaph-7e', 'Ventilated rig: condition anaphylaxis 1 (7e) at 600', [...RIG(), [E0, A.cond('anaphylaxis', 1), 'anaphylaxis (7e)']], 1200, { printEvery: 60, fine: true }),
  S('I2b-anaph-lung', 'Ventilated rig: lungCondition anaphylaxis 1 (7b) at 600', [...RIG(), [E0, A.lung('anaphylaxis', 1), 'anaphylaxis (7b lung)']], 1200, { printEvery: 60, fine: true }),
  S('I2c-anaph-both', 'Ventilated rig: both anaphylaxis commands at 600', [...RIG(), [E0, A.cond('anaphylaxis', 1), 'anaphylaxis (7e)'], [E0, A.lung('anaphylaxis', 1), 'anaphylaxis (7b lung)']], 1200, { printEvery: 60, fine: true }),
  S('I2d-bronchospasm-both', 'Ventilated rig: airway bronchospasm 1 (Stage 3) AND lungCondition bronchospasm 1 (7b) at 600', [...RIG(), [E0, A.airway('bronchospasm', 1), 'airway bronchospasm'], [E0, A.lung('bronchospasm', 1), 'lung bronchospasm']], 1200, { printEvery: 60, fine: true }),
);

// ---- X. FU-6: treatment arms and induction variants (docs/plans/fu-6-respiratory-integration.md) ----
SCENARIOS.push(
  S('X-bs-untreated', 'lung bronchospasm 1 at 600, untreated', [...RIG(), [E0, A.lung('bronchospasm', 1)]], 1800, { printEvery: 60, fine: true }),
  S('X-bs-salb', 'bronchospasm 1 at 600, salbutamol 250 µg at 900', [...RIG(), [E0, A.lung('bronchospasm', 1)], [900, A.drug('salbutamol', 250, 'mcg'), 'salbutamol 250 µg']], 1800, { printEvery: 60, fine: true }),
  S('X-bs-sevo', 'bronchospasm 1 at 600, sevoflurane 2.5 % FGF 6 at 900', [...RIG(), [E0, A.lung('bronchospasm', 1)], [900, A.vap('sevoflurane', 2.5, 6), 'sevoflurane 2.5 %']], 1800, { printEvery: 60, fine: true }),
  S('X-bs-adr', 'bronchospasm 1 at 600, adrenaline 50 µg at 900', [...RIG(), [E0, A.lung('bronchospasm', 1)], [900, A.drug('epinephrine', 50, 'mcg'), 'adrenaline 50 µg']], 1800, { printEvery: 60, fine: true }),
  S('X-bs-mg', 'bronchospasm 1 at 600, magnesium 2 g at 900', [...RIG(), [E0, A.lung('bronchospasm', 1)], [900, A.drug('magnesium', 2000, 'mg'), 'magnesium 2 g']], 1800, { printEvery: 60, fine: true }),
  S('X-bs-ket', 'bronchospasm 1 at 600, ketamine 1 mg/kg at 900', [...RIG(), [E0, A.lung('bronchospasm', 1)], [900, A.drug('ketamine', 1, 'mg/kg'), 'ketamine 1 mg/kg']], 1800, { printEvery: 60, fine: true }),
  S('X-asthma-salb', 'lung asthma 1 at 600, salbutamol 250 µg at 900', [...RIG(), [E0, A.lung('asthma', 1)], [900, A.drug('salbutamol', 250, 'mcg'), 'salbutamol 250 µg']], 1800, { printEvery: 60, fine: true }),
  S('X-copd-salb', 'lung copd 1 at 60 (RR 10), salbutamol 250 µg at 900', [...RIG({ rr: 10 }), [60, A.lung('copd', 1)], [900, A.drug('salbutamol', 250, 'mcg'), 'salbutamol 250 µg']], 1800, { printEvery: 60, fine: true }),
  S('C6-prop-fent', 'fentanyl 2 µg/kg at 180, propofol 2 mg/kg at 300, natural airway, room air', [[180, A.drug('fentanyl', 2, 'mcg/kg'), 'fentanyl 2 µg/kg'], prop(T0)], 900, { printEvery: 15 }),
  S('C6b-prop-fent-sga', 'as C6 via SGA', [[1, A.device('sga')], [180, A.drug('fentanyl', 2, 'mcg/kg'), 'fentanyl 2 µg/kg'], prop(T0)], 900, { printEvery: 15 }),
  S('C7-prop25-sga', 'propofol 2.5 mg/kg via SGA, room air', [[1, A.device('sga')], prop(T0, 2.5)], 900, { printEvery: 15 }),
  S('C8-prop-remi-sga', 'remifentanil 0.1 µg/kg/min from 120, propofol 2 mg/kg at 300, SGA', [[1, A.device('sga')], [120, A.infusion('remifentanil', 0.1, 'mcg/kg/min'), 'remifentanil 0.1'], prop(T0)], 900, { printEvery: 15 }),
  // R54 coverage-matrix LUNG cells FU-6 owns (research/12 §5.3, §5.5, §5.7): measured and graded in the gate note
  S('M-NN08-extub-hypoxic', 'NN-08: D3 (extubation at TOFR ≈ 0.6, FiO2 0.4) then room air at 4650 — obstruction and a blunted hypoxic response (the engine accepts FiO2 ≥ 0.21)', [...(SCENARIOS.find((x) => x.name === 'D3-extubation-residual')?.steps ?? []), [4650, A.spont({ fio2: 0.21 }), 'room-air challenge']], 5250, { printEvery: 30 }),
  S('M-PD11-child-vcv', 'PD-11: child 4 y 16 kg, ETT, VCV 20 × 128 (8 mL/kg), PEEP 5, FiO2 0.5, propofol + rocuronium', [[1, A.device('ett')], [1, A.vent({ rr: 20, vtMl: 128 })], [1, A.infusion('propofol', 150, 'mcg/kg/min'), 'propofol 150'], [1, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6']], 1800, { printEvery: 300, patient: CHILD }),
  S('M-PD12-infant-vcv', 'PD-12 (partial): infant 6 mo 7 kg, ETT, VCV 30 × 56 (8 mL/kg) — the weight-scaled apparatus only; an adult HME needs an apparatus-volume input (Request → FU-4)', [[1, A.device('ett')], [1, A.vent({ rr: 30, vtMl: 56 })], [1, A.infusion('propofol', 150, 'mcg/kg/min'), 'propofol 150'], [1, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6']], 1800, { printEvery: 300, patient: { ageY: 0.5, weightKg: 7, heightCm: 67 } }),
  S('M-CM07-copd-o2', 'CM-07: COPD GOLD 3 (lung copd 0.67, HCO3 30) awake on air, FiO2 1.0 at 600 — O2-induced hypercapnia (+5–20 mmHg)', [[600, A.spont({ fio2: 1 }), 'FiO2 1.0']], 2400, { printEvery: 120, patient: { ageY: 65, weightKg: 70, heightCm: 175, lungConditions: [{ id: 'copd', severity: 0.67 }], blood: { hco3: 30 } } }),
);
