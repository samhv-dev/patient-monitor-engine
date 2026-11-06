// The e2e jobs' retry gate (scripts/ci/e2e-report.mjs, ci.yml): which retry-only passes fail the job. Brief 57 (DRAFT,
// awaiting the owner's ruling): a retry whose every earlier attempt ended in a browser crash is "crash" (reported,
// not failing); an assertion or a time-out that passes on retry is "new" (fails); a tagged test is "known".
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- a plain .mjs script without type declarations
import { classify, CRASH_NOTICE_AT, gate, retryLines } from '../../../scripts/ci/e2e-report.mjs';

const report = JSON.parse(readFileSync(resolve(import.meta.dirname, 'fixtures/e2e-report-retry-classes.json'), 'utf8'));
const flaky = (...results: object[]) => ({ status: 'flaky', projectName: 'webkit', results: [...results, { retry: results.length, status: 'passed', errors: [] }] });
const failed = (message: string, retry = 0) => ({ retry, status: 'failed', errors: [{ message }] });

describe('scripts/ci/e2e-report.mjs, the retry classes', () => {
  it('classifies the fixture report: crash, new, new, known, (none), new', () => {
    expect(retryLines(report)).toEqual([
      'crash\tfixture.e2e.ts:10 [webkit] crash then pass\ttarget-closed',
      'new\tfixture.e2e.ts:20 [webkit] crash, then an assertion, then pass',
      'new\tfixture.e2e.ts:30 [webkit] assertion then pass',
      'known\tfixture.e2e.ts:40 [webkit] tagged, retried',
      'new\tfixture.e2e.ts:60 [webkit] crash, then a time-out, then pass',
    ]);
  });
  it('a test that passed first time, or failed every attempt, is not a retry-only pass', () => {
    expect(classify({ status: 'expected', results: [{ retry: 0, status: 'passed' }] })).toBeNull();
    expect(classify({ status: 'unexpected', results: [failed('Error: page.evaluate: Target crashed')] })).toBeNull();
  });
  it('each signature, alone or repeated, is a crash; the first failed attempt names it', () => {
    expect(classify(flaky(failed('Error: page.evaluate: Target crashed ')))).toEqual({ kind: 'crash', signature: 'target-crashed' });
    expect(classify(flaky(failed('Error: page.reload: Page crashed')))).toEqual({ kind: 'crash', signature: 'page-crashed' });
    expect(
      classify(flaky(failed('Error: locator.click: Target page, context or browser has been closed'), failed('Error: page.goto: Target crashed', 1))),
    ).toEqual({ kind: 'crash', signature: 'target-closed' });
  });
  it('a wording not seen in CI is not a crash until it is listed', () => {
    expect(classify(flaky(failed('Error: browserContext.newPage: Browser has been closed')))).toEqual({ kind: 'new' });
  });
  it('an attempt with a crash and a real failure, a time-out, or no error at all, is not a crash', () => {
    expect(classify(flaky({ retry: 0, status: 'failed', errors: [{ message: 'Error: page.evaluate: Target crashed' }, { message: 'Error: expect(received).toBe(expected)' }] }))).toEqual({ kind: 'new' });
    expect(classify(flaky({ retry: 0, status: 'timedOut', errors: [{ message: 'Error: page.evaluate: Target page, context or browser has been closed' }] }))).toEqual({ kind: 'new' });
    expect(classify(flaky({ retry: 0, status: 'failed', errors: [] }))).toEqual({ kind: 'new' });
    expect(classify(flaky(failed('TimeoutError: page.waitForFunction: Timeout 30000ms exceeded.')))).toEqual({ kind: 'new' });
  });
  it('a tagged test is known whatever its errors', () => {
    expect(classify(flaky(failed('Error: page.evaluate: Target crashed')), ['known-flaky'])).toEqual({ kind: 'known' });
  });
});

describe('scripts/ci/e2e-report.mjs, the gate', () => {
  const crash = (n: number) => `crash\tc.e2e.ts:${n} [webkit] c${n}\ttarget-closed`;
  it('fails only on a new line, and lists crashes apart with a warning each', () => {
    const g = gate(retryLines(report), 'WebKit');
    expect(g.fail).toBe(true);
    expect(g.summary).toEqual([
      '### e2e tests that passed only on retry: 4',
      '- **NEW** fixture.e2e.ts:20 [webkit] crash, then an assertion, then pass',
      '- **NEW** fixture.e2e.ts:30 [webkit] assertion then pass',
      '- (@known-flaky) fixture.e2e.ts:40 [webkit] tagged, retried',
      '- **NEW** fixture.e2e.ts:60 [webkit] crash, then a time-out, then pass',
      '### e2e crashes (browser died, retry passed): 1',
      '- fixture.e2e.ts:10 [webkit] crash then pass (target-closed)',
    ]);
    expect(g.annotations.filter((a: string) => a.startsWith('::warning title=e2e crash'))).toEqual([
      '::warning title=e2e crash (browser died, retry passed)::fixture.e2e.ts:10 [webkit] crash then pass (target-closed)',
    ]);
    expect(g.annotations.at(-1)).toMatch(/^::error /);
  });
  it('crashes and known lines alone pass the job; a notice at 3 crashes in one job, never a failure', () => {
    expect(CRASH_NOTICE_AT).toBe(3);
    const two = gate([crash(1), crash(2), 'known\tk.e2e.ts:1 [webkit] k'], 'WebKit');
    expect(two.fail).toBe(false);
    expect(two.annotations.some((a: string) => a.startsWith('::notice'))).toBe(false);
    const three = gate([crash(1), crash(2), crash(3)], 'WebKit');
    expect(three.fail).toBe(false);
    expect(three.annotations).toContain('::notice title=e2e crashes::WebKit crashed 3 times on this runner');
    expect(gate([], 'WebKit')).toEqual({
      summary: ['### e2e tests that passed only on retry: 0', '### e2e crashes (browser died, retry passed): 0'],
      annotations: [],
      fail: false,
    });
  });
});
