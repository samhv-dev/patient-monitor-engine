// FU-7 Task 19 helpers: the drug audit's ARM runner (scripts/audit-drugs/runner.ts, research/14 §1) ported into the test
// tree, so the matrix cells run as engine tests on the same rig: adult 40 y / 70 kg / 175 cm, male, ABP/CVP/PAP/SpO2/
// CO2/temp on, seed 7 unless an arm says otherwise; a scripted timeline of the console's command bodies; the committed
// state sampled READ-ONLY every `dt` s (default 5) plus the 1 Hz `anaesthesia` truth event. One yield per sim-MINUTE.
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent, MonitorEngine } from '../../src/types.ts';

export type Body = Record<string, unknown> & { type: string };
export type Step = [number, Body];
export interface Arm {
  patient?: Record<string, unknown>; steps: Step[]; tEnd: number; dt?: number; seed?: number;
  /** Called once after creation (a test-only state write where no command exists, e.g. `prof.betaNonSel`). */
  prep?: (st: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** Called after every sample with the committed state; return true to end the arm early. */
  each?: (st: any, t: number, row: Row) => boolean | void; // eslint-disable-line @typescript-eslint/no-explicit-any
}
export type Row = Record<string, number | string | boolean>;
export interface ArmResult { rows: Row[]; rhythms: [number, string][]; e: MonitorEngine }

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const A = {
  drug: (drugId: string, dose: number, unit: string, extra: Record<string, unknown> = {}) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...extra }),
  infusion: (drugId: string, rate: number, unit: string) => ev({ kind: 'infusion', drugId, rate, unit }),
  tci: (drugId: string, target: number, mode: 'plasma' | 'effect', model: string) => ev({ kind: 'tci', drugId, target, mode, model }),
  vap: (agent: string, dialPct: number, fgfLpm = 2, n2oFrac = 0) => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, n2oFrac }),
  bleed: (volumeMl: number, overS: number) => ev({ kind: 'bleed', volumeMl, overS }),
  cond: (id: string, severity: number, extra: Record<string, unknown> = {}) => ev({ kind: 'condition', id, severity, ...extra }),
  lung: (id: string, severity: number) => ev({ kind: 'lungCondition', id, severity }),
  vent: () => ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 }),
  spont: (fio2?: number) => ev({ kind: 'ventilation', source: 'spontaneous', ...(fio2 !== undefined ? { fio2 } : {}) }),
  device: (device: 'ett' | 'sga' | 'none') => ev({ kind: 'airwayDevice', device }),
  neuroProfile: (o: Record<string, unknown>) => ev({ kind: 'neuroProfile', ...o }),
  cpr: (active: boolean, quality = 1, rate = 110) => ev({ kind: 'cpr', active, quality, rate }),
  defib: (action: string, extra: Record<string, unknown> = {}) => ev({ kind: 'defib', action, ...extra }),
  rhythm: (rhythm: string, opts: Record<string, unknown> = {}): Body => ({ type: 'setRhythm', rhythm, opts }),
  tof: (): Body => ({ type: 'device', action: { kind: 'tofStart', intervalS: 15 } }),
};

export const T = 300; // the plain rigs' intervention time
export const TB = 960; // after a 10-min bleed from 60 s
/** research/14 §1 "vent": ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 from t = 1 s. */
export const VENTED: Step[] = [[1, A.device('ett')], [1, A.vent()]];
export const BB = { conditions: [{ id: 'betaBlocked' }] };
export const d = (t: number, id: string, dose: number, unit: string, extra: Record<string, unknown> = {}): Step => [t, A.drug(id, dose, unit, extra)];
export const inf = (t: number, id: string, rate: number, unit: string): Step => [t, A.infusion(id, rate, unit)];
export const vap = (t: number, agent: string, pct: number, fgf = 2, n2o = 0): Step => [t, A.vap(agent, pct, fgf, n2o)];
/** A ventilated arm (the audit's `V`). */
export const V = (steps: Step[], tEnd = T + 900, patient: Record<string, unknown> = {}, extra: Partial<Arm> = {}): Arm => ({ patient, steps: [...VENTED, ...steps], tEnd, ...extra });
/** A spontaneous arm, no airway device (the audit's `SP`). */
export const SP = (steps: Step[], tEnd = T + 900, patient: Record<string, unknown> = {}, extra: Partial<Arm> = {}): Arm => ({ patient, steps, tEnd, ...extra });

