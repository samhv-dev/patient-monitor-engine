// `pnpm validate` (root) → docs/validation/report.md, report.json, calibration-queue.md. Entry-only module.
// Flags: --suites morphology,intervals,sanity,gates,regression,determinism,oracle (default: all)
//        --quick (4 recorded windows, 30 PTB-XL records, 1 determinism seed)  --seeds 11,12  --max-windows N  --full (40 seeds)
//        --rebaseline (rewrite waveform baselines + golden hashes)  --out <dir> (default docs/validation)
// Exit 1 when any red row or a non-deterministic run exists (yellow never fails the run; R40).
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { version as engineVersion } from '@pme/engine-core';
import { cacheDir } from '../datasets/cache.ts';
import { readManifest } from '../datasets/manifest.ts';
import { pwdbStats, PWDB_FILES, PWDB_RECORD } from '../datasets/pwdb.ts';
import { SOURCES } from '../datasets/sources.ts';
import { fetchZenodo } from '../datasets/fetch-zenodo.ts';
import { engineIntervals, intervalFills, ptbxlIntervals } from '../morphology/intervals-suite.ts';
import { gradePairs, measurePairs } from '../morphology/suite.ts';
import { loadPulse, pulseDir } from '../oracle/pulse-node.ts';
import { ORACLE, ORACLE_BACKLOG, runOracle, type OracleRow } from '../oracle/oracle.ts';
import { runRegression } from '../regression/baseline.ts';
import { runDeterminism, writeGolden } from '../regression/determinism.ts';
import { runValidationDoc } from '../segments/run.ts';
import type { ValidationDoc } from '../segments/types.ts';
import { calibrationQueue, gatingFailures, renderMarkdown, renderQueue } from '../report/write.ts';
import type { DocSummary, Report } from '../report/types.ts';
import { GATE_DOCS } from '../../suites/gates/gate-docs.ts';
import { SANITY_DOCS } from '../../suites/sanity/sanity-docs.ts';
import induction from '../../suites/sanity/or-induction-hypotension.json';

const ALL = ['morphology', 'intervals', 'sanity', 'gates', 'regression', 'determinism', 'oracle'];
const arg = (k: string) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const has = (k: string) => process.argv.includes(k);
const quick = has('--quick');
const suites = (arg('--suites') ?? ALL.join(',')).split(',');
const seeds = (arg('--seeds') ?? '11').split(',').map(Number);
const maxWindows = arg('--max-windows') ? Number(arg('--max-windows')) : quick ? 4 : null;
const repoRoot = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const outDir = resolve(repoRoot, arg('--out') ?? 'docs/validation');
const log = (m: string) => process.stderr.write(`${m}\n`);
const t0 = performance.now();
const cache = cacheDir();
const on = (s: string) => suites.includes(s);

const fills: Record<string, { min: number; max: number }> = {};
let intervals: Report['intervals'] = null;
let engIv: ReturnType<typeof engineIntervals> = [];
if (on('intervals')) {
  const ref = await ptbxlIntervals(cache, quick ? 30 : 100);
  engIv = engineIntervals();
  Object.assign(fills, intervalFills(ref));
  intervals = { ptbxl: ref.length, engine: engIv.length };
}
let morphology: Report['morphology'] = [];
if (on('morphology')) {
  const pw = pwdbStats(new TextDecoder().decode(await fetchZenodo(cache, PWDB_RECORD, PWDB_FILES.indices.file, PWDB_FILES.indices.md5)), ['Radial']);
  fills['pwdb-rise'] = { min: Math.min(...pw.map((p) => p.sysAfterFootMs[0])), max: Math.max(...pw.map((p) => p.sysAfterFootMs[2])) };
  const pairs = await measurePairs({ cache, seeds, onProgress: log, ...(maxWindows !== null ? { maxWindows } : {}) });
  if (on('intervals')) {
    // engine intervals join the morphology table as one pseudo-window (V5 bands are absolute: PTB-XL p10–p90)
    const eng = engIv;
    const nan = Number.NaN;
    const blank = { hr: nan, beats: 0, rToFootMs: [], footToPeakMs: [], rToNotchMs: [], notchDepth: [], notchMinimumFrac: nan, upstrokeSlope: [], sys: [], dia: [], alpha: [], slopeIII: [], plateau: [], co2Calibrated: false, resp: null, ppgDelayMs: [], ppgShapeR: nan, ppgCountRatio: nan, hrErr: [], nibpMinusAbp: [] };
    const iv = { ...blank, qtcMs: eng.map((e) => e.qtcMs), prMs: eng.map((e) => e.prMs), qrsMs: eng.map((e) => e.qrsMs) };
    const w = { source: 'vitaldb' as const, record: 'capture12', fromS: 0, toS: 10, site: 'unknown' as const, hr: nan, sbp: nan, dbp: nan, etco2: null, vent: null, ageY: null, sex: null, tags: [] };
    pairs.push({ window: w, recorded: blank, engine: iv as never, wallMs: 0 });
  }
  morphology = gradePairs(pairs, fills);
}

