// Coverage run CM (comorbidity profiles; research/19-coverage-comorbidity.md), copied from run DI's runner
// (research/14-audit-scripts/runner.ts) and extended with the CM readouts: ST/ischaemia (LV and RV), LAP, mPAP, EF,
// EVLWI, DO2/SvO2/CaO2, COHb, FRC/compliance, total PEEP, Ppeak/Pplat probes and effect-site concentrations. One ARM runner in
// the audit 08/09/10 pattern (research/12 §6): creates an engine (seed 7 unless the arm says otherwise), dispatches a
// scripted timeline of the command bodies the physiology console sends, samples the committed pipeline state
// READ-ONLY every `dt` s (default 5), keeps the 1 Hz `anaesthesia` truth event (depth, TOF, drive) and the rhythm
// segments / neuro marks, and returns the rows. Pokes (state writes) are NOT used by any cell of this run.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = process.env.PME_ENGINE ?? join(HERE, 'wt/packages/engine-core/src/index.ts');
const { createEngine } = (await import(ENGINE)) as { createEngine: (o: unknown) => any };
// read-only ventilator-style hold on a COPY of the unit state (7b measure.ts): used by the Ppeak/Pplat probe
const { holdPressure } = (await import(join(dirname(ENGINE), 'l2/lung/measure.ts'))) as { holdPressure: (mp: unknown, ms: unknown, s: number, off: number) => number };

export type Body = Record<string, unknown> & { type: string };
export type Step = [number, Body, string?];
export interface Arm {
  patient?: Record<string, unknown>;
  mode?: 'modeled' | 'manual';
  steps: Step[];
  tEnd: number;
  dt?: number; // sample interval, s (default 5)
  seed?: number;
  /** CM: sim times at which one ventilated breath is probed at 20 ms for Ppeak and Pplat (0.3 s hold on a copy). */
  mech?: number[];
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
  none: () => ev({ kind: 'ventilation', source: 'none' }),
  preox: (fio2: number, durationS: number) => ev({ kind: 'preoxygenate', fio2, durationS }),
  thermal: (o: Record<string, unknown>) => ev({ kind: 'thermal', ...o }),
  airway: (state: string, severity?: number) => ev(severity === undefined ? { kind: 'airway', state } : { kind: 'airway', state, severity }),
  recruit: (pressureCmH2O: number, durationS: number) => ev({ kind: 'recruit', pressureCmH2O, durationS }),
  position: (o: Record<string, unknown>) => ev({ kind: 'position', ...o }),
  renal: (o: Record<string, unknown>) => ev({ kind: 'renal', ...o }),
  transfusion: (o: Record<string, unknown>) => ev({ kind: 'transfusion', ...o }),
  rhythmAt: (rhythm: string, opts: Record<string, unknown> = {}): Body => ({ type: 'setRhythm', rhythm, opts }),
};
/** Intubated and ventilated at t = 1 s: ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 (audit 08's rig: PaCO2 ≈ 40 on main). */
export const VENTED: Step[] = [[1, A.device('ett'), 'ETT'], [1, A.vent(), 'VCV 12×600 PEEP 5 FiO2 0.5']];

const SENSORS = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on', co2: 'on', temp: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole', 'agonal', 'torsades', 'vtPoly']);

export interface Row { [k: string]: number | string | boolean }
export interface ArmResult { rows: Row[]; log: string[]; rhythms: [number, string][]; marks: [number, string][]; rejected: string[] }

