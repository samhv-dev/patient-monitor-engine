// Coverage run DI (drug–drug and drug–disease interactions; research/14-audit-drug-interactions.md). One ARM runner in
// the audit 08/09/10 pattern (research/12 §6): creates an engine (seed 7 unless the arm says otherwise), dispatches a
// scripted timeline of the command bodies the physiology console sends, samples the committed pipeline state
// READ-ONLY every `dt` s (default 5), keeps the 1 Hz `anaesthesia` truth event (depth, TOF, drive) and the rhythm
// segments / neuro marks, and returns the rows. Pokes (state writes) are NOT used by any cell of this run.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
// FU-7: in-repo default (research/14 ran against a throwaway worktree). PME_ENGINE still overrides it, so the audit can
// be pointed at another commit's worktree for a before/after comparison (gate Task 20).
const ENGINE = process.env.PME_ENGINE ?? join(HERE, '../../packages/engine-core/src/index.ts');
const { createEngine } = (await import(ENGINE)) as { createEngine: (o: unknown) => any };

export type Body = Record<string, unknown> & { type: string };
export type Step = [number, Body, string?];
export interface Arm {
  patient?: Record<string, unknown>;
  mode?: 'modeled' | 'manual';
  steps: Step[];
  tEnd: number;
  dt?: number; // sample interval, s (default 5)
  seed?: number;
}

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const A = {
  drug: (drugId: string, dose: number, unit: string, extra: Record<string, unknown> = {}) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...extra }),
  infusion: (drugId: string, rate: number, unit: string) => ev({ kind: 'infusion', drugId, rate, unit }),
  tci: (drugId: string, target: number, mode: 'plasma' | 'effect' = 'effect', model?: string) => ev({ kind: 'tci', drugId, target, mode, ...(model ? { model } : {}) }),
  vap: (agent: string, dialPct: number, fgfLpm = 2, n2oFrac = 0) => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, n2oFrac }),
  bleed: (volumeMl: number, overS: number) => ev({ kind: 'bleed', volumeMl, overS }),
  fluid: (fluid: string, volumeMl: number, overS: number) => ev({ kind: 'fluid', fluid, volumeMl, overS }),
  cond: (id: string, severity: number, extra: Record<string, unknown> = {}) => ev({ kind: 'condition', id, severity, ...extra }),
  lung: (id: string, severity: number, side?: 'L' | 'R') => ev(side ? { kind: 'lungCondition', id, severity, side } : { kind: 'lungCondition', id, severity }),
  vent: (o: { rr?: number; vtMl?: number; peep?: number; fio2?: number } = {}) => ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5, ...o }),
  spont: (fio2?: number) => ev({ kind: 'ventilation', source: 'spontaneous', ...(fio2 !== undefined ? { fio2 } : {}) }),
  device: (device: 'ett' | 'sga' | 'none') => ev({ kind: 'airwayDevice', device }),
  stim: (intensity: number) => ev({ kind: 'stimulus', intensity }),
  metabolic: (o: Record<string, unknown>) => ev({ kind: 'metabolic', ...o }),
  neuroProfile: (o: Record<string, unknown>) => ev({ kind: 'neuroProfile', ...o }),
  rhythm: (rhythm: string, opts: Record<string, unknown> = {}): Body => ({ type: 'setRhythm', rhythm, opts }),
  tof: (): Body => ({ type: 'device', action: { kind: 'tofStart', intervalS: 15 } }),
};
/** Intubated and ventilated at t = 1 s: ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 (audit 08's rig: PaCO2 ≈ 40 on main). */
export const VENTED: Step[] = [[1, A.device('ett'), 'ETT'], [1, A.vent(), 'VCV 12×600 PEEP 5 FiO2 0.5']];

const SENSORS = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on', co2: 'on', temp: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole', 'agonal', 'torsades', 'vtPoly']);

export interface Row { [k: string]: number | string | boolean }
export interface ArmResult { rows: Row[]; log: string[]; rhythms: [number, string][]; marks: [number, string][]; rejected: string[] }

