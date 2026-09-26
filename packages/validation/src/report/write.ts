// report.md + report.json + calibration-queue.md (brief §9; R40 grades; R44: the calibration queue lists every row
// that fell outside its band, for Ali's calibration pass). Pure functions of the Report; the CLI writes the files.
import type { Grade } from '../segments/types.ts';
import type { QueueItem, Report } from './types.ts';

const f = (x: number | null | undefined, d = 1): string => (x === null || x === undefined || !Number.isFinite(x) ? '—' : Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(d));
const dot: Record<Grade, string> = { green: '🟢', yellow: '🟡', red: '🔴' };
const count = (gs: Grade[]) => ({ green: gs.filter((g) => g === 'green').length, yellow: gs.filter((g) => g === 'yellow').length, red: gs.filter((g) => g === 'red').length });

export function calibrationQueue(r: Report): QueueItem[] {
  const q: QueueItem[] = [];
  for (const m of r.morphology) if (m.grade !== 'green') q.push({ suite: 'morphology', id: `${m.band} · ${m.group}`, measured: `engine ${f(m.engine.median)} vs recorded ${f(m.recorded?.median)}`, expected: m.expected, grade: m.grade, source: m.source });
  for (const t of r.segments.results) if (t.grade !== 'green') q.push({ suite: 'segments', id: `${t.doc}/${t.segment}/${t.target}`, measured: f(t.measured), expected: t.expected, grade: t.grade, source: t.source });
  for (const w of r.regression) if (w.grade !== 'green') q.push({ suite: 'regression', id: `${w.case}/${w.channel}`, measured: `${w.failed}/${w.n} samples > 2 %`, expected: 'all samples within 2 %', grade: w.grade, source: 'R40 (audit N-P02)' });
  for (const o of r.oracle.rows) if (o.grade !== 'green') q.push({ suite: 'oracle', id: `${o.scenario}/${o.id}`, measured: `ours ${f(o.ours, 2)} · Pulse ${f(o.pulse, 2)}`, expected: o.expected, grade: o.grade, source: o.note });
  return q.sort((a, b) => (a.grade === b.grade ? a.suite.localeCompare(b.suite) : a.grade === 'red' ? -1 : 1));
}

export function gatingFailures(r: Report): string[] {
  const out: string[] = [];
  for (const q of calibrationQueue(r)) if (q.grade === 'red') out.push(`${q.suite} ${q.id}`);
  if (r.determinism && r.determinism.nonDeterministic.length) out.push(`determinism: ${r.determinism.nonDeterministic.join(', ')}`);
  return out;
}

