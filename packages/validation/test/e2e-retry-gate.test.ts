// The e2e retry gate (scripts/ci/e2e-report.mjs): a retry-only pass whose every earlier attempt ended in a browser crash
// (the wordings in scripts/ci/browser-crash.json, in the attempt's error or in what the browser said during it) is
// counted apart and, on WebKit only, does not fail the job; any other retry-only pass fails it. The fixture holds the
// fourteen WebKit retry-only passes of 85 CI runs: each attempt's error as Playwright reported it, and what the browser
// said during the attempt as its trace and console recorded it.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- a plain .mjs script without type declarations
import { attemptCrash, classify, CRASH_NOTICE_AT, CRASHES, gate, retries } from '../../../scripts/ci/e2e-report.mjs';

const dir = resolve(import.meta.dirname, 'fixtures/e2e-retry-sightings');
const report = JSON.parse(readFileSync(resolve(dir, 'report.json'), 'utf8'));
const run = (title: string) => /ci run (\d+)/.exec(title)![1];
const failedAt = (status: string, message: string) => ({ retry: 0, status, errors: [{ message }] });
const pass = { retry: 1, status: 'passed', errors: [] };
const flaky = (...results: object[]) => ({ status: 'flaky', projectName: 'webkit', results: [...results, { ...pass, retry: results.length }] });
const row = (kind: string, n = 0) => ({ kind, test: `t${n}.e2e.ts:1 [webkit] t`, folder: '-', ...(kind === 'crash' ? { signature: 'target-crashed' } : {}) });

describe('the e2e retry gate', () => {
  it('the crash wordings are data, each a distinct, non-empty text with the run it was seen in', () => {
    expect(CRASHES.map((s: { name: string }) => s.name)).toEqual(['target-closed', 'target-crashed', 'page-crashed', 'network-process-crashed', 'webkit-internal-error']);
    for (const s of CRASHES) expect(s.text.length && /ci run \d+/.test(s.seen)).toBeTruthy();
  });

  it("classes the fourteen WebKit retry-only passes as their evidence shows", () => {
    const got = Object.fromEntries(retries(report, dir).map((r: { test: string; kind: string; signature?: string }) => [`${r.test.split(' ')[0]} ${run(r.test)}`, r.signature ?? r.kind]));
    expect(got).toEqual({
      // a press lost under a page that moved: an assertion, so a failure
      'builder-end-sections.e2e.ts:47 44003911554': 'new',
      'builder-action-editor.e2e.ts:40 44054484447': 'new',
      'builder-action-editor.e2e.ts:40 44029616512': 'new',
      'builder-phase-editor.e2e.ts:36 44000311605': 'new',
      // the network process crashed under the page (in the attempt's error, or only in what the browser said)
      'sim-line.e2e.ts:63 43991982650': 'network-process-crashed',
      'sim-line.e2e.ts:63 44035867305': 'network-process-crashed',
      'sim-line.e2e.ts:63 43994852807': 'network-process-crashed',
      'kit-store.e2e.ts:136 44061053044': 'webkit-internal-error',
      'kit-store.e2e.ts:46 43977237726': 'webkit-internal-error',
      'archive-beyond-localstorage.e2e.ts:40 44027075554': 'webkit-internal-error',
      'archive-beyond-localstorage.e2e.ts:40 44022905539': 'webkit-internal-error',
      // the web process closed under a call
      'teach2-fit-stages.e2e.ts:86 44035184955': 'target-closed',
      // the host page stopped answering and the browser reported no crash before the attempt failed: a failure
      'depth-artefacts.e2e.ts:141 44015852066': 'new',
      'learner-remote.e2e.ts:192 44045161565': 'new',
    });
  });

  it('a crash on attempt 1 and an assertion or a time-out on attempt 2 is a failure', () => {
    const crash = failedAt('failed', 'page.evaluate: Target crashed');
    expect(classify(flaky(crash, { ...failedAt('failed', 'expect(locator).toHaveText(expected) failed'), retry: 1 }))).toEqual({ kind: 'new' });
    expect(classify(flaky(crash, { ...failedAt('timedOut', 'Test timeout of 120000ms exceeded.'), retry: 1 }))).toEqual({ kind: 'new' });
    expect(classify(flaky(crash, { ...failedAt('failed', 'locator.click: Target page, context or browser has been closed'), retry: 1 }))).toEqual({ kind: 'crash', signature: 'target-crashed' });
  });

  it('a time-out with no crash said is a failure; a tagged test is known; a test that passed first is not a retry', () => {
    expect(classify(flaky(failedAt('timedOut', 'Test timeout of 120000ms exceeded.')))).toEqual({ kind: 'new' });
    expect(classify(flaky(failedAt('failed', 'Target crashed')), ['known-flaky'])).toEqual({ kind: 'known' });
    expect(classify({ status: 'expected', results: [pass] })).toBeNull();
    expect(attemptCrash({ status: 'failed', errors: [{ message: '\u001b[31mpage.reload: Page crashed\u001b[39m' }] })).toBe('page-crashed');
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
