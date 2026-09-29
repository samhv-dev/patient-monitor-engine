// Physiology integration audit (research/08-physiology-integration-audit.md, FU-4 Task 1): ONE scenario runner.
// Creates an engine (seed fixed), dispatches a scripted timeline, samples the physiology every 5 s (truth read from the
// engine's committed pipeline state, read-only), prints a compact table plus extremes, and writes
// <out>/results/<name>.json. Output folder: PME_AUDIT_OUT, default <repo>/.audit-physiology (git-ignored).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
export const OUT = process.env.PME_AUDIT_OUT ?? join(HERE, '../../.audit-physiology');
const ENGINE = process.env.PME_ENGINE ?? join(HERE, '../../packages/engine-core/src/index.ts');
const { createEngine } = (await import(ENGINE)) as typeof import('../../packages/engine-core/src/index.ts');

export type Body = Record<string, unknown> & { type: string };
export type Step = [number, Body | ((e: any) => void), string?]; // t (s), command body or a state poke (audit seam), label
export interface Scenario {
  name: string; title: string; mode: 'modeled' | 'manual'; patient?: Record<string, unknown>;
  steps: Step[]; tEnd: number; printEvery?: number; truthHz?: number;
}

const ev = (event: Record<string, unknown>): Body => ({ type: 'applyEvent', event });
export const A = {
  drug: (drugId: string, dose: number, unit: string) => ev({ kind: 'drug', drugId, dose, unit, route: 'iv' }),
  infusion: (drugId: string, rate: number, unit: string) => ev({ kind: 'infusion', drugId, rate, unit }),
  vap: (agent: string, dialPct: number, fgfLpm = 2) => ev({ kind: 'vaporiser', agent, dialPct, fgfLpm, n2oFrac: 0 }),
  bleed: (volumeMl: number, overS: number) => ev({ kind: 'bleed', volumeMl, overS }),
  fluid: (fluid: string, volumeMl: number, overS: number) => ev({ kind: 'fluid', fluid, volumeMl, overS }),
  cond: (id: string, severity: number, extra: Record<string, unknown> = {}) => ev({ kind: 'condition', id, severity, ...extra }),
  lung: (id: string, severity: number, side?: 'L' | 'R') => ev(side ? { kind: 'lungCondition', id, severity, side } : { kind: 'lungCondition', id, severity }),
  vent: (peep = 5, fio2 = 0.5, rr = 12, vtMl = 600) => ev({ kind: 'ventilation', source: 'ventilator', rr, vtMl, peep, fio2 }),
  ventOff: () => ev({ kind: 'ventilation', source: 'none' }),
  ett: () => ev({ kind: 'airwayDevice', device: 'ett' }),
  transfusion: (product: string, units: number, overS: number, storageDays = 35) => ev({ kind: 'transfusion', product, units, overS, storageDays, warmed: true }),
  cpr: (active: boolean, quality = 1) => ev({ kind: 'cpr', active, rate: 110, quality }),
  mode: (mode: 'manual' | 'modeled'): Body => ({ type: 'setMode', mode }),
};
/** Standard ventilated start: ETT + ventilator VCV 12 × 600 mL (PaCO2 ≈ 42 on main; 12 × 500 drifts to PaCO2 60 — audit finding), PEEP 5, FiO2 0.5 at t = 1 s. */
export const VENTED: Step[] = [[1, A.ett()], [1, A.vent(5, 0.5)]];

const SENSORS = { abp: 'connected', cvp: 'connected', pap: 'connected', spo2: 'on' };
const PULSELESS = new Set(['vfCoarse', 'vfFine', 'vf', 'asystole', 'pea', 'pwaveAsystole', 'pWaveAsystole', 'torsades']);
const r1 = (x: number) => Math.round(x * 10) / 10;

export interface Row {
  t: number; rhythm: string; pulseless: boolean; noEject: boolean; hr: number; sbp: number; dbp: number; map: number; cvp: number;
  pawp: number; co: number; sv: number; svr: number; pmsf: number; lvedv: number; lvedp: number; cpp: number; sd: number; kIsch: number; kIschRv: number; cause: string;
  ppeRi: number; dSbp: number; spo2: number; sao2: number; pao2: number; etco2: number; paco2: number; ph: number; lact: number; k: number; iCa: number;
  hb: number; temp: number; cbf: number; icp: number; uop: number; epi: number; ne: number; baroEs: number; baroSet: number; kLv: number;
  propCe: number; mac: number; drugSvr: number; drugEes: number; drugV0: number; drugGv: number; manEes: number; manR: number; rr: number; ve: number;
}

