// Runs several test groups of one package at once on one runner, each in its own `vitest run` with PME_TEST_SET=<group>,
// so each group runs exactly as it would alone in its own job (its files one at a time). Every output line carries its
// group's name; the job summary has one row per group with its failed files and tests; the exit status is 1 when any
// group failed or wrote no report.
//   node scripts/ci/lanes.mjs <package> <group> [<group> ...]
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

/** Starts every lane, prefixes its output, and resolves to each lane's exit code. */
export function runLanes(lanes, write = (s) => process.stdout.write(s)) {
  return Promise.all(lanes.map((l) => new Promise((done) => {
    const child = spawn(l.cmd, l.args, { env: { ...process.env, ...l.env }, stdio: ['ignore', 'pipe', 'pipe'] });
    for (const s of [child.stdout, child.stderr]) createInterface({ input: s }).on('line', (line) => write(`[${l.name}] ${line}\n`));
    child.on('error', (e) => { write(`[${l.name}] ${e.message}\n`); done({ name: l.name, code: 1 }); });
    child.on('close', (code, signal) => done({ name: l.name, code: code ?? (signal ? 1 : 0) }));
  })));
}

/** One summary row per lane from its exit code and its Vitest JSON report (null when it wrote none). */
export function laneRow({ name, code }, report) {
  if (!report) return { name, ok: false, line: `| ${name} | **no report** (exit ${code}) | | |` };
  const files = report.testResults ?? [];
  const failed = files.flatMap((f) => (f.assertionResults ?? []).filter((a) => a.status === 'failed').map((a) => `${f.name.replace(/^.*?\/((test|src)\/)/, '$1')} > ${a.fullName}`));
  const broken = files.filter((f) => f.status === 'failed' && !(f.assertionResults ?? []).some((a) => a.status === 'failed')).map((f) => `${f.name.replace(/^.*?\/((test|src)\/)/, '$1')} (the file failed to run: ${String(f.message ?? '').split('\n')[0]})`);
  const ok = code === 0 && failed.length === 0 && broken.length === 0;
  const list = [...failed, ...broken].map((t) => `**${t}**`).join('<br>');
  return { name, ok, line: `| ${name} | ${ok ? 'passed' : `**failed** (exit ${code})`} | ${files.length} files, ${report.numPassedTests ?? 0}/${report.numTotalTests ?? 0} tests | ${list} |` };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [pkg, ...groups] = process.argv.slice(2);
  if (!pkg || groups.length === 0) throw new Error('usage: lanes.mjs <package> <group> [<group> ...]');
  const out = (g) => join(process.env.RUNNER_TEMP ?? tmpdir(), `lane-${g}.json`);
  const results = await runLanes(groups.map((g) => ({
    name: g,
    cmd: 'pnpm',
    args: ['--filter', pkg, 'exec', 'vitest', 'run', '--reporter=default', '--reporter=github-actions', '--reporter=json', `--outputFile.json=${out(g)}`],
    env: { PME_TEST_SET: g },
  })));
  const rows = results.map((r) => laneRow(r, existsSync(out(r.name)) ? JSON.parse(readFileSync(out(r.name), 'utf8')) : null));
  const table = [`### ${pkg}: ${groups.join(', ')}`, '', '| group | result | ran | failed tests |', '|---|---|---|---|', ...rows.map((r) => r.line), ''].join('\n');
  console.log(table);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
  process.exit(rows.every((r) => r.ok) ? 0 : 1);
}
