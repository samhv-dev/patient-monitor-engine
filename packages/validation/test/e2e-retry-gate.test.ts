// The e2e retry gate (scripts/ci/e2e-report.mjs): a retry-only pass whose every earlier attempt ended in a browser crash
// is counted apart and, on WebKit only, does not fail the job; any other retry-only pass fails it. An attempt ended in a
// crash only when a sign that is sufficient alone (browser-crash.json `alone`) came before its failure. The fixture holds
// the fourteen WebKit retry-only passes of 85 CI runs and one earlier crash-free time-out, each attempt's status and
// errors copied unedited from its Playwright report, with the browser-crash record its trace shows (the signs, timed,
// and the moment the test function ended).
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- a plain .mjs script without type declarations
import { attemptCrash, classify, CRASH_NOTICE_AT, CRASHES, gate, retries } from '../../../scripts/ci/e2e-report.mjs';

type Result = { retry: number; status: string; errors: Array<{ message: string }>; attachments: Array<{ name: string; path: string }> };
type Spec = { file: string; line: number; title: string; tests: Array<{ status: string; results: Result[] }> };
const dir = resolve(import.meta.dirname, 'fixtures/e2e-retry-sightings');
const report = JSON.parse(readFileSync(resolve(dir, 'report.json'), 'utf8')) as { suites: Array<{ specs: Spec[] }> };
const tmp = mkdtempSync(join(tmpdir(), 'e2e-retry-gate-'));
let seq = 0;
const run = (title: string) => /ci run (\d+)/.exec(title)![1];
const spec = (file: string, r: string) => report.suites[0]!.specs.find((s) => s.file === file && run(s.title) === r)!;
const firstAttempt = (file: string, r: string) => spec(file, r).tests[0]!.results[0]!;
const flaky = (...results: object[]) => ({ status: 'flaky', results: [...results, { retry: results.length, status: 'passed', errors: [] }] });
const err = (message: string) => ({ message });
const row = (kind: string, n = 0) => ({ kind, test: `t${n}.e2e.ts:1 [webkit] t`, folder: '-', ...(kind === 'crash' ? { signature: 'target-crashed' } : {}) });

