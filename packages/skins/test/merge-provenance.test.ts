import { describe, expect, it } from 'vitest';
import { deepMerge } from '../src/merge.ts';
import { coveringKey, leafPaths, provenanceGaps } from '../src/provenance.ts';

describe('deepMerge', () => {
  it('merges objects key by key; arrays, scalars and null replace', () => {
    const base = { a: { b: 1, c: [1, 2] }, d: 'x', e: { f: 1 } };
    expect(deepMerge(base, { a: { c: [9] }, e: null })).toEqual({ a: { b: 1, c: [9] }, d: 'x', e: null });
  });
  it('never mutates its inputs', () => {
    const base = { a: { b: 1 } };
    const over = { a: { c: 2 } };
    const out = deepMerge(base, over) as { a: Record<string, number> };
    out.a.b = 5;
    expect(base).toEqual({ a: { b: 1 } });
    expect(over).toEqual({ a: { c: 2 } });
  });
});

describe('provenance helpers', () => {
  it('leafPaths treats arrays and nulls as leaves and skips identity fields', () => {
    expect(leafPaths({ id: 'x', provenance: {}, a: [1, 2], b: { c: null, d: 1 } })).toEqual(['a', 'b.c', 'b.d']);
  });
  it('coveringKey is the longest matching prefix', () => {
    const prov = { colors: { tag: 'eng', source: 'ENG' }, 'colors.ECG': { tag: 'measured', source: 'research/06 §3.2' } } as const;
    expect(coveringKey(prov, 'colors.ECG')).toBe('colors.ECG');
    expect(coveringKey(prov, 'colors.SpO2')).toBe('colors');
    expect(coveringKey(prov, 'sweep.gapPx')).toBeUndefined();
  });
  it('provenanceGaps reports uncovered leaves and dangling keys', () => {
    const doc = { a: 1, b: { c: 2 } };
    expect(provenanceGaps(doc, { a: { tag: 'eng', source: 'ENG' }, 'b.x': { tag: 'eng', source: 'ENG' } })).toEqual({ uncovered: ['b.c'], dangling: ['b.x'] });
  });
});
