// Respiratory integration audit (research/09-respiratory-integration-audit.md): ONE scenario runner, the 08 audit's
// pattern with a respiratory sampler. Creates an engine (seed 7), dispatches a scripted timeline of command bodies
// (the shapes the physiology console sends), samples the committed pipeline state READ-ONLY every DT s (default 5;
// `fine` scenarios step at 0.1 s between samples to catch peak airway pressure), captures the monitor's measurement
// and alarm events, prints a compact table and writes <RESULTS>/<name>.json (not committed; regenerate).
// Run: see cli.ts header.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
// FU-6 Task 1: defaults point at this repo; the probes and summarize.ts read the same variables through process.env
process.env.PME_ENGINE ??= join(HERE, '../../packages/engine-core/src/index.ts');
process.env.PME_VENT ??= join(HERE, '../../packages/ventilator/src/index.ts');
process.env.RESULTS ??= join(HERE, '../../.audit-respiratory/results');
const ENGINE = process.env.PME_ENGINE;
const RESULTS = process.env.RESULTS;
const { createEngine } = (await import(ENGINE)) as { createEngine: (o: unknown) => unknown };
const { respPleural } = (await import(join(dirname(ENGINE), 'l2/resp/pipeline.ts'))) as { respPleural: (rs: unknown, t: number) => number };

export type Body = Record<string, unknown> & { type: string };
export type Step = [number, Body | ((e: any) => void), string?];
export interface Scenario {
  name: string; title: string; mode?: 'modeled' | 'manual'; patient?: Record<string, unknown>;
  steps: Step[]; tEnd: number; printEvery?: number; dt?: number; fine?: boolean;
}

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const A = {
  drug: (drugId: string, dose: number, unit: string) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' }),
  infusion: (drugId: string, rate: number, unit: string) => ev({ kind: 'infusion', drugId, rate, unit }),
  vap: (agent: string, dialPct: number, fgfLpm = 2) => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, n2oFrac: 0 }),
  cond: (id: string, severity: number) => ev({ kind: 'condition', id, severity }),
  lung: (id: string, severity: number, side?: 'L' | 'R', extra: Record<string, unknown> = {}) => ev({ kind: 'lungCondition', id, severity, ...(side ? { side } : {}), ...extra }),
  vent: (o: { rr?: number; vtMl?: number; peep?: number; fio2?: number; ie?: number } = {}) => ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, ...o }),
  bvm: (rr = 12, vtMl = 500, fio2 = 1) => ev({ kind: 'ventilation', source: 'bvm', rr, vtMl, fio2 }),
  spont: (o: { fio2?: number } = {}) => ev({ kind: 'ventilation', source: 'spontaneous', ...o }),
  none: () => ev({ kind: 'ventilation', source: 'none' }),
  airway: (state: string, severity?: number) => ev(severity === undefined ? { kind: 'airway', state } : { kind: 'airway', state, severity }),
  device: (device: 'ett' | 'sga' | 'none') => ev({ kind: 'airwayDevice', device }),
  preox: (fio2: number, durationS: number) => ev({ kind: 'preoxygenate', fio2, durationS }),
  stim: (intensity: number) => ev({ kind: 'stimulus', intensity }),
  thermal: (o: Record<string, unknown>) => ev({ kind: 'thermal', ...o }),
  mainstem: (ventilated: 'both' | 'left' | 'right') => ev({ kind: 'mainstem', ventilated }),
  recruit: (pressureCmH2O: number, durationS: number) => ev({ kind: 'recruit', pressureCmH2O, durationS }),
  bleed: (volumeMl: number, overS: number) => ev({ kind: 'bleed', volumeMl, overS }),
  cpr: (active: boolean, quality = 1) => ev({ kind: 'cpr', active, rate: 110, quality }),
  rhythm: (id: string) => ({ type: 'setRhythm', rhythm: id }) as Body,
  setTarget: (variable: string, value: number) => ({ type: 'setTarget', variable, value }) as Body,
};
/** Intubated and ventilated at t = 1 s: ETT + VCV rr × vt, PEEP 5, FiO2 0.5 (engine defaults are 12 × 500). */
export const VENTED = (o: { rr?: number; vtMl?: number; peep?: number; fio2?: number } = {}): Step[] => [[1, A.device('ett')], [1, A.vent(o)]];

