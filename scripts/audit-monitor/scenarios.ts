// Monitor-fidelity scenarios (research/10-monitor-fidelity-audit.md; FU-5 Task 1 adds D4, F3, F4 and G1). Adult 40 y
// 70 kg M, seed 7. Sensors: ECG, SpO2 (left finger), ABP (radial), CVP, NIBP cuff (right arm), CO2 (sidestream),
// temperature. Default skin philips-like; per-skin variants carry the skin id in the name suffix (-mr mindray-like,
// -sa saadat-like).
import { A, VENTED, type Scenario, type Step } from './runner.ts';

const S = (name: string, title: string, mode: 'manual' | 'modeled', steps: Step[], tEnd: number, extra: Partial<Scenario> = {}): Scenario =>
  ({ name, title, mode, steps, tEnd, printEvery: 10, ...extra });
const SKINS: Array<[string, string]> = [['', 'philips-like'], ['-mr', 'mindray-like'], ['-sa', 'saadat-like']];
const perSkin = (base: Scenario): Scenario[] => SKINS.map(([suf, skin]) => ({ ...base, name: base.name + suf, skin, title: `${base.title} [${skin}]` }));
const bp = (t: number, s: number, d: number, label: string): Step[] => [[t, A.target('sbp', s), label], [t, A.target('dbp', d), label]];

