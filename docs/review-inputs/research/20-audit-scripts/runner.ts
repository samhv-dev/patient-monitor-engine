// Coverage run DV (devices, pacing, defibrillation, CPR; research/20-coverage-devices.md), copied from run CM's runner
// (research/19-audit-scripts/runner.ts, itself from DI) and extended with the DV readouts: the continuous coronary
// perfusion pressure the coronary step uses in arrest (`cor.cpp`), the declared arrest state, CPR state, the device
// layer's `deviceStatus`, `marker` (shock, syncR, paceSpike, charge…), `tone` and `alarmStatus` events, the monitor's
// displayed numerics WITH their validity flags, and the IABP/LVAD console summaries. One ARM runner in the audit
// 08/09/10 pattern (research/12 §6): creates an engine (seed 7 unless the arm says otherwise), dispatches a scripted
// timeline of the command bodies the physiology console sends, samples the committed pipeline state READ-ONLY every
// `dt` s (default 5) and returns the rows. Pokes (state writes) are NOT used by any cell of this run.
// `fine` windows sample the aortic-root pressure and the IABP/LVAD state at 10 ms for the beat-level device cells.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = process.env.PME_ENGINE ?? join(HERE, 'wt/packages/engine-core/src/index.ts');
const { createEngine } = (await import(ENGINE)) as { createEngine: (o: unknown) => any };
/** Stage 4b's shock-outcome table, read for the exact probabilities the engine draws from (read-only). */
export const OUTCOME = (await import(join(dirname(ENGINE), 'l3/defib-pacer/outcome.ts'))) as { outcomeProbabilities: (c: Record<string, unknown>) => Record<string, number> };

export type Body = Record<string, unknown> & { type: string };
export type Step = [number, Body, string?];
export interface Arm {
  patient?: Record<string, unknown>;
  mode?: 'modeled' | 'manual';
  steps: Step[];
  tEnd: number;
  dt?: number; // sample interval, s (default 5)
  seed?: number;
  skin?: string; // device skin (default philips-like: no defibrillator of its own → the ZOLL-like fallback, 120 J)
  /** fine windows [t0, t1]: aortic root / LV / device state every 10 ms. */
  fine?: [number, number][];
}

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const A = {
  drug: (drugId: string, dose: number, unit: string, extra: Record<string, unknown> = {}) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...extra }),
  infusion: (drugId: string, rate: number, unit: string) => ev({ kind: 'infusion', drugId, rate, unit }),
  bleed: (volumeMl: number, overS: number) => ev({ kind: 'bleed', volumeMl, overS }),
  fluid: (fluid: string, volumeMl: number, overS: number) => ev({ kind: 'fluid', fluid, volumeMl, overS }),
  cond: (id: string, severity: number, extra: Record<string, unknown> = {}) => ev({ kind: 'condition', id, severity, ...extra }),
  lung: (id: string, severity: number) => ev({ kind: 'lungCondition', id, severity }),
  vent: (o: { rr?: number; vtMl?: number; peep?: number; fio2?: number } = {}) => ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5, ...o }),
  spont: (fio2?: number) => ev({ kind: 'ventilation', source: 'spontaneous', ...(fio2 !== undefined ? { fio2 } : {}) }),
  none: () => ev({ kind: 'ventilation', source: 'none' }),
  device: (device: 'ett' | 'sga' | 'none') => ev({ kind: 'airwayDevice', device }),
  thermal: (o: Record<string, unknown>) => ev({ kind: 'thermal', ...o }),
  metabolic: (o: Record<string, unknown>) => ev({ kind: 'metabolic', ...o }),
  stim: (intensity: number) => ev({ kind: 'stimulus', intensity }),
  preox: (fio2: number, durationS: number) => ev({ kind: 'preoxygenate', fio2, durationS }),
  rhythm: (rhythm: string, opts: Record<string, unknown> = {}): Body => ({ type: 'setRhythm', rhythm, opts }),
  cpr: (active: boolean, quality?: number, rate?: number): Body => ev({ kind: 'cpr', active, ...(quality !== undefined ? { quality } : {}), ...(rate !== undefined ? { rate } : {}) }),
  defib: (action: string, extra: Record<string, unknown> = {}): Body => ev({ kind: 'defib', action, ...extra }),
  pacer: (mode: 'off' | 'demand' | 'fixed', o: { ratePpm?: number; mA?: number; fault?: string; pause?: boolean } = {}): Body => ev({ kind: 'pacer', action: 'set', mode, ...o }),
  iabp: (action: 'start' | 'stop' | 'set', o: Record<string, unknown> = {}): Body => ({ type: 'device', action: { device: 'iabp', action, ...o } }),
  lvad: (action: 'start' | 'stop' | 'set', rpm?: number): Body => ({ type: 'device', action: { device: 'lvad', action, ...(rpm !== undefined ? { rpm } : {}) } }),
  nibp: (action: 'start' | 'stat' | 'stop' | 'auto', intervalMin?: number): Body => ({ type: 'device', action: { device: 'nibp', action, ...(intervalMin ? { intervalMin } : {}) } }),
  target: (variable: string, value: number, durationS?: number): Body => ({ type: 'setTarget', variable, value, ...(durationS !== undefined ? { ramp: { durationS } } : {}) }),
  mode: (mode: 'manual' | 'modeled'): Body => ({ type: 'setMode', mode }),
  sensor: (sensor: string, state: string, site?: string): Body => ({ type: 'attachSensor', sensor, state, ...(site ? { site } : {}) }),
  raw: (body: Body): Body => body,
};
/** Intubated and ventilated at t = 1 s: ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 (audit 08's rig: PaCO2 ≈ 40 on main). */
export const VENTED: Step[] = [[1, A.device('ett'), 'ETT'], [1, A.vent(), 'VCV 12×600 PEEP 5 FiO2 0.5']];