const SENSORS = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on', co2: 'on', temp: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole', 'agonal', 'torsades', 'vtPoly']);
type Anaes = Extract<EngineEvent, { type: 'anaesthesia' }>;

function sample(e: MonitorEngine, t: number, x: { hr: number; an: Anaes | null }): Row {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- read-only test access to the committed pipeline state
  const st = (e as unknown as { st: any }).st;
  const c = st.hemo.circ;
  const rs = st.resp;
  const bs = c.beats.filter((b: { t: number }) => b.t > t - 6);
  const avg = (k: string) => (bs.length ? bs.reduce((a: number, b: Record<string, number>) => a + b[k]!, 0) / bs.length : Number.NaN);
  const noEject = t - c.lastEjT > 3;
  const an = x.an;
  const vp = st.pk.vap;
  const out: Row = {
    t, rhythm: st.rhythm.id, pulseless: PULSELESS.has(st.rhythm.id) || st.rhythm.opts?.pulseless === true, noEject,
    hr: x.hr, map: bs.length ? avg('map') : (c.s[0] as number), co: noEject ? 0 : c.qFwd * 0.06, svr: c.p.rSys * 1333,
    etco2: rs.etco2, spo2: rs.num?.spo2?.shown ?? Number.NaN, veSp: rs.spont?.ve ?? Number.NaN, drvOp: st.neuro?.resp?.opioidDep ?? 0, apnoea: st.neuro?.resp?.apnoea === true,
    k: st.blood.out.k, kEcg: st.blood.out.kEcg, mg: st.blood.out.mg, hb: st.blood.out.hb, bvRel: st.blood.out.bvRel,
    glu: st.endo?.core?.out?.glucoseMgDl ?? Number.NaN, temp: rs.temp.tc,
    di: an?.di ?? Number.NaN, conscious: an?.conscious ?? true, macBrain: an?.macBrain ?? 0, macEff: an?.macEff ?? 0,
    tofR: an?.tof?.ratio ?? Number.NaN, tofC: an?.tof?.count ?? Number.NaN, t1: an?.tof?.t1 ?? Number.NaN,
    lastCns: st.pk.bus?.last?.cnsE ?? 0, lastCv: st.pk.bus?.last?.cvE ?? 0, seizure: st.pk.bus?.cns?.seizure === true,
    faFi: vp && vp.s.fi > 0 ? vp.s.fa / vp.s.fi : Number.NaN, antiarrhythmicU: st.pk.bus?.rhythm?.antiarrhythmicU ?? 0, avNode: st.pk.bus?.avNodeBlock ?? 0,
  };
  for (const [id, v] of Object.entries((st.pk.lastC ?? {}) as Record<string, number>)) out[`c_${id}`] = v;
  for (const [id, a] of Object.entries((st.pk.bus?.agents ?? {}) as Record<string, { plasma?: number }>)) if (typeof a.plasma === 'number') out[`p_${id}`] = a.plasma;
  return out;
}

/** Run one arm (the audit's `runArm`); throws on a rejected command. */
export async function runArm(arm: Arm): Promise<ArmResult> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, ...(arm.patient ?? {}), sensors: SENSORS };
  const e = createEngine({ seed: arm.seed ?? 7, mode: 'modeled', patient } as never);
  const st = (e as unknown as { st: unknown }).st;
  arm.prep?.(st);
  const x = { hr: Number.NaN, an: null as Anaes | null };
  e.on((m: EngineEvent) => {
    if (m.type === 'measurement') { const v = (m as { values: { hr?: { value: number | null } } }).values.hr?.value; if (v != null) x.hr = v; }
    else if (m.type === 'anaesthesia') x.an = m;
  }, ['measurement', 'anaesthesia']);
  let n = 0;
  const pending = [...arm.steps].sort((a, b) => a[0] - b[0]);
  const rows: Row[] = [];
  const DT = arm.dt ?? 5;
  let lastYield = 0;
  for (let t = DT; t <= arm.tEnd + 1e-9; t = Math.round((t + DT) * 1000) / 1000) {
    while (pending.length && pending[0]![0] < t) {
      const [ts, body] = pending.shift()!;
      e.advanceTo(Math.max(e.now().simT, ts));
      const r = e.dispatch({ id: `fu7-${++n}`, issuedBy: 'test', ...body } as never) as { accepted: boolean; reason?: string };
      if (!r.accepted) throw new Error(`rejected ${JSON.stringify(body)}: ${r.reason}`);
    }
    e.advanceTo(t);
    const row = sample(e, t, x);
    rows.push(row);
    if (arm.each?.(st, t, row) === true) break;
    if (t - lastYield >= 60) { lastYield = t; await new Promise((r) => setImmediate(r)); } // one yield per sim-minute
  }
  const rhythms: [number, string][] = [];
  for (const r of rows) if (!rhythms.length || rhythms[rhythms.length - 1]![1] !== r.rhythm) rhythms.push([r.t as number, r.rhythm as string]);
  return { rows, rhythms, e };
}

