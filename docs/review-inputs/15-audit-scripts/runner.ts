// Coverage run NN (neuro, neuromuscular block, depth of anaesthesia, brain; research/12 §5.3). One ARM runner in the
// audit 08/09/10/14 pattern (research/12 §6), copied from research/19-audit-scripts/runner.ts (run CM) and
// research/22-audit-scripts/runner.ts (run BF) and extended with the NN readouts: the 1 Hz `anaesthesia` truth event
// (DI, SR, MAC, consciousness, movement, awareness risk, TOF count/ratio/PTC/T1, block at thumb and diaphragm, drive,
// pupils), 7g's effect-site concentrations and CNS bus (seizure flag, LAST CNS/CV effect, antagonists, dexmedetomidine
// Ce), and the 7d brain state (ICP, CPP, CBF, CMRO2, PbtO2, SjvO2, Cushing, herniation, mass). It creates an engine
// (seed 7 unless the arm says otherwise), dispatches a scripted timeline of the command bodies the physiology console
// sends, samples the committed pipeline state READ-ONLY every `dt` s (default 5) and returns the rows. No pokes (state
// writes) are used by any cell of this run. Long arms yield to the event loop once per simulated minute.
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
  lung: (id: string, severity: number) => ev({ kind: 'lungCondition', id, severity }),
  vent: (o: { rr?: number; vtMl?: number; peep?: number; fio2?: number } = {}) => ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, ...o }),
  spont: (fio2?: number) => ev({ kind: 'ventilation', source: 'spontaneous', ...(fio2 !== undefined ? { fio2 } : {}) }),
  none: () => ev({ kind: 'ventilation', source: 'none' }),
  device: (device: 'ett' | 'sga' | 'none') => ev({ kind: 'airwayDevice', device }),
  stim: (intensity: number) => ev({ kind: 'stimulus', intensity }),
  neuroProfile: (o: Record<string, unknown>) => ev({ kind: 'neuroProfile', ...o }),
  thermal: (o: Record<string, unknown>) => ev({ kind: 'thermal', ...o }),
  preox: (fio2: number, durationS: number) => ev({ kind: 'preoxygenate', fio2, durationS }),
  brain: (o: { massMl?: number; massRateMlPerMin?: number; oedemaMl?: number }) => ev({ kind: 'brain', ...o }),
  position: (headUpDeg: number) => ev({ kind: 'position', headUpDeg }),
  rhythm: (rhythm: string, opts: Record<string, unknown> = {}): Body => ({ type: 'setRhythm', rhythm, opts }),
  cpr: (o: Record<string, unknown>) => ev({ kind: 'cpr', ...o }),
  tof: (action: 'start' | 'stop' | 'train' | 'ptc', intervalS?: number): Body => ({ type: 'device', action: { device: 'tof', action, ...(intervalS ? { intervalS } : {}) } }),
  depthOn: (): Body => ({ type: 'device', action: { device: 'depth', action: 'on' } }),
};
/** Intubated and ventilated at t = 1 s: ETT + VCV 12 × 500 mL, PEEP 5, FiO2 0.5. Audit 08's 12 × 600 gives PaCO2 ≈ 30
 *  on this main (FU-4's single physical dead space: the ETT replaces the upper airway), so the NN rig uses the 7d tests'
 *  12 × 500 (PaCO2 ≈ 38.5, calibration probe) — the brain cells need normocapnia. */
export const VENTED: Step[] = [[1, A.device('ett'), 'ETT'], [1, A.vent(), 'VCV 12×500 PEEP 5 FiO2 0.5']];

const SENSORS = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on', co2: 'on', temp: 'on', icp: 'on', pbto2: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole', 'agonal', 'torsades', 'vtPoly']);

export interface Row { [k: string]: number | string | boolean }
export interface ArmResult { rows: Row[]; log: string[]; rhythms: [number, string][]; marks: [number, string][]; rejected: string[]; tofs: { t: number; count: number; ratio: number | null; ptc: number | null }[] }