// A. pulse oximetry vs perfusion ---------------------------------------------------------------------------------
const ladder: Step[] = [
  ...VENTED,
  ...bp(60, 135, 82, 'MAP 100'), [100, A.nibp('start'), 'NIBP'],
  ...bp(180, 80, 50, 'MAP 60'), [220, A.nibp('start'), 'NIBP'],
  ...bp(300, 55, 32, 'MAP 40'), [340, A.nibp('start'), 'NIBP'],
  ...bp(420, 35, 20, 'MAP 25'), [460, A.nibp('start'), 'NIBP'],
  ...bp(540, 18, 10, 'MAP 13'), [580, A.nibp('start'), 'NIBP'],
];
const arrest = (rhythm: string, opts: Record<string, unknown> = {}): Step[] => [
  ...VENTED, [60, A.rhythm(rhythm, opts), `${rhythm} ${JSON.stringify(opts)}`], [70, A.nibp('start'), 'NIBP in arrest'],
  [150, A.cpr(true), 'CPR on'], [160, A.nibp('start'), 'NIBP during CPR'], [300, A.cpr(false), 'CPR off'],
  [302, A.rhythm('sinus', { rateBpm: 80 }), 'ROSC sinus 80'], [360, A.nibp('start'), 'NIBP after ROSC'],
];
export const SCENARIOS: Scenario[] = [
  S('A1-map-ladder', 'MANUAL: MAP 100 → 60 → 40 → 25 → 13 (2 min each), NIBP 40 s into each step', 'manual', ladder, 660),
  S('A1m-map-ladder', 'MODELED start, MANUAL targets are ignored → use bleed ladder instead: bleed 3 L over 15 min', 'modeled', [...VENTED, [60, A.bleed(3000, 900), 'bleed 3 L/15 min'], [300, A.nibp('auto', 1), 'NIBP auto 1 min']], 1500, { printEvery: 30 }),
  S('A2-ali-b7', "MODELED Ali's case (08 audit B7): tamponade, propofol 2+1, PEEP 15, sevo 2 %, bleed 2 L", 'modeled', [
    ...VENTED, [60, A.cond('tamponade', 1), 'tamponade 1'], [660, A.drug('propofol', 2, 'mg/kg'), 'propofol 2'], [900, A.drug('propofol', 1, 'mg/kg'), 'propofol 1'],
    [1200, A.vent(15, 0.5), 'PEEP 15'], [1500, A.vap('sevoflurane', 2), 'sevo 2 %'], [2100, A.bleed(2000, 300), 'bleed 2 L'], [2400, A.nibp('auto', 2), 'NIBP auto 2 min'],
  ], 3000, { printEvery: 60 }),
  ...perSkin(S('A4-vf', 'MANUAL: VF coarse at 60 s, NIBP at 70, CPR 150–300 (NIBP at 160), ROSC sinus 80 at 302', 'manual', arrest('vfCoarse'), 420)),
  ...perSkin(S('A5-pea', 'MANUAL: PEA (sinus 90 pulseless) at 60 s, CPR 150–300, ROSC at 302', 'manual', arrest('sinus', { rateBpm: 90, pulseless: true }), 420)),
  ...perSkin(S('A6-asystole', 'MANUAL: asystole at 60 s, CPR 150–300, ROSC at 302', 'manual', arrest('asystole'), 420)),
  S('A7-probe', 'MANUAL: SpO2 probe off 60–90, motion 120–180, ear site 200, same-limb NIBP (probe right finger) 300', 'manual', [
    ...VENTED, [60, A.sensor('spo2', 'off'), 'probe off'], [90, A.sensor('spo2', 'on'), 'probe on'], [120, A.sensor('spo2', 'motion'), 'motion'],
    [180, A.sensor('spo2', 'on'), 'motion stops'], [200, A.sensor('spo2', 'on', 'ear'), 'ear site'], [290, A.sensor('spo2', 'on', 'rightFinger'), 'right finger'], [300, A.nibp('start'), 'NIBP same arm'],
  ], 360, { printEvery: 5 }),
  S('A8-desat-finger', 'MODELED: ventilated FiO2 0.21, ventilator off at 120 s, back on (FiO2 1) when SaO2 < 75 (at 400 s)', 'modeled', [
    [1, A.ett()], [1, A.vent(5, 0.21)], [120, A.ventOff(), 'ventilator off (apnoea)'], [400, A.vent(5, 1.0), 'ventilator on FiO2 1'],
  ], 600, { printEvery: 5 }),
  S('A8e-desat-ear', 'as A8 with the probe on the ear', 'modeled', [
    [1, A.ett()], [1, A.vent(5, 0.21)], [2, A.sensor('spo2', 'on', 'ear'), 'ear'], [120, A.ventOff(), 'ventilator off (apnoea)'], [400, A.vent(5, 1.0), 'ventilator on FiO2 1'],
  ], 600, { printEvery: 5 }),

  // B. ECG / HR ------------------------------------------------------------------------------------------------------
  ...perSkin(S('B1-rhythms', 'MANUAL rhythm tour, 60 s each', 'manual', [
    ...VENTED, [60, A.rhythm('sinus', { rateBpm: 30 }), 'sinus 30'], [120, A.rhythm('sinusBrady', { rateBpm: 35 }), 'sinusBrady 35'],
    [180, A.rhythm('junctionalEscape', { rateBpm: 40 }), 'junctional 40'], [240, A.rhythm('afib', { rateBpm: 140 }), 'AF 140'],
    [300, A.rhythm('vtMono', { rateBpm: 180 }), 'VT 180'], [360, A.rhythm('sinus', { rateBpm: 75 }), 'sinus 75'], [420, A.rhythm('avb3Wide', { rateBpm: 32 }), 'CHB wide 32'],
    [480, A.rhythm('pacedVVI', { pacer: { ratePpm: 70 } }), 'VVI 70'], [540, A.rhythm('sinusTachy', { rateBpm: 187 }), 'sinus tachy 187'], [600, A.rhythm('sinus', { rateBpm: 75 }), 'sinus 75'],
  ], 660, { printEvery: 5 })),
  S('B1a-rhythms-arrOn', 'as B1 on philips-like with arrhythmia analysis switched ON at 2 s', 'manual', [
    ...VENTED, [2, A.alarm('arrhythmiaAnalysis', { value: true }), 'arrhythmia ON'], [60, A.rhythm('sinus', { rateBpm: 30 }), 'sinus 30'], [120, A.rhythm('sinusBrady', { rateBpm: 35 }), 'sinusBrady 35'],
    [180, A.rhythm('junctionalEscape', { rateBpm: 40 }), 'junctional 40'], [240, A.rhythm('afib', { rateBpm: 140 }), 'AF 140'],
    [300, A.rhythm('vtMono', { rateBpm: 180 }), 'VT 180'], [360, A.rhythm('sinus', { rateBpm: 75 }), 'sinus 75'], [420, A.rhythm('avb3Wide', { rateBpm: 32 }), 'CHB wide 32'],
    [480, A.rhythm('pacedVVI', { pacer: { ratePpm: 70 } }), 'VVI 70'], [540, A.rhythm('sinusTachy', { rateBpm: 187 }), 'sinus tachy 187'], [600, A.rhythm('sinus', { rateBpm: 75 }), 'sinus 75'],
  ], 660, { printEvery: 5 }),
  ...perSkin(S('B2-step', 'MANUAL HR step 80 → 120 at 60 s, → 40 at 120 s, → 80 at 180 s (response time)', 'manual', [
    ...VENTED, [2, A.target('hr', 80), 'hr 80'], [60, A.target('hr', 120), 'hr 120'], [120, A.target('hr', 40), 'hr 40'], [180, A.target('hr', 80), 'hr 80'],
  ], 240, { printEvery: 1 })),
  S('B3-sinus30-modeled', 'MODELED: sinus 30 commanded (escape fill-in; 08 audit / G-FU3 ruling 1)', 'modeled', [...VENTED, [60, A.rhythm('sinus', { rateBpm: 30 }), 'sinus 30']], 240, { printEvery: 5 }),

  // C. invasive pressure / NIBP ----------------------------------------------------------------------------------------
  S('C1-damp', 'MANUAL: ART damped (ζ 1.2) at 60 s, flush at 120 s, under-damped (ζ 0.1, fn 10) at 150, flush 210', 'manual', [
    ...VENTED, [60, A.line('abp', 'damp', 1.2), 'damp ζ1.2'], [120, A.line('abp', 'flush'), 'flush'], [150, A.line('abp', 'damp', 0.1, 10), 'ringing ζ0.1 fn10'], [210, A.line('abp', 'flush'), 'flush'],
  ], 240, { printEvery: 5 }),
  S('C2-af-nibp', 'MANUAL: AF 150 at 30 s, NIBP at 60, 120, 180 s (pulse deficit, NIBP in AF)', 'manual', [
    ...VENTED, [30, A.rhythm('afib', { rateBpm: 150 }), 'AF 150'], [60, A.nibp('start'), 'NIBP'], [120, A.nibp('start'), 'NIBP'], [180, A.nibp('start'), 'NIBP'],
  ], 240, { printEvery: 5 }),
  S('C3-lowpp', 'MANUAL: pulse pressure 10 at MAP 70 (SBP 77/DBP 67) at 60 s — ART, NIBP, PI', 'manual', [...VENTED, ...bp(60, 77, 67, 'PP 10'), [120, A.nibp('start'), 'NIBP']], 200, { printEvery: 5 }),

  // D. capnography / apnoea ------------------------------------------------------------------------------------------
  ...perSkin(S('D1-apnoea', 'MODELED ventilated: ventilator off 120–180 s (60 s apnoea), then back on; no acknowledge', 'modeled', [
    ...VENTED, [120, A.ventOff(), 'ventilator off'], [180, A.vent(5, 0.5), 'ventilator on'],
  ], 300, { printEvery: 5 })),
  S('D2-disconnect', 'MODELED ventilated: circuit disconnect at 60 s, reconnect (patent) at 120 s; oesophageal ETT at 180 s', 'modeled', [
    ...VENTED, [60, { type: 'applyEvent', event: { kind: 'airway', state: 'disconnected' } }, 'disconnect'], [120, { type: 'applyEvent', event: { kind: 'airway', state: 'patent' } }, 'reconnect'],
    [180, { type: 'applyEvent', event: { kind: 'airway', state: 'oesophageal' } }, 'oesophageal'],
  ], 300, { printEvery: 5 }),
  S('D3-induction', 'MODELED spontaneous → propofol 2 mg/kg at 60 s (apnoea) → ETT + ventilator at 150 s (the FU-3 screenshot sequence)', 'modeled', [
    [60, A.drug('propofol', 2, 'mg/kg'), 'propofol 2'], [60, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6'], [150, A.ett(), 'ETT'], [150, A.vent(5, 0.5), 'ventilator'],
  ], 400, { printEvery: 5 }),

  // E. temperature ---------------------------------------------------------------------------------------------------
  S('E1-temp', 'MODELED: core pinned 37 → 34 °C over 5 min from 60 s; temp probe off 420–480', 'modeled', [
    ...VENTED, ...Array.from({ length: 6 }, (_, i) => [60 + 60 * i, (e: any) => { e.st.resp.temp.pinCoreTemp = 37 - (3 * i) / 5; }, `core ${(37 - (3 * i) / 5).toFixed(1)}`] as Step),
    [420, A.sensor('temp', 'off'), 'temp off'], [480, A.sensor('temp', 'on'), 'temp on'],
  ], 540, { printEvery: 10 }),
];

// Added after the first pass: ECG leads off (HR fallback), latched alarm acknowledge, silence semantics.
SCENARIOS.push(
  ...['philips-like', 'saadat-like'].map((skin, i): Scenario => S(`F1-leadsoff${i ? '-sa' : ''}`, `ECG leads off 60–120 s, then VF at 150 s with leads on; silence at 160 s, acknowledge at 200 s [${skin}]`, 'manual', [
    ...VENTED, [60, A.sensor('ecg', 'off'), 'ECG leads off'], [120, A.sensor('ecg', 'on'), 'ECG leads on'], [150, A.rhythm('vfCoarse'), 'VF'],
    [160, A.alarm('silence'), 'silence'], [200, A.alarm('ack'), 'acknowledge'], [230, A.rhythm('sinus', { rateBpm: 80 }), 'sinus 80 (ROSC)'], [260, A.alarm('ack'), 'acknowledge'],
  ], 300, { printEvery: 5, skin })),
  S('F2-apnoea-ack', 'D1 on philips-like with an acknowledge 30 s after ventilation resumes', 'modeled', [
    ...VENTED, [120, A.ventOff(), 'ventilator off'], [180, A.vent(5, 0.5), 'ventilator on'], [210, A.alarm('ack'), 'acknowledge'],
  ], 260, { printEvery: 5 }),
);

// FU-5 additions: impedance-only apnoea (suite 7), leads off under a red alarm (suite 5), a new red alarm during Silence
// (suite 14), a hovering limit (suite 11) and the probe-state INOPs (suite 8 technical alarms).
SCENARIOS.push(
  S('D4-apnoea-imp', 'MODELED paralysed apnoea on room air with the CO2 line off (impedance only): ventilator off at 120 s', 'modeled', [
    [1, A.ett()], [1, A.vent(5, 0.21)], [100, A.drug('rocuronium', 0.6, 'mg/kg'), 'rocuronium 0.6'], [120, A.ventOff(), 'ventilator off'],
  ], 420, { printEvery: 10, sensors: { co2: 'off' } }),
  ...['philips-like', 'saadat-like'].map((skin, i): Scenario => S(`F3-leadsoff-red${i ? '-sa' : ''}`, `ventilator off at 60 s (red APNEA), ECG leads off at 100–160 s [${skin}]`, 'modeled', [
    ...VENTED, [60, A.ventOff(), 'ventilator off'], [100, A.sensor('ecg', 'off'), 'ECG leads off'], [160, A.sensor('ecg', 'on'), 'ECG leads on'], [170, A.vent(5, 0.5), 'ventilator on'],
  ], 220, { printEvery: 5, skin })),
  ...['philips-like', 'saadat-like', 'mindray-like'].map((skin, i): Scenario => S(`F4-silence-new${['', '-sa', '-mr'][i]}`, `asystole at 30 s, Silence at 45 s, VF at 60 s (a new red alarm during the silence), acknowledge at 120 s [${skin}]`, 'manual', [
    ...VENTED, [30, A.rhythm('asystole'), 'asystole'], [45, A.alarm('silence'), 'silence'], [60, A.rhythm('vfCoarse'), 'VF'], [100, A.rhythm('sinus', { rateBpm: 80 }), 'sinus 80'], [120, A.alarm('ack'), 'acknowledge'],
  ], 150, { printEvery: 5, skin })),
  S('G1-hover', 'MANUAL: CVP target 10 (the philips-like high limit) and HR 50 (the low limit) for 3 min', 'manual', [
    ...VENTED, [10, A.target('cvp', 10), 'CVP 10'], [10, A.target('hr', 50), 'HR 50'],
  ], 200, { printEvery: 10 }),
  S('G2-probes', 'MANUAL: temperature probe off 30–60 s; ART zeroing at 70 s; ART to atmosphere 90–120 s; CO2 line occluded 130–160 s', 'manual', [
    ...VENTED, [30, A.sensor('temp', 'off'), 'temp off'], [60, A.sensor('temp', 'on'), 'temp on'], [70, A.sensor('abp', 'zeroing'), 'ART zero'],
    [90, A.sensor('abp', 'atmosphere'), 'ART atmosphere'], [120, A.sensor('abp', 'connected'), 'ART connected'], [130, A.sensor('co2', 'occluded'), 'CO2 occluded'], [160, A.sensor('co2', 'on'), 'CO2 on'],
  ], 190, { printEvery: 5 }),
);
