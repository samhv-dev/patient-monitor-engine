// The physiology sanity set as pme-validation/1 documents (brief §4.9 checks 1–9 = V8; tables
// docs/physiology/parameter-tables.md §7 checks 10–25; R39 bands). Built by helpers so each row reads as
// its source sentence. Checks that need Stage 7 modules (drugs, bleeding, conditions, MODELED mode) are NOT
// MEASURABLE on a build without them (the engine refuses the command, decision 8) and become live as 7a–7g merge.
// Default tolerance for a stated change is ±15 % (tables §7 header) (as the tables state); stated ranges are used as Range targets.
import type { DocCommand } from '@pme/controller/scenario';
import { miss } from '../../src/report/expected-ids.ts';
import type { CrossTarget, Ref, Segment, Target, ValidationDoc } from '../../src/segments/types.ts';

type Ev = Record<string, unknown>;
const ev = (event: Ev): DocCommand => ({ type: 'applyEvent', event } as DocCommand);
const at = (t: number, command: DocCommand) => ({ t, command });
const ADULT = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175, ageBand: 'adult' as const };
const SENSORS = { ecg: 'on', spo2: 'on', abp: 'connected', co2: 'on' };

function doc(o: {
  id: string; title: string; source: string; durationS: number; requires?: string[];
  mode?: 'manual' | 'modeled'; patient?: Record<string, unknown>; baseline?: Record<string, number>;
  actions: Array<{ t: number; command: DocCommand }>; segments: Segment[];
}): ValidationDoc {
  // The R22 profile rides in `patient.profile` (FU-3 item 9): chronic conditions (7a/7d) and lung conditions (7b,
  // pregnancy) build the engine; acute ones (RV infarct, sepsis, a growing haematoma) are t = 0 actions. Before, such
  // documents were not measurable (the first 8a run graded t15 RV infarct on the healthy adult: CVP 4.4 / MAP 92).
  return {
    schema: 'pme-validation/1', id: o.id, title: o.title, seed: 1, durationS: o.durationS,
    ...(o.requires ? { requires: o.requires } : {}),
    scenario: {
      schema: 'pme-scenario/1', id: `val-${o.id}`, title: o.title, ...(o.mode ? { mode: o.mode } : {}),
      // MODELED leaves the heart rate to the model: there `setTarget hr` is the instructor's held rate (FU-2 rate rule), so
      // the default `hr: 75` froze the rate and the reflex rows read exactly 75.0 (Q-FU3-9a). MANUAL keeps it (targets ARE the patient).
      patient: { ...ADULT, sensors: SENSORS, baseline: { ...(o.mode === 'modeled' ? {} : { hr: 75 }), sbp: 120, dbp: 70, ...o.baseline }, ...o.patient },
      initialState: 'run', states: [{ id: 'run', notes: o.source }],
    },
    actions: o.actions,
    segments: o.segments,
  };
}
const seg = (id: string, fromS: number, toS: number, ...targets: Target[]): Segment => ({ id, fromS, toS, targets });
const rng = (id: string, series: string, reduce: Target['reduce'], min: number | { segment: string; factor?: number; offset?: number }, max: number | { segment: string; factor?: number; offset?: number }, source: string, extra: Partial<Target> = {}): Target => ({ id, series, reduce, type: 'Range', min, max, source, ...extra }) as Target;
const gt = (id: string, series: string, reduce: Target['reduce'], value: number | { segment: string; factor?: number; offset?: number }, source: string): Target => ({ id, series, reduce, type: 'GreaterThan', value, source });
const lt = (id: string, series: string, reduce: Target['reduce'], value: Ref, source: string, extra: Partial<Target> = {}): Target => ({ id, series, reduce, type: 'LessThan', value, source, ...extra }) as Target;
const base = (id = 'base', fromS = 30, toS = 60) => seg(id, fromS, toS, rng('steady-map', 'state:map', 'mean', 60, 110, 'baseline MAP physiological [FIT: physiological normal range without a cited source; brief research/44 X-15]'));