function sample(e: any, t: number, x: { hr: number; an: any; meas: Record<string, any>; lung: any }): Row {
  const st = e.st;
  const c = st.hemo.circ;
  const rs = st.resp;
  const bs = c.beats.filter((b: any) => b.t > t - 6);
  const avg = (k: string) => (bs.length ? bs.reduce((a: number, b: any) => a + b[k], 0) / bs.length : NaN);
  const noEject = t - c.lastEjT > 3;
  const an = x.an ?? {};
  const bus = st.pk?.bus ?? {};
  const cns = bus.cns ?? {};
  const br = st.organs?.brain ?? {};
  const nr = st.neuro?.resp ?? {};
  const out: Row = {
    t, rhythm: st.rhythm.id, pulseless: PULSELESS.has(st.rhythm.id) || st.rhythm.opts?.pulseless === true, noEject,
    hr: x.hr, hrModel: c.hrModel, sbp: avg('sbp'), dbp: avg('dbp'), map: bs.length ? avg('map') : (c.s[0] as number),
    co: noEject ? 0 : c.qFwd * 0.06, sv: bs.length ? avg('sv') : 0, svr: c.p.rSys * 1333, cvp: st.hemo.num?.cvpAvg ?? st.hemo.circOut.pRa,
    spo2: rs.num?.spo2?.shown ?? NaN, sao2: rs.o2.sa * 100, pao2: rs.o2.pao2, paco2: rs.co2.pf, etco2: rs.etco2,
    src: rs.driver.source, rrSp: rs.spont?.rr ?? NaN, vtSp: rs.spont?.vt ?? NaN, veSp: rs.spont?.ve ?? NaN, va: rs.vaLpm ?? NaN, temp: rs.temp.tc,
    crs: x.lung?.complianceMlPerCmH2O ?? NaN,
    apnoea: nr.apnoea === true, obstr: nr.obstruction ?? 0, drvOp: nr.opioidDep ?? 0, drvHyp: nr.hypnoticDep ?? 0, veRest: nr.veRest ?? NaN, pMax: nr.pMaxMult ?? NaN,
    ph: st.blood.core.ab.ph, na: st.blood.out.na, lact: st.blood.out.lactate, k: st.blood.out.k, mg: st.blood.out.mg, glu: st.endo?.core?.out?.glucoseMgDl ?? NaN,
    epi: st.endo?.core?.out?.epiPgMl ?? NaN, ne: st.endo?.core?.out?.nePgMl ?? NaN,
    // 7f anaesthesia truth (1 Hz event)
    di: an.di ?? NaN, sr: an.sr ?? NaN, conscious: an.conscious ?? true, aware: an.awarenessRisk ?? false, movement: an.movement ?? false,
    macBrain: an.macBrain ?? 0, macEff: an.macEff ?? 0, mac: an.mac ?? 0, stress: an.stress ?? NaN,
    tofR: an.tof?.ratio ?? NaN, tofC: an.tof?.count ?? NaN, t1: an.tof?.t1 ?? NaN, ptc: an.tof?.ptc ?? NaN,
    blockTh: an.block?.thumb ?? NaN, blockDia: an.block?.dia ?? NaN, pupil: an.outputs?.pupilMm ?? NaN, cmro2Mult: an.outputs?.cmro2Mult ?? NaN,
    antinoc: an.outputs?.antinoc ?? NaN, diShown: x.meas.di?.value ?? NaN,
    // 7g CNS bus
    seizure: cns.seizure === true, propCe: cns.propCe ?? NaN, opRemiEq: cns.opioidCeRemiEq ?? NaN, dexCe: cns.dexmedCe ?? NaN, ketCe: cns.ketamineCe ?? NaN,
    benzoEq: cns.benzoCeMidazEq ?? NaN, cbfVaso: cns.cbfVaso ?? NaN, busCmro2: cns.cmro2Mult ?? NaN,
    cnsE: bus.last?.cnsE ?? 0, cvE: bus.last?.cvE ?? 0, antOp: bus.antagonist?.opioid ?? 1, antBz: bus.antagonist?.benzodiazepine ?? 1, achGain: bus.nmb?.achGain ?? 1,
    // 7d brain
    icp: br.icp ?? NaN, cppBr: br.cpp ?? NaN, mapHead: br.mapHead ?? NaN, cbf: br.cbfRel ?? NaN, cmro2: br.cmro2Rel ?? NaN, pbto2: br.pbto2 ?? NaN,
    sjvo2: Number.isFinite(br.sjvo2) ? br.sjvo2 * 100 : NaN, cush: br.cush?.drive ?? 0, cushOn: br.cush?.active === true, herniated: br.herniated === true,
    mass: br.mass ?? NaN, csfDisp: br.csfDisp ?? NaN,
  };
  for (const [id, v] of Object.entries(an.ce ?? {})) out[`ce_${id}`] = v as number;
  for (const [id, v] of Object.entries(st.pk?.lastC ?? {})) out[`c_${id}`] = v as number;
  for (const [id, a] of Object.entries((bus.agents ?? {}) as Record<string, { plasma?: number; brain?: number; cumulativeMgPerKg?: number }>)) {
    if (typeof a.plasma === 'number') out[`p_${id}`] = a.plasma;
    if (typeof a.brain === 'number') out[`b_${id}`] = a.brain;
  }
  return out;
}

export async function runArm(arm: Arm): Promise<ArmResult> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, ...(arm.patient ?? {}), sensors: SENSORS };
  const e = createEngine({ seed: arm.seed ?? 7, mode: arm.mode ?? 'modeled', patient });
  const x = { hr: NaN, an: null as any, meas: {} as Record<string, any>, lung: null as any };
  const marks: [number, string][] = [];
  const tofs: ArmResult['tofs'] = [];
  e.on((m: any) => {
    if (m.type === 'measurement') { if (m.values.hr?.value != null) x.hr = m.values.hr.value; Object.assign(x.meas, m.values); }
    else if (m.type === 'anaesthesia') x.an = m;
    else if (m.type === 'lungState') x.lung = m;
    else if (m.type === 'neuroMark') marks.push([Math.round(m.t), m.kind]);
    else if (m.type === 'tof') tofs.push({ t: Math.round(m.t), count: m.count, ratio: m.ratio, ptc: m.ptc });
  }, ['measurement', 'anaesthesia', 'neuroMark', 'lungState', 'tof']);
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
      const r = e.dispatch({ id: `a${++n}`, issuedBy: 'audit-nn', ...body });
      const d = JSON.stringify((body as any).event ?? (body as any).action ?? body);
      log.push(`${ts}s ${label ?? ''} ${r.accepted ? 'OK' : 'REJECTED: ' + r.reason}`);
      if (!r.accepted) rejected.push(`${d}: ${r.reason}`);
    }
    while (e.now().simT < t - 1e-9) {
      e.advanceTo(Math.min(t, e.now().simT + 60));
      if (e.now().simT - lastYield >= 60) { lastYield = e.now().simT; await new Promise((r) => setImmediate(r)); }
    }
    rows.push(sample(e, t, x));
  }
  // rhythm transitions from the sampled committed rhythm id (the `rhythmSegment` event fires only for templated AF)
  const rhythms: [number, string][] = [];
  for (const r of rows) if (!rhythms.length || rhythms[rhythms.length - 1]![1] !== r.rhythm) rhythms.push([r.t as number, r.rhythm as string]);
  return { rows, log, rhythms, marks, rejected, tofs };
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
