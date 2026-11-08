import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { gradeCross, runValidationDoc, type DocRun } from '../../src/segments/run.ts';
import { SeriesStore } from '../../src/segments/series.ts';
import { resolveRef } from '../../src/segments/grade.ts';
import type { CrossTarget, ValidationDoc } from '../../src/segments/types.ts';

describe('segment runner on the built-in induction scenario', { timeout: 120_000 }, () => {
  it('drives the scenario headless and grades every target', async () => {
    const doc = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../suites/sanity/or-induction-hypotension.json'), 'utf8')) as ValidationDoc;
    const r = await runValidationDoc(doc);
    expect(r.store.states.map(([, s]) => s)).toEqual(['preInduction', 'induction', 'hypotension', 'profound']);
    expect(r.results.length).toBe(7);
    expect(r.results.filter((x) => x.grade !== 'green')).toEqual([]);
  });
});

describe('rows across documents and references to another series (brief 84)', () => {
  const run = (id: string, hr: [number, number], measurable = true): DocRun => {
    const store = new SeriesStore();
    for (let t = 0; t < 100; t++) store.push('state:hr', t, t < 50 ? hr[0] : hr[1]);
    return { doc: { id } as ValidationDoc, measurable, unsupported: [], results: [], store, wallMs: 0, notes: [] };
  };
  const X = { id: 'F: test', mechanism: 'm', since: '2026-11-08', measured: '1' };
  const c: CrossTarget = {
    doc: 'a-vs-b', segment: 'late', target: 'dhr', docs: ['a', 'b'], source: 'test', type: 'LessThan', value: 0.6, expectedMiss: X,
    measure: (m) => (m('b', 'state:hr', 50, 100) - m('b', 'state:hr', 0, 50)) / (m('a', 'state:hr', 50, 100) - m('a', 'state:hr', 0, 50)),
  };
  it('grades the derived value like a segment target and carries the mark', () => {
    const g = gradeCross(c, new Map([['a', run('a', [70, 94])], ['b', run('b', [60, 64])]]));
    expect(g?.measured).toBeCloseTo(4 / 24, 6);
    expect([g?.grade, g?.doc, g?.target, g?.expectedMiss?.id]).toEqual(['green', 'a-vs-b', 'dhr', 'F: test']);
  });
  it('is skipped when one of its documents is not measurable or was not run', () => {
    expect(gradeCross(c, new Map([['a', run('a', [70, 94])], ['b', run('b', [60, 64], false)]]))).toBeNull();
    expect(gradeCross(c, new Map([['a', run('a', [70, 94])]]))).toBeNull();
  });
  it('refuses to read a document it does not declare', () => {
    const bad: CrossTarget = { ...c, docs: ['a'], measure: (m) => m('b', 'state:hr', 0, 50) };
    expect(() => gradeCross(bad, new Map([['a', run('a', [70, 94])], ['b', run('b', [60, 64])]]))).toThrow(/does not declare/);
  });
  it('a reference may read another series of the same segment', () => {
    const seen: Array<[string, string | undefined]> = [];
    const v = resolveRef({ segment: 'arrest', series: 'breath:etco2True', offset: 10 }, (s, series) => (seen.push([s, series]), 72));
    expect([v, seen]).toEqual([82, [['arrest', 'breath:etco2True']]]);
  });
});
