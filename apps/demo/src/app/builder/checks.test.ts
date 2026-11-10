// Validation on every change, debounced (scenario builder B1, docs/plans/scenario-builder.md §5.1 and §5.5): the
// validator runs 300 ms after the last change, on the document the form would write, and each of its lines is placed on
// its field. Refusals and warnings stay two kinds.
import { validateScenario } from '@pme/controller/scenario';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIBRARY } from '../scenarios.ts';
import { checker, CHECK_DELAY_MS, place } from './checks.ts';
import { docOf, formOf } from './form.ts';

const MH = LIBRARY.find((c) => c.id === 'showcase-mh-v2')!.doc;

describe('place: each validator line on its field', () => {
  it('splits a line at its path and keeps refusals and warnings apart, in the validator\'s order', () => {
    const f = formOf(MH);
    f.fields.phases![2]!.next![0] = 'nope';
    f.fields.actions![7]!.drug!.route = { set: ['iv', 'im'] };
    const placed = place(validateScenario(docOf(f)));
    expect(placed.filter((p) => p.kind === 'refusal')).toEqual([
      { kind: 'refusal', line: '/phases/2/next/0: no phase "nope"', text: 'no phase "nope"', at: expect.objectContaining({ section: 'phases', entry: 2, field: 'next', row: 0 }) },
    ]);
    expect(placed.filter((p) => p.kind === 'warning').map((p) => [p.at.path, p.text])).toEqual([
      ['/actions/7/drug', 'propofol: route im is judged; the engine does not model it'],
    ]);
  });
  it('a valid card places nothing; a line without a path shows at the document', () => {
    expect(place(validateScenario(MH))).toEqual([]);
    expect(place({ ok: false, errors: ['something odd'], warnings: [] })).toEqual([
      { kind: 'refusal', line: 'something odd', text: 'something odd', at: { section: 'document', path: '/', heading: true } },
    ]);
  });
});

describe('checker: debounced, on the document the form would write', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it(`runs once, ${CHECK_DELAY_MS} ms after the last of several changes, on the form as it then is`, () => {
    const seen: string[][] = [];
    const c = checker((placed) => seen.push(placed.map((p) => p.line)));
    const f = formOf(MH);
    c.change(f);
    vi.advanceTimersByTime(200);
    f.fields.phases![2]!.next![0] = 'nope';
    c.change(f);
    vi.advanceTimersByTime(CHECK_DELAY_MS - 1);
    expect(seen).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(seen).toEqual([['/phases/2/next/0: no phase "nope"']]);
    vi.advanceTimersByTime(5000);
    expect(seen).toHaveLength(1);
  });
  it('flush runs a pending check now; cancel drops it', () => {
    const seen: number[] = [];
    const c = checker((placed) => seen.push(placed.length));
    c.change(formOf(MH));
    c.flush();
    expect(seen).toEqual([0]);
    c.flush();
    expect(seen).toEqual([0]);
    c.change(formOf(MH));
    c.cancel();
    vi.advanceTimersByTime(CHECK_DELAY_MS * 2);
    expect(seen).toEqual([0]);
  });
  it('passes the validator its options (the engine\'s rhythms: a rhythm it lacks is a warning)', () => {
    const seen: string[][] = [];
    const c = checker((placed) => seen.push(placed.map((p) => `${p.kind} ${p.line}`)), { rhythms: ['sinus'] });
    const f = formOf(MH);
    f.fields.phases![7]!.enter = { signal: 'rhythm:zzz' };
    c.change(f);
    c.flush();
    expect(seen[0]).toContain('warning /phases/7/enter/signal: "zzz" is not in this engine');
  });
});
