// Debrief 2, piece D0 (docs/plans/debrief-2-option-c.md): the pre-D readers pinned on committed exports. Each fixture
// under __fixtures__/debrief-2/ is a byte copy of a kit-round export under docs/showcase/kit-round-a/ (no new
// recording); its `.readers.json` beside it is what the Debrief's readers make of the fixture's record before any
// Debrief 2 piece. Every later piece (D1 pressures, D2 alarm ends, D3 CPR stop, …) keeps this file green: a pre-D file
// opens and prints as it did, and a change to that output has to change a golden here, on purpose, in its own diff.
// Goldens are written with `vitest run -u` only; CI never writes one.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { facts, objectives, perMinute, report3 } from './debrief.ts';
import { debriefJson } from './debrief-export.ts';
import { keyMoments, keyTimes } from './debrief-moments.ts';
import type { RunData } from './record.ts';

const DIR = join(import.meta.dirname, '__fixtures__', 'debrief-2');
/** fixture → the committed export it copies (the PR body says why each was taken). */
const FIXTURES = {
  'tamponade-a31-v1': 'docs/showcase/kit-round-a/fa/debrief-a3-tamponade-cue-card-path-kit-round-chromium.json',
  'tamponade-q12-v2': 'docs/showcase/kit-round-a/q2-pretag-chromium/debrief-q1-2-tamponade-a3-path-and-3-debrief-chromium.json',
  'mh-early-call-a4-v2': 'docs/showcase/kit-round-a/debrief-a4-mh-e119-induction-sequence-and-early-call-kit-round-chromium.json',
} as const;
const REPO = join(import.meta.dirname, '../../../..');
const raw = (name: keyof typeof FIXTURES): string => readFileSync(join(DIR, `${name}.json`), 'utf8');
const runOf = (name: keyof typeof FIXTURES): RunData => (JSON.parse(raw(name)) as { record: RunData }).record;

/** What the Debrief's readers make of a record (the sections the export and the page print). */
function readers(d: RunData) {
  const moments = keyMoments(d);
  return { objectives: objectives(d), facts: facts(d), keyMoments: moments, keyTimes: keyTimes(d, moments), report3: report3(d), perMinute: perMinute(d) };
}

describe.each(Object.keys(FIXTURES) as Array<keyof typeof FIXTURES>)('Debrief 2 baseline: %s', (name) => {
  it('is a byte copy of its committed kit-round export', () => {
    expect(raw(name)).toBe(readFileSync(join(REPO, FIXTURES[name]), 'utf8'));
  });

  it('objectives, facts, keyMoments, keyTimes, report3 and perMinute equal the pre-D golden', async () => {
    await expect(`${JSON.stringify(readers(runOf(name)), null, 1)}\n`).toMatchFileSnapshot(join(DIR, `${name}.readers.json`));
  });

  it('debriefJson round-trips: the same record, and the sections the readers make', () => {
    const d = runOf(name);
    const out = JSON.parse(debriefJson(d, 'd0-baseline')) as Record<string, unknown>;
    const r = readers(d);
    expect(out.schema).toBe('pme-debrief/2'); // all three are pme-scenario/1 runs; report3 is null on each
    expect(r.report3).toBeNull();
    expect(out.record).toEqual(d);
    expect(out.build).toBe('d0-baseline');
    expect({ objectives: out.objectives, facts: out.facts, keyMoments: out.keyMoments, keyTimes: out.keyTimes, minutes: out.minutes })
      .toEqual(JSON.parse(JSON.stringify({ objectives: r.objectives, facts: r.facts, keyMoments: r.keyMoments, keyTimes: r.keyTimes, minutes: r.perMinute })));
  });
});
