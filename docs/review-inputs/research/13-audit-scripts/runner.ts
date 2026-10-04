// Coverage run RH (renal and hepatic; research/12 §5.1). One ARM runner in the audit 08/09/10/14 pattern (research/12
// §6), copied from research/22-audit-scripts/runner.ts (BF) and extended for 7d/7g: kidney (RBF, GFR, UO, oliguria flag,
// KDIGO stage, renal controllers), liver (HBF, lactate clearance, liver function, INR placeholder), 7g clearance factors
// and effect-site levels, the 7b lungState compliance and an optional Ppeak probe (IAP cells). Otherwise as BF:
// creates an engine (seed 7 unless the arm says otherwise), dispatches a scripted timeline of the command bodies the
// physiology console sends, samples the committed pipeline state READ-ONLY every `dt` s (default 5), keeps the 1 Hz
// `anaesthesia` truth event, rhythm transitions, neuro marks and every `labResult` event, and returns the rows.
// No pokes (state writes) are used by any cell of this run. Long arms yield to the event loop once per simulated minute.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = process.env.PME_ENGINE ?? join(HERE, '../../../packages/engine-core/src/index.ts');
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
  mech?: number[]; // times at which one breath is probed at 20 ms for Ppeak (IAP cells)
}

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const A = {
  drug: (drugId: string, dose: number, unit: string, extra: Record<string, unknown> = {}) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...extra }),
  infusion: (drugId: string, rate: number, unit: string) => ev({ kind: 'infusion', drugId, rate, unit }),
  vap: (agent: string, dialPct: number, fgfLpm = 2, n2oFrac = 0) => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, n2oFrac }),
  bleed: (volumeMl: number, overS: number) => ev({ kind: 'bleed', volumeMl, overS }),
  bleedRate: (rateMlPerMin: number) => ev({ kind: 'bleed', rateMlPerMin }),
  fluid: (fluid: string, volumeMl: number, overS: number) => ev({ kind: 'fluid', fluid, volumeMl, overS }),
  transfusion: (product: string, units: number, overS: number, extra: Record<string, unknown> = {}) => ev({ kind: 'transfusion', product, units, overS, ...extra }),
  cond: (id: string, severity: number, extra: Record<string, unknown> = {}) => ev({ kind: 'condition', id, severity, ...extra }),
  lung: (id: string, severity: number) => ev({ kind: 'lungCondition', id, severity }),
  vent: (o: { rr?: number; vtMl?: number; peep?: number; fio2?: number } = {}) => ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5, ...o }),
  spont: (fio2?: number) => ev({ kind: 'ventilation', source: 'spontaneous', ...(fio2 !== undefined ? { fio2 } : {}) }),
  device: (device: 'ett' | 'sga' | 'none') => ev({ kind: 'airwayDevice', device }),
  thermal: (o: Record<string, unknown>) => ev({ kind: 'thermal', ...o }),
  metabolic: (o: Record<string, unknown>) => ev({ kind: 'metabolic', ...o }),
  lab: (panel: 'abg' | 'vbg', turnaroundS?: number) => ev({ kind: 'lab', panel, ...(turnaroundS ? { turnaroundS } : {}) }),
  rhythm: (rhythm: string, opts: Record<string, unknown> = {}): Body => ({ type: 'setRhythm', rhythm, opts }),
  tof: (): Body => ({ type: 'device', action: { kind: 'tofStart', intervalS: 15 } }),
  renal: (o: Record<string, unknown>) => ev({ kind: 'renal', ...o }),
  stimulus: (o: Record<string, unknown>) => ev({ kind: 'stimulus', ...o }),
};
/** Intubated and ventilated at t = 1 s: ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 (audit 08's rig). */
export const VENTED: Step[] = [[1, A.device('ett'), 'ETT'], [1, A.vent(), 'VCV 12×600 PEEP 5 FiO2 0.5']];
/** The same rig under general anaesthesia (Stage 3 `thermal` anaesthesia 'general': 7c's fluid elimination ×0.2, thermoregulation). */
export const VENTED_GA: Step[] = [...VENTED, [1, A.thermal({ anaesthesia: 'general' }), 'GA flag']];

