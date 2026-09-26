import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runValidationDoc } from '../../src/segments/run.ts';
import type { ValidationDoc } from '../../src/segments/types.ts';

describe('segment runner on the Stage 6b induction scenario', { timeout: 120_000 }, () => {
  it('drives the scenario headless and grades every target', async () => {
    const doc = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../suites/sanity/or-induction-hypotension.json'), 'utf8')) as ValidationDoc;
    const r = await runValidationDoc(doc);
    expect(r.store.states.map(([, s]) => s)).toEqual(['preInduction', 'induction', 'hypotension', 'profound']);
    expect(r.results.length).toBe(7);
    expect(r.results.filter((x) => x.grade !== 'green')).toEqual([]);
  });
});
