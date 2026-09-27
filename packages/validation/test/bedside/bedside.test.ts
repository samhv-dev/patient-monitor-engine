import { describe, expect, it } from 'vitest';
import { bedsideMarkdown, provenanceQueue } from '../../src/bedside/apply.ts';
import { BEDSIDE, type BedsideResults } from '../../src/bedside/checklist.ts';

const R: BedsideResults = {
  schema: 'pme-bedside-results/1', device: 'Saadat Alborz B9', firmware: '', observer: 'Ali', date: '2026-10-01', skin: 'saadat-like',
  results: [
    { id: 'asystole-delay', verdict: 'wrong', observed: '5 s', engineMeasured: '9.7 s', note: 'OR default' },
    { id: 'nibp-cycle', verdict: 'matches', observed: '31 s', engineMeasured: '33.9 s', note: '' },
  ],
};

describe('Saadat bedside checklist (research/06 §7)', () => {
  it('covers the checklist, audio and stopwatch items with unique ids', () => {
    const ids = BEDSIDE.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const k of ['main-screen', 'sweep-erase', 'alarm-l1', 'alarm-l2', 'alarm-l3', 'silence', 'nibp-cycle', 'hr-step', 'asystole-delay', 'qrs-pitch']) expect(ids).toContain(k);
  });
  it('a wrong item queues its skin fields with the observation as the proposed source', () => {
    expect(provenanceQueue(R)).toEqual([{ field: 'arrhythmia.asystoleS', item: 'asystole-delay', verdict: 'wrong', observed: '5 s', engine: '9.7 s' }]);
    const md = bedsideMarkdown(R);
    expect(md).toContain('| Asystole delay: 5 s or 10 s? | wrong | 5 s | 9.7 s | OR default |');
    expect(md).toContain('`arrhythmia.asystoleS`');
    expect(md).toContain('| Factory main screen (P1) | not-checked |');
  });
});