function sample(e: any, t: number, last: { hr: number }): Row {
  const st = e.st;
  const hs = st.hemo;
  const c = hs.circ;
  const bs = c.beats.filter((b: any) => b.t > t - 6);
  const avg = (k: string) => (bs.length ? bs.reduce((a: number, b: any) => a + b[k], 0) / bs.length : NaN);
  const noEject = t - c.lastEjT > 3;
  const mapNow = bs.length ? avg('map') : (c.s[0] as number);
  const ce = hs.out.length ? null : null;
  void ce;
  const lb = c.beats[c.beats.length - 1];
  const fx = st.pk.fx ?? {};
  const spo2 = st.resp.num.spo2.shown;
  return {
    t, rhythm: st.rhythm.id, pulseless: PULSELESS.has(st.rhythm.id) || st.rhythm.opts?.pulseless === true, noEject,
    hr: last.hr, sbp: bs.length ? avg('sbp') : NaN, dbp: bs.length ? avg('dbp') : NaN, map: mapNow, cvp: hs.num.cvpAvg ?? hs.circOut.pRa, pawp: hs.circOut.pPv,
    co: noEject ? 0 : c.qFwd * 0.06, sv: bs.length ? avg('sv') : 0, svr: c.p.rSys, pmsf: ((c.s[4] as number) - c.p.v0Sv) / c.p.cSv,
    lvedv: lb?.lvedv ?? NaN, lvedp: lb?.lvedp ?? NaN, cpp: c.cor.cpp ?? (lb ? lb.aoDia - lb.lvedp : NaN), sd: c.cor.ratio, kIsch: c.cor.kIsch, kIschRv: c.cor.kIschRv ?? 1, cause: c.arrest?.cause ?? '', ppeRi: hs.circOut.pPeri, dSbp: bs.length > 2 ? Math.max(...bs.map((b: any) => b.sbp)) - Math.min(...bs.map((b: any) => b.sbp)) : NaN,
    spo2, sao2: st.resp.o2.sa * 100, pao2: st.resp.o2.pao2, etco2: st.resp.etco2, paco2: st.resp.co2.pf, ph: st.blood.core.ab.ph,
    lact: st.blood.out.lactate, k: st.blood.out.k, iCa: st.blood.out.iCa, hb: st.blood.out.hb, temp: st.resp.temp.tc,
    cbf: st.organs.brain.cbfRel, icp: st.organs.brain.icp, uop: st.organs.renal.uopMlMin * 60, epi: st.endo.core.out.epiPgMl, ne: st.endo.core.out.nePgMl,
    baroEs: c.baro.es, baroSet: c.baro.set, kLv: c.kLv, propCe: st.pk.bus.cns.propCe ?? 0, mac: st.pk.bus.cns.macBrain ?? 0,
    drugSvr: fx.svr ?? 1, drugEes: fx.ees ?? 1, drugV0: fx.v0Frac ?? 0, drugGv: fx.gv ?? 1, manEes: c.man.eesF, manR: c.man.rSys ?? c.base.rSys,
    rr: st.resp.driver.source, ve: st.resp.vaLpm,
  } as unknown as Row;
}

export async function run(sc: Scenario, quiet = false): Promise<{ rows: Row[]; log: string[] }> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, ...(sc.patient ?? {}), sensors: SENSORS };
  const e: any = createEngine({ seed: 7, mode: sc.mode, patient: patient as never });
  const last = { hr: NaN };
  e.on((x: any) => { if (x.type === 'measurement' && x.values.hr?.value != null) last.hr = x.values.hr.value; }, ['measurement']);
  const log: string[] = [];
  let n = 0;
  const pending = [...sc.steps].sort((a, b) => a[0] - b[0]);
  const rows: Row[] = [];
  const DT = 5;
  for (let t = DT; t <= sc.tEnd + 1e-9; t += DT) {
    while (pending.length && (pending[0] as Step)[0] < t) {
      const [ts, body, label] = pending.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      if (typeof body === 'function') { body(e); log.push(`${ts}s poke ${label ?? ''}`); continue; }
      const r = e.dispatch({ id: `a${++n}`, issuedBy: 'audit', ...body });
      const d = JSON.stringify((body as any).event ?? body);
      log.push(`${ts}s ${label ?? ''} ${d} ${r.accepted ? 'OK' : 'REJECTED: ' + r.reason}`);
      if (!r.accepted && !quiet) console.log(`!! ${sc.name}: rejected ${d}: ${r.reason}`);
    }
    e.advanceTo(t);
    rows.push(sample(e, t, last));
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return { rows, log };
}

