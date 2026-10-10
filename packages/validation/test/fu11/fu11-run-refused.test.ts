// FU-11 Task J3 (external review F21): validation cannot certify an invalid result as green.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runValidationDoc } from '../../src/segments/run.ts';
import type { ValidationDoc } from '../../src/segments/types.ts';

describe('FU-11 J3: a refused intervention makes the run unmeasurable (F21)', () => {
  it('HR 10 000 at 2 s: not measurable, the refusal recorded with its reason', { timeout: 120_000 }, async () => {
    const doc = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../suites/sanity/or-induction-hypotension.json'), 'utf8')) as ValidationDoc;
    const r = await runValidationDoc({ ...doc, durationS: 10, actions: [{ t: 2, command: { type: 'setTarget', variable: 'hr', value: 10_000 } }] } as ValidationDoc);
    expect(r.measurable).toBe(false);
    expect(r.unsupported[0]?.reason).toMatch(/^refused: /);
    expect(r.results).toEqual([]);
  });
});