function sample(e: any, t: number, x: { hr: number; an: any; qrs: number }): Row {
  const st = e.st;
  const c = st.hemo.circ;
  const rs = st.resp;
  const bs = c.beats.filter((b: any) => b.t > t - 6);
  const avg = (k: string) => (bs.length ? bs.reduce((a: number, b: any) => a + b[k], 0) / bs.length : NaN);
  const noEject = t - c.lastEjT > 3;
  const lb = c.beats[c.beats.length - 1];
  const fx = st.pk.fx ?? {};
  const an = x.an ?? {};
  const nr = st.neuro?.resp ?? {};
  const vap = st.pk.vap;
  const lc = st.pk.lastC ?? {};
  const out: Row = {
    t, rhythm: st.rhythm.id, pulseless: PULSELESS.has(st.rhythm.id) || st.rhythm.opts?.pulseless === true, noEject,
    hr: x.hr, hrModel: c.hrModel, sbp: avg('sbp'), dbp: avg('dbp'), map: bs.length ? avg('map') : (c.s[0] as number),
    co: noEject ? 0 : c.qFwd * 0.06, sv: bs.length ? avg('sv') : 0, svr: c.p.rSys * 1333, pvr: ((c.p.pvrL * c.p.pvrR) / (c.p.pvrL + c.p.pvrR)) * 1333,
    cvp: st.hemo.num?.cvpAvg ?? st.hemo.circOut.pRa, pawp: st.hemo.circOut.pPv, lvedp: lb?.lvedp ?? NaN, cppCor: lb ? lb.aoDia - lb.lvedp : NaN,
    kIsch: c.cor.kIsch, sd: c.cor.ratio, kLv: c.kLv,
    spo2: rs.num?.spo2?.shown ?? NaN, sao2: rs.o2.sa * 100, pao2: rs.o2.pao2, paco2: rs.co2.pf, etco2: rs.etco2,
    src: rs.driver.source, rrSp: rs.spont?.rr ?? NaN, vtSp: rs.spont?.vt ?? NaN, veSp: rs.spont?.ve ?? NaN, va: rs.vaLpm ?? NaN,
    apnoea: nr.apnoea === true, obstr: nr.obstruction ?? 0, drvOp: nr.opioidDep ?? 0, drvHyp: nr.hypnoticDep ?? 0,
    ph: st.blood.core.ab.ph, hco3: st.blood.core.ab.hco3, lact: st.blood.out.lactate, k: st.blood.out.k, kEcg: st.blood.out.kEcg, iCa: st.blood.out.iCa,
    mg: st.blood.out.mg, na: st.blood.out.na, hb: st.blood.out.hb, bvRel: st.blood.out.bvRel, glu: st.endo?.core?.out?.glucoseMgDl ?? NaN, temp: rs.temp.tc,
    icp: st.organs?.brain?.icp ?? NaN, cbf: st.organs?.brain?.cbfRel ?? NaN, uop: (st.organs?.renal?.uopMlMin ?? NaN) * 60,
    epi: st.endo?.core?.out?.epiPgMl ?? NaN, ne: st.endo?.core?.out?.nePgMl ?? NaN, qrs: x.qrs, ecgK: st.mods?.k ?? NaN,
    di: an.di ?? NaN, conscious: an.conscious ?? true, macBrain: an.macBrain ?? 0, macEff: an.macEff ?? 0, mac: an.mac ?? 0, movement: an.movement ?? false,
    tofR: an.tof?.ratio ?? NaN, tofC: an.tof?.count ?? NaN, t1: an.tof?.t1 ?? NaN, ptc: an.tof?.ptc ?? NaN, blockDia: an.block?.dia ?? NaN,
    fxSvr: fx.svr ?? 1, fxEes: fx.ees ?? 1, fxHr: fx.hr ?? 1, fxV0: fx.v0Frac ?? 0, fxGv: fx.gv ?? 1, fxGvHr: fx.gvHr ?? 1,
    betaAdd: st.pk.betaBlockAdd ?? 0, avNode: st.pk.bus?.avNodeBlock ?? 0, lastCv: st.pk.bus?.last?.cvE ?? 0, lastCns: st.pk.bus?.last?.cnsE ?? 0,
    seizure: st.pk.bus?.cns?.seizure === true, uSurf: st.pk.bus?.cns?.uSurface ?? 0,
    faFi: vap && vap.s.fi > 0 ? vap.s.fa / vap.s.fi : NaN, fa: vap ? 100 * vap.s.fa : NaN, faN2o: vap ? 100 * vap.n2o.fa : NaN,
    baroEs: c.baro.es, baroSet: c.baro.set, rSysBase: c.base.rSys * 1333,
  };
  for (const [id, v] of Object.entries(lc)) out[`c_${id}`] = v as number;
  for (const [id, a] of Object.entries((st.pk.bus?.agents ?? {}) as Record<string, { plasma?: number }>)) if (typeof a.plasma === 'number') out[`p_${id}`] = a.plasma;
  return out;
}