const SENSORS = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on', co2: 'on', temp: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'vf', 'asystole', 'pea', 'pwaveAsystole', 'pWaveAsystole', 'torsades']);
const r1 = (x: number) => Math.round(x * 10) / 10;

export interface Row { [k: string]: number | string | boolean }

function sample(e: any, t: number, meas: Record<string, any>, lungEv: any, win: { pk: number; pkAlv: number; ppl: number; sbpMax: number; sbpMin: number }): Row {
  const st = e.st;
  const hs = st.hemo;
  const c = hs.circ;
  const rs = st.resp;
  const d = rs.driver;
  const bs = c.beats.filter((b: any) => b.t > t - 6);
  const avg = (k: string) => (bs.length ? bs.reduce((a: number, b: any) => a + b[k], 0) / bs.length : NaN);
  const noEject = t - c.lastEjT > 3;
  const nr = st.neuro?.resp ?? {};
  const bus = st.pk?.bus ?? {};
  const mech = d.source === 'ventilator' || d.source === 'bvm' || d.source === 'external';
  const modeledSp = st.l1.mode === 'modeled' && d.source === 'spontaneous' && (rs.spont?.rr ?? -1) >= 0;
  const rrTrue = d.source === 'none' ? 0 : mech ? (d.source === 'external' ? NaN : d.vent.rr) : modeledSp ? rs.spont.rr : NaN;
  const vtTrue = mech ? (d.source === 'external' ? NaN : d.vent.vt) : modeledSp ? rs.spont.vt : NaN;
  const vd = rs.pat.deadSpaceMl + (mech && d.source !== 'spontaneous' ? Math.min(50, 1.5 * rs.pat.weightKg) : 0) + rs.co2.vdExtraMl;
  const m = (k: string) => (meas[k]?.value ?? NaN);
  const peep = d.source === 'ventilator' ? d.vent.peep : 0;
  return {
    t, rhythm: st.rhythm.id, pulseless: PULSELESS.has(st.rhythm.id) || st.rhythm.opts?.pulseless === true, noEject,
    hr: m('hr'), map: bs.length ? avg('map') : (c.s[0] as number), co: noEject ? 0 : c.qFwd * 0.06, pap: m('papMean'), cvp: m('cvpMean'),
    spo2: m('spo2'), sao2: rs.o2.sa * 100, pao2: rs.o2.pao2, paco2: rs.co2.pf, et: rs.etco2, etD: m('etco2'), fico2D: m('imco2'),
    ph: st.blood.core.ab.ph, hco3: st.blood.core.ab.hco3, k: st.blood.out.k, lact: st.blood.out.lactate, hb: st.blood.out.hb, temp: rs.temp.tc,
    src: d.source, aw: d.airway, rr: rrTrue, vt: vtTrue, rrD: m('rr'), awrr: m('awrr'), va: rs.vaLpm ?? NaN, vd, vdvt: Number.isFinite(vtTrue) && vtTrue > 0 ? vd / vtTrue : NaN,
    e: rs.lung.co2.e, g: rs.lung.co2.g, pv: rs.lung.co2.pv,
    pPk: win.pk, pPl: rs.lung.pInsp, peepTot: rs.lung.peepTot, autoPeep: Math.max(0, rs.lung.peepTot - peep), vLung: rs.lung.mech.v.reduce((a: number, b: number) => a + b, 0),
    crs: lungEv?.complianceMlPerCmH2O ?? NaN, shunt: lungEv?.shunt ?? NaN, frc: lungEv?.frcMl ?? NaN, atel: lungEv?.atelectasisFrac ?? NaN,
    opDep: nr.opioidDep ?? 0, hypDep: nr.hypnoticDep ?? 0, nApn: nr.apnoea ?? false, obs: nr.obstruction ?? 0, pMax: nr.pMaxMult ?? 1,
    di: st.neuro?.diShown ?? NaN, tofr: st.neuro?.last?.tof ? (st.neuro.last.tof.count === 4 ? st.neuro.last.tof.ratio : 0) : NaN,
    fat: rs.spont?.fatigue ?? 1, pSet: rs.spont?.paco2Set ?? NaN, propCe: bus.cns?.propCe ?? 0, mac: bus.cns?.macBrain ?? 0,
    vo2: st.endo?.core?.out?.vo2F ?? NaN, shiver: rs.temp?.out?.shiverW ?? NaN,
    fa: rs.o2.fa, cao2: st.blood.core.o2?.cao2 ?? NaN, svo2: (st.blood.core.o2?.svo2 ?? NaN) * 100, do2: (noEject ? 0 : c.qFwd * 0.06) * (st.blood.core.o2?.cao2 ?? NaN),
    pplMin: win.ppl, gaLvl: rs.gaLvl ?? NaN, effort: rs.spont?.effort ?? NaN, loc: nr.loc ?? NaN, frcNow: rs.lung.frcGaMl,
    dSbp: Number.isFinite(win.sbpMax) ? win.sbpMax - win.sbpMin : NaN, // FU-6: pleural minimum (mmHg) and SBP swing of `fine` runs
    ga: rs.temp.anaesthesia, fatigue: rs.spont?.fatigue ?? 1, cleft: nr.cleft ?? 0,
  };
}

