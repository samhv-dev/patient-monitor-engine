// Respiratory integration audit (research/09-respiratory-integration-audit.md) — ONE scenario runner.
// FU-6 Task 1 DEVIATION: the research scripts this file was to be copied from (research/09-audit-scripts/, outside the
// repository) were not available to the executor; this runner is a reconstruction on the pattern of
// scripts/audit-physiology/runner.ts with the columns the FU-6 plan names (Ppk, pleural minimum, SBP swing, gaLvl,
// effort, loc, FRC). It asserts nothing. Creates an engine (seed 7), dispatches a scripted timeline, samples every 5 s
// (truth read from the engine's committed pipeline state, read-only), prints a table and writes <RESULTS>/<name>.json.
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
  name: string; title: string; mode?: 'modeled' | 'manual'; patient?: Record<string, unknown>; seed?: number;
  steps: Step[]; tEnd: number; printEvery?: number; fine?: boolean;
}
export const DT = 5;

export interface Row {
  t: number; src: string; airway: string; rr: number; vt: number; ve: number; va: number; ppk: number; pplat: number; peepi: number;
  sao2: number; spo2: number; pao2: number; paco2: number; etco2: number; hr: number; map: number; co: number; hb: number; cohb: number;
  cao2: number; lact: number; shunt: number; obs: number; tofr: number; propCe: number; mac: number; remiCe: number;
  pplMin: number; gaLvl: number; effort: number; loc: number; frcNow: number; dSbp: number; ga: string; fatigue: number;
  bd: number; pvr: number; mpap: number; evlwi: number; rhythm: string;
}

const r1 = (x: number) => Math.round(x * 10) / 10;
function sample(e: any, t: number, meas: Record<string, any>, lungEv: any, win: { pk: number; pkAlv: number; ppl: number; sbpMax: number; sbpMin: number }): Row {
  const st = e.st;
  const rs = st.resp;
  const nr = st.neuro?.resp ?? {};
  const c = st.hemo.circ;
  const bs = c.beats.filter((b: any) => b.t > t - 6);
  const avg = (k: string) => (bs.length ? bs.reduce((a: number, b: any) => a + b[k], 0) / bs.length : NaN);
  const spont = rs.driver.source === 'spontaneous';
  const fatigue = rs.spont?.fatigue ?? NaN;
  const cyc = rs.driver.cycles.filter((x: any) => x.t0 > t - 30 && x.t0 <= t);
  const span = cyc.length >= 2 ? (cyc[cyc.length - 1].t0 - cyc[0].t0) : 0;
  const rrNow = spont && rs.spont ? rs.spont.rr : span > 0 ? (60 * (cyc.length - 1)) / span : cyc.length ? (rs.driver.vent?.rr ?? NaN) : 0;
  return {
    t, src: rs.driver.source, airway: rs.driver.airway, rr: rrNow,
    vt: cyc.length ? cyc.reduce((a: number, x: any) => a + x.vt, 0) / cyc.length : 0,
    ve: rs.spont && spont ? rs.spont.ve : NaN, va: rs.vaLpm ?? NaN,
    ppk: win.pk, pplat: rs.lung?.pInsp ?? NaN, peepi: (rs.lung?.peepTot ?? NaN) - (rs.driver.vent?.peep ?? 0),
    sao2: rs.o2.sa * 100, spo2: rs.num.spo2.shown, pao2: rs.o2.pao2, paco2: rs.co2.pf, etco2: rs.etco2,
    hr: meas.hr ?? NaN, map: bs.length ? avg('map') : (c.s[0] as number), co: c.qFwd * 0.06,
    hb: st.blood.out?.hb ?? NaN, cohb: (st.blood.core?.odc?.cohb ?? NaN) * 100, cao2: st.blood.core?.o2?.cao2 ?? NaN, lact: st.blood.out?.lactate ?? NaN,
    shunt: lungEv?.shunt ?? rs.shunt, obs: nr.obstruction ?? NaN, tofr: st.neuro?.nmb?.tofr ?? NaN,
    propCe: st.pk.bus.cns?.propCe ?? 0, mac: st.pk.bus.cns?.macBrain ?? 0, remiCe: st.pk.bus.cns?.opioidVent ?? NaN,
    pplMin: win.ppl, gaLvl: rs.gaLvl ?? NaN, effort: rs.spont?.effort ?? NaN, loc: nr.loc ?? NaN, frcNow: rs.lung?.frcGaMl ?? NaN,
    dSbp: Number.isFinite(win.sbpMax) ? win.sbpMax - win.sbpMin : NaN, // FU-6: pleural minimum (mmHg) and SBP swing of `fine` runs
    ga: rs.temp.anaesthesia, fatigue, bd: rs.bd ?? 0, pvr: c.p?.rPul ?? NaN, mpap: st.hemo.circOut?.pPa ?? NaN, evlwi: st.blood.out?.evlwi ?? NaN,
    rhythm: st.rhythm.id,
  };
}

