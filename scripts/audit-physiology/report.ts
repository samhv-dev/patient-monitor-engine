// Physiology integration audit — reports over <out>/results/*.json (FU-4 Task 1): the per-step summary, the propofol
// state-dependence matrix (audit §K: each propofol run minus its no-drug control at the same sim time) and the arrest
// table (time, onset rhythm and cause of every emergent arrest, the first MAP < 30 and the lowest HR in the minute
// before). Run alone: `node --experimental-strip-types scripts/audit-physiology/report.ts [summary|matrix|arrests] [prefix…]`.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT } from './runner.ts';

type Row = Record<string, number | string | boolean>;
interface Result { scenario: { name: string; title: string; mode: string; tEnd: number; steps: [number, unknown, string?][] }; rows: Row[] }
const RES = join(OUT, 'results');
const load = (n: string): Result => JSON.parse(readFileSync(join(RES, `${n}.json`), 'utf8')) as Result;
const names = (sel: readonly string[]) => (existsSync(RES) ? readdirSync(RES) : []).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).filter((n) => !sel.length || sel.some((p) => n.startsWith(p))).sort();
const f = (x: unknown, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x.toFixed(d) : '–');
const n = (r: Row, k: string) => r[k] as number;
const mean = (rows: Row[], k: string) => {
  const v = rows.map((r) => n(r, k)).filter(Number.isFinite);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
};

/** Per scripted step: the 30 s mean before it, the MAP nadir before the next step, the window's end. */
export function summary(sel: readonly string[] = []): string {
  const out: string[] = [];
  const pick = (r: Row) => `HR ${f(r.hr)} ${f(r.sbp)}/${f(r.dbp)} (${f(r.map)}) CVP ${f(r.cvp, 1)} CO ${f(r.co, 2)} SV ${f(r.sv)} CPP ${f(r.cpp)} kI ${f(r.kIsch, 2)}/${f(r.kIschRv, 2)} SpO2 ${f(r.spo2)} EtCO2 ${f(r.etco2)} PaCO2 ${f(r.paco2)} pH ${f(r.ph, 2)} Lac ${f(r.lact, 1)} K ${f(r.k, 1)} T ${f(r.temp, 1)} CBF ${f(r.cbf, 2)} es ${f(r.baroEs)} set ${f(r.baroSet)} ${String(r.rhythm)}${r.noEject ? ' NO-EJECT' : ''}${r.pulseless ? ' PULSELESS' : ''}`;
  for (const name of names(sel)) {
    const d = load(name);
    const steps = d.scenario.steps.filter((s) => s[0] > 1);
    const times = [...new Set(steps.map((s) => s[0]))].sort((a, b) => a - b);
    out.push(`\n## ${name} — ${d.scenario.title} [${d.scenario.mode}]`);
    times.forEach((t, i) => {
      const t1 = times[i + 1] ?? d.scenario.tEnd;
      const win = d.rows.filter((r) => n(r, 't') > t && n(r, 't') <= t1);
      if (!win.length) return;
      const pre = d.rows.filter((r) => n(r, 't') > t - 30 && n(r, 't') <= t);
      const nad = win.reduce((a, b) => ((Number.isFinite(n(b, 'map')) ? n(b, 'map') : 1e9) < (Number.isFinite(n(a, 'map')) ? n(a, 'map') : 1e9) ? b : a));
      out.push(`  @${t}s ${steps.filter((s) => s[0] === t).map((s) => s[2] ?? '').join(' + ')}`);
      if (pre.length) out.push(`    pre   MAP ${f(mean(pre, 'map'))} HR ${f(mean(pre, 'hr'))} CO ${f(mean(pre, 'co'), 2)}`);
      out.push(`    nadir t=${f(nad.t)} ${pick(nad)}`);
      out.push(`    end   t=${t1} ${pick(win[win.length - 1] as Row)}`);
    });
  }
  return out.join('\n');
}