export async function run(sc: Scenario, quiet = false): Promise<{ rows: Row[]; log: string[]; alarms: string[] }> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, ...(sc.patient ?? {}), sensors: SENSORS };
  const e: any = createEngine({ seed: 7, mode: sc.mode ?? 'modeled', patient });
  const meas: Record<string, any> = {};
  let lungEv: any = null;
  const alarms: string[] = [];
  e.on((x: any) => {
    if (x.type === 'measurement') Object.assign(meas, x.values);
    else if (x.type === 'lungState') lungEv = x;
    else if (x.type === 'alarm' && x.t > 10) alarms.push(`${x.t.toFixed(0)}s ${x.state === 'raised' ? '+' : '-'}${x.id}`);
  }, ['measurement', 'lungState', 'alarm']);
  const log: string[] = [];
  let n = 0;
  const pending = [...sc.steps].sort((a, b) => a[0] - b[0]);
  const rows: Row[] = [];
  const DT = sc.dt ?? 5;
  const win = { pk: 0, pkAlv: 0, ppl: 0, sbpMax: NaN, sbpMin: NaN };
  for (let t = DT; t <= sc.tEnd + 1e-9; t += DT) {
    while (pending.length && (pending[0] as Step)[0] < t) {
      const [ts, body, label] = pending.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      if (typeof body === 'function') { body(e); log.push(`${ts}s poke ${label ?? ''}`); continue; }
      const r = e.dispatch({ id: `a${++n}`, issuedBy: 'audit', ...body });
      const dd = JSON.stringify((body as any).event ?? body);
      log.push(`${ts}s ${label ?? ''} ${dd} ${r.accepted ? 'OK' : 'REJECTED: ' + r.reason}`);
      if (!r.accepted && !quiet) console.log(`!! ${sc.name}: rejected ${dd}: ${r.reason}`);
    }
    win.pk = -1e9;
    win.ppl = Number.NaN;
    if (sc.fine) {
      win.ppl = 1e9;
      for (let u = e.now().simT + 0.1; u < t - 1e-9; u += 0.1) { e.advanceTo(u); win.pk = Math.max(win.pk, e.st.resp.lung.mech.paw); win.ppl = Math.min(win.ppl, respPleural(e.st.resp, u)); }
      const bs = e.st.hemo.circ.beats.filter((b: any) => b.t > t - DT && b.sbp !== undefined);
      win.sbpMax = bs.length ? Math.max(...bs.map((b: any) => b.sbp)) : NaN;
      win.sbpMin = bs.length ? Math.min(...bs.map((b: any) => b.sbp)) : NaN;
    }
    e.advanceTo(t);
    win.pk = Math.max(win.pk, e.st.resp.lung.mech.paw);
    rows.push(sample(e, t, meas, lungEv, win));
    if (Math.round(t) % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return { rows, log, alarms };
}

export type Col = [string, string, number];
export const COLS: Col[] = [
  ['t', 't(s)', 0], ['rhythm', 'rhythm', 0], ['hr', 'HR', 0], ['map', 'MAP', 0], ['co', 'CO', 1], ['pap', 'PAPm', 0],
  ['spo2', 'SpO2', 0], ['sao2', 'SaO2', 0], ['pao2', 'PaO2', 0], ['paco2', 'PaCO2', 1], ['et', 'EtT', 1], ['etD', 'EtD', 0], ['ph', 'pH', 2],
  ['src', 'src', 0], ['aw', 'airway', 0], ['rr', 'RR', 1], ['vt', 'VT', 0], ['rrD', 'RRd', 0], ['awrr', 'awRR', 0], ['va', 'VA', 2], ['vd', 'VD', 0],
  ['pPk', 'Ppk', 1], ['pPl', 'Ppl', 1], ['autoPeep', 'PEEPi', 1], ['crs', 'Crs', 0], ['shunt', 'Qs', 2], ['frc', 'FRC', 0],
  ['opDep', 'dOp', 2], ['hypDep', 'dHyp', 2], ['obs', 'obs', 2], ['pMax', 'str', 2], ['tofr', 'TOFr', 2], ['propCe', 'Cp', 1], ['mac', 'MAC', 2],
  ['k', 'K', 1], ['lact', 'Lac', 1], ['temp', 'T', 1],
];
export function table(sc: Scenario, rows: Row[], every = sc.printEvery ?? 60, cols: Col[] = COLS): string {
  const fmt = (v: unknown, d: number) => (typeof v === 'number' ? (Number.isFinite(v) ? v.toFixed(d) : '–') : String(v).slice(0, 8));
  const lines = [cols.map(([, h]) => h).join('\t')];
  const marks = sc.steps.map((s) => s[0]);
  for (const r of rows) {
    const t = r.t as number;
    const near = marks.some((m) => (t > m && t <= m + (sc.dt ?? 5)));
    if (Math.abs(t / every - Math.round(t / every)) < 1e-6 || near) lines.push(cols.map(([k, , d]) => fmt(r[k], d)).join('\t') + (r.noEject ? '\tNO-EJECT' : '') + (r.pulseless ? '\tPULSELESS' : ''));
  }
  return lines.join('\n');
}
/** First time after t0 at which pred holds (NaN if never). */
export function firstT(rows: Row[], pred: (r: Row) => boolean, t0 = 0): number {
  const r = rows.find((x) => (x.t as number) > t0 && pred(x));
  return r ? (r.t as number) : NaN;
}
export function at(rows: Row[], k: string, t0: number, t1: number): number {
  const w = rows.filter((r) => (r.t as number) > t0 && (r.t as number) <= t1).map((r) => r[k] as number).filter(Number.isFinite);
  return w.length ? r1(w.reduce((a, b) => a + b, 0) / w.length) : NaN;
}
export function ext(rows: Row[], k: string, t0: number, t1: number, fn: 'min' | 'max'): number {
  const w = rows.filter((r) => (r.t as number) > t0 && (r.t as number) <= t1).map((r) => r[k] as number).filter(Number.isFinite);
  return w.length ? r1(fn === 'min' ? Math.min(...w) : Math.max(...w)) : NaN;
}
export function save(sc: Scenario, rows: Row[], log: string[], alarms: string[]): void {
  mkdirSync(RESULTS, { recursive: true });
  writeFileSync(join(RESULTS, `${sc.name}.json`), JSON.stringify({ scenario: { ...sc, steps: sc.steps.map((s) => [s[0], typeof s[1] === 'function' ? `poke:${s[2]}` : s[1], s[2]]) }, log, alarms, rows }));
}