const SENSORS = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on', co2: 'on', temp: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole', 'agonal', 'torsades', 'vtPoly']);

export interface Row { [k: string]: number | string | boolean }
export interface Lab { t: number; drawnAt: number; panel: string; values: Record<string, number> }
export interface ArmResult { rows: Row[]; log: string[]; rhythms: [number, string][]; marks: [number, string][]; rejected: string[]; labs: Lab[] }

function sample(e: any, t: number, x: { hr: number; an: any; qrs: number; org: any; lung: any; ppeak: number }): Row {
  const st = e.st;
  const c = st.hemo.circ;
  const rs = st.resp;
  const bs = c.beats.filter((b: any) => b.t > t - 6);
  const avg = (k: string) => (bs.length ? bs.reduce((a: number, b: any) => a + b[k], 0) / bs.length : NaN);
  const noEject = t - c.lastEjT > 3;
  const lb = c.beats[c.beats.length - 1];
  const an = x.an ?? {};
  const bl = st.blood;
  const bc = bl.core;
  const fl = bc.fl;
  const bo = bl.out;
  const out: Row = {
    t, rhythm: st.rhythm.id, pulseless: PULSELESS.has(st.rhythm.id) || st.rhythm.opts?.pulseless === true, noEject,
    hr: x.hr, hrModel: c.hrModel, sbp: avg('sbp'), dbp: avg('dbp'), map: bs.length ? avg('map') : (c.s[0] as number),
    co: noEject ? 0 : c.qFwd * 0.06, sv: bs.length ? avg('sv') : 0, svr: c.p.rSys * 1333,
    cvp: st.hemo.num?.cvpAvg ?? st.hemo.circOut.pRa, pawp: st.hemo.circOut.pPv, lvedp: lb?.lvedp ?? NaN, kIsch: c.cor.kIsch,
    spo2: rs.num?.spo2?.shown ?? NaN, sao2: rs.o2.sa * 100, pao2: rs.o2.pao2, paco2: rs.co2.pf, etco2: rs.etco2,
    rrSp: rs.spont?.rr ?? NaN, veSp: rs.spont?.ve ?? NaN, va: rs.vaLpm ?? NaN, temp: rs.temp.tc,
    ph: bc.ab.ph, hco3: bc.ab.hco3, be: bc.ab.be, lact: bo.lactate, k: bo.k, kEcg: bo.kEcg, iCa: bo.iCa, mg: bo.mg, na: bo.na, cl: bo.cl,
    ag: bo.ag, osm: bo.osm, alb: bo.albGL, cop: bo.cop, hb: bo.hb, bvRel: bo.bvRel, hbfRel: bo.hbfRel,
    bv: fl.vp + fl.hbG * 3, vp: fl.vp, visf: fl.visf, vicf: fl.vicf, kf: fl.kfMult, jFilt: fl.jFilt, bled: bc.bledMl,
    citrate: bc.so.citrate / ((fl.vp + fl.visf) / 1000),
    cao2: bc.o2.cao2, do2: bc.o2.do2, vo2: bc.o2.vo2, svo2: bc.o2.svo2 * 100, o2def: bc.o2.deficit,
    evlwi: bl.lung.evlwi, glu: st.endo?.core?.out?.glucoseMgDl ?? NaN, keto: bo.dkaSeverity,
    icp: st.organs?.brain?.icp ?? NaN, cbf: st.organs?.brain?.cbfRel ?? NaN, uop: (st.organs?.renal?.uopMlMin ?? NaN) * 60,
    inr: st.organs?.liver?.inr ?? NaN, qrs: x.qrs, ecgK: st.mods?.k ?? NaN, ecgQtc: st.mods?.qtc ?? NaN,
    di: an.di ?? NaN, tofR: an.tof?.ratio ?? NaN, tofC: an.tof?.count ?? NaN, t1: an.tof?.t1 ?? NaN,
    // ---- RH additions (7d kidney and liver, 7g clearance) ----
    rbf: st.organs?.renal?.rbf ?? NaN, gfr: st.organs?.renal?.gfr ?? NaN, gfrRel: st.organs?.kidney?.gfrRel ?? NaN,
    uopKgH: ((st.organs?.renal?.uopMlMin ?? NaN) * 60) / (st.organs?.weightKg ?? 70),
    uop1hKgH: x.org?.kidney?.uop1hMlKgH ?? NaN, oliguria: x.org?.kidney?.oliguria === true, aki: st.organs?.renal?.akiStage ?? NaN,
    cumMl: st.organs?.renal?.cumMl ?? NaN, bins: st.organs?.renal?.bins?.length ?? 0, vNh: st.organs?.renal?.vNh ?? NaN, ang: st.organs?.renal?.ang ?? NaN,
    rAff: st.organs?.renal?.rAff ?? NaN, pgc: st.organs?.renal?.pgc ?? NaN, furoE: st.organs?.renal?.furoE ?? NaN, mannitolG: st.organs?.renal?.mannitolG ?? NaN,
    iap: st.organs?.iap ?? NaN, hbf7d: st.organs?.liver?.hbfRel ?? NaN, kLac: st.organs?.liver?.kLacPerH ?? NaN, liverFn: st.organs?.liver?.liverFn ?? NaN,
    tempF: st.organs?.liver?.tempF ?? NaN, glucoseF: st.organs?.liver?.glucoseF ?? NaN, coreLiver: bc.liver ?? NaN, bvMl: st.hemo.circ.prof?.bloodVolumeMl ?? NaN,
    gluMmol: st.endo?.core?.out?.glucoseMmol ?? NaN, epi: st.endo?.core?.out?.epiPgMl ?? NaN, nep: st.endo?.core?.out?.nePgMl ?? NaN, kfMult: st.endo?.core?.out?.kfMult ?? NaN, sepStage: st.endo?.core?.cond?.sepsis?.cur ?? NaN,
    crs: x.lung?.complianceMlPerCmH2O ?? NaN, ppeak: x.ppeak, frcGa: st.resp?.lung?.frcGaMl ?? NaN,
  };
  for (const [id, v] of Object.entries(st.pk?.lastC ?? {})) out[`c_${id}`] = v as number;
  for (const [id, d] of Object.entries((st.pk?.drugs ?? {}) as Record<string, { factor?: number; x?: number[]; dist?: number }>)) {
    if (typeof d.factor === 'number') out[`f_${id}`] = d.factor;
    if (d.x && d.x.length) out[`a_${id}`] = d.x[0] as number; // central-compartment amount (plasma level × V1)
    if (typeof d.dist === 'number') out[`q_${id}`] = d.dist;
  }
  for (const [id, a] of Object.entries((st.pk?.bus?.agents ?? {}) as Record<string, { plasma?: number }>)) if (typeof a.plasma === 'number') out[`p_${id}`] = a.plasma;
  return out;
}

