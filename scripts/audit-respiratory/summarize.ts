// Respiratory audit — per-step digest of every saved scenario (FU-6 Task 1; reconstruction, see runner.ts).
// For each step: the values just before it and 60 s / 180 s / 600 s after, plus the scenario's extremes.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const DIR = process.env.RESULTS as string;
const K = ['rr', 'vt', 'ppk', 'peepi', 'sao2', 'pao2', 'paco2', 'etco2', 'hr', 'map', 'co', 'shunt', 'loc', 'gaLvl', 'frcNow', 'pplMin', 'dSbp'] as const;
const f = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1)) : '–');
for (const file of readdirSync(DIR).filter((x) => x.endsWith('.json')).sort()) {
  const { scenario, rows } = JSON.parse(readFileSync(join(DIR, file), 'utf8')) as { scenario: any; rows: any[] };
  const near = (t: number) => rows.reduce((b, r) => (Math.abs(r.t - t) < Math.abs(b.t - t) ? r : b), rows[0]);
  console.log(`\n## ${scenario.name} — ${scenario.title}`);
  console.log(['step', 'at', ...K].join('\t'));
  const times = [...new Set<number>(scenario.steps.map((s: any) => s[0]).filter((t: number) => t > 5))];
  for (const ts of times) for (const [lab, dt] of [['pre', -5], ['+60', 60], ['+180', 180], ['+600', 600]] as const) {
    if (ts + dt > scenario.tEnd) continue;
    const r = near(ts + dt);
    console.log([`${ts}s`, lab, ...K.map((k) => f(r[k]))].join('\t'));
  }
  const sa = rows.map((r) => r.sao2).filter(Number.isFinite);
  const t90 = rows.find((r) => r.sao2 < 90)?.t;
  const pk = rows.map((r) => r.ppk).filter(Number.isFinite);
  console.log(`extremes: SaO2 min ${f(Math.min(...sa))} (first < 90 at ${t90 ?? '–'} s); Ppk max ${f(Math.max(...pk))}; PaCO2 max ${f(Math.max(...rows.map((r) => r.paco2)))}; RR max ${f(Math.max(...rows.map((r) => r.rr).filter(Number.isFinite)))}; apnoea rows (VT < 100 on spontaneous) ${rows.filter((r) => r.src === 'spontaneous' && r.vt < 100).length}`);
}