const SENSORS = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on', co2: 'on', temp: 'on', nibp: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole', 'agonal', 'torsades', 'vtPoly']);

export interface Row { [k: string]: number | string | boolean }
export interface Mark { t: number; kind: string; data?: any }
export interface FineRow { t: number; pAo: number; pLv: number; vLv: number; qAv: number; qVad: number; iabpIn: number; iabpOut: number; ej: number }
export interface ArmResult {
  rows: Row[]; log: string[]; rhythms: [number, string][]; marks: Mark[]; tones: Mark[]; rejected: string[];
  alarmsSeen: string[]; fine: FineRow[]; nibp: { t: number; sys: number | null; dia: number | null; map: number | null; flag?: string }[];
  device: any[]; accepted: string[];
}

const val = (x: any): number => (x && typeof x.value === 'number' ? x.value : NaN);
const flag = (x: any): string => (x && typeof x.flag === 'string' ? x.flag : 'none');

function sample(e: any, t: number, x: { hr: number; meas: Record<string, any>; circ: any; alarms: string[]; dev: any }): Row {
  const st = e.st;
  const c = st.hemo.circ;
  const rs = st.resp;
  const bs = c.beats.filter((b: any) => b.t > t - 6);
  const avg = (k: string) => (bs.length ? bs.reduce((a: number, b: any) => a + b[k], 0) / bs.length : NaN);
  const noEject = t - c.lastEjT > 3;
  const lb = c.beats[c.beats.length - 1];
  const m = x.meas;
  const out: Row = {
    t, rhythm: st.rhythm.id, pulselessOpt: st.rhythm.opts?.pulseless === true, rateOpt: st.rhythm.opts?.rateBpm ?? NaN,
    pulseless: PULSELESS.has(st.rhythm.id) || st.rhythm.opts?.pulseless === true, noEject,
    hr: x.hr, hrFlag: flag(m.hr), sbp: avg('sbp'), dbp: avg('dbp'), map: bs.length ? avg('map') : (c.s[0] as number), mapNow: c.mapNow,
    co: noEject ? 0 : c.qFwd * 0.06, qFwd: c.qFwd * 0.06, sv: bs.length ? avg('sv') : 0, svr: c.p.rSys * 1333, cvp: st.hemo.num?.cvpAvg ?? st.hemo.circOut.pRa,
    pawp: st.hemo.circOut.pPv, lvedp: lb?.lvedp ?? NaN, pAo: c.s[0] as number,
    kIsch: c.cor.kIsch, kIschRv: c.cor.kIschRv ?? NaN, hyp: c.cor.hyp ?? NaN, cpp: c.cor.cpp, myo: c.cor.kIsch * (1 - (c.cor.hyp ?? 0)),
    arrest: c.arrest ? String(c.arrest.cause) : '', roscS: c.arrest ? c.arrest.roscS : NaN, noFlowS: c.noFlowS,
    cpr: st.hemo.cpr?.active === true, cprQ: st.hemo.cpr?.quality ?? NaN,
    spo2True: rs.o2.sa * 100, pao2: rs.o2.pao2, paco2: rs.co2.pf, etco2: rs.etco2, ph: st.blood.core.ab.ph, k: st.blood.out.k, kEcg: st.blood.out.kEcg,
    iCa: st.blood.out.iCa, lact: st.blood.out.lactate, temp: rs.temp.tc, bvRel: st.blood.out.bvRel,
    cbf: st.organs?.brain?.cbfRel ?? NaN, icp: st.organs?.brain?.icp ?? NaN, cppBrain: st.organs?.brain?.cpp ?? NaN,
    epi: st.endo?.core?.out?.epiPgMl ?? NaN, ne: st.endo?.core?.out?.nePgMl ?? NaN,
    // displayed numerics and their flags (the monitor, graded separately from the truth: research/12 §2.2)
    dHr: val(m.hr), dPr: val(m.pr), dPrF: flag(m.pr), dPrAbp: val(m.prAbp), dSpo2: val(m.spo2), dSpo2F: flag(m.spo2), dPi: val(m.pi), dPiF: flag(m.pi),
    dAbpS: val(m.abpSys), dAbpD: val(m.abpDia), dAbpM: val(m.abpMean), dAbpF: flag(m.abpMean), dEtco2: val(m.etco2), dEtco2F: flag(m.etco2),
    dCvp: val(m.cvpMean), dPapM: val(m.papMean),
    alarms: x.alarms.join(' ; '),
    // circ event device summaries
    iabpAug: x.circ?.iabp?.augmentation ?? NaN, lvadFlow: x.circ?.lvad?.flowLpm ?? NaN, lvadPi: x.circ?.lvad?.pi ?? NaN, lvadW: x.circ?.lvad?.powerW ?? NaN,
    lvadSuction: x.circ?.lvad?.suction === true, lvedv: x.circ?.lvedv ?? NaN, ef: x.circ?.ef ?? NaN, vLv: c.s[10] as number,
    defibState: x.dev?.defib?.state ?? '', defibJ: x.dev?.defib?.energyJ ?? NaN, shocks: x.dev?.defib?.shocks ?? 0, pacerMode: x.dev?.pacer?.mode ?? '',
  };
  return out;
}

