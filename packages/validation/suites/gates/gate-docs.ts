// Gate numbers as regression documents (R40 borrow #1: "band rules for numerics"). Each target is one number a
// merged gate note recorded (docs/gates/stage-*.md), with the band that gate accepted. They make those numbers a
// command (`pnpm validate`) instead of a scratch test re-run by hand.
import type { DocCommand } from '@pme/controller/scenario';
import type { Segment, Target, ValidationDoc } from '../../src/segments/types.ts';

const ev = (event: Record<string, unknown>): DocCommand => ({ type: 'applyEvent', event } as DocCommand);
const c = (body: Record<string, unknown>): DocCommand => body as DocCommand;
const ADULT = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const range = (id: string, series: string, reduce: Target['reduce'], min: number, max: number, source: string, extra: Partial<Target> = {}): Target => ({ id, series, reduce, type: 'Range', min, max, source, ...extra }) as Target;
const seg = (id: string, fromS: number, toS: number, ...targets: Target[]): Segment => ({ id, fromS, toS, targets });

function gate(o: { id: string; title: string; durationS: number; skin?: string; baseline?: Record<string, number>; sensors?: Record<string, string>; rhythm?: string; actions: Array<{ t: number; command: DocCommand }>; segments: Segment[]; requires?: string[] }): ValidationDoc {
  return {
    schema: 'pme-validation/1', id: o.id, title: o.title, seed: 42, durationS: o.durationS, ...(o.requires ? { requires: o.requires } : {}),
    scenario: {
      schema: 'pme-scenario/1', id: `gate-${o.id}`, title: o.title, ...(o.skin ? { device: { skin: o.skin } } : {}),
      patient: { ...ADULT, baseline: { hr: 75, sbp: 120, dbp: 80, ...o.baseline }, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', co2: 'on', ...o.sensors }, ...(o.rhythm ? { rhythm: { id: o.rhythm } } : {}) },
      initialState: 'run', states: [{ id: 'run' }],
    },
    actions: o.actions, segments: o.segments,
  };
}

export const GATE_DOCS: ValidationDoc[] = [
  gate({
    id: 'g2-displayed-abp', title: 'Stage 2: displayed ABP follows targets 120/80 and a ramp to 90/50', durationS: 110,
    actions: [{ t: 60, command: c({ type: 'setTarget', variable: 'sbp', value: 90, ramp: { durationS: 5 } }) }, { t: 60, command: c({ type: 'setTarget', variable: 'dbp', value: 50, ramp: { durationS: 5 } }) }],
    segments: [
      seg('steady', 30, 60, range('sys', 'numeric:abpSys', 'mean', 117, 124, 'gate 2 acc. 1: 120.8 (±3)'), range('dia', 'numeric:abpDia', 'mean', 77, 84, 'gate 2 acc. 1: 80.8 (±3)')),
      seg('after-ramp', 75, 110, range('sys', 'numeric:abpSys', 'mean', 88, 94, 'gate 2 acc. 3: 91.2 (±3)'), range('dia', 'numeric:abpDia', 'mean', 49, 55, 'gate 2 acc. 3: 52.2 (±3)')),
    ],
  }),
  gate({
    id: 'g3-rr-three-ways', title: 'Stage 3: RR from capnograph and impedance at ventilator 14/min', durationS: 120,
    actions: [{ t: 0, command: ev({ kind: 'ventilation', source: 'ventilator', rr: 14, vtMl: 500, fio2: 0.5, peep: 5 }) }],
    segments: [seg('steady', 60, 120, range('awrr', 'numeric:awrr', 'mean', 13.5, 14.5, 'gate 3: awRR 14.0'), range('rr', 'numeric:rr', 'mean', 13, 15, 'gate 3: impedance RR 14.0'))],
  }),
  gate({
    id: 'g3-peep-map', title: 'Stage 3: PEEP 5 → 15 lowers MAP by ≈ 14 mmHg (MANUAL coupling)', durationS: 240, baseline: { sbp: 130, dbp: 80 },
    actions: [{ t: 0, command: ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }) }, { t: 120, command: ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 15 }) }],
    segments: [seg('peep5', 90, 120, range('map', 'numeric:abpMean', 'mean', 94, 104, 'gate 3: MAP ≈ 97 at PEEP 5 (displayed radial mean) [ENG band]')),
      seg('peep15', 200, 240, { id: 'drop', series: 'numeric:abpMean', reduce: 'mean', type: 'Range', min: { segment: 'peep5', offset: -17 }, max: { segment: 'peep5', offset: -11 }, source: 'gate 3: PEEP 5 → 15 drops MAP by 14 (97 → 83) ± 3' })],
  }),
  gate({
    id: 'g3-disconnect-apnoea-alarm', title: 'Stage 3/4b: disconnection → apnoea-co2 alarm', durationS: 120,
    actions: [{ t: 0, command: ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }) }, { t: 60, command: ev({ kind: 'airway', state: 'disconnected' }) }],
    segments: [seg('disconnected', 60, 120, range('alarm', 'alarm:apnoea-co2', 'firstT', 15, 22, 'gate 3 acc. 3: raised 16.9 s after the event = 20 ± 1 s after the last breath (breath phase adds ≤ 5 s)'))],
  }),
  ...([['saadat-like', 10], ['philips-like', 4]] as const).map(([skin, s]) => gate({
    id: `g4b-asystole-${skin}`, title: `Stage 4b: asystole alarm delay on ${skin}`, durationS: 60, skin,
    actions: [{ t: 30, command: c({ type: 'setRhythm', rhythm: 'asystole', when: 'now' }) }],
    segments: [seg('arrest', 30, 60, range('delay', 'alarm:ASYSTOLE', 'firstT', s - 1, s + 1.5, `gate 4b: asystole ${s} s on ${skin} (alarm delays ±1 s, brief §9 V7)`))],
  })),
  gate({
    id: 'g3-cpr-etco2', title: 'CPR EtCO2 at the default learner quality (R39 item 2)', durationS: 240, requires: ['3.1'],
    actions: [{ t: 30, command: c({ type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' }) }, { t: 40, command: ev({ kind: 'cpr', active: true, rate: 110 }) }],
    segments: [seg('cpr', 120, 240, range('etco2', 'numeric:etco2', 'mean', 17, 23, 'R39-2: default quality 0.8 → ≈ 20 mmHg'))],
  }),
];