export async function run(sc: Scenario): Promise<{ rows: Row[]; log: string[]; alarms: string[] }> {
  const patient = { ageY: 40, sex: 'M', weightKg: 70, heightCm: 175, ...(sc.patient ?? {}), sensors: { spo2: 'on', co2: 'on', abp: 'connected' } };
  const e: any = createEngine({ seed: sc.seed ?? 7, mode: sc.mode ?? 'modeled', patient });
  const meas: Record<string, any> = {};
  let lungEv: any = null;
  const alarms: string[] = [];
  e.on((x: any) => {
    if (x.type === 'measurement') for (const [k, v] of Object.entries(x.values ?? {})) meas[k] = (v as any)?.value ?? v;
    else if (x.type === 'lungState') lungEv = x;
    else if (x.type === 'alarm' && x.state === 'active') alarms.push(`${Math.round(x.t)}s:${x.id ?? x.text ?? ''}`);
  });
  const log: string[] = [];
  let n = 0;
  const pending = [...sc.steps].sort((a, b) => a[0] - b[0]);
  const rows: Row[] = [];
  const win = { pk: 0, pkAlv: 0, ppl: 0, sbpMax: NaN, sbpMin: NaN };
  for (let t = DT; t <= sc.tEnd + 1e-9; t += DT) {
    while (pending.length && (pending[0] as Step)[0] < t) {
      const [ts, body, label] = pending.shift() as Step;
      e.advanceTo(Math.max(e.now().simT, ts));
      if (typeof body === 'function') { body(e); log.push(`${ts}s poke ${label ?? ''}`); continue; }
      const r = e.dispatch({ id: `a${++n}`, issuedBy: 'audit', ...body });
      log.push(`${ts}s ${label ?? ''} ${JSON.stringify((body as any).event ?? body)} ${r.accepted ? 'OK' : 'REJECTED: ' + r.reason}`);
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
    if (!sc.fine) win.pk = e.st.resp.lung?.mech?.paw ?? NaN;
    rows.push(sample(e, t, meas, lungEv, win));
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
  return { rows, log, alarms };
}

const COLS: [keyof Row, string, number][] = [
  ['t', 't(s)', 0], ['src', 'src', 0], ['airway', 'airway', 0], ['rr', 'RR', 1], ['vt', 'VT', 0], ['ve', 'VE', 2], ['va', 'VA', 2], ['ppk', 'Ppk', 1],
  ['pplat', 'Pplat', 1], ['peepi', 'PEEPi', 1], ['sao2', 'SaO2', 1], ['spo2', 'SpO2', 0], ['pao2', 'PaO2', 0], ['paco2', 'PaCO2', 1], ['etco2', 'EtCO2', 1],
  ['hr', 'HR', 0], ['map', 'MAP', 0], ['co', 'CO', 2], ['shunt', 'Qs/Qt', 3], ['obs', 'obs', 2], ['loc', 'loc', 2], ['effort', 'eff', 2],
  ['gaLvl', 'gaLvl', 2], ['frcNow', 'FRC', 0], ['pplMin', 'PplMin', 1], ['dSbp', 'dSBP', 1], ['bd', 'B', 2], ['mac', 'MAC', 2], ['propCe', 'Cprop', 2],
  ['hb', 'Hb', 1], ['cohb', 'COHb', 1], ['lact', 'Lac', 1], ['mpap', 'mPAP', 1],
];
export function table(sc: Scenario, rows: Row[], every = sc.printEvery ?? 60): string {
  const fmt = (v: unknown, d: number) => (typeof v === 'number' ? (Number.isFinite(v) ? v.toFixed(d) : '–') : String(v).slice(0, 8));
  const out = [COLS.map(([, h]) => h).join('\t')];
  for (const r of rows) if (r.t % every === 0) out.push(COLS.map(([k, , d]) => fmt(r[k], d)).join('\t'));
  return out.join('\n');
}
/** Mean of a field over (t0, t1]. */
export function at(rows: Row[], k: keyof Row, t0: number, t1: number): number {
  const w = rows.filter((r) => r.t > t0 && r.t <= t1).map((r) => r[k] as number).filter(Number.isFinite);
  return w.length ? r1(w.reduce((a, b) => a + b, 0) / w.length) : NaN;
}
export function save(sc: Scenario, rows: Row[], log: string[], alarms: string[]): void {
  mkdirSync(RESULTS, { recursive: true });
  const scOut = { ...sc, steps: sc.steps.map((s) => [s[0], typeof s[1] === 'function' ? `poke:${s[2]}` : s[1], s[2]]) };
  writeFileSync(join(RESULTS, `${sc.name}.json`), JSON.stringify({ scenario: scOut, log, alarms, rows }, null, 0));
}