export async function runArm(arm: Arm): Promise<ArmResult> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, ...(arm.patient ?? {}), sensors: SENSORS };
  const e = createEngine({ seed: arm.seed ?? 7, mode: arm.mode ?? 'modeled', patient });
  const x = { hr: NaN, an: null as any, qrs: NaN };
  const rhythms: [number, string][] = [];
  const marks: [number, string][] = [];
  e.on((m: any) => {
    if (m.type === 'measurement' && m.values.hr?.value != null) x.hr = m.values.hr.value;
    else if (m.type === 'anaesthesia') x.an = m;
    else if (m.type === 'beat' && m.qrsMs != null) x.qrs = m.qrsMs;
    else if (m.type === 'rhythmSegment') { if (!rhythms.length || rhythms[rhythms.length - 1]![1] !== m.rhythm) rhythms.push([Math.round(m.t * 10) / 10, m.rhythm]); }
    else if (m.type === 'neuroMark') marks.push([Math.round(m.t), m.kind]);
  }, ['measurement', 'anaesthesia', 'beat', 'rhythmSegment', 'neuroMark']);
  const log: string[] = [];
  const rejected: string[] = [];
  let n = 0;
  const pending = [...arm.steps].sort((a, b) => a[0] - b[0]);
  const rows: Row[] = [];
  const DT = arm.dt ?? 5;
  let lastYield = 0;
  for (let t = DT; t <= arm.tEnd + 1e-9; t = Math.round((t + DT) * 1000) / 1000) {
    while (pending.length && (pending[0] as Step)[0] < t) {
      const [ts, body, label] = pending.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      const r = e.dispatch({ id: `a${++n}`, issuedBy: 'audit-di', ...body });
      const d = JSON.stringify((body as any).event ?? body);
      log.push(`${ts}s ${label ?? ''} ${r.accepted ? 'OK' : 'REJECTED: ' + r.reason}`);
      if (!r.accepted) rejected.push(`${d}: ${r.reason}`);
    }
    e.advanceTo(t);
    rows.push(sample(e, t, x));
    if (t - lastYield >= 60) { lastYield = t; await new Promise((r) => setImmediate(r)); } // yield per sim-minute
  }
  // rhythm transitions from the sampled committed rhythm id: the `rhythmSegment` event is emitted only for templated
  // rhythms (AF), so it misses instructor- and hook-driven switches (resume fix, 2026-09-28)
  const fromRows: [number, string][] = [];
  for (const r of rows) if (!fromRows.length || fromRows[fromRows.length - 1]![1] !== r.rhythm) fromRows.push([r.t as number, r.rhythm as string]);
  return { rows, log, rhythms: fromRows, marks, rejected };
}

// ---- row helpers ---------------------------------------------------------------------------------------------------
export const r1 = (x: number) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : NaN);
export const r2 = (x: number) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : NaN);
const win = (rows: Row[], t0: number, t1: number) => rows.filter((r) => (r.t as number) > t0 && (r.t as number) <= t1);
/** Mean of a key over (t0, t1]. */
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
/** Value at the sample nearest t. */
export function at(rows: Row[], k: string, t: number): number {
  let best: Row | undefined;
  for (const r of rows) if (!best || Math.abs((r.t as number) - t) < Math.abs((best.t as number) - t)) best = r;
  return best ? (best[k] as number) : NaN;
}
/** Per-sample difference a − b (same grid) of key k over (t0, t1]: the most negative / positive and when. */
export function diffExtreme(a: Row[], b: Row[], k: string, t0: number, t1: number, kind: 'min' | 'max', pct = false): { v: number; t: number } {
  const bt = new Map(b.map((r) => [r.t as number, r]));
  let best = { v: kind === 'min' ? Infinity : -Infinity, t: NaN };
  for (const r of win(a, t0, t1)) {
    const q = bt.get(r.t as number);
    if (!q) continue;
    const x = r[k] as number;
    const y = q[k] as number;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const d = pct ? (100 * (x - y)) / y : x - y;
    if (kind === 'min' ? d < best.v : d > best.v) best = { v: d, t: r.t as number };
  }
  return best;
}
/** First time ≥ t0 at which pred(row) holds (NaN if never). */
export function firstT(rows: Row[], t0: number, pred: (r: Row) => boolean): number {
  for (const r of rows) if ((r.t as number) >= t0 && pred(r)) return r.t as number;
  return NaN;
}
