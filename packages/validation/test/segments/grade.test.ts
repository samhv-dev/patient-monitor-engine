import { describe, expect, it } from 'vitest';
import { gradeTarget } from '../../src/segments/grade.ts';
import type { Target } from '../../src/segments/types.ts';

const ctx = { segValue: (id: string) => (id === 'base' ? 80 : Number.NaN) };
const T = (t: Partial<Target> & Pick<Target, 'type'>): Target => ({ id: 'x', series: 'state:hr', reduce: 'mean', source: 'test', ...t }) as Target;

describe('R40 grading: green < 10 %, yellow 10–30 %, red ≥ 30 %; a band replaces the green zone', () => {
  it('EqualTo', () => {
    expect(gradeTarget(T({ type: 'EqualTo', value: 100 }), 108, ctx).grade).toBe('green');
    expect(gradeTarget(T({ type: 'EqualTo', value: 100 }), 115, ctx).grade).toBe('yellow');
    expect(gradeTarget(T({ type: 'EqualTo', value: 100 }), 131, ctx)).toMatchObject({ grade: 'red', pass: false });
  });
  it('Range: inside is green whatever its width; outside graded by distance to the nearer edge', () => {
    expect(gradeTarget(T({ type: 'Range', min: 100, max: 110 }), 104, ctx)).toMatchObject({ grade: 'green', errPct: 0 });
    expect(gradeTarget(T({ type: 'Range', min: 100, max: 110 }), 115.7, ctx).grade).toBe('yellow');
    expect(gradeTarget(T({ type: 'Range', min: 100, max: 110 }), 60, ctx).grade).toBe('red');
  });
  it('GreaterThan / LessThan, including a reference to another segment × factor', () => {
    expect(gradeTarget(T({ type: 'GreaterThan', value: { segment: 'base', factor: 1.3 } }), 110, ctx).grade).toBe('green');
    expect(gradeTarget(T({ type: 'GreaterThan', value: { segment: 'base', factor: 1.3 } }), 100, ctx).grade).toBe('yellow');
    expect(gradeTarget(T({ type: 'LessThan', value: 20 }), 30, ctx).grade).toBe('red');
  });
  it('TrendsTo needs the end closer than the start and within tolPct', () => {
    expect(gradeTarget(T({ type: 'TrendsTo', value: 122 }), 120, { ...ctx, firstMeasured: 80 }).grade).toBe('green');
    expect(gradeTarget(T({ type: 'TrendsTo', value: 122 }), 70, { ...ctx, firstMeasured: 80 }).grade).toBe('red');
  });
  it('a missing measurement is red', () => {
    expect(gradeTarget(T({ type: 'EqualTo', value: 1 }), Number.NaN, ctx)).toMatchObject({ grade: 'red', pass: false });
  });
});