const COLS: [keyof Row, string, number][] = [
  ['t', 't(s)', 0], ['rhythm', 'rhythm', 0], ['hr', 'HR', 0], ['sbp', 'SBP', 0], ['dbp', 'DBP', 0], ['map', 'MAP', 0], ['cvp', 'CVP', 1], ['pawp', 'PAWP', 1],
  ['co', 'CO', 2], ['sv', 'SV', 0], ['svr', 'Rsys', 3], ['pmsf', 'Pmsf', 1], ['lvedv', 'EDV', 0], ['cpp', 'CPP', 0], ['kIsch', 'kIsc', 2], ['dSbp', 'dSBP', 0],
  ['spo2', 'SpO2', 0], ['etco2', 'EtCO2', 0], ['paco2', 'PaCO2', 0], ['ph', 'pH', 2], ['lact', 'Lac', 1], ['k', 'K', 1], ['temp', 'T', 1], ['cbf', 'CBF', 2], ['uop', 'UOP', 0],
  ['ne', 'NE', 0], ['baroEs', 'es', 0], ['kLv', 'kLv', 2], ['propCe', 'Cprop', 1], ['mac', 'MAC', 2],
];
export function table(sc: Scenario, rows: Row[], every = sc.printEvery ?? 60): string {
  const fmt = (v: unknown, d: number) => (typeof v === 'number' ? (Number.isFinite(v) ? v.toFixed(d) : '–') : String(v).slice(0, 8));
  const lines = [COLS.map(([, h]) => h).join('\t')];
  const marks = new Set(sc.steps.map((s) => s[0]));
  for (const r of rows) {
    const nearMark = [...marks].some((m) => r.t > m && r.t <= m + 5) || [...marks].some((m) => r.t <= m && r.t > m - 5);
    if (r.t % every === 0 || nearMark) lines.push(COLS.map(([k, , d]) => fmt(r[k], d)).join('\t') + (r.noEject ? '\tNO-EJECT' : '') + (r.pulseless ? '\tPULSELESS' : ''));
  }
  return lines.join('\n');
}
export function extremes(rows: Row[], t0 = 0, t1 = Infinity) {
  const w = rows.filter((r) => r.t > t0 && r.t <= t1);
  const mn = (k: keyof Row) => Math.min(...w.map((r) => r[k] as number).filter(Number.isFinite));
  const mx = (k: keyof Row) => Math.max(...w.map((r) => r[k] as number).filter(Number.isFinite));
  return {
    mapMin: r1(mn('map')), sbpMin: r1(mn('sbp')), hrMax: r1(mx('hr')), hrMin: r1(mn('hr')), coMin: r1(mn('co') * 100) / 100, cppMin: r1(mn('cpp')),
    kIschMin: Math.round(mn('kIsch') * 100) / 100, spo2Min: r1(mn('spo2')), lactMax: r1(mx('lact')), phMin: Math.round(mn('ph') * 100) / 100,
    anyNoEject: w.some((r) => r.noEject), anyPulseless: w.some((r) => r.pulseless), rhythms: [...new Set(w.map((r) => r.rhythm))].join(','),
  };
}
/** Mean of a field over (t0, t1]. */
export function at(rows: Row[], k: keyof Row, t0: number, t1: number): number {
  const w = rows.filter((r) => r.t > t0 && r.t <= t1).map((r) => r[k] as number).filter(Number.isFinite);
  return w.length ? r1(w.reduce((a, b) => a + b, 0) / w.length) : NaN;
}
export function save(sc: Scenario, rows: Row[], log: string[]): void {
  mkdirSync(join(OUT, 'results'), { recursive: true });
  writeFileSync(join(OUT, 'results', `${sc.name}.json`), JSON.stringify({ scenario: { ...sc, steps: sc.steps.map((s) => [s[0], typeof s[1] === 'function' ? `poke:${s[2]}` : s[1], s[2]]) }, log, rows }, null, 0));
}
