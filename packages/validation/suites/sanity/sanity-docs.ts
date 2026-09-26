// The physiology sanity set as pme-validation/1 documents (brief §4.9 checks 1–9 = V8; tables
// docs/physiology/stage-7-parameter-tables.md §7 checks 10–25; R39 bands). Built by helpers so each row reads as
// its source sentence. Checks that need Stage 7 modules (drugs, bleeding, conditions, MODELED mode) are NOT
// MEASURABLE on a build without them (the engine refuses the command, decision 8) and become live as 7a–7g merge.
// Default tolerance for a stated change is ±15 % (tables §7 header) [ENG]; stated ranges are used as Range targets.
import type { DocCommand } from '@pme/controller/scenario';
import type { Segment, Target, ValidationDoc } from '../../src/segments/types.ts';

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
  // Stage 7 profile fields (conditions, pregnancyWeeks) are not in pme-scenario/1 yet: they travel in `notes` until
  // the R22 profile schema lands, and the document says which stages it needs.
  const { conditions, pregnancyWeeks, ...patient } = (o.patient ?? {}) as Record<string, unknown>;
  const profile = [conditions ? `conditions ${JSON.stringify(conditions)}` : '', pregnancyWeeks ? `pregnancy ${String(pregnancyWeeks)} weeks` : ''].filter(Boolean).join('; ');
  return {
    schema: 'pme-validation/1', id: o.id, title: o.title, seed: 1, durationS: o.durationS,
    ...(o.requires ? { requires: o.requires } : {}),
    scenario: {
      schema: 'pme-scenario/1', id: `val-${o.id}`, title: o.title, ...(o.mode ? { mode: o.mode } : {}), ...(profile ? { notes: `R22 profile: ${profile}` } : {}),
      patient: { ...ADULT, sensors: SENSORS, baseline: { hr: 75, sbp: 120, dbp: 70, ...o.baseline }, ...patient },
      initialState: 'run', states: [{ id: 'run', notes: o.source }],
    },
    actions: o.actions,
    segments: o.segments,
  };
}
const seg = (id: string, fromS: number, toS: number, ...targets: Target[]): Segment => ({ id, fromS, toS, targets });
const rng = (id: string, series: string, reduce: Target['reduce'], min: number | { segment: string; factor?: number; offset?: number }, max: number | { segment: string; factor?: number; offset?: number }, source: string, extra: Partial<Target> = {}): Target => ({ id, series, reduce, type: 'Range', min, max, source, ...extra }) as Target;
const gt = (id: string, series: string, reduce: Target['reduce'], value: number | { segment: string; factor?: number; offset?: number }, source: string): Target => ({ id, series, reduce, type: 'GreaterThan', value, source });
const lt = (id: string, series: string, reduce: Target['reduce'], value: number | { segment: string; factor?: number; offset?: number }, source: string): Target => ({ id, series, reduce, type: 'LessThan', value, source });
const base = (id = 'base', fromS = 30, toS = 60) => seg(id, fromS, toS, rng('steady-map', 'state:map', 'mean', 60, 110, 'baseline MAP physiological [ENG]'));

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
    segments: [seg('base', 30, 60, rng('pp0', 'state:pp', 'mean', 30, 70, 'baseline PP [ENG]')),
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
    segments: [seg('before', 100, 120, rng('et0', 'breath:etco2True', 'mean', 30, 45, 'normocapnia [ENG]')),
      seg('after', 180, 192, rng('first', 'breath:etco2True', 'max', { segment: 'before', offset: 9 }, { segment: 'before', offset: 15 }, 'Stage 3 acc. 4: first breath +9 to +15 mmHg'))],
  }),
  doc({
    id: 's9-witnessed-vf', title: 'Witnessed VF, no CPR', source: `${S} check 9 (research 03 §8.8 A); Stage 3 gate`, durationS: 180,
    actions: [at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 })), at(60, { type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' } as DocCommand)],
    segments: [seg('base', 30, 60, rng('et0', 'numeric:etco2', 'mean', 30, 45, 'normocapnia [ENG]')),
      seg('arrest', 60, 180,
        rng('abp-flat', 'numeric:abpSys', 'firstTBelow', 0, 20, 'Stage 2 acc. 6: pulseless → flat (displayed ABP < 20) within 20 s', { threshold: 20 }),
        rng('etco2-gone', 'numeric:etco2', 'firstTBelow', 0, 30, 'Stage 3: EtCO2 < 5 within 30 s', { threshold: 5 }))],
  }),
  // --- tables §7 checks 10–25 (Stage 7) -----------------------------------------------------------------------
  doc({
    id: 't10-as-cad-propofol', title: 'AS + CAD + HTN, propofol 1.5 mg/kg', source: `${T7} 10`, durationS: 360, mode: 'modeled', requires: ['7a', '7g'],
    patient: { ageY: 75, conditions: ['aorticStenosis', 'cad3v', 'htn'] }, baseline: { sbp: 150, dbp: 80 },
    actions: [at(60, ev({ kind: 'drug', drugId: 'propofol', dose: 1.5, unit: 'mg/kg' })), at(210, ev({ kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg' }))],
    segments: [base(), seg('2min', 175, 185, rng('map', 'state:map', 'mean', 60, 65, `${T7} 10: MAP 103 → 60–65 at 2 min`)),
      seg('rescue', 210, 300, gt('map-rescued', 'state:map', 'max', 85, `${T7} 10: phenylephrine → MAP ≥ 85 within 90 s`))],
  }),
  doc({
    id: 't11-chronic-mr-fluid', title: 'Chronic MR + 1.5 L crystalloid', source: `${T7} 11`, durationS: 2700, mode: 'modeled', requires: ['7a', '7b', '7c'],
    patient: { conditions: ['mitralRegurgitationChronic'] },
    actions: [at(60, ev({ kind: 'fluid', fluid: 'crystalloid', volumeMl: 1500, overS: 1800 }))],
    segments: [seg('late', 1200, 1560, gt('pawp', 'state:pawp', 'mean', 25, `${T7} 11: PCWP 15 → > 25 by 15–25 min`)),
      seg('oedema', 1800, 2400, rng('spo2', 'state:spo2', 'mean', 89, 92, `${T7} 11: SpO2 96 → 89–92`))],
  }),
  doc({
    id: 't12-massive-pe', title: 'Massive PE (φ 0.6), ventilated', source: `${T7} 12`, durationS: 300, mode: 'modeled', requires: ['7a', '7b'],
    actions: [at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 1, peep: 5 })), at(120, ev({ kind: 'condition', id: 'pe', severity: 0.6 }))],
    segments: [seg('base', 90, 120, rng('et0', 'numeric:etco2', 'mean', 30, 45, 'normocapnia [ENG]')),
      seg('pe', 120, 140, rng('etco2', 'numeric:etco2', 'min', 20, 25, `${T7} 12: EtCO2 35 → 20–25 within 3 breaths`)),
      seg('pe-late', 180, 300, rng('papm', 'state:papSys', 'max', 30, 45, `${T7} 12: mPAP 30–40, never > 45 (systolic proxy) [ENG]`), rng('spo2', 'state:spo2', 'min', 85, 92, `${T7} 12: SpO2 85–92 on FiO2 1`))],
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
    patient: { conditions: ['rvInfarct'] },
    actions: [],
    segments: [seg('rest', 120, 300, rng('cvp', 'state:cvp', 'mean', 14, 18, `${T7} 15: CVP 14–18`), rng('pawp', 'state:pawp', 'mean', 8, 12, `${T7} 15: PCWP 8–12`), rng('map', 'state:map', 'mean', 60, 70, `${T7} 15: MAP 60–70`))],
  }),
  doc({
    id: 't16-septic-shock-warm', title: 'Septic shock, warm phase', source: `${T7} 16`, durationS: 600, mode: 'modeled', requires: ['7f'],
    patient: { conditions: ['sepsisWarm'] }, actions: [],
    segments: [seg('warm', 300, 600, rng('map', 'state:map', 'mean', 55, 60, `${T7} 16: MAP 55–60`), rng('hr', 'state:hr', 'mean', 115, 130, `${T7} 16: HR 115–130`))],
  }),
  doc({
    id: 't17a-class3-no-bb', title: 'Class III haemorrhage (35 %), no β-blocker', source: `${T7} 17a`, durationS: 1800, mode: 'modeled', requires: ['7a', '7c'],
    actions: [at(60, ev({ kind: 'bleed', volumeMl: 1750, overS: 600 }))],
    segments: [seg('late', 900, 1800, rng('hr', 'state:hr', 'mean', 120, 140, `${T7} 17a: HR 120–140`), rng('sbp', 'state:sbp', 'mean', 80, 90, `${T7} 17a: SBP 80–90`), rng('pp', 'state:pp', 'mean', 20, 25, `${T7} 17a: PP 20–25`))],
  }),
  doc({
    id: 't17b-class3-bb', title: 'Class III haemorrhage, chronic β-blocker', source: `${T7} 17b`, durationS: 1800, mode: 'modeled', requires: ['7a', '7c', '7g'],
    patient: { conditions: ['betaBlockerChronic'] },
    actions: [at(60, ev({ kind: 'bleed', volumeMl: 1750, overS: 600 }))],
    segments: [seg('late', 900, 1800, rng('hr', 'state:hr', 'mean', 80, 95, `${T7} 17b: HR 80–95`), rng('sbp', 'state:sbp', 'mean', 65, 80, `${T7} 17b: SBP 65–80`))],
  }),
  doc({
    id: 't18-htn-hypocapnia-cbf', title: 'Hypertensive 75 y at MAP 65, PaCO2 40 → 25', source: `${T7} 18`, durationS: 600, mode: 'modeled', requires: ['7d'],
    patient: { ageY: 75, conditions: ['htn'] }, actions: [at(120, ev({ kind: 'ventilation', source: 'ventilator', rr: 24, vtMl: 600, fio2: 0.5, peep: 5 }))],
    segments: [seg('hypocapnia', 400, 600, rng('etco2', 'numeric:etco2', 'mean', 20, 28, `${T7} 18: hyperventilation to PaCO2 ≈ 25 (EtCO2 proxy) [ENG]`))],
  }),
  doc({
    id: 't19-tbi-haematoma', title: 'TBI, expanding haematoma', source: `${T7} 19`, durationS: 1800, mode: 'modeled', requires: ['7d'],
    patient: { conditions: ['tbiHaematoma'] }, actions: [],
    segments: [seg('cushing', 1200, 1800, lt('hr', 'state:hr', 'min', 60, `${T7} 19: HR 80 → 45–55 at CPP < 40`))],
  }),
  doc({
    id: 't20-low-flow-oliguria', title: 'Low-flow oliguria, dobutamine', source: `${T7} 20`, durationS: 3600, mode: 'modeled', requires: ['7d', '7g'],
    patient: { conditions: ['hfref'] }, actions: [at(600, ev({ kind: 'drug', drugId: 'dobutamine', dose: 5, unit: 'mcg/kg/min' }))],
    segments: [seg('on-dobutamine', 1800, 3600, rng('map', 'state:map', 'mean', 68, 76, `${T7} 20: MAP 72 on dobutamine`))],
  }),
  doc({
    id: 't21-mh', title: 'Malignant hyperthermia, fixed ventilation', source: `${T7} 21; Stage 3 gate (EtCO2 38 → 124 in 30 min)`, durationS: 1500,
    actions: [at(0, ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 })), at(300, ev({ kind: 'condition', id: 'mh', severity: 1 }))],
    segments: [seg('base', 240, 300, rng('et0', 'numeric:etco2', 'mean', 30, 45, 'normocapnia [ENG]')),
      seg('10min', 870, 930, rng('etco2', 'numeric:etco2', 'mean', 51, 69, `${T7} 21: EtCO2 40 → 60 by 10 min (±15 %)`)),
      seg('20min', 1400, 1500, gt('rising', 'numeric:etco2', 'mean', { segment: '10min', offset: 15 }, `${T7} 21: keeps rising 3–5 mmHg/min`))],
  }),
  doc({
    id: 't22-term-spinal', title: 'Term pregnancy, spinal, supine', source: `${T7} 22`, durationS: 600, mode: 'modeled', requires: ['7a', '7f'],
    patient: { ageY: 30, sex: 'F', pregnancyWeeks: 39 }, baseline: { sbp: 125, dbp: 75 },
    actions: [at(60, ev({ kind: 'neuraxial', level: 'T4' }))],
    segments: [seg('3-5min', 240, 360, rng('map', 'state:map', 'mean', 60, 65, `${T7} 22: MAP 90 → 60–65 in 3–5 min`))],
  }),
  doc({
    id: 't23-term-apnoea', title: 'Term pregnancy, GA apnoea after preoxygenation', source: `${T7} 23`, durationS: 600, requires: ['7b'],
    patient: { ageY: 30, sex: 'F', weightKg: 80, heightCm: 165, pregnancyWeeks: 39 },
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(0, ev({ kind: 'preoxygenate', fio2: 1, durationS: 180 })), at(180, ev({ kind: 'airway', state: 'apnoea' }))],
    segments: [seg('apnoea', 180, 600, rng('t90', 'state:spo2', 'firstTBelow', 150, 240, `${T7} 23: SpO2 90 % at 2.5–4 min`, { threshold: 90 }))],
  }),
  ...([[1.0, 411], [0.8, 303], [0.6, 213]] as const).map(([fio2, s]) => doc({
    id: `t24-edmark-fio2-${fio2}`, title: `Induction atelectasis: apnoea after FiO2 ${fio2}`, source: `${T7} 24 (Edmark)`, durationS: 900, requires: ['7b'],
    actions: [at(0, ev({ kind: 'thermal', anaesthesia: 'general' })), at(0, ev({ kind: 'preoxygenate', fio2, durationS: 180 })), at(180, ev({ kind: 'airway', state: 'apnoea' }))],
    segments: [seg('apnoea', 180, 900, rng('t90', 'state:spo2', 'firstTBelow', Math.round(0.8 * s), Math.round(1.2 * s), `${T7} 24: ${s} s ±20 %`, { threshold: 90 }))],
  })),
  doc({
    id: 't25-rocuronium-sugammadex', title: 'Rocuronium 0.6 mg/kg → sugammadex 2 mg/kg at T2', source: `${T7} 25`, durationS: 2400, mode: 'modeled', requires: ['7f', '7g'],
    actions: [at(60, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg' })), at(1800, ev({ kind: 'drug', drugId: 'sugammadex', dose: 2, unit: 'mg/kg' }))],
    segments: [seg('recovery', 1800, 2400, rng('rr-back', 'state:rr', 'firstTAbove', 60, 240, `${T7} 25: spontaneous effort returns within ≈ 2.2 min of sugammadex [ENG]`, { threshold: 4 }))],
  }),
];
