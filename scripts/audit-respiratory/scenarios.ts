// Respiratory integration audit — scenarios (research/09 ids A1…I2d). FU-6 Task 1 DEVIATION: reconstructed from the
// scenario descriptions in docs/plans/fu-6-respiratory-integration.md (the research scripts were not available to the
// executor); ids and intent follow the plan's tables, the exact timings are the executor's.
import type { Body, Scenario, Step } from './runner.ts';

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const A = {
  drug: (drugId: string, dose: number, unit: string) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' }),
  infusion: (drugId: string, rate: number, unit: string) => ev({ kind: 'infusion', drugId, rate, unit }),
  vap: (agent: string, dialPct: number, fgfLpm = 2) => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, n2oFrac: 0 }),
  airway: (state: string, severity?: number) => ev(severity === undefined ? { kind: 'airway', state } : { kind: 'airway', state, severity }),
  lung: (id: string, severity: number, side?: 'L' | 'R') => ev(side ? { kind: 'lungCondition', id, severity, side } : { kind: 'lungCondition', id, severity }),
  device: (device: 'none' | 'ett' | 'sga') => ev({ kind: 'airwayDevice', device }),
  vent: (o: Record<string, number> = {}) => ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, ...o }),
  spont: (o: Record<string, number> = {}) => ev({ kind: 'ventilation', source: 'spontaneous', ...o }),
  none: () => ev({ kind: 'ventilation', source: 'none' }),
  bvm: (o: Record<string, number> = {}) => ev({ kind: 'ventilation', source: 'bvm', rr: 12, vtMl: 500, fio2: 1, ...o }),
  ga: () => ev({ kind: 'thermal', anaesthesia: 'general' }),
  stim: (intensity: number) => ev({ kind: 'stimulus', intensity }),
  cond: (id: string, severity: number) => ev({ kind: 'condition', id, severity }),
  recruit: (pressureCmH2O: number, durationS: number) => ev({ kind: 'recruit', pressureCmH2O, durationS }),
};
export const E0 = 600;
export const T0 = 300;
export const CHILD = { ageY: 4, weightKg: 16, heightCm: 102 };
export const OBESE = { ageY: 40, weightKg: 127, heightCm: 175, lungConditions: [{ id: 'obesity', severity: 1 }] };
export const PREG = { ageY: 30, sex: 'F', weightKg: 75, heightCm: 165, lungConditions: [{ id: 'pregnancy', severity: 1 }] };
/** The audit's ventilated GA rig at t = 1 s: ETT, VCV 12 × 500 (overrides `o`), PEEP 5, FiO2 0.5, GA, propofol 100, rocuronium 1 mg/kg. */
export const RIG = (o: Record<string, number> = {}): Step[] => [
  [1, A.device('ett')], [1, A.vent(o)], [1, A.ga()],
  [1, A.infusion('propofol', 100, 'mcg/kg/min'), 'propofol 100'], [1, A.drug('rocuronium', 1, 'mg/kg'), 'rocuronium 1 mg/kg'],
];
export const prop = (t: number, mgKg = 2): Step => [t, A.drug('propofol', mgKg, 'mg/kg'), `propofol ${mgKg} mg/kg`];
/** Preoxygenation 3 min at FiO2 1, then propofol 2 mg/kg + rocuronium 1.2 mg/kg and apnoea (no ventilation). */
const preox = (ga = false): Step[] => [
  [1, A.spont({ fio2: 1 }), 'preoxygenate FiO2 1'], ...(ga ? [[1, A.ga(), 'GA switch'] as Step] : []),
  prop(180), [180, A.drug('rocuronium', 1.2, 'mg/kg'), 'rocuronium 1.2'], [200, A.none(), 'apnoea'],
];

export function S(name: string, title: string, steps: Step[], tEnd: number, o: Partial<Scenario> = {}): Scenario {
  return { name, title, steps, tEnd, ...o };
}

