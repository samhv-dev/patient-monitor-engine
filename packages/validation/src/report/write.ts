// report.md + report.json + calibration-queue.md (brief §9; the calibration queue lists every row
// that fell outside its band, for the calibration pass). Pure functions of the Report; the CLI writes the files.
import type { ExpectedMiss, Grade } from '../segments/types.ts';
import type { QueueItem, Report, Row, RowClass } from './types.ts';

const f = (x: number | null | undefined, d = 1): string => (x === null || x === undefined || !Number.isFinite(x) ? '—' : Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(d));
/** A segment value: two decimals below 10, so a ratio row (1.03 against < 1) does not print as 1.0. */
const fm = (x: number) => f(x, Math.abs(x) < 10 ? 2 : 1);
const dot: Record<RowClass, string> = { green: '🟢', yellow: '🟡', expected: '🟣', red: '🔴' };
const CLASSES: RowClass[] = ['red', 'expected', 'yellow', 'green'];

/** Brief 84: a marked row counts as an expected failure while it misses its band, and as red once it meets it. */
export const rowClass = (grade: Grade, x?: ExpectedMiss): RowClass => (x ? (grade === 'green' ? 'red' : 'expected') : grade);
const cls = (row: { grade: Grade; expectedMiss?: ExpectedMiss }) => rowClass(row.grade, row.expectedMiss);
const mark = (x?: ExpectedMiss) => (x ? { expectedMiss: x } : {});

/** Every graded row of every suite, in report order. */
export function allRows(r: Report): Row[] {
  const out: Row[] = [];
  for (const m of r.morphology) out.push({ suite: 'morphology', id: `${m.band} · ${m.group}`, measured: `engine ${f(m.engine.median)} vs recorded ${f(m.recorded?.median)}`, expected: m.expected, grade: m.grade, source: m.source, ...mark(m.expectedMiss) });
  for (const t of r.segments.results) out.push({ suite: 'segments', id: `${t.doc}/${t.segment}/${t.target}`, measured: fm(t.measured), expected: t.expected, grade: t.grade, source: t.source, ...mark(t.expectedMiss) });
  for (const w of r.regression) out.push({ suite: 'regression', id: `${w.case}/${w.channel}`, measured: `${w.failed}/${w.n} samples > 2 %`, expected: 'all samples within 2 %', grade: w.grade, source: 'R40 (audit N-P02)', ...mark(w.expectedMiss) });
  for (const o of r.oracle.rows) out.push({ suite: 'oracle', id: `${o.scenario}/${o.id}`, measured: `ours ${f(o.ours, 2)} · Pulse ${f(o.pulse, 2)}`, expected: o.expected, grade: o.grade, source: o.note });
  return out;
}

export function counts(r: Report): Record<RowClass, number> {
  const c: Record<RowClass, number> = { green: 0, yellow: 0, expected: 0, red: 0 };
  for (const row of allRows(r)) c[cls(row)]++;
  return c;
}

export function calibrationQueue(r: Report): QueueItem[] {
  const q = allRows(r).filter((x): x is QueueItem => x.grade !== 'green');
  const rank = (x: QueueItem) => CLASSES.indexOf(cls(x));
  return q.sort((a, b) => rank(a) - rank(b) || a.suite.localeCompare(b.suite));
}

/** What fails the run: a red row that is not an expected miss, an expected miss that now meets its band, non-determinism. */
export function gatingFailures(r: Report): string[] {
  const out: string[] = [];
  for (const x of allRows(r)) {
    if (cls(x) !== 'red') continue;
    out.push(x.expectedMiss ? `${x.suite} ${x.id}: expected failure "${x.expectedMiss.id}" now meets its band; take the mark off` : `${x.suite} ${x.id}`);
  }
  if (r.determinism && r.determinism.nonDeterministic.length) out.push(`determinism: ${r.determinism.nonDeterministic.join(', ')}`);
  return out;
}

