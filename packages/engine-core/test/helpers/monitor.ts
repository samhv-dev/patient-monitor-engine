// FU-5 monitor-fidelity rig (research/10-monitor-fidelity-audit.md §1): an adult 40 y 70 kg M, seed 7, with ECG, SpO2
// (left finger), ABP, CVP, NIBP (right arm), CO2 and temperature, on a chosen skin; a scripted timeline; every 1 s one
// row of what the MONITOR shows (measured numerics with flags, alarmStatus entries) beside the TRUTH (committed state,
// read-only) and the displayed pleth peak-to-peak. Yields once per sim-minute (CI amendment 4).
import { createEngine } from '../../src/engine.ts';
import type { AlarmEntry } from '../../src/types-device.ts';
import type { EngineEvent, Measured, MonitorEngine, NumericId } from '../../src/types.ts';

export type Alarm = Extract<EngineEvent, { type: 'alarm' }>;
type Status = Extract<EngineEvent, { type: 'alarmStatus' }>;
export type Step = [number, Record<string, unknown> | ((e: MonitorEngine) => void)];
export interface MonRow {
  t: number;
  map: number; sv: number; co: number; sao2: number; rhythm: string; pulseless: boolean;
  /** Truth radial systolic/diastolic, the mean over the beats of the last 6 s (the FU-5 review's NIBP rows). */
  sbp: number; dbp: number;
  m: Partial<Record<NumericId, Measured>>;
  active: AlarmEntry[];
  silencedUntil: number | null;
  plethPtp: number;
}
export interface MonRun { e: MonitorEngine; rows: MonRow[]; alarms: Alarm[]; nibp: Array<Extract<EngineEvent, { type: 'nibp' }>> }

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event });
/** Command bodies the fidelity scenarios use (the audit's A helpers). */
export const M = {
  ett: () => ev({ kind: 'airwayDevice', device: 'ett' }),
  vent: (peep = 5, fio2 = 0.5, rr = 12, vtMl = 600) => ev({ kind: 'ventilation', source: 'ventilator', rr, vtMl, peep, fio2 }),
  ventOff: () => ev({ kind: 'ventilation', source: 'none' }),
  bleed: (volumeMl: number, overS: number) => ev({ kind: 'bleed', volumeMl, overS }),
  cond: (id: string, severity: number) => ev({ kind: 'condition', id, severity }),
  drug: (drugId: string, dose: number, unit: string) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' }),
  vap: (agent: string, dialPct: number) => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm: 2, n2oFrac: 0 }),
  cpr: (active: boolean) => ev({ kind: 'cpr', active, rate: 110, quality: 1 }),
  airway: (state: string) => ev({ kind: 'airway', state }),
  rhythm: (rhythm: string, opts: Record<string, unknown> = {}) => ({ type: 'setRhythm', rhythm, opts }),
  target: (variable: string, value: number) => ({ type: 'setTarget', variable, value }),
  sensor: (sensor: string, state: string, site?: string) => ({ type: 'attachSensor', sensor, state, ...(site ? { site } : {}) }),
  nibp: (action: 'start' | 'auto', intervalMin?: number) => ({ type: 'device', action: { device: 'nibp', action, ...(intervalMin ? { intervalMin } : {}) } }),
  alarm: (action: string, extra: Record<string, unknown> = {}) => ({ type: 'device', action: { device: 'alarm', action, ...extra } }),
};
export const VENTED: Step[] = [[1, M.ett()], [1, M.vent()]];
const SENSORS = { abp: 'connected', cvp: 'connected', spo2: 'on', co2: 'on', temp: 'on', nibp: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole']);

export async function monitorRun(o: { mode: 'manual' | 'modeled'; skin?: string; sensors?: Record<string, string>; steps: Step[]; tEnd: number }): Promise<MonRun> {
  const e = createEngine({ seed: 7, mode: o.mode, patient: { ageY: 40, sex: 'M', weightKg: 70, sensors: { ...SENSORS, ...(o.sensors ?? {}) } } as never, device: { skin: o.skin ?? 'philips-like' } });
  const m: Partial<Record<NumericId, Measured>> = {};
  let st: Status | null = null;
  const alarms: Alarm[] = [];
  const nibp: MonRun['nibp'] = [];
  e.on((x) => {
    if (x.type === 'measurement') Object.assign(m, x.values);
    else if (x.type === 'alarmStatus') st = x;
    else if (x.type === 'alarm' && x.level !== undefined) alarms.push(x);
    else if (x.type === 'nibp' && (x.result !== undefined || x.phase === 'failed')) nibp.push(x);
  }, ['measurement', 'alarmStatus', 'alarm', 'nibp']);
  const pending = [...o.steps].sort((a, b) => a[0] - b[0]);
  const rows: MonRow[] = [];
  let n = 0;
  const buf = new Float32Array(500);
  for (let t = 1; t <= o.tEnd + 1e-9; t++) {
    while (pending.length > 0 && (pending[0] as Step)[0] < t) {
      const [ts, body] = pending.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      if (typeof body === 'function') body(e);
      else e.dispatch({ id: `m${++n}`, issuedBy: 'fidelity', ...body } as never);
    }
    e.advanceTo(t);
    const ps = (e as unknown as { st: { rhythm: { id: string; opts?: { pulseless?: boolean } }; hemo: { circ: { beats: Array<{ t: number; map: number; sv: number; sbp: number; dbp: number }>; lastEjT: number; qFwd: number } }; resp: { o2: { sa: number } } } }).st;
    const bs = ps.hemo.circ.beats.filter((b) => b.t > t - 6);
    const noEject = t - ps.hemo.circ.lastEjT > 3;
    const last = e.latestSampleIndex('pleth');
    const got = last >= 0 ? e.readSamples('pleth', last - buf.length + 1, buf) : 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < got; i++) {
      lo = Math.min(lo, buf[i] as number);
      hi = Math.max(hi, buf[i] as number);
    }
    const s = st as Status | null;
    rows.push({
      t, rhythm: ps.rhythm.id, pulseless: PULSELESS.has(ps.rhythm.id) || ps.rhythm.opts?.pulseless === true,
      map: bs.length ? bs.reduce((a, b) => a + b.map, 0) / bs.length : Number.NaN,
      sbp: bs.length ? bs.reduce((a, b) => a + b.sbp, 0) / bs.length : Number.NaN, dbp: bs.length ? bs.reduce((a, b) => a + b.dbp, 0) / bs.length : Number.NaN, sv: bs.length ? bs.reduce((a, b) => a + b.sv, 0) / bs.length : 0,
      co: noEject ? 0 : ps.hemo.circ.qFwd * 0.06, sao2: ps.resp.o2.sa * 100, m: structuredClone(m), active: s ? s.active.map((a) => ({ ...a })) : [], silencedUntil: s ? s.silencedUntil : null,
      plethPtp: got > 0 ? hi - lo : Number.NaN,
    });
    if (t % 60 === 0) await new Promise<void>((r) => setImmediate(r));
  }
  return { e, rows, alarms, nibp };
}

/** A value shown as valid (not questionable, not invalid). */
export const validShown = (x: Measured | undefined): boolean => !!x && x.value !== null && x.flag === 'valid';
export const activeIds = (r: MonRow): string[] => r.active.map((a) => a.id);
