// Brief 194: the evidence of a failed e2e attempt, from every page the test had open. Two things keep it working:
// (1) every e2e spec takes `test` from apps/demo/e2e/evidence.ts (Playwright's own, with the auto fixture that writes each
// page's counters and console on a failure), never straight from '@playwright/test', so a new spec cannot leave it out;
// (2) scripts/ci/e2e-report.mjs names, for a test that passed only on a retry, the folder of its failed attempt, which
// ci.yml's warning line points at.
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const e2e = join(root, 'apps/demo/e2e');

describe('e2e evidence on a failed attempt (brief 194)', () => {
  it('every e2e spec imports its test from the evidence fixture (directly or through audit-fixture.ts)', () => {
    const specs = readdirSync(e2e).filter((f) => f.endsWith('.e2e.ts'));
    expect(specs.length).toBeGreaterThan(50);
    const bad = specs.filter((f) => {
      const src = readFileSync(join(e2e, f), 'utf8');
      const direct = /^import\s+(?!type\b)[^;]*from\s+'@playwright\/test'/m.test(src); // a value import, `test` among them
      const fixture = /from\s+'\.\/(evidence\.ts|audit-fixture)'/.test(src);
      return direct || !fixture;
    });
    expect(bad, "import { test, expect, … } from './evidence.ts' (it re-exports all of '@playwright/test')").toEqual([]);
    // the shared fixtures that define or hook tests build on it too
    for (const f of ['audit-fixture.ts', 'teach2-fit-support.ts']) expect(readFileSync(join(e2e, f), 'utf8')).toMatch(/from '\.\/evidence\.ts'/);
  });

  it("the retry report names the failed attempt's folder, where its evidence is", () => {
    const dir = mkdtempSync(join(tmpdir(), 'e2e-evidence-'));
    const att = (p: string) => ({ name: 'evidence', contentType: 'application/json', path: p });
    const report = {
      suites: [{
        specs: [
          { file: 'a.e2e.ts', line: 3, title: 'two pages', tags: [], tests: [{ projectName: 'webkit', status: 'flaky', results: [
            { retry: 0, status: 'failed', attachments: [att('/w/repo/test-results/a.e2e.ts-two-pages-webkit/evidence/1-host.json')] },
            { retry: 1, status: 'passed', attachments: [] },
          ] }] },
          { file: 'b.e2e.ts', line: 9, title: 'no evidence', tags: ['known-flaky'], tests: [{ projectName: 'webkit', status: 'flaky', results: [{ retry: 0, status: 'timedOut', attachments: [] }, { retry: 1, status: 'passed', attachments: [] }] }] },
          { file: 'c.e2e.ts', line: 1, title: 'passed', tags: [], tests: [{ projectName: 'webkit', status: 'expected', results: [{ retry: 0, status: 'passed', attachments: [] }] }] },
        ],
      }],
    };
    writeFileSync(join(dir, 'r.json'), JSON.stringify(report));
    const out = execFileSync(process.execPath, [join(root, 'scripts/ci/e2e-report.mjs'), 'retry', join(dir, 'r.json')], { encoding: 'utf8' });
    expect(out.trim().split('\n')).toEqual([
      'new\ta.e2e.ts:3 [webkit] two pages\ttest-results/a.e2e.ts-two-pages-webkit/',
      'known\tb.e2e.ts:9 [webkit] no evidence\t-',
    ]);
  });
});