// s9 (brief 84, research 46 §C). After VF with ventilation continued, alveolar CO2 washes out with τ = V_lung / V̇A. The
// window is computed from this rig's ventilator settings and the sourced lung volume, never from the engine's output:
// V_lung at end-expiration 2.2–2.8 L (anaesthetised supine adult, FRC 2.0–2.5 L plus 0.2–0.3 L at PEEP 5; Miller 10e
// ch. 12 pp. 254–264), dead space ≈ 150 mL. From EtCO2 ≈ 37 the true value falls below 5 at ln(37/5) ≈ 2.0 τ.
const S9_VENT = { rr: 12, vtMl: 500 };
const S9_WASHOUT = (() => {
  const va = (S9_VENT.rr * (S9_VENT.vtMl - 150)) / 60; // mL/s
  const breath = 60 / S9_VENT.rr;
  const [lo, hi] = [2200 / va, 2800 / va];
  return { tau: `${lo.toFixed(0)}–${hi.toFixed(0)}`, min: Math.round(2 * lo - breath), max: Math.round(2 * hi + breath) };
})();
/** A capnograph's transport delay (2–5 s, sidestream; research 46 §C) at its upper end, plus one breath. */
const S9_DISPLAY_LAG_S = 5 + 60 / S9_VENT.rr;

const S = 'brief §4.9';
const T7 = 'tables §7';