// ---- row helpers (the audit's spec.ts) -------------------------------------------------------------------------------
const inWin = (rows: Row[], t0: number, t1: number) => rows.filter((r) => (r.t as number) > t0 && (r.t as number) <= t1);
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const mx = (rows: Row[], k: string, t0: number, t1: number): number => Math.max(...inWin(rows, t0, t1).map((r) => r[k]).filter(fin));
export const mn = (rows: Row[], k: string, t0: number, t1: number): number => Math.min(...inWin(rows, t0, t1).map((r) => r[k]).filter(fin));
export const mean = (rows: Row[], k: string, t0: number, t1: number): number => { const w = inWin(rows, t0, t1).map((r) => r[k]).filter(fin); return w.reduce((a, b) => a + b, 0) / w.length; };
/** The most negative / positive per-sample difference a − b (same grid) over (t0, t1]; `pct` = relative to b, %. */
export function diffExtreme(a: Row[], b: Row[], k: string, t0: number, t1: number, kind: 'min' | 'max', pct = false): { v: number; t: number } {
  const bt = new Map(b.map((r) => [r.t as number, r]));
  let best = { v: kind === 'min' ? Infinity : -Infinity, t: Number.NaN };
  for (const r of inWin(a, t0, t1)) {
    const q = bt.get(r.t as number);
    if (!q || !fin(r[k]) || !fin(q[k])) continue;
    const dv = pct ? (100 * ((r[k] as number) - (q[k] as number))) / (q[k] as number) : (r[k] as number) - (q[k] as number);
    if (kind === 'min' ? dv < best.v : dv > best.v) best = { v: dv, t: r.t as number };
  }
  return best;
}
export const pctMin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => diffExtreme(i, c, k, t0, t1, 'min', true).v;
export const pctMax = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => diffExtreme(i, c, k, t0, t1, 'max', true).v;
export const dMin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => diffExtreme(i, c, k, t0, t1, 'min').v;
export const dMax = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => diffExtreme(i, c, k, t0, t1, 'max').v;
export const pctWin = (i: Row[], c: Row[], k: string, t0: number, t1: number): number => (100 * (mean(i, k, t0, t1) - mean(c, k, t0, t1))) / mean(c, k, t0, t1);
/** Seconds from t0 until `f` first holds (NaN if never). */
export const firstAt = (rows: Row[], t0: number, f: (r: Row) => boolean): number => { for (const r of rows) if ((r.t as number) >= t0 && f(r)) return (r.t as number) - t0; return Number.NaN; };
/** Seconds from t0 to the maximum / minimum of `k` over (t0, t1]. */
export const peakT = (rows: Row[], k: string, t0: number, t1: number): number => { let b = { v: -Infinity, t: Number.NaN }; for (const r of inWin(rows, t0, t1)) if (fin(r[k]) && (r[k] as number) > b.v) b = { v: r[k] as number, t: r.t as number }; return b.t - t0; };
export const minT = (rows: Row[], k: string, t0: number, t1: number): number => { let b = { v: Infinity, t: Number.NaN }; for (const r of inWin(rows, t0, t1)) if (fin(r[k]) && (r[k] as number) < b.v) b = { v: r[k] as number, t: r.t as number }; return b.t - t0; };
/** Minutes from `tStop` until `k` falls to half its value over the 20 s before it (the CSHT measure). */
export const halfMin = (rows: Row[], k: string, tStop: number): number => { const v0 = mx(rows, k, tStop - 20, tStop); return firstAt(rows, tStop, (r) => (r[k] as number) <= 0.5 * v0) / 60; };
export const arrestIn = (rows: Row[], t0: number, t1: number): boolean => inWin(rows, t0, t1).some((r) => r.pulseless === true || r.noEject === true);
/** Run a cell's arms one after another. */
export async function runAll<K extends string>(arms: Record<K, Arm>): Promise<Record<K, ArmResult>> {
  const out = {} as Record<K, ArmResult>;
  for (const k of Object.keys(arms) as K[]) out[k] = await runArm(arms[k]);
  return out;
}