export async function runArm(arm: Arm): Promise<ArmResult> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, ...(arm.patient ?? {}), sensors: SENSORS };
  const e = createEngine({ seed: arm.seed ?? 7, mode: arm.mode ?? 'modeled', patient });
  const x = { hr: NaN, an: null as any, qrs: NaN, org: null as any, lung: null as any, ppeak: NaN };
  const marks: [number, string][] = [];
  const labs: Lab[] = [];
  e.on((m: any) => {
    if (m.type === 'measurement' && m.values.hr?.value != null) x.hr = m.values.hr.value;
    else if (m.type === 'anaesthesia') x.an = m;
    else if (m.type === 'beat' && m.qrsMs != null) x.qrs = m.qrsMs;
    else if (m.type === 'neuroMark') marks.push([Math.round(m.t), m.kind]);
    else if (m.type === 'labResult') labs.push({ t: m.t, drawnAt: m.drawnAt, panel: m.panel, values: m.values });
    else if (m.type === 'organs') x.org = m;
    else if (m.type === 'lungState') x.lung = m;
  }, ['measurement', 'anaesthesia', 'beat', 'neuroMark', 'labResult', 'organs', 'lungState']);
  const mechTimes = [...(arm.mech ?? [])].sort((a, b) => a - b);
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
      const r = e.dispatch({ id: `a${++n}`, issuedBy: 'audit-rh', ...body });
      const d = JSON.stringify((body as any).event ?? body);
      log.push(`${ts}s ${label ?? ''} ${r.accepted ? 'OK' : 'REJECTED: ' + r.reason}`);
      if (!r.accepted) rejected.push(`${d}: ${r.reason}`);
    }
    // advance in ≤ 60 s slices and yield once per simulated minute (the brief: long runs must not starve the host)
    while (e.now().simT < t - 1e-9) {
      e.advanceTo(Math.min(t, e.now().simT + 60));
      if (e.now().simT - lastYield >= 60) { lastYield = e.now().simT; await new Promise((r) => setImmediate(r)); }
    }
    if (mechTimes.length && (mechTimes[0] as number) < t) {
      // one-breath probe at 20 ms (IAP cells): Ppeak = the maximum airway pressure over the next 8 s (the row is then
      // sampled 8 s late; resume fix: the first version probed an empty window because the arm had already reached t)
      const t0 = e.now().simT;
      mechTimes.shift();
      let pk = -Infinity;
      for (let tt = t0; tt < t0 + 8; tt = Math.round((tt + 0.02) * 1000) / 1000) { e.advanceTo(tt); pk = Math.max(pk, e.st.resp.lung?.mech?.paw ?? NaN); }
      x.ppeak = pk;
    }
    rows.push(sample(e, t, x));
  }
  // rhythm transitions from the sampled committed rhythm id (the `rhythmSegment` event fires only for templated AF)
  const rhythms: [number, string][] = [];
  for (const r of rows) if (!rhythms.length || rhythms[rhythms.length - 1]![1] !== r.rhythm) rhythms.push([r.t as number, r.rhythm as string]);
  return { rows, log, rhythms, marks, rejected, labs };
}