export const SANITY_DOCS: ValidationDoc[] = [
  // --- brief §4.9 (V8) ---------------------------------------------------------------------------------------
  doc({
    id: 's1-phenylephrine', title: 'Phenylephrine 100 µg', source: `${S} check 1`, durationS: 180, mode: 'modeled', requires: ['7a', '7g'],
    actions: [at(60, ev({ kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg' }))],
    segments: [base(), seg('peak', 90, 120,
      rng('map-rise', 'state:map', 'max', { segment: 'base', offset: 15 }, { segment: 'base', offset: 25 }, `${S} 1: MAP +15–25 within 30–60 s`),
      rng('hr-fall', 'state:hr', 'min', { segment: 'base', offset: -15 }, { segment: 'base', offset: -5 }, `${S} 1: reflex HR −5–15`))],
  }),
  doc({
    id: 's2-class2-haemorrhage', title: 'ATLS class II haemorrhage (1000 mL / 10 min)', source: `${S} check 2; R45(b)`, durationS: 900, mode: 'modeled', requires: ['7a', '7c'],
    actions: [at(60, ev({ kind: 'bleed', volumeMl: 1000, overS: 600 }))],
    segments: [seg('base', 30, 60, rng('pp0', 'state:pp', 'mean', 30, 70, 'baseline PP [FIT: physiological normal range without a cited source; brief research/44 X-15]')),
      seg('class2', 660, 900,
        rng('hr', 'state:hr', 'mean', 100, 120, `${S} 2: HR 100–120`),
        rng('sbp-held', 'state:sbp', 'mean', { segment: 'base', factor: 0.9 }, { segment: 'base', factor: 1.05 }, `${S} 2: SBP near normal (R45 b)`),
        lt('pp-narrow', 'state:pp', 'mean', { segment: 'base', factor: 0.9 }, `${S} 2: PP narrowed`))],
  }),
  doc({
    id: 's3-propofol-induction', title: 'Propofol 2 mg/kg induction', source: `${S} check 3`, durationS: 240, mode: 'modeled', requires: ['7g'],
    actions: [at(60, ev({ kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg' }))],
    segments: [base(), seg('2min', 175, 185,
      { id: 'map-70pct', series: 'state:map', reduce: 'mean', type: 'EqualTo', value: { segment: 'base', factor: 0.7 }, tolPct: 15, source: `${S} 3: MAP ≈ 70 % of baseline at 2 min` },
      lt('hr-little', 'state:hr', 'mean', { segment: 'base', factor: 1.1 }, `${S} 3: little HR rise`))],
  }),
  ...([['I', 700, [60, 100], null], ['III', 1750, [120, 140], 90], ['IV', 2250, [140, 180], 90]] as const).map(([cls, ml, hr, sbpMax]) => doc({
    id: `s4-class-${cls.toLowerCase()}`, title: `ATLS class ${cls} haemorrhage (${ml} mL / 10 min)`, source: `${S} check 4`, durationS: 900, mode: 'modeled', requires: ['7a', '7c'],
    actions: [at(60, ev({ kind: 'bleed', volumeMl: ml, overS: 600 }))],
    segments: [seg('late', 660, 900,
      rng('hr', 'state:hr', 'mean', hr[0], hr[1], `${S} 4 / ATLS class ${cls}: HR ${hr[0]}–${hr[1]}`),
      ...(sbpMax !== null ? [lt('sbp', 'state:sbp', 'mean', sbpMax + (cls === 'III' ? 10 : 0), `${S} 4 / ATLS class ${cls}: SBP decreased`)] : []),
      ...(cls === 'IV' ? [lt('pp', 'state:pp', 'mean', 25, `${S} 4: class IV PP < 25`)] : []))],
  })),
  doc({
    id: 's6-apnoea-preoxygenated', title: 'Apnoea after preoxygenation, 70 kg', source: `${S} check 6; Stage 3 acceptance 5`, durationS: 900,
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(0, ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 })), at(180, ev({ kind: 'airway', state: 'apnoea' }))],
    segments: [seg('apnoea', 180, 900, rng('t90', 'state:spo2', 'firstTBelow', 390, 570, `${S} 6: SaO2 90 % at 8 ± 1.5 min (Benumof)`, { threshold: 90 }))],
  }),
  doc({
    id: 's6-apnoea-room-air', title: 'Apnoea on room air, 70 kg', source: 'R39 item 1', durationS: 300,
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(60, ev({ kind: 'airway', state: 'apnoea' }))],
    segments: [seg('apnoea', 60, 300,
      rng('true-t90', 'state:spo2', 'firstTBelow', 35, 60, 'R39-1: true SaO2 90 % at 45 s (35–60)', { threshold: 90 }),
      rng('shown-t90', 'numeric:spo2', 'firstTBelow', 45, 90, 'R39-1: displayed SpO2 90 % at 60 s (45–90)', { threshold: 90 }))],
  }),
  doc({
    id: 's7-apnoea-child', title: 'Apnoea after preoxygenation, 4 y 16 kg', source: `${S} check 7 (Patel)`, durationS: 600,
    patient: { ageY: 4, weightKg: 16, heightCm: 102, ageBand: 'paediatric' }, baseline: { hr: 100, sbp: 100, dbp: 60, rr: 24, vt: 130 },
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(0, ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 })), at(180, ev({ kind: 'airway', state: 'apnoea' }))],
    segments: [seg('apnoea', 180, 600, rng('t90', 'state:spo2', 'firstTBelow', 130, 190, `${S} 7: 160 ± 30 s`, { threshold: 90 }))],
  }),
  doc({
    id: 's8-co2-apnoea-first-breath', title: 'First breath after 60 s disconnection', source: `${S} check 8; Stage 3 acceptance 4 (resp-airway.test.ts)`, durationS: 200,
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 })), at(1, { type: 'setTarget', variable: 'etco2', value: 37 } as DocCommand),
      at(120, ev({ kind: 'airway', state: 'disconnected' })), at(180, ev({ kind: 'airway', state: 'patent' }))],
    segments: [seg('before', 100, 120, rng('et0', 'breath:etco2True', 'mean', 30, 45, 'normocapnia [FIT: physiological normal range without a cited source; brief research/44 X-15]')),
      seg('after', 180, 192, rng('first', 'breath:etco2True', 'max', { segment: 'before', offset: 9 }, { segment: 'before', offset: 15 }, 'Stage 3 acc. 4: first breath +9 to +15 mmHg'))],
  }),
  doc({
    id: 's9-witnessed-vf', title: 'Witnessed VF, no CPR', source: `${S} check 9 (research 03 §8.8 A); Stage 3 gate`, durationS: 180,
    actions: [at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: S9_VENT.rr, vtMl: S9_VENT.vtMl, fio2: 0.5, peep: 5 })), at(60, { type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' } as DocCommand)],
    segments: [seg('base', 30, 60, rng('et0', 'numeric:etco2', 'mean', 30, 45, 'normocapnia [FIT: physiological normal range without a cited source; brief research/44 X-15]')),
      seg('arrest', 60, 180,
        rng('abp-flat', 'numeric:abpSys', 'firstTBelow', 0, 20, 'Stage 2 acc. 6: pulseless → flat (displayed ABP < 20) within 20 s', { threshold: 20 }),
        // Brief 84 / research 46 §C: the 0–30 s row ("Stage 3") had no source and is replaced by the washout it implies.
        rng('etco2-true-gone', 'breath:etco2True', 'firstTBelow', S9_WASHOUT.min, S9_WASHOUT.max, `research 46 §C: true EtCO2 < 5 at 2τ ± one breath, τ = V_lung / V̇A = ${S9_WASHOUT.tau} s on this rig (V_lung 2.2–2.8 L, Miller 10e ch. 12; V̇A = RR × (VT − 150 mL)); Falk 1988, Gudipati 1988`, { threshold: 5 }),
        lt('etco2-shown-lag', 'numeric:etco2', 'firstTBelow', { segment: 'arrest', series: 'breath:etco2True', offset: S9_DISPLAY_LAG_S }, `research 46 §C: displayed EtCO2 < 5 within a capnograph's response of the true value: transport delay ≤ 5 s plus one breath (${60 / S9_VENT.rr} s); Miller 10e ch. 37 p. 1164, ISO 80601-2-55`, { threshold: 5 }))],
  }),
  // --- tables §7 checks 10–25 (Stage 7) -----------------------------------------------------------------------
  doc({
    id: 't10-as-cad-propofol', title: 'AS + CAD + HTN, propofol 1.5 mg/kg', source: `${T7} 10`, durationS: 360, mode: 'modeled', requires: ['7a', '7g'],
    patient: { ageY: 75, profile: { conditions: [{ id: 'as', grade: 'severe' }, { id: 'cad', grade: 'severe' }, { id: 'htn' }] } }, baseline: { sbp: 150, dbp: 80 },
    actions: [at(60, ev({ kind: 'drug', drugId: 'propofol', dose: 1.5, unit: 'mg/kg' })), at(210, ev({ kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg' }))],
    segments: [base(), seg('2min', 175, 185, rng('map', 'state:map', 'mean', 60, 65, `${T7} 10: MAP 103 → 60–65 at 2 min`)),
      seg('rescue', 210, 300, gt('map-rescued', 'state:map', 'max', 85, `${T7} 10: phenylephrine → MAP ≥ 85 within 90 s`))],
  }),
  doc({
    id: 't11-chronic-mr-fluid', title: 'Chronic MR + 1.5 L crystalloid', source: `${T7} 11`, durationS: 2700, mode: 'modeled', requires: ['7a', '7b', '7c'],
    patient: { profile: { conditions: [{ id: 'mr', grade: 'severe', severity: 0.4 }] } }, // severe, severity < 0.5 = 7a's chronic big LA
    actions: [at(60, ev({ kind: 'fluid', fluid: 'crystalloid', volumeMl: 1500, overS: 1800 }))],
    segments: [seg('late', 1200, 1560, gt('pawp', 'state:pawp', 'mean', 25, `${T7} 11: PCWP 15 → > 25 by 15–25 min`)),
      seg('oedema', 1800, 2400, rng('spo2', 'state:spo2', 'mean', 89, 92, `${T7} 11: SpO2 96 → 89–92`))],
  }),
  doc({
    id: 't12-massive-pe', title: 'Massive PE (φ 0.6), ventilated', source: `${T7} 12`, durationS: 300, mode: 'modeled', requires: ['7a', '7b'],
    actions: [at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 1, peep: 5 })), at(120, ev({ kind: 'condition', id: 'pe', severity: 0.6 }))],
    segments: [seg('base', 90, 120, rng('et0', 'numeric:etco2', 'mean', 30, 45, 'normocapnia [FIT: physiological normal range without a cited source; brief research/44 X-15]')),
      seg('pe', 120, 140, rng('etco2', 'numeric:etco2', 'min', 20, 25, `${T7} 12: EtCO2 35 → 20–25 within 3 breaths`)),
      seg('pe-late', 180, 300, rng('papm', 'state:papSys', 'max', 30, 45, `${T7} 12: mPAP 30–40, never > 45 (systolic proxy) [FIT: mPAP band as a systolic proxy; brief research/44 V-09]`), rng('spo2', 'state:spo2', 'min', 85, 92, `${T7} 12: SpO2 85–92 on FiO2 1`))],
  }),
  doc({
    id: 't13-tension-ptx', title: 'Tension pneumothorax, ventilated', source: `${T7} 13`, durationS: 480, mode: 'modeled', requires: ['7a', '7b'],
    actions: [at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 })), at(60, ev({ kind: 'condition', id: 'tensionPtx', severity: 1 }))],
    segments: [base(), seg('3min', 230, 250, lt('sbp', 'state:sbp', 'mean', 90, `${T7} 13: SBP < 90 by 3 min`), rng('cvp', 'state:cvp', 'mean', { segment: 'base', offset: 5 }, { segment: 'base', offset: 15 }, `${T7} 13: CVP +5–15`))],
  }),
  doc({
    id: 't14-tamponade', title: 'Tamponade (20 mL/min into the pericardium)', source: `${T7} 14`, durationS: 720, mode: 'modeled', requires: ['7a'],
    actions: [at(60, ev({ kind: 'condition', id: 'tamponade', severity: 1 }))],
    segments: [seg('equalised', 540, 720, rng('cvp', 'state:cvp', 'mean', 15, 20, `${T7} 14: CVP ≈ PAD ≈ PCWP 15–20`), rng('pawp', 'state:pawp', 'mean', 15, 20, `${T7} 14`))],
  }),
  doc({
    id: 't15-rv-infarct', title: 'RV infarct (inferior STEMI, Ees_RV ×0.35)', source: `${T7} 15`, durationS: 300, mode: 'modeled', requires: ['7a'],
    actions: [at(0, ev({ kind: 'condition', id: 'rvInfarct', severity: 1 }))],
    segments: [seg('rest', 120, 300, rng('cvp', 'state:cvp', 'mean', 14, 18, `${T7} 15: CVP 14–18`, { expectedMiss: miss('D', '2026-11-08', 'CVP 6.8') }), rng('pawp', 'state:pawp', 'mean', 8, 12, `${T7} 15: PCWP 8–12`, { expectedMiss: miss('D', '2026-11-08', 'PCWP 3.3') }), rng('map', 'state:map', 'mean', 60, 70, `${T7} 15: MAP 60–70`))],
  }),
  doc({
    id: 't16-septic-shock-warm', title: 'Septic shock, warm phase', source: `${T7} 16`, durationS: 600, mode: 'modeled', requires: ['7f'],
    actions: [at(0, ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm' }))],
    // Brief 84: the MAP 55–60 row at 300–600 s had no source for its time and is replaced by the state rows below; the HR
    // row is kept as it was (its window has the same problem, audit V-12, outside brief 84).
    segments: [seg('warm', 300, 600, rng('hr', 'state:hr', 'mean', 115, 130, `${T7} 16: HR 115–130`))],
  }),
  // Brief 84 / research 46 §E: septic shock is a state. The rig follows the source (Garcia 2023): anaesthetised (sevoflurane),
  // ventilated (8 mL/kg, PEEP 5), maintenance fluid 2 mL/kg/h only. The condition keeps its present onset (τ 600 s, a [ENG: scenario]
  // compression of an onset the sources put at hours; expected deviation E), so the state is read once the ramp is complete
  // (≥ 5 τ = 3000 s).
  ...([['state', false], ['fluid', true]] as const).map(([k, fluid]) => doc({
    id: `t16-septic-shock-${k}`, title: fluid ? 'Septic shock, 30 mL/kg crystalloid, no vasopressor' : 'Septic shock, established, unresuscitated', source: `${T7} 16; research 46 §E`, durationS: 3600, mode: 'modeled', requires: ['7f'],
    actions: [at(0, ev({ kind: 'airwayDevice', device: 'ett' })), at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 560, fio2: 0.5, peep: 5 })),
      at(0, ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2 })), at(0, ev({ kind: 'thermal', anaesthesia: 'general' })),
      at(0, ev({ kind: 'fluid', fluid: 'crystalloid', volumeMl: 140, overS: 3600 })), // 2 mL/kg/h × 70 kg for the hour
      at(0, ev({ kind: 'condition', id: 'sepsis', severity: 1, phase: 'warm' })),
      // 30 mL/kg (2100 mL) over 30 min once MAP is below 65 (≈ 1200 s here), the Sepsis-3 "volume repletion"
      ...(fluid ? [at(1200, ev({ kind: 'fluid', fluid: 'crystalloid', volumeMl: 2100, overS: 1800 }))] : [])],
    segments: [fluid
      ? seg('after-fluid', 3000, 3600, lt('map', 'state:map', 'mean', 65, 'research 46 §E: after 30 mL/kg and no vasopressor MAP stays < 65 (Sepsis-3, Singer 2016)'))
      : seg('established', 3000, 3600, rng('map', 'state:map', 'mean', 49, 60, 'research 46 §E: established septic shock, unresuscitated, anaesthetised, ventilated: MAP 49–60 (Garcia 2023, control IQR at 4 h)', { expectedMiss: miss('E', '2026-11-08', 'MAP 17.4 at 3000–3600 s: 40.9 at 2700–3000 s, then circulatory arrest from ≈ 3000 s') }))],
  })),
  doc({
    id: 't17a-class3-no-bb', title: 'Class III haemorrhage (35 %), no β-blocker', source: `${T7} 17a`, durationS: 1800, mode: 'modeled', requires: ['7a', '7c'],
    actions: [at(60, ev({ kind: 'bleed', volumeMl: 1750, overS: 600 }))],
    segments: [seg('late', 900, 1800, rng('hr', 'state:hr', 'mean', 120, 140, `${T7} 17a: HR 120–140`), rng('sbp', 'state:sbp', 'mean', 80, 90, `${T7} 17a: SBP 80–90`), rng('pp', 'state:pp', 'mean', 20, 25, `${T7} 17a: PP 20–25`))],
  }),
  doc({
    id: 't17b-class3-bb', title: 'Class III haemorrhage, chronic β-blocker', source: `${T7} 17b`, durationS: 1800, mode: 'modeled', requires: ['7a', '7c', '7g'],
    patient: { profile: { conditions: [{ id: 'betaBlocked' }] } },
    actions: [at(60, ev({ kind: 'bleed', volumeMl: 1750, overS: 600 }))],
    // Brief 84 / research 46 §F: the SBP 65–80 band had no primary source and is deleted; the two rows that compare
    // this run with t17a at the same bleed (SANITY_CROSS) take its place.
    segments: [seg('late', 900, 1800, rng('hr', 'state:hr', 'mean', 80, 95, `${T7} 17b: HR 80–95`))],
  }),
  doc({
    id: 't18-htn-hypocapnia-cbf', title: 'Hypertensive 75 y at MAP 65, PaCO2 40 → 25', source: `${T7} 18`, durationS: 600, mode: 'modeled', requires: ['7d'],
    patient: { ageY: 75, profile: { conditions: [{ id: 'htn' }] } }, actions: [at(120, ev({ kind: 'ventilation', source: 'ventilator', rr: 24, vtMl: 600, fio2: 0.5, peep: 5 }))],
    segments: [seg('hypocapnia', 400, 600, rng('etco2', 'numeric:etco2', 'mean', 20, 28, `${T7} 18: hyperventilation to PaCO2 ≈ 25 (EtCO2 proxy) [FIT: EtCO2 proxy for PaCO2 25; brief research/44 V-15]`))],
  }),
  doc({
    id: 't19-tbi-haematoma', title: 'TBI, expanding haematoma', source: `${T7} 19`, durationS: 1800, mode: 'modeled', requires: ['7d'],
    patient: { profile: { conditions: [{ id: 'tbi', severity: 1 }] } }, actions: [at(0, ev({ kind: 'brain', massRateMlPerMin: 1 }))],
    segments: [seg('cushing', 1200, 1800, lt('hr', 'state:hr', 'min', 60, `${T7} 19: HR 80 → 45–55 at CPP < 40`))],
  }),
  doc({
    id: 't20-low-flow-oliguria', title: 'Low-flow oliguria, dobutamine', source: `${T7} 20`, durationS: 3600, mode: 'modeled', requires: ['7d', '7g'],
    patient: { profile: { conditions: [{ id: 'hfref' }] } }, actions: [at(600, ev({ kind: 'drug', drugId: 'dobutamine', dose: 5, unit: 'mcg/kg/min' }))],
    segments: [seg('on-dobutamine', 1800, 3600, rng('map', 'state:map', 'mean', 68, 76, `${T7} 20: MAP 72 on dobutamine`))],
  }),
  doc({
    id: 't21-mh', title: 'Malignant hyperthermia, fixed ventilation', source: `${T7} 21; Stage 3 gate (EtCO2 38 → 124 in 30 min)`, durationS: 1500,
    actions: [at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 })), at(300, ev({ kind: 'condition', id: 'mh', severity: 1 }))],
    segments: [seg('base', 240, 300, rng('et0', 'numeric:etco2', 'mean', 30, 45, 'normocapnia [FIT: physiological normal range without a cited source; brief research/44 X-15]')),
      seg('10min', 870, 930, rng('etco2', 'numeric:etco2', 'mean', 51, 69, `${T7} 21: EtCO2 40 → 60 by 10 min (±15 %)`)),
      seg('20min', 1400, 1500, gt('rising', 'numeric:etco2', 'mean', { segment: '10min', offset: 15 }, `${T7} 21: keeps rising 3–5 mmHg/min`))],
  }),
  doc({
    id: 't22-term-spinal', title: 'Term pregnancy, spinal, supine', source: `${T7} 22`, durationS: 600, mode: 'modeled', requires: ['7a', '7f'],
    patient: { ageY: 30, sex: 'F', profile: { lungConditions: [{ id: 'pregnancy', severity: 1 }] } }, baseline: { sbp: 125, dbp: 75 }, // 39 wk = term
    actions: [at(60, ev({ kind: 'neuraxial', level: 'T4' }))],
    segments: [seg('3-5min', 240, 360, rng('map', 'state:map', 'mean', 60, 65, `${T7} 22: MAP 90 → 60–65 in 3–5 min`))],
  }),
  doc({
    id: 't23-term-apnoea', title: 'Term pregnancy, GA apnoea after preoxygenation', source: `${T7} 23`, durationS: 600, requires: ['7b'],
    patient: { ageY: 30, sex: 'F', weightKg: 80, heightCm: 165, profile: { lungConditions: [{ id: 'pregnancy', severity: 1 }] } }, // 39 wk = term
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(0, ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 })), at(180, ev({ kind: 'airway', state: 'apnoea' }))],
    segments: [seg('apnoea', 180, 600, rng('t90', 'state:spo2', 'firstTBelow', 150, 240, `${T7} 23: SpO2 90 % at 2.5–4 min`, { threshold: 90 }))],
  }),
  ...([[1.0, 411], [0.8, 303], [0.6, 213]] as const).map(([fio2, s]) => doc({
    id: `t24-edmark-fio2-${fio2}`, title: `Induction atelectasis: apnoea after FiO2 ${fio2}`, source: `${T7} 24 (Edmark)`, durationS: 900, requires: ['7b'],
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(0, ev({ kind: 'preoxygenate', fio2, durationS: 180 })), at(180, ev({ kind: 'airway', state: 'apnoea' }))],
    segments: [seg('apnoea', 180, 900, rng('t90', 'state:spo2', 'firstTBelow', Math.round(0.8 * s), Math.round(1.2 * s), `${T7} 24: ${s} s ±20 %`, { threshold: 90 }))],
  })),
  doc({
    id: 't25-rocuronium-sugammadex', title: 'Rocuronium 0.6 mg/kg → sugammadex 2 mg/kg at T2', source: `${T7} 25; Moerer 2005; Cantineau 1994`, durationS: 2400, mode: 'modeled', requires: ['7f', '7g'],
    // FU-4 (G-FU3 ruling 4): ventilated from induction as clinically done; spontaneous breathing is allowed back with the
    // reversal. Brief 93 (audit DEV-06, target audit row 16): the cell had read the tables' 2.2 min, a TOFR-0.9 endpoint,
    // as breathing. The sources' endpoint is the diaphragm's own recovery after 0.6 mg/kg — Moerer 2005 (PMID 15832241:
    // airway pressure against an occluded tube on magnetic phrenic stimulation) onset 15.9 min young / 22.0 min over 65;
    // Cantineau 1994 (PMID 8092503: phrenic twitch force, thiopental/fentanyl/N2O) 10 % recovery 17 ± 10 min, the
    // adductor pollicis 34 ± 10. The patient's effort shows that recovery only while the brainstem asks for a breath, so
    // the rig has no hypnotic and the ventilator is set to normocapnia (RR 9 × 500 mL: EtCO2 36–37 on this build)
    // [ENG: scenario; a ventilation that holds the PaCO2 at the patient's set point, so the drive is present], and the
    // effort is read under the ventilator from the lungState effort the ventilator link receives.
    actions: [at(0, ev({ kind: 'airwayDevice', device: 'ett' })), at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 9, vtMl: 500, fio2: 0.5, peep: 5 })),
      at(60, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg' })), at(1800, ev({ kind: 'drug', drugId: 'sugammadex', dose: 2, unit: 'mg/kg' })),
      at(1800, ev({ kind: 'ventilation', source: 'spontaneous' }))],
    segments: [
      // From 4 min after the dose (diaphragm onset 3.6 min, Moerer 2005; 120 ± 62 s, Cantineau 1994): seconds to the first own effort
      seg('block', 300, 1800,
        rng('first-effort', 'lung:effort', 'firstTAbove', 12 * 60 + 60 - 300, 24 * 60 + 60 - 300, 'first own effort under the ventilator 12–24 min after rocuronium 0.6 mg/kg: diaphragm recovery onset 15.9 min (young) / 22.0 min (> 65), Moerer 2005; diaphragm twitch 10 % recovery 17 ± 10 min, Cantineau 1994', { threshold: 0 }),
        gt('effort-before-t2', 'lung:effort', 'last', 0, `${T7} 25: capnogram cleft and spontaneous effort return before TOF ≥ 2 (the effort is present when sugammadex is given at T2)`)),
      seg('recovery', 1830, 1932, gt('rr-back', 'numeric:awrr', 'min', 4, `${T7} 25: off the ventilator after sugammadex 2 mg/kg the patient breathes throughout its onset (TOFR 0.9 in 2.2 min, the label; effort is back before TOF ≥ 2)`))],
  }),
  doc({
    // FU-4 (G-FU3 ruling 4): the stress document — the same paralysis NEVER ventilated must end in an arrest (FU-3 Task 5,
    // FU-4 Tasks 4–6): an unventilated paralysed adult on room air arrests 5–14 min after SaO2 < 60 % (DeBehnke 1995;
    // Varvarousi 2011) — SBP below 30 within 5–20 min of the dose
    id: 't25-apnoea', title: 'Rocuronium 0.6 mg/kg, never ventilated: asphyxial arrest', source: `${T7} 25 (stress); FU-3 item 16`, durationS: 1800, mode: 'modeled', requires: ['7f', '7g'],
    // FU-4 (measured, recorded as a deviation): the helper's default baseline sends `setTarget hr 75`, which in MODELED
    // HOLDS the rate (FU-2 rate rule: the instructor's rate) — the asphyxial bradycardia then cannot happen and the
    // paralysed patient did not arrest in 29 min. The stress document leaves the rate to the reflex (pressures only).
    patient: { baseline: { sbp: 120, dbp: 70 } },
    actions: [at(60, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg' }))],
    segments: [seg('arrest', 60, 1800, rng('sbp-collapse', 'state:sbp', 'firstTBelow', 300, 1200, 'asphyxial arrest 5–20 min after the dose [P: DeBehnke 1995; Varvarousi 2011]', { threshold: 30 }))],
  }),
];

// t17a against t17b at the same bleed (brief 84, research 46 §F): each arm's own baseline is 30–60 s (the bleed starts
// at 60 s), the late window 900–1800 s as in both documents.
const T17 = ['t17a-class3-no-bb', 't17b-class3-bb'];
const late = (m: Parameters<CrossTarget['measure']>[0], doc: string, series: string) => m(doc, series, 900, 1800);
export const SANITY_CROSS: CrossTarget[] = [
  {
    doc: 't17-bb-contrast', segment: 'late', target: 'hr-response-ratio', docs: T17, type: 'LessThan', value: 0.6,
    source: 'research 46 §F: β-blockade blunts the reflex tachycardia, ΔHR(17b) ≤ 0.6 × ΔHR(17a) from each arm\'s baseline (Bjurstedt 1977: 48 % of control; Kinsky 2008; Havens 2012)',
    measure: (m) => (late(m, 't17b-class3-bb', 'state:hr') - m('t17b-class3-bb', 'state:hr', 30, 60)) / (late(m, 't17a-class3-no-bb', 'state:hr') - m('t17a-class3-no-bb', 'state:hr', 30, 60)),
  },
  {
    doc: 't17-bb-contrast', segment: 'late', target: 'sbp-ratio', docs: T17, type: 'LessThan', value: 1,
    source: 'research 46 §F: awake, SBP(17b) ≤ SBP(17a) at the same loss, direction only (Bjurstedt 1977; Convertino 2000)',
    measure: (m) => late(m, 't17b-class3-bb', 'state:sbp') / late(m, 't17a-class3-no-bb', 'state:sbp'),
    expectedMiss: miss('F', '2026-11-08', 'SBP 104.1 / 97.9 = 1.063'),
  },
  {
    doc: 't17-bb-contrast', segment: 'late', target: 'co-ratio', docs: T17, type: 'LessThan', value: 1,
    source: 'research 46 §F: awake, CO(17b) < CO(17a) at the same loss, SV unchanged (Convertino 2000)',
    measure: (m) => late(m, 't17b-class3-bb', 'circ:co') / late(m, 't17a-class3-no-bb', 'circ:co'),
    expectedMiss: miss('F', '2026-11-08', 'CO 4.02 / 3.89 L/min = 1.033 (SV 62 vs 41 mL at CVP 0.75 vs 0.86)'),
  },
];
