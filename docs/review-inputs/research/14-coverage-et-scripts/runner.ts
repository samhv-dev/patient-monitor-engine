// Coverage run ET (endocrine and thermal; research/14-coverage-endocrine-thermal.md), copied from run CM's runner
// (research/19-audit-scripts/runner.ts, itself from DI) and run DV's (research/20-audit-scripts/runner.ts), extended
// with the ET readouts: core/peripheral/site temperatures and the heat flows of the 7e heat balance, the thermal
// depth, shivering and sweating, VO2 (actual and demand) and the metabolic factor Stage 3's gas model uses for VCO2, the
// 7e endocrine outputs (glucose, insulin, adrenaline, noradrenaline, cortisol, stress index, sympathetic activity, MH
// activity), the arrest state and the displayed temperature. One ARM runner in the audit 08/09/10 pattern
// (research/12 §6): creates an engine (seed 7 unless the arm says otherwise), dispatches a scripted timeline of the
// command bodies the physiology console sends, samples the committed pipeline state READ-ONLY every `dt` s (default
// 10) and returns the rows. No pokes. Arms yield to the event loop once per simulated minute.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = process.env.PME_ENGINE ?? join(HERE, 'wt/packages/engine-core/src/index.ts');
const { createEngine } = (await import(ENGINE)) as { createEngine: (o: unknown) => any };
/** Stage 3's metabolic factor (VCO2/VO2 multiplier the gas model uses), read-only. */
const { metabolic } = (await import(join(dirname(ENGINE), 'l2/resp/pipeline.ts'))) as { metabolic: (rs: unknown, t: number, gas?: 'o2' | 'co2') => number };

export type Body = Record<string, unknown> & { type: string };
export type Step = [number, Body, string?];
export interface Arm {
  patient?: Record<string, unknown>;
  mode?: 'modeled' | 'manual';
  steps: Step[];
  tEnd: number;
  dt?: number; // sample interval, s (default 10)
  seed?: number;
}

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const A = {
  drug: (drugId: string, dose: number, unit: string, extra: Record<string, unknown> = {}) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv', ...extra }),
  infusion: (drugId: string, rate: number, unit: string) => ev({ kind: 'infusion', drugId, rate, unit }),
  vap: (agent: string, dialPct: number, fgfLpm = 2, n2oFrac = 0) => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, n2oFrac }),
  bleed: (volumeMl: number, overS: number) => ev({ kind: 'bleed', volumeMl, overS }),
  fluid: (fluid: string, volumeMl: number, overS: number) => ev({ kind: 'fluid', fluid, volumeMl, overS }),
  transfusion: (o: Record<string, unknown>) => ev({ kind: 'transfusion', ...o }),
  cond: (id: string, severity: number, extra: Record<string, unknown> = {}) => ev({ kind: 'condition', id, severity, ...extra }),
  lung: (id: string, severity: number) => ev({ kind: 'lungCondition', id, severity }),
  vent: (o: { rr?: number; vtMl?: number; peep?: number; fio2?: number } = {}) => ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5, ...o }),
  spont: (fio2?: number) => ev({ kind: 'ventilation', source: 'spontaneous', ...(fio2 !== undefined ? { fio2 } : {}) }),
  none: () => ev({ kind: 'ventilation', source: 'none' }),
  device: (device: 'ett' | 'sga' | 'none') => ev({ kind: 'airwayDevice', device }),
  thermal: (o: Record<string, unknown>) => ev({ kind: 'thermal', ...o }),
  thermal7e: (o: Record<string, unknown>) => ev({ kind: 'thermal7e', ...o }),
  metabolic: (o: Record<string, unknown>) => ev({ kind: 'metabolic', ...o }),
  meal: (carbohydrateG: number) => ev({ kind: 'meal', carbohydrateG }),
  stim: (intensity: number) => ev({ kind: 'stimulus', intensity }),
  neuroProfile: (o: Record<string, unknown>) => ev({ kind: 'neuroProfile', ...o }),
  rhythm: (rhythm: string, opts: Record<string, unknown> = {}): Body => ({ type: 'setRhythm', rhythm, opts }),
  tof: (): Body => ({ type: 'device', action: { kind: 'tofStart', intervalS: 15 } }),
  target: (variable: string, value: number, durationS?: number): Body => ({ type: 'setTarget', variable, value, ...(durationS !== undefined ? { ramp: { durationS } } : {}) }),
  raw: (event: Record<string, unknown>): Body => ev(event),
};
/** Intubated and ventilated at t = 1 s: ETT + VCV 12 × 600 mL, PEEP 5, FiO2 0.5 (audit 08's rig: PaCO2 ≈ 40 on main). */
export const VENTED: Step[] = [[1, A.device('ett'), 'ETT'], [1, A.vent(), 'VCV 12×600 PEEP 5 FiO2 0.5']];