// ---- row helpers ---------------------------------------------------------------------------------------------------
export const r1 = (x: number) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : NaN);
export const r2 = (x: number) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : NaN);
export const r3 = (x: number) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 : NaN);
const win = (rows: Row[], t0: number, t1: number) => rows.filter((r) => (r.t as number) > t0 && (r.t as number) <= t1);
/** Mean of a key over (t0, t1]. */
export function mean(rows: Row[], k: string, t0: number, t1: number): number {
  const w = win(rows, t0, t1).map((r) => r[k] as number).filter(Number.isFinite);
  return w.length ? w.reduce((a, b) => a + b, 0) / w.length : NaN;
}
export function minOf(rows: Row[], k: string, t0: number, t1: number): { v: number; t: number } {
  let best = { v: Infinity, t: NaN };
  for (const r of win(rows, t0, t1)) if (Number.isFinite(r[k] as number) && (r[k] as number) < best.v) best = { v: r[k] as number, t: r.t as number };
  return Number.isFinite(best.v) ? best : { v: NaN, t: NaN };
}
export function maxOf(rows: Row[], k: string, t0: number, t1: number): { v: number; t: number } {
  let best = { v: -Infinity, t: NaN };
  for (const r of win(rows, t0, t1)) if (Number.isFinite(r[k] as number) && (r[k] as number) > best.v) best = { v: r[k] as number, t: r.t as number };
  return Number.isFinite(best.v) ? best : { v: NaN, t: NaN };
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
  return Number.isFinite(best.v) ? best : { v: NaN, t: NaN };
}
/** First time ≥ t0 at which pred(row) holds (NaN if never). */
export function firstT(rows: Row[], t0: number, pred: (r: Row) => boolean): number {
  for (const r of rows) if ((r.t as number) >= t0 && pred(r)) return r.t as number;
  return NaN;
}