const docs: Array<{ suite: 'sanity' | 'gates'; doc: ValidationDoc }> = [
  ...(on('sanity') ? [induction as unknown as ValidationDoc, ...SANITY_DOCS].map((doc) => ({ suite: 'sanity' as const, doc })) : []),
  ...(on('gates') ? GATE_DOCS.map((doc) => ({ suite: 'gates' as const, doc })) : []),
];
const summaries: DocSummary[] = [];
const results: Report['segments']['results'] = [];
for (const { suite, doc } of docs) {
  const r = await runValidationDoc(doc);
  summaries.push({ id: doc.id, title: doc.title, suite, measurable: r.measurable, unsupported: r.unsupported, requires: doc.requires ?? [], wallMs: r.wallMs });
  results.push(...r.results);
  log(`${suite} ${doc.id}: ${r.measurable ? `${r.results.length} targets` : 'not measurable'} (${(r.wallMs / 1000).toFixed(1)} s)`);
}

const regression = on('regression') ? await runRegression({ rebaseline: has('--rebaseline') }) : [];
let determinism: Report['determinism'] = null;
if (on('determinism')) {
  const d = await runDeterminism(has('--full') ? Array.from({ length: 40 }, (_, i) => i + 1) : quick ? [1] : [1, 2, 3]);
  if (has('--rebaseline')) writeGolden(d.hashes);
  determinism = { runs: d.runs, nonDeterministic: d.nonDeterministic, goldenChanged: d.goldenChanged };
}
const oracle: Report['oracle'] = { buildHash: null, rows: [] as OracleRow[], backlog: ORACLE_BACKLOG };
if (on('oracle')) {
  const dir = pulseDir();
  for (const s of ORACLE) {
    const p = dir ? await loadPulse(dir) : null;
    if (p) oracle.buildHash = p.buildHash;
    oracle.rows.push(...(await runOracle(s, p)).rows);
    log(`oracle ${s.id}${dir ? '' : ' (Pulse skipped: PME_PULSE_DIR unset)'}`);
  }
}

const windows = (src: 'vitaldb' | 'mghdb') => readManifest(src)?.windows.length ?? 0;
let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch { /* not a git checkout */ }
const report: Report = {
  schema: 'pme-validation-report/1', createdAt: new Date().toISOString(), commit, engineVersion,
  options: { suites, seeds, maxWindows },
  datasets: [
    { ...pick('vitaldb'), windows: windows('vitaldb') }, { ...pick('mghdb'), windows: windows('mghdb') },
    { ...pick('pwdb'), windows: 0 }, { ...pick('ptbxl'), windows: intervals?.ptbxl ?? 0 },
  ],
  morphology, intervals, segments: { docs: summaries, results }, regression, determinism, oracle,
  wallS: (performance.now() - t0) / 1000,
};
function pick(id: 'vitaldb' | 'mghdb' | 'pwdb' | 'ptbxl') {
  const s = SOURCES[id];
  return { id, title: s.title, licence: s.licence, attribution: s.attribution };
}
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'report.json'), `${JSON.stringify(report, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v), 1)}\n`);
writeFileSync(join(outDir, 'report.md'), renderMarkdown(report));
writeFileSync(join(outDir, 'calibration-queue.md'), `# Calibration queue (R44)\n\nFrom \`pnpm validate\` at ${report.createdAt}, commit \`${commit}\`. Every row outside its band; fill the last column during the calibration pass.\n\n${renderQueue(calibrationQueue(report)).join('\n')}\n`);
const fail = gatingFailures(report);
log(`report: ${join(outDir, 'report.md')} — ${calibrationQueue(report).length} queued, ${fail.length} gating`);
process.exit(fail.length ? 1 : 0);