export function renderMarkdown(r: Report): string {
  const q = calibrationQueue(r);
  const all = [...r.morphology.map((m) => m.grade), ...r.segments.results.map((t) => t.grade), ...r.regression.map((w) => w.grade), ...r.oracle.rows.map((o) => o.grade)];
  const c = count(all);
  const nm = r.segments.docs.filter((d) => !d.measurable);
  const L: string[] = [];
  L.push('# Validation report', '');
  L.push(`Generated ${r.createdAt} by \`pnpm validate\` on commit \`${r.commit}\` (engine ${r.engineVersion}); ${f(r.wallS, 0)} s wall. Suites: ${r.options.suites.join(', ')}; seeds ${r.options.seeds.join(', ')}.`, '');
  L.push(`**Summary:** ${dot.green} ${c.green} · ${dot.yellow} ${c.yellow} · ${dot.red} ${c.red} graded rows; ${nm.length} documents not measurable on this build; calibration queue ${q.length} rows. Gating failures: ${gatingFailures(r).length || 'none'}.`, '');
  L.push('Grades (R40): 🟢 inside the evidence band (or within 10 % of a point target); 🟡 misses by < 30 %; 🔴 misses by ≥ 30 % or not measured. Red gates the run; yellow is reported and queued for calibration (R44).', '');
  L.push('## Datasets and attribution', '', '| Dataset | Licence | Windows | Attribution |', '|---|---|---|---|');
  for (const d of r.datasets) L.push(`| ${d.title} | ${d.licence} | ${d.windows} | ${d.attribution} |`);
  L.push('', 'Raw records stay in the git-ignored cache; this report holds derived statistics only (brief §8).', '');
  L.push('## Morphology: recorded vs engine (brief §9 V1–V5)', '', 'Same metric code on both sides; engine runs matched to each recorded window (HR, BP, site, ventilator, EtCO2).', '');
  L.push('| | Band | Group | Recorded median [IQR] (n) | Engine median [IQR] (n) | KS D | W1 | Expected | Source |', '|---|---|---|---|---|---|---|---|---|');
  for (const m of r.morphology) L.push(`| ${dot[m.grade]} | ${m.band} | ${m.group} | ${m.recorded ? `${f(m.recorded.median)} [${f(m.recorded.p25)}–${f(m.recorded.p75)}] (${m.recorded.n})` : '—'} | ${f(m.engine.median)} [${f(m.engine.p25)}–${f(m.engine.p75)}] (${m.engine.n}) | ${f(m.ks, 2)} | ${f(m.w1)} | ${m.expected} | ${m.source} |`);
  if (r.intervals) L.push('', `V5 interval bands come from ${r.intervals.ptbxl} PTB-XL NORM records measured with the engine's method; ${r.intervals.engine} engine captures.`);
  L.push('', '## Segment validation: sanity checks and gate numbers', '', '| | Document / segment / target | Measured | Expected | Source |', '|---|---|---|---|---|');
  for (const t of r.segments.results) L.push(`| ${dot[t.grade]} | ${t.doc} / ${t.segment} / ${t.target} | ${f(t.measured)} | ${t.expected} | ${t.source} |`);
  if (nm.length) {
    L.push('', '### Not measurable on this build (decision 8)', '', '| Document | Needs | Refused command |', '|---|---|---|');
    for (const d of nm) L.push(`| ${d.id} — ${d.title} | ${d.requires.join(', ') || '—'} | ${d.unsupported[0]?.type ?? ''}: ${d.unsupported[0]?.reason ?? ''} |`);
  }
  L.push('', '## Waveform regression (2 % per sample)', '', '| | Case / channel | Samples outside | Max rel. error | RMS |', '|---|---|---|---|---|');
  for (const w of r.regression) L.push(`| ${dot[w.grade]} | ${w.case} / ${w.channel} | ${w.failed}/${w.n} | ${f(100 * w.maxRelErr, 2)} % | ${w.rms.toExponential(2)} |`);
  if (!r.regression.length) L.push('| — | baselines written this run | | | |');
  if (r.determinism) L.push('', `## Determinism (V9)`, '', `${r.determinism.runs} runs; non-deterministic: ${r.determinism.nonDeterministic.join(', ') || 'none'}; changed vs the committed golden file (informational): ${r.determinism.goldenChanged.length}.`);
  L.push('', '## Pulse oracle (R34; annex §C/§D)', '', `Build: ${r.oracle.buildHash ? `\`${r.oracle.buildHash.slice(0, 16)}…\`` : 'not run (set PME_PULSE_DIR)'}.`, '', '| | Scenario / check | Ours | Pulse | Expected | Note |', '|---|---|---|---|---|---|');
  for (const o of r.oracle.rows) L.push(`| ${dot[o.grade]} | ${o.scenario} / ${o.id} | ${f(o.ours, 2)} | ${f(o.pulse, 2)} | ${o.expected} | ${o.note} |`);
  L.push('', `Backlog: ${r.oracle.backlog.join('; ')}.`);
  L.push('', '## Calibration queue (R44)', '', `${q.length} rows outside their band — the input to Ali's calibration pass. Also written to \`calibration-queue.md\`.`, '');
  L.push(...renderQueue(q));
  return `${L.join('\n')}\n`;
}

export function renderQueue(q: QueueItem[]): string[] {
  const L = ['| | Suite | Row | Measured | Expected | Source | Ali: decision |', '|---|---|---|---|---|---|---|'];
  for (const x of q) L.push(`| ${dot[x.grade]} | ${x.suite} | ${x.id} | ${x.measured} | ${x.expected} | ${x.source} | |`);
  return L;
}
