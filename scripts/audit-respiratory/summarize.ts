// Compact digest of every saved scenario (reads $RESULTS/*.json from cli.ts): per step window, each key field's value
// before the step (mean of the previous 60 s), its extreme inside the window and the window's last-60-s mean; plus
// apnoea timings where the scenario stops ventilation. Run: RESULTS=… node summarize.ts > out/summary.txt
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const DIR = process.env.RESULTS ?? 'results';
const FIELDS: Array<[string, number, 'min' | 'max']> = [
  ['hr', 0, 'max'], ['map', 0, 'min'], ['co', 1, 'min'], ['spo2', 0, 'min'], ['sao2', 0, 'min'], ['pao2', 0, 'min'], ['paco2', 1, 'max'],
  ['etD', 0, 'max'], ['ph', 2, 'min'], ['rr', 1, 'max'], ['vt', 0, 'min'], ['va', 2, 'min'], ['pPk', 1, 'max'], ['autoPeep', 1, 'max'], ['shunt', 2, 'max'],
];
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f = (x: number, d: number) => (Number.isFinite(x) ? x.toFixed(d) : '–');
for (const file of readdirSync(DIR).filter((x) => x.endsWith('.json')).sort()) {
  const j = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  const rows: any[] = j.rows;
  const sc = j.scenario;
  console.log(`\n### ${sc.name} — ${sc.title} (${sc.mode ?? 'modeled'})`);
  const marks = [...new Set<number>(sc.steps.map((s: any[]) => s[0] as number).filter((t: number) => t > 1))].sort((a, b) => a - b);
  const bounds = [0, ...marks, rows[rows.length - 1].t + 1];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const t0 = bounds[i] as number, t1 = bounds[i + 1] as number;
    const labels = sc.steps.filter((s: any[]) => s[0] === t0).map((s: any[]) => s[2] ?? (typeof s[1] === 'string' ? s[1] : s[1]?.event?.kind ?? s[1]?.type)).join(' + ');
    const win = rows.filter((r) => r.t > t0 && r.t < t1);
    if (!win.length) continue;
    const pre = rows.filter((r) => r.t > t0 - 60 && r.t <= t0);
    const end = win.filter((r) => r.t > (win[win.length - 1].t as number) - 60);
    const parts = FIELDS.map(([k, d, ext]) => {
      const col = (rs: any[]) => rs.map((r) => r[k]).filter((x) => typeof x === 'number' && Number.isFinite(x)) as number[];
      const w = col(win);
      if (!w.length) return '';
      const x = ext === 'min' ? Math.min(...w) : Math.max(...w);
      return `${k} ${f(mean(col(pre)), d)}→${ext === 'min' ? '↓' : '↑'}${f(x, d)}→${f(mean(col(end)), d)}`;
    }).filter(Boolean);
    const flags = [win.some((r) => r.pulseless) ? 'PULSELESS' : '', win.some((r) => r.noEject) ? 'NO-EJECT' : ''].filter(Boolean).join(' ');
    console.log(`  [${t0}–${Math.round(t1)} s] ${t0 ? labels : 'baseline'}${flags ? ' ' + flags : ''}\n    ${parts.join('; ')}`);
  }
  const ap = sc.steps.find((s: any[]) => s[1]?.event?.kind === 'ventilation' && s[1].event.source === 'none');
  if (ap) {
    const t0 = ap[0] as number;
    const first = (p: (r: any) => boolean) => { const r = rows.find((x) => x.t > t0 && p(x)); return r ? `${((r.t - t0) / 60).toFixed(2)} min` : 'never'; };
    const pa = (t: number) => rows.find((r) => r.t >= t)?.paco2 as number;
    const t90 = rows.find((r) => r.t > t0 && r.sao2 < 90)?.t ?? rows[rows.length - 1].t;
    console.log(`  APNOEA from ${t0} s: SaO2<90 ${first((r) => r.sao2 < 90)}, displayed SpO2<90 ${first((r) => r.spo2 !== null && r.spo2 < 90)}, SaO2<60 ${first((r) => r.sao2 < 60)}, HR<60 ${first((r) => r.hr < 60)}, pulseless ${first((r) => r.pulseless)}; PaCO2 ${f(pa(t0), 1)} → +${f(pa(t0 + 60) - pa(t0), 1)} in min 1, then ${f((pa(t90) - pa(t0 + 60)) / Math.max(0.1, (t90 - t0 - 60) / 60), 2)} mmHg/min to SaO2 90`);
  }
}