describe('the e2e retry gate', () => {
  it('the crash wordings are data; "Target page, context or browser has been closed" is the one not sufficient alone', () => {
    expect(CRASHES.map((s: { name: string; alone: boolean }) => `${s.name}:${s.alone}`)).toEqual([
      'target-closed:false', 'target-crashed:true', 'page-crashed:true', 'network-process-crashed:true', 'webkit-internal-error:true',
    ]);
    for (const s of CRASHES) expect(s.text.length && /ci run \d+/.test(s.seen)).toBeTruthy();
  });

  it('classes the fifteen recorded retry-only passes as their evidence shows', () => {
    const got = Object.fromEntries(retries(report, dir).map((r: { test: string; kind: string; signature?: string }) => [`${r.test.split(' ')[0]} ${run(r.test)}`, r.signature ?? r.kind]));
    expect(got).toEqual({
      // a press lost under a page that moved: an assertion, no crash
      'builder-end-sections.e2e.ts:47 44003911554': 'new',
      'builder-action-editor.e2e.ts:40 44054484447': 'new',
      'builder-action-editor.e2e.ts:40 44029616512': 'new',
      'builder-phase-editor.e2e.ts:36 44000311605': 'new',
      // the browser said its network process crashed before the attempt failed
      'sim-line.e2e.ts:63 43991982650': 'network-process-crashed',
      'sim-line.e2e.ts:63 44035867305': 'network-process-crashed',
      'sim-line.e2e.ts:63 43994852807': 'network-process-crashed',
      'kit-store.e2e.ts:136 44061053044': 'webkit-internal-error',
      // time-outs, each 113 s or more after the browser said its loads failed with an internal error
      'kit-store.e2e.ts:46 43977237726': 'webkit-internal-error',
      'archive-beyond-localstorage.e2e.ts:40 44027075554': 'webkit-internal-error',
      'archive-beyond-localstorage.e2e.ts:40 44022905539': 'webkit-internal-error',
      // "Target page, context or browser has been closed" alone: "Target crashed" came only after the failure
      'teach2-fit-stages.e2e.ts:86 44035184955': 'new',
      // the host page stopped answering; no crash said before the failure
      'depth-artefacts.e2e.ts:141 44015852066': 'new',
      'learner-remote.e2e.ts:192 44045161565': 'new',
      // a time-out with no crash
      'vent-window.e2e.ts:84 42656928762': 'new',
    });
  });

  it('a real timed-out attempt reports the time-out and the pending call, and with no sign before it is a failure', () => {
    for (const [file, r] of [['vent-window.e2e.ts', '42656928762'], ['kit-store.e2e.ts', '43977237726']] as const) {
      const a = firstAttempt(file, r);
      expect(a.status).toBe('timedOut');
      expect(a.errors.map((e) => e.message.replace(/\u001b\[[0-9;]*m/g, '').split('\n')[0])).toEqual([expect.stringMatching(/^Test timeout of \d+ms exceeded\.$/), expect.stringMatching(/^Error: \S+: Test timeout of \d+ms exceeded\.$/)]);
    }
    expect(attemptCrash(firstAttempt('vent-window.e2e.ts', '42656928762'), dir)).toBeNull();
    // the same kit-store attempt without its record: the time-out alone is a failure
    expect(attemptCrash({ ...firstAttempt('kit-store.e2e.ts', '43977237726'), attachments: [] }, dir)).toBeNull();
  });

  it('"Target page, context or browser has been closed" counts only beside a sufficient sign before the failure', () => {
    const closed = firstAttempt('teach2-fit-stages.e2e.ts', '44035184955');
    expect(closed.errors[0]!.message).toContain('Target page, context or browser has been closed');
    expect(attemptCrash(closed, dir)).toBeNull();
    const withSign = (at: number) => ({ ...closed, attachments: [] as object[], rec: { failedAt: 100, signs: [{ signature: 'page-crashed', at }] } });
    expect(attemptCrash(withRecord(withSign(90)))).toBe('page-crashed');
    expect(attemptCrash(withRecord(withSign(110)))).toBeNull(); // said after the failure
  });

  it('order within an attempt: an assertion or a time-out before any crash sign is a failure', () => {
    const assertion = err('Error: expect(locator).toHaveText(expected) failed');
    const timeout = err('Test timeout of 120000ms exceeded.');
    expect(attemptCrash({ status: 'failed', errors: [err('Error: page.reload: WebKit encountered an internal error'), assertion] })).toBe('webkit-internal-error');
    expect(attemptCrash({ status: 'failed', errors: [assertion, err('Error: page.evaluate: Target crashed')] })).toBeNull();
    expect(attemptCrash({ status: 'timedOut', errors: [timeout, err('Error: page.evaluate: Target page, context or browser has been closed')] })).toBeNull();
    expect(attemptCrash({ status: 'failed', errors: [assertion, err('Error: locator.click: Target page, context or browser has been closed')] })).toBeNull();
    expect(attemptCrash(withRecord({ status: 'timedOut', errors: [timeout], rec: { failedAt: 100, signs: [{ signature: 'network-process-crashed', at: 40 }] } }))).toBe('network-process-crashed');
    expect(attemptCrash(withRecord({ status: 'timedOut', errors: [timeout], rec: { failedAt: 100, signs: [{ signature: 'target-closed', at: 40 }] } }))).toBeNull();
  });

  it('a crash on attempt 1 and an assertion or a time-out on attempt 2 is a failure', () => {
    const crash = { retry: 0, status: 'failed', errors: [err('Error: page.evaluate: Target crashed')] };
    expect(classify(flaky(crash, { retry: 1, status: 'failed', errors: [err('Error: expect(locator).toHaveText(expected) failed')] }))).toEqual({ kind: 'new' });
    expect(classify(flaky(crash, { retry: 1, status: 'timedOut', errors: [err('Test timeout of 120000ms exceeded.')] }))).toEqual({ kind: 'new' });
    expect(classify(flaky(crash, { retry: 1, status: 'failed', errors: [err('Error: page.reload: Page crashed')] }))).toEqual({ kind: 'crash', signature: 'target-crashed' });
    expect(classify(flaky(crash), ['known-flaky'])).toEqual({ kind: 'known' });
    expect(classify({ status: 'expected', results: [{ retry: 0, status: 'passed', errors: [] }] })).toBeNull();
  });

  it('on WebKit crash retries are counted apart and pass the job; on Chromium they fail it; a new retry fails both', () => {
    const crashes = [row('crash', 1), row('crash', 2)];
    const w = gate(crashes, 'webkit', 'artifact a');
    expect(w.fail).toBe(false);
    expect(w.summary).toEqual([
      '### e2e tests that passed only on retry: 0',
      '### e2e retries after a browser crash: 2',
      '- t1.e2e.ts:1 [webkit] t: target-crashed (evidence: artifact a, -)',
      '- t2.e2e.ts:1 [webkit] t: target-crashed (evidence: artifact a, -)',
    ]);
    expect(gate(crashes, 'chromium').fail).toBe(true);
    expect(gate([...crashes, row('new', 3)], 'webkit').fail).toBe(true);
    expect(gate([row('known', 4)], 'webkit').fail).toBe(false);
  });

  it(`a job with ${CRASH_NOTICE_AT} or more crash retries carries a notice`, () => {
    const many = Array.from({ length: CRASH_NOTICE_AT }, (_, i) => row('crash', i));
    expect(gate(many, 'webkit').annotations).toContain(`::notice title=e2e browser crashes::${CRASH_NOTICE_AT} retries in this job followed a browser crash`);
    expect(gate(many.slice(1), 'webkit').annotations.some((a: string) => a.startsWith('::notice'))).toBe(false);
  });
});

/** An attempt whose browser-crash record is `rec`, written where its attachment points. */
function withRecord<T extends { rec: object }>(a: T): Omit<T, 'rec'> & { attachments: object[] } {
  const { rec, ...rest } = a;
  const path = resolve(tmp, `rec-${seq++}.json`);
  writeFileSync(path, JSON.stringify(rec));
  return { ...rest, attachments: [{ name: 'evidence browser crashes', path }] };
}