const SENSORS = { abp: 'connected', cvp: 'connected', spo2: 'on', co2: 'on', temp: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'asystole', 'pWaveAsystole', 'agonal', 'torsades', 'vtPoly']);

export interface Row { [k: string]: number | string | boolean }
export interface ArmResult { rows: Row[]; log: string[]; rhythms: [number, string][]; marks: [number, string][]; rejected: string[]; accepted: string[] }

const val = (x: any): number => (x && typeof x.value === 'number' ? x.value : NaN);

function sample(e: any, t: number, x: { hr: number; an: any; meas: Record<string, any>; endo: any }): Row {
  const st = e.st;
  const c = st.hemo.circ;
  const rs = st.resp;
  const th = rs.temp;
  const bs = c.beats.filter((b: any) => b.t > t - 6);
  const avg = (k: string) => (bs.length ? bs.reduce((a: number, b: any) => a + b[k], 0) / bs.length : NaN);
  const noEject = t - c.lastEjT > 3;
  const an = x.an ?? {};
  const eo = st.endo?.core?.out ?? {};
  const g = st.endo?.core?.glucose ?? {};
  const cas = st.endo?.cascade ?? {};
  const o = th.out ?? {};
  const out: Row = {
    t, rhythm: st.rhythm.id, pulseless: PULSELESS.has(st.rhythm.id) || st.rhythm.opts?.pulseless === true, noEject,
    arrest: c.arrest ? String(c.arrest.cause) : '',
    hr: x.hr, sbp: avg('sbp'), dbp: avg('dbp'), map: bs.length ? avg('map') : (c.s[0] as number), co: noEject ? 0 : c.qFwd * 0.06,
    sv: bs.length ? avg('sv') : 0, svr: c.p.rSys * 1333, cvp: st.hemo.num?.cvpAvg ?? st.hemo.circOut.pRa,
    spo2: rs.num?.spo2?.shown ?? NaN, sao2: rs.o2.sa * 100, pao2: rs.o2.pao2, paco2: rs.co2.pf, etco2: rs.etco2,
    src: rs.driver.source, veSp: rs.spont?.ve ?? NaN, rrSp: rs.spont?.rr ?? NaN,
    ph: st.blood.core.ab.ph, hco3: st.blood.core.ab.hco3, be: st.blood.core.ab.be ?? NaN, lact: st.blood.out.lactate, k: st.blood.out.k, kEcg: st.blood.out.kEcg,
    na: st.blood.out.na, hb: st.blood.out.hb, bvRel: st.blood.out.bvRel,
    vo2: st.blood.core.o2.vo2, vo2Dem: st.blood.core.o2.demand, svo2: st.blood.core.o2.svo2 * 100,
    metCo2: metabolic(rs, t, 'co2'), metO2: metabolic(rs, t, 'o2'), vco2: rs.pat.vco2 * metabolic(rs, t, 'co2'),
    // thermal (7e heat balance)
    tc: th.tc, tp: th.tp, ta: th.ta, tOes: th.sites?.oesophageal ?? NaN, tBlad: th.sites?.bladder ?? NaN, tAx: th.sites?.axilla ?? NaN,
    depth: th.depth, vasoF: o.vasoF ?? NaN, kcp: o.kcp ?? NaN, metW: o.metabolicW ?? NaN, shivW: o.shiverW ?? NaN, mhW: o.mhW ?? NaN, sweatW: o.sweatW ?? NaN,
    dryW: o.dryW ?? NaN, respW: o.respW ?? NaN, evapW: o.evapW ?? NaN, warmW: o.warmW ?? NaN, ivW: o.ivW ?? NaN, extraX: th.extraX, feverShift: th.feverShift,
    anaes: th.anaesthesia, nmbT: th.nmb, thSetShift: th.setShift, lungSev: st.endo?.lungSev ?? NaN, ecgTempC: st.mods?.tempC ?? NaN, stage: cas.stage ?? NaN, macF: cas.macF ?? NaN, clearF: cas.clearanceF ?? NaN, coagF: cas.coagF ?? NaN, hrFtemp: cas.hrF ?? NaN,
    shivering: x.endo?.shivering === true, sweating: x.endo?.sweating === true, vasoconstricted: x.endo?.vasoconstricted === true,
    // endocrine (7e core)
    glu: eo.glucoseMgDl ?? NaN, gluMmol: eo.glucoseMmol ?? NaN, ins: eo.insulinUuMl ?? NaN, insExo: g.iExo ?? NaN, epi: eo.epiPgMl ?? NaN, ne: eo.nePgMl ?? NaN,
    cort: eo.cortisolNmolL ?? NaN, symp: eo.symp ?? NaN, stressIdx: eo.stressIndex ?? NaN, vasoResp: eo.vasoResp ?? NaN, vo2F: eo.vo2F ?? NaN, setShift: eo.setShiftC ?? NaN,
    endoHrF: eo.hrF ?? NaN, endoSvrF: eo.svrF ?? NaN, endoEesF: eo.eesF ?? NaN, kShiftEndo: eo.kShift ?? NaN, glyco: eo.neuroglycopenia ?? NaN,
    mhAct: x.endo?.mhActivity ?? NaN, dka: st.blood.out.dkaSeverity ?? NaN, keto: st.blood.core?.so?.keto ?? NaN,
    // neuro / depth
    di: an.di ?? NaN, conscious: an.conscious ?? true, mac: an.mac ?? 0, macBrain: an.macBrain ?? 0, macEff: an.macEff ?? 0, movement: an.movement ?? false,
    tofR: an.tof?.ratio ?? NaN, tofC: an.tof?.count ?? NaN, t1: an.tof?.t1 ?? NaN, antinoc: st.neuro?.antinoc ?? NaN, thermoDepth: st.neuro?.thermoDepth ?? NaN,
    // monitor
    dTemp: val(x.meas.tempCore), dTempSite: val(x.meas.tempSite), dHr: val(x.meas.hr), dEtco2: val(x.meas.etco2),
    // organs
    uop: (st.organs?.renal?.uopMlMin ?? NaN) * 60, liverF: st.organs?.liver?.glucoseF ?? NaN,
  };
  for (const [id, v] of Object.entries(an.ce ?? {})) out[`ce_${id}`] = v as number;
  for (const [id, a] of Object.entries((st.pk.bus?.agents ?? {}) as Record<string, { plasma?: number }>)) if (typeof a.plasma === 'number') out[`p_${id}`] = a.plasma;
  return out;
}