function sample(e: any, t: number, x: { hr: number; an: any; qrs: number; meas: Record<string, any>; circ: any; lung: any; mech: { ppeak: number; pplat: number } | null }): Row {
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
    // ---- CM additions ----
    stMv: c.cor.stMv ?? NaN, kIschRv: c.cor.kIschRv ?? NaN, cppCorEv: x.circ?.cpp ?? NaN, supDem: x.circ?.supplyDemand ?? NaN,
    ef: x.circ?.ef ?? NaN, lvedpEv: x.circ?.lvedp ?? NaN, lvedv: x.circ?.lvedv ?? NaN, pla: st.hemo.circOut.pLa, pmsf: x.circ?.pmsf ?? NaN,
    papMean: x.meas.papMean?.value ?? NaN, papSys: x.meas.papSys?.value ?? NaN, cvpMeas: x.meas.cvpMean?.value ?? NaN,
    rvsp: lb?.rvsp ?? NaN, svRv: lb?.svRv ?? NaN,
    evlwi: st.blood.lung?.evlwi ?? NaN, pCap: st.blood.lung?.pCap ?? NaN, do2: st.blood.core.o2.do2, vo2: st.blood.core.o2.vo2, svo2: st.blood.core.o2.svo2 * 100, cao2: st.blood.core.o2.cao2 / 10,
    cohb: (st.blood.core.odc?.cohb ?? 0) * 100, cop: st.blood.out.cop, alb: st.blood.out.albuminGL, gluMmol: st.endo?.core?.out?.glucoseMmol ?? NaN, cortisol: st.endo?.core?.out?.cortisolNmolL ?? NaN,
    frcGa: st.resp.lung.frcGaMl, peepTot: st.resp.lung.peepTot, crs: x.lung?.complianceMlPerCmH2O ?? NaN, raw: x.lung?.resistanceCmH2OPerLps ?? NaN, shunt: x.lung?.shunt ?? NaN, vdMl: x.lung?.deadSpaceMl ?? NaN,
    ppeak: x.mech?.ppeak ?? NaN, pplat: x.mech?.pplat ?? NaN,
    hbf: st.organs?.liver?.hbfRel ?? NaN, inr: st.organs?.liver?.inr ?? NaN, liverFn: st.organs?.liver?.liverFn ?? NaN, gfr: st.organs?.renal?.gfr ?? NaN, rbf: st.organs?.renal?.rbf ?? NaN,
    cmro2: st.organs?.brain?.cmro2Rel ?? NaN, cppBrain: st.organs?.brain?.cpp ?? NaN, iap: st.organs?.iap?.iap ?? st.organs?.iap ?? NaN,
    papMeanTruth: st.hemo.circOut.pPa,
  };
  for (const [id, v] of Object.entries(an.ce ?? {})) out[`ce_${id}`] = v as number;
  for (const [id, v] of Object.entries(lc)) out[`c_${id}`] = v as number;
  for (const [id, a] of Object.entries((st.pk.bus?.agents ?? {}) as Record<string, { plasma?: number; cumulativeMgPerKg?: number }>)) {
    if (typeof a.plasma === 'number') out[`p_${id}`] = a.plasma;
    if (typeof a.cumulativeMgPerKg === 'number') out[`cum_${id}`] = a.cumulativeMgPerKg;
  }
  out.bvMl = st.hemo.circ.prof?.bloodVolumeMl ?? NaN;
  return out;
}

export async function runArm(arm: Arm): Promise<ArmResult> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, ...(arm.patient ?? {}), sensors: SENSORS };
  const e = createEngine({ seed: arm.seed ?? 7, mode: arm.mode ?? 'modeled', patient });
  const x = { hr: NaN, an: null as any, qrs: NaN, meas: {} as Record<string, any>, circ: null as any, lung: null as any, mech: null as { ppeak: number; pplat: number } | null };
  const rhythms: [number, string][] = [];
  const marks: [number, string][] = [];
  e.on((m: any) => {
    if (m.type === 'measurement') { if (m.values.hr?.value != null) x.hr = m.values.hr.value; Object.assign(x.meas, m.values); }
    else if (m.type === 'circ') x.circ = m;
    else if (m.type === 'lungState') x.lung = m;
    else if (m.type === 'anaesthesia') x.an = m;
    else if (m.type === 'beat' && m.qrsMs != null) x.qrs = m.qrsMs;
    else if (m.type === 'rhythmSegment') { if (!rhythms.length || rhythms[rhythms.length - 1]![1] !== m.rhythm) rhythms.push([Math.round(m.t * 10) / 10, m.rhythm]); }
    else if (m.type === 'neuroMark') marks.push([Math.round(m.t), m.kind]);
  }, ['measurement', 'anaesthesia', 'beat', 'rhythmSegment', 'neuroMark', 'circ', 'lungState']);
  const log: string[] = [];
  const rejected: string[] = [];
  let n = 0;
  const pending = [...arm.steps].sort((a, b) => a[0] - b[0]);
  const rows: Row[] = [];
  const DT = arm.dt ?? 5;
  let lastYield = 0;
  const mechTimes = [...(arm.mech ?? [])].sort((a, b) => a - b);
  for (let t = DT; t <= arm.tEnd + 1e-9; t = Math.round((t + DT) * 1000) / 1000) {
    while (pending.length && (pending[0] as Step)[0] < t) {
      const [ts, body, label] = pending.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      const r = e.dispatch({ id: `a${++n}`, issuedBy: 'audit-cm', ...body });
      const d = JSON.stringify((body as any).event ?? body);
      log.push(`${ts}s ${label ?? ''} ${r.accepted ? 'OK' : 'REJECTED: ' + r.reason}`);
      if (!r.accepted) rejected.push(`${d}: ${r.reason}`);
    }
    if (mechTimes.length && (mechTimes[0] as number) < t) {
      // probe one breath at 20 ms: Ppeak = max airway pressure; Pplat = a 0.3 s hold on a copy at the last inspiratory tick
      const t0 = Math.max(e.now().simT, mechTimes.shift() as number);
      let ppeak = -Infinity, pplat = NaN, wasInsp = false, cand = NaN;
      for (let tt = t0; tt < Math.min(t, t0 + 8); tt = Math.round((tt + 0.02) * 1000) / 1000) {
        e.advanceTo(tt);
        const ls = e.st.resp.lung;
        ppeak = Math.max(ppeak, ls.mech.paw);
        if (ls.inInsp) cand = holdPressure(ls.mp, ls.mech, 0.3, 0);
        if (wasInsp && !ls.inInsp && Number.isFinite(cand)) pplat = cand;
        wasInsp = ls.inInsp;
      }
      x.mech = { ppeak, pplat };
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