/** Audit §K: propofol 2 mg/kg minus its no-drug control (or the pre-dose mean) over the 10 min after the dose. */
export const PAIRS: [string, string, string | null, number][] = [
  ['healthy 40 y', 'A1-propofol2', 'A0-control', 300],
  ['80 y hypertensive', 'J3-80htn-prop2', 'J4-80htn-ctl', 300],
  ['AS + CAD + HTN 75 y', 'K-ascad-prop2', 'K-ascad-ctl', 300],
  ['HFrEF 60 y', 'K-hfref-prop2', 'K-hfref-ctl', 300],
  ['tamponade 1 (250 mL)', 'B2-tamp-prop2', 'B0-tamp', 660],
  ['hypovolaemia (−1.5 L)', 'C1-bleed-prop2', 'C0-bleed1500-ctl', 960],
  ['massive PE (φ 0.8)', 'K-pe-prop2', 'D0-pe', 660],
  ['tension PTX (7b, R)', 'K-ptx-prop2', 'K-ptx-ctl', 660],
  ['septic shock warm', 'F1-sepsis-prop2', 'F0-sepsis', 1260],
  ['MANUAL healthy (vs pre-dose)', 'L-A1-prop2', null, 300],
  ['MANUAL hypovolaemia', 'L-C1-bleed-prop2', 'L-C0-bleed', 960],
];
export function matrix(): string {
  const out = ['| state | pre MAP | pre HR | pre CO | ΔMAP nadir | ΔMAP % | at t+ | ΔHR | ΔCO | min MAP | arrest |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const [label, run, ctl, t0] of PAIRS) {
    if (!existsSync(join(RES, `${run}.json`)) || (ctl && !existsSync(join(RES, `${ctl}.json`)))) continue;
    const a = load(run).rows;
    const c = ctl ? load(ctl).rows : null;
    const pre = a.filter((r) => n(r, 't') > t0 - 30 && n(r, 't') <= t0);
    const base = { map: mean(pre, 'map'), hr: mean(pre, 'hr'), co: mean(pre, 'co') };
    let best = { d: Infinity, t: 0, dhr: 0, dco: 0, map: 0, ref: 1 };
    for (const r of a.filter((x) => n(x, 't') > t0 && n(x, 't') <= t0 + 600)) {
      const w = a.filter((x) => Math.abs(n(x, 't') - n(r, 't')) <= 10); // ±10 s against the ventilator/beat jitter
      const wc = c ? c.filter((x) => Math.abs(n(x, 't') - n(r, 't')) <= 10) : null;
      const ref = { map: wc ? mean(wc, 'map') : base.map, hr: wc ? mean(wc, 'hr') : base.hr, co: wc ? mean(wc, 'co') : base.co };
      const d = mean(w, 'map') - ref.map;
      if (d < best.d) best = { d, t: n(r, 't') - t0, dhr: mean(w, 'hr') - ref.hr, dco: mean(w, 'co') - ref.co, map: mean(w, 'map'), ref: ref.map };
    }
    const arrest = a.find((r) => n(r, 't') > t0 && r.pulseless === true);
    out.push(`| ${label} | ${f(base.map)} | ${f(base.hr)} | ${f(base.co, 2)} | ${f(best.d, 1)} | ${f((100 * best.d) / best.ref)} % | ${best.t} s | ${f(best.dhr)} | ${f(best.dco, 2)} | ${f(best.map)} | ${arrest ? `t+${n(arrest, 't') - t0} s ${String(arrest.rhythm)}` : 'no'} |`);
  }
  return out.join('\n');
}

/** Every scenario: the first pulseless sample (rhythm, cause), the first MAP < 30, the lowest HR in the minute before. */
export function arrests(sel: readonly string[] = []): string {
  const out = ['| scenario | arrest at | rhythm | cause | first MAP < 30 | min HR, last min before | steps |', '|---|---|---|---|---|---|---|'];
  for (const name of names(sel)) {
    const d = load(name);
    const a = d.rows.find((r) => r.pulseless === true);
    const pre = a ? d.rows.filter((r) => n(r, 't') < n(a, 't')) : d.rows;
    const low = pre.find((r) => n(r, 'map') < 30);
    const hrs = pre.filter((r) => a && n(r, 't') >= n(a, 't') - 60).map((r) => n(r, 'hr')).filter(Number.isFinite);
    const steps = d.scenario.steps.filter((s) => s[0] > 1 && !String(s[2] ?? '').startsWith('core →')).map((s) => `${s[0]} s ${s[2] ?? ''}`).join('; ');
    out.push(`| ${name} | ${a ? `${f(a.t)} s` : '–'} | ${a ? String(a.rhythm) + (String(a.rhythm).startsWith('sinus') ? ' (PEA)' : '') : '–'} | ${a ? String(a.cause || '') : ''} | ${low ? `${f(low.t)} s` : '–'} | ${hrs.length ? f(Math.min(...hrs)) : '–'} | ${steps} |`);
  }
  return out.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [what = 'arrests', ...sel] = process.argv.slice(2);
  console.log(what === 'summary' ? summary(sel) : what === 'matrix' ? matrix() : arrests(sel));
}