export async function runArm(arm: Arm): Promise<ArmResult> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, ...(arm.patient ?? {}), sensors: SENSORS };
  const e = createEngine({ seed: arm.seed ?? 7, mode: arm.mode ?? 'modeled', patient, ...(arm.skin ? { device: { skin: arm.skin } } : {}) });
  const x = { hr: NaN, meas: {} as Record<string, any>, circ: null as any, alarms: [] as string[], dev: null as any };
  const rhythms: [number, string][] = [];
  const marks: Mark[] = [];
  const tones: Mark[] = [];
  const alarmsSeen = new Set<string>();
  const nibp: ArmResult['nibp'] = [];
  const device: any[] = [];
  e.on((m: any) => {
    if (m.type === 'measurement') {
      if (m.values.hr?.value != null) x.hr = m.values.hr.value;
      Object.assign(x.meas, m.values);
      if (m.values.nibpSys) nibp.push({ t: m.t, sys: m.values.nibpSys.value, dia: m.values.nibpDia?.value ?? null, map: m.values.nibpMean?.value ?? null, flag: m.values.nibpSys.flag });
    } else if (m.type === 'circ') x.circ = m;
    else if (m.type === 'marker') marks.push({ t: Math.round(m.t * 1000) / 1000, kind: m.kind, data: m.data });
    else if (m.type === 'tone') tones.push({ t: Math.round(m.t * 1000) / 1000, kind: m.kind, data: { chargeS: m.chargeS, id: m.id } });
    else if (m.type === 'alarmStatus') { x.alarms = (m.active ?? []).map((a: any) => `${a.latched ? 'L:' : ''}${a.text}`); for (const a of m.active ?? []) alarmsSeen.add(a.text.replace(/[0-9.]+/g, '#')); }
    else if (m.type === 'deviceStatus') { x.dev = m; device.push({ t: m.t, defib: m.defib, pacer: m.pacer, hrDashes: m.hrDashes }); }
    else if (m.type === 'nibp' && m.result === undefined && m.status) nibp.push({ t: m.t, sys: null, dia: null, map: null, flag: String(m.status) });
  }, ['measurement', 'circ', 'marker', 'tone', 'alarmStatus', 'deviceStatus', 'nibp']);
  const log: string[] = [];
  const rejected: string[] = [];
  const accepted: string[] = [];
  let n = 0;
  const pending = [...arm.steps].sort((a, b) => a[0] - b[0]);
  const rows: Row[] = [];
  const fine: FineRow[] = [];
  const DT = arm.dt ?? 5;
  let lastYield = 0;
  const fines = [...(arm.fine ?? [])].sort((a, b) => a[0] - b[0]);
  const dispatchDue = (tUpTo: number) => {
    while (pending.length && (pending[0] as Step)[0] < tUpTo) {
      const [ts, body, label] = pending.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      const r = e.dispatch({ id: `a${++n}`, issuedBy: 'audit-dv', ...body });
      const d = JSON.stringify((body as any).event ?? (body as any).action ?? body);
      log.push(`${ts}s ${label ?? ''} ${r.accepted ? 'OK' : 'REJECTED: ' + r.reason}`);
      if (!r.accepted) rejected.push(`${d}: ${r.reason}`);
      else accepted.push(`${ts}s ${label ?? d}`);
    }
  };
  for (let t = DT; t <= arm.tEnd + 1e-9; t = Math.round((t + DT) * 1000) / 1000) {
    dispatchDue(t);
    while (fines.length && (fines[0] as [number, number])[0] < t) {
      const [f0, f1] = fines.shift() as [number, number];
      for (let tt = Math.max(e.now().simT, f0); tt <= f1; tt = Math.round((tt + 0.01) * 1000) / 1000) {
        dispatchDue(tt);
        e.advanceTo(tt);
        const hs = e.st.hemo;
        const c = hs.circ;
        const o = hs.circOut;
        fine.push({ t: tt, pAo: o.pAo, pLv: o.pLv, vLv: c.s[10] as number, qAv: o.qAv, qVad: o.qVad, iabpIn: hs.iabp.inflateAt, iabpOut: hs.iabp.deflateAt, ej: c.lastEjT });
      }
    }
    e.advanceTo(t);
    rows.push(sample(e, t, x));
    if (t - lastYield >= 60) { lastYield = t; await new Promise((r) => setImmediate(r)); } // yield per sim-minute
  }
  const fromRows: [number, string][] = [];
  for (const r of rows) {
    const id = `${r.rhythm as string}${r.pulselessOpt ? '(pulseless)' : ''}`;
    if (!fromRows.length || fromRows[fromRows.length - 1]![1] !== id) fromRows.push([r.t as number, id]);
  }
  return { rows, log, rhythms: fromRows, marks, tones, rejected, alarmsSeen: [...alarmsSeen], fine, nibp, device, accepted };
}