export async function runArm(arm: Arm): Promise<ArmResult> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, ...(arm.patient ?? {}), sensors: SENSORS };
  const e = createEngine({ seed: arm.seed ?? 7, mode: arm.mode ?? 'modeled', patient });
  const x = { hr: NaN, an: null as any, meas: {} as Record<string, any>, endo: null as any };
  const marks: [number, string][] = [];
  e.on((m: any) => {
    if (m.type === 'measurement') { if (m.values.hr?.value != null) x.hr = m.values.hr.value; Object.assign(x.meas, m.values); }
    else if (m.type === 'anaesthesia') x.an = m;
    else if (m.type === 'endo') x.endo = m;
    else if (m.type === 'neuroMark') marks.push([Math.round(m.t), m.kind]);
  }, ['measurement', 'anaesthesia', 'endo', 'neuroMark']);
  const log: string[] = [];
  const rejected: string[] = [];
  const accepted: string[] = [];
  let n = 0;
  const pending = [...arm.steps].sort((a, b) => a[0] - b[0]);
  const rows: Row[] = [];
  const DT = arm.dt ?? 10;
  let lastYield = 0;
  for (let t = DT; t <= arm.tEnd + 1e-9; t = Math.round((t + DT) * 1000) / 1000) {
    while (pending.length && (pending[0] as Step)[0] < t) {
      const [ts, body, label] = pending.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      const r = e.dispatch({ id: `a${++n}`, issuedBy: 'audit-et', ...body });
      const d = JSON.stringify((body as any).event ?? body);
      log.push(`${ts}s ${label ?? ''} ${r.accepted ? 'OK' : 'REJECTED: ' + r.reason}`);
      if (!r.accepted) rejected.push(`${d}: ${r.reason}`);
      else accepted.push(`${ts}s ${label ?? d}`);
    }
    // advance in ≤ 60 s slices, yielding once per simulated minute
    let now = e.now().simT;
    while (now < t) { now = Math.min(t, now + 60); e.advanceTo(now); if (now - lastYield >= 60) { lastYield = now; await new Promise((r) => setImmediate(r)); } }
    rows.push(sample(e, t, x));
  }
  const fromRows: [number, string][] = [];
  for (const r of rows) {
    const id = `${r.rhythm as string}${r.pulseless && !PULSELESS.has(r.rhythm as string) ? '(pulseless)' : ''}`;
    if (!fromRows.length || fromRows[fromRows.length - 1]![1] !== id) fromRows.push([r.t as number, id]);
  }
  return { rows, log, rhythms: fromRows, marks, rejected, accepted };
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