export const SCENARIOS: Scenario[] = [];
SCENARIOS.push(
  // ---- A. baselines ----
  S('A1-spont-awake', 'Awake adult 40 y 70 kg, room air, 30 min', [], 1800, { printEvery: 300 }),
  S('A1-spont-awake-man', 'As A1 in MANUAL', [], 1800, { printEvery: 300, mode: 'manual' }),
  S('A2-vent-default', 'ETT + VCV 12 × 500, PEEP 5, FiO2 0.5, propofol + rocuronium, 60 min (PaCO2 at 30/60 min)', [...RIG()], 3600, { printEvery: 300 }),
  // ---- B. preoxygenated apnoea to SaO2 90 % ----
  S('B1-apnoea-adult', 'Preoxygenated apnoea, adult 70 kg, no GA switch', preox(), 900, { printEvery: 30 }),
  S('B2-apnoea-adult-ga', 'As B1 with the thermal GA switch', preox(true), 900, { printEvery: 30 }),
  S('B3-apnoea-obese', 'Preoxygenated apnoea, obese 127 kg', preox(), 900, { printEvery: 30, patient: OBESE }),
  S('B4-apnoea-pregnant', 'Preoxygenated apnoea, term pregnancy', preox(), 900, { printEvery: 30, patient: PREG }),
  S('B4g-apnoea-pregnant-ga', 'As B4 with the GA switch', preox(true), 900, { printEvery: 30, patient: PREG }),
  S('B5-apnoea-child', 'Preoxygenated apnoea, child 4 y 16 kg', preox(), 900, { printEvery: 30, patient: CHILD }),
  S('B5g-child-baseline', 'Awake child 4 y 16 kg, room air, 15 min', [], 900, { printEvery: 60, patient: CHILD }),
  // ---- C. induction ----
  S('C1-prop1-natural', 'propofol 1 mg/kg at 300, natural airway, room air', [prop(T0, 1)], 900, { printEvery: 15 }),
  S('C4-prop2-natural', 'propofol 2 mg/kg at 300, natural airway, room air', [prop(T0)], 900, { printEvery: 15 }),
  S('C4b-prop2-sga', 'propofol 2 mg/kg at 300 via SGA, room air', [[1, A.device('sga')], prop(T0)], 900, { printEvery: 15 }),
  // ---- D. drive depression ----
  S('D1-remi-steps', 'remifentanil 0.05 → 0.1 → 0.2 µg/kg/min at 120/900/1800, natural airway', [[120, A.infusion('remifentanil', 0.05, 'mcg/kg/min'), 'remi 0.05'], [900, A.infusion('remifentanil', 0.1, 'mcg/kg/min'), 'remi 0.1'], [1800, A.infusion('remifentanil', 0.2, 'mcg/kg/min'), 'remi 0.2'], [2700, A.drug('naloxone', 100, 'mcg'), 'naloxone 100 µg']], 3000, { printEvery: 150 }),
  S('D2-sevo-sga', 'sevoflurane via SGA, dial 1.5 / 2.5 / 3.5 % at 120/1020/1920, FGF 4', [[1, A.device('sga')], [120, A.vap('sevoflurane', 1.5, 4), 'sevo 1.5'], [1020, A.vap('sevoflurane', 2.5, 4), 'sevo 2.5'], [1920, A.vap('sevoflurane', 3.5, 4), 'sevo 3.5']], 2800, { printEvery: 150 }),
  S('D3-extubation-residual', 'ETT/VCV, propofol, rocuronium 0.6 mg/kg; propofol off at 2400, extubation at 3600 (TOFR ≈ 0.6) on FiO2 0.4', [[1, A.device('ett')], [1, A.vent({ fio2: 0.4 })], [1, A.infusion('propofol', 100, 'mcg/kg/min'), 'propofol 100'], [1, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6'], [2400, A.infusion('propofol', 0, 'mcg/kg/min'), 'propofol off'], [3600, A.device('none'), 'extubation'], [3600, A.spont({ fio2: 0.4 }), 'spontaneous FiO2 0.4']], 4650, { printEvery: 150 }),
  S('D4-remi-prop-stim', 'remifentanil 0.1 + propofol 50 µg/kg/min via SGA, stimulus 1.5 at 1200', [[1, A.device('sga')], [60, A.infusion('remifentanil', 0.1, 'mcg/kg/min'), 'remi 0.1'], [60, A.infusion('propofol', 50, 'mcg/kg/min'), 'propofol 50'], [1200, A.stim(1.5), 'stimulus 1.5']], 1800, { printEvery: 60 }),
  // ---- E. airway ----
  S('E1-bronchospasm-airway', 'Ventilated rig: airway bronchospasm 1 (Stage 3) at 600, salbutamol 250 µg at 900', [...RIG(), [E0, A.airway('bronchospasm', 1), 'airway bronchospasm'], [900, A.drug('salbutamol', 250, 'mcg'), 'salbutamol 250 µg']], 1800, { printEvery: 60, fine: true }),
  S('E1b-bronchospasm-lung', 'Ventilated rig: lungCondition bronchospasm 1 (7b) at 600, salbutamol 250 µg at 900', [...RIG(), [E0, A.lung('bronchospasm', 1), 'lung bronchospasm'], [900, A.drug('salbutamol', 250, 'mcg'), 'salbutamol 250 µg']], 1800, { printEvery: 60, fine: true }),
  S('E2-laryngospasm', 'Awake adult, room air: airway obstructed (complete laryngospasm) 180 s at 300, released', [[T0, A.airway('obstructed', 1), 'laryngospasm'], [480, A.airway('patent'), 'release']], 900, { printEvery: 15, fine: true }),
  S('E2b-laryngospasm-prop', 'propofol 1 mg/kg at 240, airway obstructed 180 s at 300, released', [[240, A.drug('propofol', 1, 'mg/kg'), 'propofol 1 mg/kg'], [T0, A.airway('obstructed', 1), 'laryngospasm'], [480, A.airway('patent'), 'release']], 900, { printEvery: 10, fine: true }),
  S('E3-kinked-tube', 'Ventilated rig: kinked tube (airway obstructed on the ventilator) at 600 for 120 s', [...RIG(), [E0, A.airway('obstructed', 1), 'kink'], [720, A.airway('patent'), 'unkink']], 1200, { printEvery: 15, fine: true }),
  // ---- F. ventilated pathology ----
  S('F1-ards', 'Ventilated rig: ARDS 0.67, PEEP 10, VT 420', [...RIG({ peep: 10, vtMl: 420 }), [60, A.lung('ards', 0.67), 'ARDS']], 1800, { printEvery: 120, fine: true }),
  S('F1r-ards-recruit', 'As F1, recruitment 40 cmH2O × 40 s at 900', [...RIG({ peep: 10, vtMl: 420 }), [60, A.lung('ards', 0.67), 'ARDS'], [900, A.recruit(40, 40), 'recruitment']], 1800, { printEvery: 60, fine: true }),
  S('F2d-copd-disconnect', 'Ventilated COPD 1 at RR 20, disconnection at 900 for 60 s', [...RIG({ rr: 20 }), [60, A.lung('copd', 1), 'COPD'], [900, A.airway('disconnected'), 'disconnect'], [960, A.airway('patent'), 'reconnect']], 1500, { printEvery: 10, fine: true }),
  S('F3-olv-sevo', 'OLV: FiO2 1, VT 350 × 16, lung olv 1 at 300; sevoflurane 2 % at 1200', [...RIG({ fio2: 1, vtMl: 350, rr: 16 }), [300, A.lung('olv', 1, 'L'), 'OLV'], [1200, A.vap('sevoflurane', 2, 4), 'sevo 2 %']], 2400, { printEvery: 120 }),
  S('F6-permissive-hypercapnia', 'ARDS 0.67 on VCV 16 × 300 (permissive hypercapnia)', [...RIG({ rr: 16, vtMl: 300, peep: 10 }), [60, A.lung('ards', 0.67), 'ARDS']], 2400, { printEvery: 300 }),
  // ---- G. systemic ----
  S('G1-pe-vent', 'Ventilated rig: massive PE (condition pe 1) at 600', [...RIG(), [E0, ev({ kind: 'condition', id: 'pe', severity: 1 }), 'PE']], 1500, { printEvery: 60 }),
  S('G1d-pe-awake', 'Awake adult: massive PE at 300', [[T0, ev({ kind: 'condition', id: 'pe', severity: 1 }), 'PE']], 1500, { printEvery: 60 }),
  S('G2-anaemia', 'Awake adult with Hb 5 g/dL (profile)', [], 1800, { printEvery: 300, patient: { blood: { hb: 5 } } }),
  S('G2c-control', 'Awake adult with Hb 15 g/dL (profile)', [], 1800, { printEvery: 300, patient: { blood: { hb: 15 } } }),
  S('G3-cohb-o2', 'COHb 30 % (profile), FiO2 1 via spontaneous O2 from 60 s', [[60, A.spont({ fio2: 1 }), 'FiO2 1']], 3600, { printEvery: 300, patient: { blood: { cohb: 30 } } }),
  S('G3a-cohb-air', 'COHb 30 % (profile) on air', [], 3600, { printEvery: 300, patient: { blood: { cohb: 30 } } }),
  // ---- H. capnography ----
  S('H1-absorber', 'Ventilated rig: FiCO2 8 mmHg (exhausted absorber) at 600', [...RIG(), [E0, A.vent({ fico2: 8 }), 'FiCO2 8']], 2400, { printEvery: 120 }),
  S('H2-bs-capno', 'Ventilated rig: lung bronchospasm 1 at 600, salbutamol at 900 (capnogram)', [...RIG(), [E0, A.lung('bronchospasm', 1)], [900, A.drug('salbutamol', 250, 'mcg')]], 1500, { printEvery: 60 }),
  S('H3-copd-capno', 'Ventilated rig: COPD 1 (capnogram gap)', [...RIG(), [60, A.lung('copd', 1)]], 1200, { printEvery: 120 }),
  S('H11-slow-rr', 'Ventilated rig at RR 6 × 800', [...RIG({ rr: 6, vtMl: 800 })], 1200, { printEvery: 60 }),
  // ---- I. long anaesthesia and anaphylaxis ----
  S('I1-ga-40min', '40 min propofol + rocuronium on VCV (no GA switch): FRC and VCO2', [[1, A.device('ett')], [1, A.vent()], [1, A.infusion('propofol', 100, 'mcg/kg/min'), 'propofol 100'], [1, A.drug('rocuronium', 1, 'mg/kg'), 'rocuronium 1 mg/kg']], 2400, { printEvery: 300 }),
  S('I2a-anaphylaxis-7e', 'Ventilated rig: anaphylaxis (7e condition) at 600', [...RIG(), [E0, ev({ kind: 'condition', id: 'anaphylaxis', severity: 1 }), '7e anaphylaxis']], 1500, { printEvery: 60, fine: true }),
  S('I2c-anaphylaxis-7e-lung', 'Ventilated rig: 7e anaphylaxis + lungCondition anaphylaxis at 600', [...RIG(), [E0, ev({ kind: 'condition', id: 'anaphylaxis', severity: 1 }), '7e anaphylaxis'], [E0, A.lung('anaphylaxis', 1), 'lung anaphylaxis']], 1500, { printEvery: 60, fine: true }),
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
