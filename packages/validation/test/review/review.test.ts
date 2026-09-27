import { describe, expect, it } from 'vitest';
import { shuffle, toClip } from '../../src/review/clips.ts';
import { scoreMarkdown, scoreReview } from '../../src/review/score.ts';
import type { ReviewAnswers, ReviewBundle, ReviewKey } from '../../src/review/types.ts';

describe('clip preparation', () => {
  it('cuts 10 s from the middle at the engine rate (360 → 500 Hz ECG, band-passed)', () => {
    const w = { fs: 360, x: Float64Array.from({ length: 300 * 360 }, (_, i) => Math.sin((2 * Math.PI * i) / 360)) };
    const c = toClip(w, 'ecgII', 'abcd');
    expect(c).toMatchObject({ id: 'abcd', fs: 500, unit: 'mV', range: null });
    expect(c.x.length).toBe(5000);
  });
  it('shuffle keeps every element', () => {
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('scoring (brief §9 step 4)', () => {
  const ids = Array.from({ length: 20 }, (_, i) => `c${i}`);
  const bundle: ReviewBundle = { schema: 'pme-review-bundle/1', session: 's1', createdAt: '', clips: ids.map((id) => ({ id, channel: 'abp', fs: 125, unit: 'mmHg', range: [0, 150], x: [] })) };
  const key: ReviewKey = { schema: 'pme-review-key/1', session: 's1', entries: Object.fromEntries(ids.map((id, i) => [id, { kind: i % 2 ? 'synthetic' : 'real', source: 'vitaldb', record: 'x', fromS: 0 }])) };
  it('chance-level guessing with high synthetic ratings passes', () => {
    const ans: ReviewAnswers = { schema: 'pme-review-answers/1', session: 's1', rater: 'Ali', startedAt: 'a', finishedAt: 'b', answers: ids.map((id, i) => ({ id, guess: i % 4 < 2 ? 'real' : 'synthetic', realism: 4, comment: i === 3 ? 'notch too deep' : '', order: i })) };
    const [s] = scoreReview(bundle, key, ans);
    expect(s).toMatchObject({ channel: 'abp', n: 20, accuracy: 0.5, realismReal: 4, realismSynthetic: 4, gap: 0, pass: { accuracy: true, synthetic: true, gap: true } });
    expect(s?.pBinomial).toBeCloseTo(1, 5);
    expect(scoreMarkdown(ans, [s!])).toContain('`c3`: notch too deep');
  });
  it('perfect identification fails and is significant', () => {
    const ans: ReviewAnswers = { schema: 'pme-review-answers/1', session: 's1', rater: 'Ali', startedAt: 'a', finishedAt: 'b', answers: ids.map((id, i) => ({ id, guess: i % 2 ? 'synthetic' : 'real', realism: i % 2 ? 2 : 5, comment: '', order: i })) };
    const [s] = scoreReview(bundle, key, ans);
    expect(s).toMatchObject({ accuracy: 1, realismSynthetic: 2, gap: 3, pass: { accuracy: false, synthetic: false, gap: false } });
    expect(s?.pBinomial).toBeLessThan(0.001);
  });
});
