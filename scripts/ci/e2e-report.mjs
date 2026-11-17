// Reads a Playwright JSON report for the e2e jobs' report steps (ci.yml); the Playwright image has no jq. Modes:
//   quarantine <report.json>       → "<status>\t<file>:<line> <title>", every test
//   retry <report.json>            → "<known|crash|new>\t<file>:<line> [<project>] <title>\t<folder>[\t<signature>]",
//                                    the tests that passed only on a retry (status "flaky"); <folder>: test-results/… of
//                                    the first failed attempt, where its evidence is, or "-" when it has none
//   gate <report.json> <browser>   → the retry gate of one e2e job: the job summary (to $GITHUB_STEP_SUMMARY), the
//                                    annotations, and exit 1 when a retry-only pass fails the job (below)
// Exit 1 when the report cannot be read or the mode is unknown.
//
// A retry-only pass is
//   known — the test is tagged @known-flaky: never fails the job;
//   crash — every attempt before the pass ended in a browser crash (browser-crash.json): its error names a crash, or the
//           browser said so on a page of the test during the attempt (the attempt's "evidence browser crashes"
//           attachment, apps/demo/e2e/evidence.ts). Counted and reported; fails the job on Chromium only;
//   new   — anything else (an assertion, a time-out, a crash followed by an assertion): fails the job.
import { appendFileSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CRASHES = JSON.parse(readFileSync(new URL('./browser-crash.json', import.meta.url), 'utf8')).signatures;
/** The crash signature `text` contains, or undefined. */
export const crashSignature = (text) => CRASHES.find((s) => text.includes(s.text))?.name;
/** At or above this many crashes in one job the summary carries a notice; it fails nothing. */
export const CRASH_NOTICE_AT = 3;
/** The browsers on which a crash retry does not fail the job. */
const CRASH_TOLERATED = new Set(['webkit']);

const ANSI = /\u001b\[[0-9;]*m/g;
const messages = (r) => [...(r.errors ?? []), ...(r.error ? [r.error] : [])].map((e) => String(e.message ?? e.value ?? '').replace(ANSI, ''));

/** What the browser said about crashes during an attempt (the evidence fixture's record), or [] when none was kept. */
function recorded(r, base) {
  const a = (r.attachments ?? []).find((x) => x.name === 'evidence browser crashes' && x.path);
  if (!a) return [];
  try {
    return JSON.parse(readFileSync(resolve(base, a.path), 'utf8'));
  } catch {
    return [];
  }
}

/** The crash signature an attempt ended in, or null when it ended in anything else. */
export function attemptCrash(r, base = '.') {
  for (const m of messages(r)) {
    const s = crashSignature(m);
    if (s) return s;
  }
  return recorded(r, base)[0]?.signature ?? null;
}

/** One `specs[].tests[]` entry: null unless it passed only on a retry, else { kind, signature? }. */
export function classify(test, tags = [], base = '.') {
  if (test.status !== 'flaky') return null;
  if (tags.includes('known-flaky')) return { kind: 'known' };
  const results = [...(test.results ?? [])].sort((a, b) => (a.retry ?? 0) - (b.retry ?? 0));
  const before = results.slice(0, Math.max(0, results.findIndex((r) => r.status === 'passed')));
  const sigs = before.map((r) => attemptCrash(r, base));
  return sigs.length && sigs.every(Boolean) ? { kind: 'crash', signature: sigs[0] } : { kind: 'new' };
}

const walk = (suite, out) => {
  for (const sp of suite.specs ?? []) for (const t of sp.tests ?? []) out.push({ sp, t });
  for (const s of suite.suites ?? []) walk(s, out);
  return out;
};
const tests = (report) => (report.suites ?? []).flatMap((s) => walk(s, []));

/** The output folder of the test's first failed attempt (where its attachments are: test-results/<test>/), or "-". */
function evidenceDir(t) {
  const r = (t.results ?? []).find((x) => x.status !== 'passed' && x.status !== 'skipped');
  for (const a of r?.attachments ?? []) {
    const m = /(?:^|[\\/])(test-results[\\/][^\\/]+)[\\/]/.exec(a.path ?? '');
    if (m) return `${m[1].replace(/\\/g, '/')}/`;
  }
  return '-';
}

/** The report's retry-only passes: { kind, test, folder, signature? }, sorted and unique by line. */
export function retries(report, base = '.') {
  const out = new Map();
  for (const { sp, t } of tests(report)) {
    const c = classify(t, sp.tags ?? [], base);
    const test = `${sp.file}:${sp.line} [${t.projectName}] ${sp.title}`;
    if (c && !out.has(test)) out.set(test, { ...c, test, folder: evidenceDir(t) });
  }
  return [...out.values()].sort((a, b) => a.test.localeCompare(b.test));
}

/** One job's gate: its summary lines, its annotations and whether it fails. `where` names the evidence artifact. */
export function gate(rows, browser, where = 'none kept') {
  const crashes = rows.filter((r) => r.kind === 'crash');
  const retried = rows.filter((r) => r.kind !== 'crash');
  const at = (r) => `(evidence: ${where}, ${r.folder})`;
  const crashFails = !CRASH_TOLERATED.has(browser);
  const summary = [
    `### e2e tests that passed only on retry: ${retried.length}`,
    ...retried.map((r) => `- ${r.kind === 'known' ? '(@known-flaky)' : '**NEW**'} ${r.test} ${at(r)}`),
    `### e2e retries after a browser crash: ${crashes.length}${crashes.length && crashFails ? ' (they fail this job: only WebKit tolerates a crash retry)' : ''}`,
    ...crashes.map((r) => `- ${r.test}: ${r.signature} ${at(r)}`),
  ];
  const annotations = [
    ...retried.map((r) => `::warning title=e2e passed only on retry::${r.test} ${at(r)}`),
    ...crashes.map((r) => `::warning title=e2e retry after a browser crash::${r.test}: ${r.signature} ${at(r)}`),
  ];
  if (crashes.length >= CRASH_NOTICE_AT) {
    summary.push(`**${crashes.length} browser crashes in this job.**`);
    annotations.push(`::notice title=e2e browser crashes::${crashes.length} retries in this job followed a browser crash`);
  }
  const fail = rows.some((r) => r.kind === 'new') || (crashes.length > 0 && crashFails);
  if (fail) annotations.push('::error title=e2e passed only on retry::a test without the @known-flaky tag passed only on a retry, not after a browser crash the rule tolerates: a retry is not a pass');
  return { summary, annotations, fail };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const [mode, file, browser = ''] = process.argv.slice(2);
  if (!['quarantine', 'retry', 'gate'].includes(mode) || !file) {
    console.error('usage: e2e-report.mjs quarantine|retry|gate <report.json> [browser]');
    process.exit(1);
  }
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const base = dirname(resolve(file));
  if (mode === 'quarantine') for (const { sp, t } of tests(report)) console.log(`${t.status}\t${sp.file}:${sp.line} ${sp.title}`);
  else if (mode === 'retry') for (const r of retries(report, base)) console.log([r.kind, r.test, r.folder, ...(r.signature ? [r.signature] : [])].join('\t'));
  else {
    const g = gate(retries(report, base), browser, process.env.E2E_EVIDENCE_WHERE);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${g.summary.join('\n')}\n`);
    else console.log(g.summary.join('\n'));
    for (const a of g.annotations) console.log(a);
    process.exit(g.fail ? 1 : 0);
  }
}