// ---- row helpers ---------------------------------------------------------------------------------------------------
export const r1 = (x: number) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : NaN);
export const r2 = (x: number) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : NaN);
export const r3 = (x: number) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : NaN);
const win = (rows: Row[], t0: number, t1: number) => rows.filter((r) => (r.t as number) > t0 && (r.t as number) <= t1);
export function mean(rows: Row[], k: string, t0: number, t1: number): number {
  const w = win(rows, t0, t1).map((r) => r[k] as number).filter(Number.isFinite);
  return w.length ? w.reduce((a, b) => a + b, 0) / w.length : NaN;
}
export function minOf(rows: Row[], k: string, t0: number, t1: number): { v: number; t: number } {
  let best = { v: Infinity, t: NaN };
  for (const r of win(rows, t0, t1)) if (Number.isFinite(r[k] as number) && (r[k] as number) < best.v) best = { v: r[k] as number, t: r.t as number };
  return best;
}
export function maxOf(rows: Row[], k: string, t0: number, t1: number): { v: number; t: number } {
  let best = { v: -Infinity, t: NaN };
  for (const r of win(rows, t0, t1)) if (Number.isFinite(r[k] as number) && (r[k] as number) > best.v) best = { v: r[k] as number, t: r.t as number };
  return best;
}
export function at(rows: Row[], k: string, t: number): number {
  let best: Row | undefined;
  for (const r of rows) if (!best || Math.abs((r.t as number) - t) < Math.abs((best.t as number) - t)) best = r;
  return best ? (best[k] as number) : NaN;
}
export function firstT(rows: Row[], t0: number, pred: (r: Row) => boolean): number {
  for (const r of rows) if ((r.t as number) >= t0 && pred(r)) return r.t as number;
  return NaN;
}