export function renderMarkdown(r: Report): string {
  const q = calibrationQueue(r);
  const c = counts(r);
  const marked = allRows(r).filter((x) => x.expectedMiss);
  const nm = r.segments.docs.filter((d) => !d.measurable);
  const L: string[] = [];
  L.push('# Validation report', '');
  L.push(`Generated ${r.createdAt} by \`pnpm validate\` on commit \`${r.commit}\` (engine ${r.engineVersion}); ${f(r.wallS, 0)} s wall. Suites: ${r.options.suites.join(', ')}; seeds ${r.options.seeds.join(', ')}.`, '');
  L.push(`**Summary:** ${dot.green} ${c.green} · ${dot.yellow} ${c.yellow} · ${dot.expected} ${c.expected} expected · ${dot.red} ${c.red} graded rows; ${nm.length} documents not measurable on this build; calibration queue ${q.length} rows. Gating failures: ${gatingFailures(r).length || 'none'}.`, '');
  L.push('Grades (R40): 🟢 inside the evidence band (or within 10 % of a point target); 🟡 misses by < 30 %; 🔴 misses by ≥ 30 % or not measured. Red gates the run; yellow is reported and queued for calibration (R44).', '');
  L.push('🟣 expected failure (brief 84): a row outside its band that waits on a named mechanism, recorded with its id in docs/guides/known-deviations.md. Its band is never changed and it is never counted green. It does not gate while it misses; once it meets its band it turns 🔴 and gates until the mark is taken off.', '');
  L.push('## Datasets and attribution', '', '| Dataset | Licence | Windows | Attribution |', '|---|---|---|---|');
  for (const d of r.datasets) L.push(`| ${d.title} | ${d.licence} | ${d.windows}${d.unavailable ? ` (not fetched: ${d.unavailable})` : ''} | ${d.attribution} |`);
  L.push('', 'Raw records stay in the git-ignored cache; this report holds derived statistics only (brief §8).', '');
  L.push('## Morphology: recorded vs engine (brief §9 V1–V5)', '', 'Same metric code on both sides; engine runs matched to each recorded window (HR, BP, site, ventilator, EtCO2).', '');
  L.push('| | Band | Group | Recorded median [IQR] (n) | Engine median [IQR] (n) | KS D | W1 | Expected | Source |', '|---|---|---|---|---|---|---|---|---|');
  for (const m of r.morphology) L.push(`| ${dot[cls(m)]} | ${m.band} | ${m.group} | ${m.recorded ? `${f(m.recorded.median)} [${f(m.recorded.p25)}–${f(m.recorded.p75)}] (${m.recorded.n})` : '—'} | ${f(m.engine.median)} [${f(m.engine.p25)}–${f(m.engine.p75)}] (${m.engine.n}) | ${f(m.ks, 2)} | ${f(m.w1)} | ${m.expected} | ${m.source} |`);
  if (r.intervals) L.push('', `V5 interval bands come from ${r.intervals.ptbxl} PTB-XL NORM records measured with the engine's method; ${r.intervals.engine} engine captures.`);
  L.push('', '## Segment validation: sanity checks and gate numbers', '', '| | Document / segment / target | Measured | Expected | Source |', '|---|---|---|---|---|');
  for (const t of r.segments.results) L.push(`| ${dot[cls(t)]} | ${t.doc} / ${t.segment} / ${t.target} | ${fm(t.measured)} | ${t.expected} | ${t.source} |`);
  if (nm.length) {
    L.push('', '### Not measurable on this build (decision 8)', '', '| Document | Needs | Refused command |', '|---|---|---|');
    for (const d of nm) L.push(`| ${d.id} — ${d.title} | ${d.requires.join(', ') || '—'} | ${d.unsupported[0]?.type ?? ''}: ${d.unsupported[0]?.reason ?? ''} |`);
  }
  L.push('', '## Waveform regression (2 % per sample)', '', '| | Case / channel | Samples outside | Max rel. error | RMS |', '|---|---|---|---|---|');
  for (const w of r.regression) L.push(`| ${dot[cls(w)]} | ${w.case} / ${w.channel} | ${w.failed}/${w.n} | ${f(100 * w.maxRelErr, 2)} % | ${w.rms.toExponential(2)} |`);
  if (!r.regression.length) L.push('| — | baselines written this run | | | |');
  if (r.determinism) L.push('', `## Determinism (V9)`, '', `${r.determinism.runs} runs; non-deterministic: ${r.determinism.nonDeterministic.join(', ') || 'none'}; changed vs the committed golden file (informational): ${r.determinism.goldenChanged.length}.`);
  L.push('', '## Pulse oracle (R34; annex §C/§D)', '', `Build: ${r.oracle.buildHash ? `\`${r.oracle.buildHash.slice(0, 16)}…\`` : 'not run (set PME_PULSE_DIR)'}.`, '', '| | Scenario / check | Ours | Pulse | Expected | Note |', '|---|---|---|---|---|---|');
  for (const o of r.oracle.rows) L.push(`| ${dot[o.grade]} | ${o.scenario} / ${o.id} | ${f(o.ours, 2)} | ${f(o.pulse, 2)} | ${o.expected} | ${o.note} |`);
  L.push('', `Backlog: ${r.oracle.backlog.join('; ')}.`);
  L.push('', '## Expected failures (brief 84)', '', `${marked.length} rows carry an expected-failure mark. Each waits on the mechanism named; its band is unchanged.`, '');
  L.push('| | Suite | Row | Measured now | Expected | Id (known deviations) | Mechanism | Marked | Measured when marked |', '|---|---|---|---|---|---|---|---|---|');
  for (const x of marked) {
    const m = x.expectedMiss as ExpectedMiss;
    L.push(`| ${dot[cls(x)]} | ${x.suite} | ${x.id} | ${x.measured} | ${x.expected} | ${m.id} | ${m.mechanism} | ${m.since} | ${m.measured} |`);
  }
  L.push('', '## Calibration queue (R44)', '', `${q.length} rows outside their band — the input to the owner's calibration pass. Also written to \`calibration-queue.md\`.`, '');
  L.push(...renderQueue(q));
  return `${L.join('\n')}\n`;
}

export function renderQueue(q: QueueItem[]): string[] {
  const L = ['| | Suite | Row | Measured | Expected | Source | Expected failure | samhv-dev: decision |', '|---|---|---|---|---|---|---|---|'];
  for (const x of q) L.push(`| ${dot[cls(x)]} | ${x.suite} | ${x.id} | ${x.measured} | ${x.expected} | ${x.source} | ${x.expectedMiss?.id ?? ''} | |`);
  return L;
}
