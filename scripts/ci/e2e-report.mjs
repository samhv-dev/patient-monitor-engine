// Reads a Playwright JSON report for the e2e jobs' report steps (ci.yml), in place of the two jq programs they used:
// the Playwright image has no jq, and its download from github.com failed three runs before any test ran (research/42
// §1.5). Prints one line per test:
//   node scripts/ci/e2e-report.mjs quarantine <report.json> → "<status>\t<file>:<line> <title>", every test
//   node scripts/ci/e2e-report.mjs retry <report.json>      → "<known|crash|new>\t<file>:<line> [<project>] <title>[\t<signature>]",
//                                                             the tests that passed only on a retry (status "flaky")
//   node scripts/ci/e2e-report.mjs gate <report.json> <browser> → the retry gate of one e2e job: the job summary (to
//                                                             $GITHUB_STEP_SUMMARY), the annotations, exit 1 on a `new` line
// Exit 1 when the report cannot be read or the mode is unknown (and, in `gate`, on a `new` line).
//
// The retry classes (brief 57, DRAFT for the owner's ruling, 6 Nov question 1):
//   known — tagged @known-flaky (exempt, as before);
//   crash — every attempt before the pass FAILED (not timed out) and every error of it is the browser or page dying
//           under the test, one of CRASH_SIGNATURES below; the line carries the signature that matched (the first one
//           listed that matches the first failed attempt);
//   new   — anything else: an assertion, a time-out, or any attempt that mixed a crash with a real failure.
import { appendFileSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The browser-crash signatures, as Playwright words them, each matched against an error's message with ANSI colour
// stripped. Each names the page or its web process going away under the test; none names an assertion. Only wordings
// seen in CI are listed: the brief's candidates "Browser has been closed" and "Protocol error (…): Target closed" did
// not appear in the 88 job logs read for brief 57 (every gating e2e job with a retry-only pass, 2026-11-05 20:00 to
// 2026-11-06 08:00 UTC), so a retry after either is still `new` until one is seen and added here with its job.
export const CRASH_SIGNATURES = [
  // Playwright's TargetClosedError, raised by any page / locator call whose page closed mid-call. 57 of the 63 crash
  // retries; e.g. run 42111824225 job 127545043744 (PR #285, debrief.e2e.ts:493, "page.evaluate: …") and run 42105086732
  // job 127518005540 (teach2-fit.e2e.ts:175, "locator.click: …").
  { name: 'target-closed', re: /Target page, context or browser has been closed/ },
  // The web process died under a call. Run 42140776760 job 127641042182 (reload-keeps-case.e2e.ts:110,
  // "page.evaluate: Target crashed"); run 42149445087 job 127669399119 (teach2-fit.e2e.ts:175, "locator.click: …").
  { name: 'target-crashed', re: /Target crashed/ },
  // The web process died during a navigation. Run 42123206703 job 127581047755 and run 42159512493 job 127701863358
  // (reload-keeps-case.e2e.ts:110, "page.reload: Page crashed").
  { name: 'page-crashed', re: /Page crashed/ },
];

const ANSI = /\u001b\[[0-9;]*m/g;
const messages = (r) => {
  const ms = (r.errors ?? []).map((e) => e.message ?? String(e.value ?? ''));
  if (ms.length === 0 && r.error) ms.push(r.error.message ?? String(r.error.value ?? ''));
  return ms.map((m) => m.replace(ANSI, ''));
};
const signature = (m) => CRASH_SIGNATURES.find((s) => s.re.test(m))?.name;

/**
 * Classifies one Playwright JSON test (a `specs[].tests[]` entry) of a spec with `tags`.
 * Returns null for a test that did not pass only on a retry, else { kind: 'known'|'crash'|'new', signature? }.
 */
export function classify(test, tags = []) {
  if (test.status !== 'flaky') return null;
  if (tags.includes('known-flaky')) return { kind: 'known' };
  const results = [...(test.results ?? [])].sort((a, b) => (a.retry ?? 0) - (b.retry ?? 0));
  const pass = results.findIndex((r) => r.status === 'passed');
  const before = pass < 0 ? results : results.slice(0, pass);
  if (before.length === 0) return { kind: 'new' };
  let first;
  for (const r of before) {
    if (r.status !== 'failed') return { kind: 'new' }; // a time-out (or an interruption) is never a crash here
    const ms = messages(r);
    if (ms.length === 0) return { kind: 'new' };
    for (const m of ms) {
      const s = signature(m);
      if (!s) return { kind: 'new' };
      first ??= s;
    }
  }
  return { kind: 'crash', signature: first };
}

const walk = (suite, out) => {
  for (const sp of suite.specs ?? []) for (const t of sp.tests ?? []) out.push({ sp, t });
  for (const s of suite.suites ?? []) walk(s, out);
  return out;
};

/** The report's retry lines, as the `retry` mode prints them. */
export function retryLines(report) {
  const out = [];
  for (const { sp, t } of (report.suites ?? []).flatMap((s) => walk(s, []))) {
    const c = classify(t, sp.tags ?? []);
    if (c) out.push(`${c.kind}\t${sp.file}:${sp.line} [${t.projectName}] ${sp.title}${c.signature ? `\t${c.signature}` : ''}`);
  }
  return out;
}

/** At or above this many crashes in one job the gate adds a ::notice, so the pattern stays visible. It fails nothing. */
export const CRASH_NOTICE_AT = 3;

/**
 * The retry gate of one e2e job, from its retry lines (sorted, unique): the job-summary lines, the annotations, and
 * whether the job fails. Only a `new` line fails it; `crash` and `known` lines warn.
 */
export function gate(lines, browser) {
  const rows = lines.map((l) => {
    const [kind, test, sig] = l.split('\t');
    return { kind, test, sig };
  });
  const of = (k) => rows.filter((r) => r.kind === k);
  const crashes = of('crash');
  const retried = rows.filter((r) => r.kind !== 'crash');
  const summary = [
    `### e2e tests that passed only on retry: ${retried.length}`,
    ...retried.map((r) => (r.kind === 'known' ? `- (@known-flaky) ${r.test}` : `- **NEW** ${r.test}`)),
    `### e2e crashes (browser died, retry passed): ${crashes.length}`,
    ...crashes.map((r) => `- ${r.test} (${r.sig})`),
  ];
  const annotations = [
    ...retried.map((r) => `::warning title=e2e passed only on retry::${r.test}`),
    ...crashes.map((r) => `::warning title=e2e crash (browser died, retry passed)::${r.test} (${r.sig})`),
  ];
  if (crashes.length >= CRASH_NOTICE_AT) annotations.push(`::notice title=e2e crashes::${browser} crashed ${crashes.length} times on this runner`);
  const fail = of('new').length > 0;
  if (fail) annotations.push('::error title=e2e passed only on retry::a test without the @known-flaky tag passed only on retry, not after a browser crash: a retry is not a pass');
  return { summary, annotations, fail };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const [mode, file, browser = 'the browser'] = process.argv.slice(2);
  if (mode !== 'quarantine' && mode !== 'retry' && mode !== 'gate') {
    console.error('usage: e2e-report.mjs quarantine|retry|gate <report.json> [browser]');
    process.exit(1);
  }
  let report;
  try {
    report = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    console.log(`::error title=e2e JSON report::${file} could not be read: the ${mode} check cannot run`);
    process.exit(1);
  }
  if (mode === 'quarantine') for (const { sp, t } of (report.suites ?? []).flatMap((s) => walk(s, []))) console.log(`${t.status}\t${sp.file}:${sp.line} ${sp.title}`);
  else if (mode === 'retry') for (const l of retryLines(report)) console.log(l);
  else {
    const g = gate([...new Set(retryLines(report))].sort(), { webkit: 'WebKit', chromium: 'Chromium' }[browser] ?? browser);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${g.summary.join('\n')}\n`);
    else console.log(g.summary.join('\n'));
    for (const a of g.annotations) console.log(a);
    process.exit(g.fail ? 1 : 0);
  }
}
